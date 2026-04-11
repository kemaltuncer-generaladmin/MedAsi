import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getQuestionBankUsageSummary } from "@/lib/access/entitlements";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const subject = url.searchParams.get("subject");
  const difficulty = url.searchParams.get("difficulty");
  const limit = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200,
  );

  const [usage, questions] = await Promise.all([
    getQuestionBankUsageSummary(user.id),
    prisma.poolQuestion.findMany({
      where: {
        isActive: true,
        ...(subject && subject !== "Tümü" ? { subject } : {}),
        ...(difficulty && difficulty !== "Tümü" ? { difficulty: difficulty.toLowerCase() } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  return NextResponse.json({
    usage,
    questions: questions.map((question) => ({
      id: question.id,
      text: question.questionText,
      options: Array.isArray(question.options)
        ? question.options.map((option) =>
            typeof option === "string"
              ? option
              : typeof option === "object" &&
                  option &&
                  "text" in option &&
                  typeof option.text === "string"
                ? option.text
                : "",
          )
        : [],
      correctAnswer: question.correctAnswer,
      subject: question.subject,
      difficulty: question.difficulty,
      explanation: question.explanation,
      createdAt: question.createdAt,
    })),
  });
}
