#!/usr/bin/env tsx
/**
 * prompt-council — offline council review for system-prompt changes.
 *
 * Usage:
 *   npx tsx scripts/prompt-council.ts <proposed-prompt.txt> [examples.json] [--no-peer-review]
 *
 * Arguments:
 *   proposed-prompt.txt : the full proposed system prompt (plain text, utf-8).
 *   examples.json       : optional. JSON array of example customer messages to
 *                         anchor the council's evaluation. Example:
 *                           [
 *                             "你好 請問3系還有現貨嗎",
 *                             "這台CR-V我可以開原廠的3+3保固嗎？",
 *                             "有沒有特斯拉Model Y"
 *                           ]
 *   --no-peer-review    : skip the peer-review phase (faster, cheaper, less signal).
 *
 * Requires: GOOGLE_AI_API_KEY in env (same key the production webhook uses).
 *
 * Output: markdown report printed to stdout. Redirect to save:
 *   npx tsx scripts/prompt-council.ts new-prompt.txt examples.json > review.md
 *
 * Not wired into CI or git hooks. Use it manually before shipping a prompt change.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runCouncil, renderCouncilMarkdown } from "../server/_core/llmCouncil";

function usage(msg?: string): never {
  if (msg) process.stderr.write(`error: ${msg}\n\n`);
  process.stderr.write(
    `Usage: npx tsx scripts/prompt-council.ts <proposed-prompt.txt> [examples.json] [--no-peer-review]\n`
  );
  process.exit(msg ? 2 : 0);
}

async function main() {
  const args = process.argv.slice(2);
  const noPeer = args.includes("--no-peer-review");
  const positional = args.filter((a) => !a.startsWith("--"));

  if (positional.length === 0) usage("missing <proposed-prompt.txt>");
  const promptPath = resolve(positional[0]!);
  const examplesPath = positional[1] ? resolve(positional[1]) : null;

  const proposedPrompt = readFileSync(promptPath, "utf-8");
  let examples: string[] = [];
  if (examplesPath) {
    try {
      examples = JSON.parse(readFileSync(examplesPath, "utf-8"));
      if (!Array.isArray(examples) || !examples.every((e) => typeof e === "string")) {
        usage(`examples file must be a JSON array of strings`);
      }
    } catch (e: any) {
      usage(`could not parse examples file: ${e.message}`);
    }
  }

  const question = [
    "Should we ship this system prompt change for the 崑家汽車 LINE chatbot?",
    "The chatbot answers Taiwanese used-car customers, must never hallucinate vehicle stock,",
    "and must hand off to a human operator in edge cases. Critique the proposed prompt",
    "below against those constraints.",
  ].join(" ");

  const contextLines = [
    "=== PROPOSED SYSTEM PROMPT ===",
    proposedPrompt,
  ];
  if (examples.length) {
    contextLines.push("");
    contextLines.push("=== EXAMPLE CUSTOMER MESSAGES TO EVALUATE AGAINST ===");
    examples.forEach((e, i) => contextLines.push(`${i + 1}. ${e}`));
  }
  const context = contextLines.join("\n");

  process.stderr.write(`prompt-council: starting (peer review: ${!noPeer})\n`);
  const result = await runCouncil({
    question,
    context,
    withPeerReview: !noPeer,
    onProgress: (step) => process.stderr.write(`  ${step}\n`),
  });

  process.stdout.write(renderCouncilMarkdown(result));
  process.stdout.write("\n");
  process.stderr.write(
    `prompt-council: done (${result.stats.totalLlmCalls} calls, ${result.stats.durationMs}ms)\n`
  );
}

main().catch((err) => {
  process.stderr.write(`prompt-council: failed: ${err.message}\n`);
  process.exit(1);
});
