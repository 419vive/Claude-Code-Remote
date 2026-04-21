/**
 * Shadow Handoff Council — log-only evaluator for borderline handoff decisions.
 *
 * STATUS: SHADOW MODE. NOT WIRED INTO `lineWebhook.ts`. Phase-1 measurement only.
 *
 * Purpose: when our rule-based handoff engine is uncertain (or when a message is
 * genuinely ambiguous), ask a minimal 2-lens council what it would do, log the
 * comparison against what we actually did, then review the data weekly. If the
 * council is consistently right where rules are wrong, THEN we consider wiring
 * it into the decision path in a separate PR.
 *
 * Why 2 lenses, not 5: this is in the money-spending part of the stack. 2 calls
 * + 1 chairman = 3 Gemini calls per flagged message. Still not cheap, but only
 * fires on flagged-ambiguous cases (caller's responsibility to decide when).
 *
 * Log format: JSONL appended to the path in `SHADOW_HANDOFF_LOG_PATH` env var,
 * default `/tmp/shadow-handoff.jsonl`. One record per evaluation. Best-effort —
 * failures are swallowed, never block the caller.
 *
 * Analysis query pattern (for when you have a week of data):
 *   cat /tmp/shadow-handoff.jsonl | jq -r 'select(.ruleDecision != .councilDecision)'
 */

import { appendFile } from "node:fs/promises";
import { logger } from "./logger";
import {
  runCouncil,
  type CouncilLens,
  type CouncilResult,
  type LlmClient,
} from "./_core/llmCouncil";

export type HandoffDecision = "auto_reply" | "handoff" | "ai_disabled";

export type ShadowEvaluateInput = {
  /** Current user message text. */
  userMessage: string;
  /** Caller-built summary of recent conversation (keeps coupling loose). */
  conversationSummary: string;
  /** What the existing rule engine already decided for this message. */
  ruleDecision: HandoffDecision;
  /** Why the caller flagged this as borderline (for audit). */
  flagReason: string;
  /** Optional conversation id for correlation in the log. */
  conversationId?: number;
};

export type ShadowEvaluateResult = {
  councilDecision: HandoffDecision;
  confidence: "low" | "medium" | "high";
  reasoning: string;
  /** Full council trace (for debugging). */
  trace: CouncilResult;
};

/** 2 lenses for handoff decisions — tuned for this domain. */
const HANDOFF_LENSES: CouncilLens[] = [
  {
    name: "The Contrarian",
    shortName: "C",
    instruction:
      "Assume the rule-based system is about to make the wrong call. Find the scenario where letting the AI answer this message damages trust, misquotes stock/price, or makes a promise we can't keep. If you cannot find such a scenario, say so.",
  },
  {
    name: "The Executor",
    shortName: "X",
    instruction:
      "Decide one action, no hedging. Options: auto_reply / handoff / ai_disabled. A handoff pauses AI for 30 min with auto-recovery. ai_disabled is permanent until an operator unlocks. Default to auto_reply unless there's a real reason not to.",
  },
];

/**
 * Extract a decision from the chairman's verdict. Uses simple keyword matching
 * — the chairman is instructed to emit the decision explicitly.
 */
function extractDecision(trace: CouncilResult): {
  decision: HandoffDecision;
  confidence: "low" | "medium" | "high";
} {
  const rec = (trace.verdict.recommendation || "").toLowerCase();
  const first = (trace.verdict.oneThingToDoFirst || "").toLowerCase();
  const blob = `${rec}\n${first}`;

  let decision: HandoffDecision = "auto_reply";
  if (/\bai[_ ]?disabled\b|permanent[ _]?lock|operator[ _]?only/.test(blob)) {
    decision = "ai_disabled";
  } else if (/\bhand[_ ]?off\b|human[_ ]?handoff|escalat/.test(blob)) {
    decision = "handoff";
  } else if (/\bauto[_ ]?reply\b|ai[ _]?can answer|let (?:the )?ai/.test(blob)) {
    decision = "auto_reply";
  }

  // Rough confidence heuristic: how much do advisors converge?
  const clashLen = (trace.verdict.whereClashes || "").length;
  const agreeLen = (trace.verdict.whereAgrees || "").length;
  const confidence =
    agreeLen > clashLen * 2 ? "high" : clashLen > agreeLen * 2 ? "low" : "medium";

  return { decision, confidence };
}

export type ShadowEvaluateOptions = {
  llmClient?: LlmClient;
  logPath?: string;
  /** Set to true in tests to skip logging. */
  skipLog?: boolean;
};

/**
 * Run a shadow evaluation. Never throws; on error returns a sentinel result
 * matching `ruleDecision` (so callers can treat it as no-op).
 */
export async function shadowEvaluateHandoff(
  input: ShadowEvaluateInput,
  opts: ShadowEvaluateOptions = {}
): Promise<ShadowEvaluateResult> {
  const question =
    "Given the user's message and conversation summary, what is the safest handoff decision: auto_reply, handoff, or ai_disabled? Explain in 1-2 sentences.";

  const context = [
    `RULE_DECISION_ALREADY_MADE: ${input.ruleDecision}`,
    `FLAGGED_AS_BORDERLINE_BECAUSE: ${input.flagReason}`,
    "",
    `USER_MESSAGE:`,
    input.userMessage,
    "",
    `CONVERSATION_SUMMARY:`,
    input.conversationSummary,
  ].join("\n");

  let trace: CouncilResult;
  try {
    trace = await runCouncil({
      question,
      context,
      lenses: HANDOFF_LENSES,
      withPeerReview: false, // 2 lenses + peer review is noise; chairman alone is fine
      llmClient: opts.llmClient,
    });
  } catch (e: any) {
    logger.warn("ShadowHandoff", `council failed, returning rule decision: ${e.message}`);
    return {
      councilDecision: input.ruleDecision,
      confidence: "low",
      reasoning: `council-error: ${e.message}`,
      trace: {
        question,
        lenses: [],
        reviews: [],
        verdict: {
          whereAgrees: "",
          whereClashes: "",
          blindSpotsCaught: "",
          recommendation: "",
          oneThingToDoFirst: "",
          raw: "",
        },
        stats: { totalLlmCalls: 0, durationMs: 0 },
      },
    };
  }

  const { decision, confidence } = extractDecision(trace);
  const result: ShadowEvaluateResult = {
    councilDecision: decision,
    confidence,
    reasoning: trace.verdict.recommendation || trace.verdict.oneThingToDoFirst || "",
    trace,
  };

  if (!opts.skipLog) {
    void logShadowResult(input, result, opts.logPath);
  }

  return result;
}

async function logShadowResult(
  input: ShadowEvaluateInput,
  result: ShadowEvaluateResult,
  logPath?: string
): Promise<void> {
  const path = logPath || process.env.SHADOW_HANDOFF_LOG_PATH || "/tmp/shadow-handoff.jsonl";
  const record = {
    ts: new Date().toISOString(),
    conversationId: input.conversationId,
    flagReason: input.flagReason,
    userMessage: input.userMessage,
    ruleDecision: input.ruleDecision,
    councilDecision: result.councilDecision,
    agreed: input.ruleDecision === result.councilDecision,
    confidence: result.confidence,
    reasoning: result.reasoning,
    llmCalls: result.trace.stats.totalLlmCalls,
    durationMs: result.trace.stats.durationMs,
  };
  try {
    await appendFile(path, JSON.stringify(record) + "\n", "utf-8");
  } catch (e: any) {
    logger.warn("ShadowHandoff", `log append failed (non-fatal): ${e.message}`);
  }
}
