import { execSync } from "node:child_process";
import fs from "node:fs";

const PATTERNS = [
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z\-_]{20,}\b/g },
  { name: "Resend key", regex: /\bre_[A-Za-z0-9_]{16,}\b/g },
  { name: "Supabase service key", regex: /\beyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g },
  { name: "Generic private key block", regex: /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/g },
];

const ALLOWLIST_FILES = new Set([
  "scripts/secret-scan.mjs",
]);

function getTrackedFiles() {
  const output = execSync("git ls-files -z", { encoding: "utf8" });
  return output.split("\0").filter(Boolean);
}

function shouldSkip(filePath) {
  if (ALLOWLIST_FILES.has(filePath)) return true;
  if (filePath.endsWith(".png") || filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return true;
  if (filePath.endsWith(".gif") || filePath.endsWith(".pdf") || filePath.endsWith(".zip")) return true;
  if (filePath.endsWith(".lock")) return true;
  return false;
}

const findings = [];
for (const filePath of getTrackedFiles()) {
  if (shouldSkip(filePath)) continue;
  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);
  for (const rule of PATTERNS) {
    lines.forEach((line, index) => {
      const matches = line.match(rule.regex);
      if (matches) {
        findings.push({
          filePath,
          lineNo: index + 1,
          rule: rule.name,
        });
      }
    });
  }
}

if (findings.length > 0) {
  console.error("Secret scan failed. Potential secrets detected:");
  for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.lineNo} (${finding.rule})`);
  }
  process.exit(1);
}

console.log("Secret scan passed.");
