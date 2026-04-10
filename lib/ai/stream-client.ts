type StreamChatOptions = {
  message: string;
  model?: "FAST" | "EFFICIENT";
  module?: string;
  onToken?: (chunk: string, fullText: string) => void;
  timeoutMs?: number;
  signal?: AbortSignal;
};

function parseErrorMessage(rawText: string): string {
  const text = rawText.trim();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text) as
      | string
      | { error?: unknown; message?: unknown; reason?: unknown };

    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
      if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
      if (typeof parsed.reason === "string" && parsed.reason.trim()) return parsed.reason;
    }
  } catch {
    // JSON değilse düz metin olarak devam et.
  }

  return text;
}

function isErrorLike(error: unknown): error is Error | DOMException {
  return error instanceof Error || error instanceof DOMException;
}

function getErrorName(error: unknown): string | undefined {
  return isErrorLike(error) ? error.name : undefined;
}

function hasErrorCause(error: unknown): error is { cause?: unknown } {
  return typeof error === "object" && error !== null && "cause" in error;
}

function isAbortLikeError(error: unknown): boolean {
  const name = getErrorName(error);
  return (
    name === "AbortError" ||
    name === "ResponseAborted" ||
    (isErrorLike(error) && /aborted|abort|cancel/i.test(error.message)) ||
    (hasErrorCause(error) && isAbortLikeError(error.cause))
  );
}

function isTimeoutLikeError(error: unknown): boolean {
  const name = getErrorName(error);
  return (
    name === "TimeoutError" ||
    (isErrorLike(error) && /timeout|timed out/i.test(error.message)) ||
    (hasErrorCause(error) && isTimeoutLikeError(error.cause))
  );
}

function isStreamInterruptedError(error: unknown): boolean {
  if (!isErrorLike(error)) return false;

  const name = error.name;
  const message = `${error.name}: ${error.message}`.toLowerCase();
  return (
    (name === "TypeError" &&
      /terminated|fetch failed|failed to fetch|network error|network request failed|connection closed|socket hang up|premature close/.test(
        message,
      )) ||
    /terminated|fetch failed|failed to fetch|network error|network request failed|connection closed|socket hang up|premature close/.test(
      message,
    )
  );
}

export async function streamChatResponse({
  message,
  model,
  module,
  onToken,
  timeoutMs = 90_000,
  signal,
}: StreamChatOptions) {
  const controller = new AbortController();
  let timedOut = false;

  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) {
      forwardAbort();
    } else {
      signal.addEventListener("abort", forwardAbort, { once: true });
    }
  }

  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;
  let receivedChunk = false;

  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        model,
        module,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(parseErrorMessage(errorText) || `AI isteği başarısız oldu (${res.status})`);
    }

    if (!res.body) {
      throw new Error("Stream gövdesi alınamadı");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        receivedChunk = true;
        fullText += chunk;
        onToken?.(chunk, fullText);
      }

      const trailing = decoder.decode();
      if (trailing) {
        receivedChunk = true;
        fullText += trailing;
        onToken?.(trailing, fullText);
      }

      return fullText;
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (timedOut) {
      throw new Error("AI yanıt süresi aşıldı. Lütfen tekrar deneyin.");
    }
    if (isTimeoutLikeError(error)) {
      throw new Error("AI yanıt süresi aşıldı. Lütfen tekrar deneyin.");
    }
    if (isAbortLikeError(error)) {
      throw new Error(signal?.aborted ? "AI isteği iptal edildi." : "AI yanıtı kesildi.");
    }
    if (receivedChunk && isStreamInterruptedError(error)) {
      throw new Error("AI yanıtı kesildi.");
    }
    if (isErrorLike(error) && /abort|cancel/i.test(error.message)) {
      throw new Error("AI isteği iptal edildi.");
    }
    throw new Error(error instanceof Error ? error.message : "AI yanıt vermedi");
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", forwardAbort);
    }
  }
}
