/**
 * LLM Council — multi-lens deliberation harness.
 *
 * Based on Andrej Karpathy's LLM Council method (and the Tenfold Marketing
 * open-source adaptation), condensed into a pure function for our Gemini stack.
 *
 * Pattern: poll N sub-agents with different thinking LENSES on the same
 * question → anonymous peer review → chairman synthesizes a verdict.
 *
 * Design constraints for this repo:
 *   - Reuses production `invokeLLM` so failure modes match real traffic.
 *   - No global state, no side effects; callers handle logging/persistence.
 *   - `llmClient` is dependency-injected so tests can stub it out.
 *   - Intentionally simple: no streaming, no partial-state recovery. Run it,
 *     wait for the verdict, or don't run it.
 *
 * NOT intended for realtime customer-conversation paths — total cost is
 * roughly `lenses × 2 + 1` LLM calls (poll + peer review + chairman), which
 * is fine for offline prompt review but not fine per inbound LINE message.
 */

import type { InvokeParams, InvokeResult, Message } from "./llm";

/**
 * Lazily import the real `invokeLLM`. Doing this at call time (rather than at
 * module-top) means importing llmCouncil.ts does NOT trigger env.ts's
 * required-env-var checks, so tests can exercise the council with a stub
 * llmClient and no DATABASE_URL / GOOGLE_AI_API_KEY set.
 */
async function defaultLlmClient(params: InvokeParams): Promise<InvokeResult> {
  const mod = await import("./llm");
  return mod.invokeLLM(params);
}

export type CouncilLens = {
  name: string;
  /** Single-letter or short tag used to anonymize during peer review. */
  shortName: string;
  /** System-style instruction that defines how this lens thinks. */
  instruction: string;
};

export type LensResponse = {
  lens: string;
  shortName: string;
  content: string;
};

export type ReviewResponse = {
  /** Anonymized short tag of the reviewer ("A", "B", etc.). */
  reviewer: string;
  strongest: string;
  biggestBlindSpot: string;
  whatAllFiveMissed: string;
  raw: string;
};

export type CouncilVerdict = {
  whereAgrees: string;
  whereClashes: string;
  blindSpotsCaught: string;
  recommendation: string;
  oneThingToDoFirst: string;
  raw: string;
};

export type CouncilResult = {
  question: string;
  lenses: LensResponse[];
  reviews: ReviewResponse[];
  verdict: CouncilVerdict;
  stats: {
    totalLlmCalls: number;
    durationMs: number;
  };
};

export type LlmClient = (params: InvokeParams) => Promise<InvokeResult>;

/** The 5 standard thinking lenses (from Karpathy / Tenfold). */
export const STANDARD_LENSES: CouncilLens[] = [
  {
    name: "The Contrarian",
    shortName: "C",
    instruction:
      "You hunt for what will fail. Assume the proposal has a fatal flaw and try to find it. Be specific about failure modes, not generic concerns. If you cannot find a real flaw, say so.",
  },
  {
    name: "The First Principles Thinker",
    shortName: "F",
    instruction:
      "Ask whether the proposer is even solving the right problem. Strip away assumptions. What is the underlying goal and is this proposal the best path to it?",
  },
  {
    name: "The Expansionist",
    shortName: "E",
    instruction:
      "Look for upside the proposer is missing. What happens if this works better than expected? What adjacent wins does it unlock? What would be the bold version of this idea?",
  },
  {
    name: "The Outsider",
    shortName: "O",
    instruction:
      "You have zero context about this product, team, or domain. Read the proposal cold. Catch the curse of knowledge — flag anything that would confuse or surprise someone new.",
  },
  {
    name: "The Executor",
    shortName: "X",
    instruction:
      "Only care about what the team does Monday morning. If the first concrete step isn't clear, say so. No philosophy, no 'it depends' — give a concrete path or reject.",
  },
];

function renderLensPrompt(
  lens: CouncilLens,
  question: string,
  context?: string
): Message[] {
  const contextBlock = context ? `\n\nCONTEXT:\n${context}` : "";
  return [
    {
      role: "system",
      content: `You are a council advisor with a specific thinking lens: ${lens.name}.\n\nYour job: respond to the question below ONLY through this lens:\n\n${lens.instruction}\n\nRules:\n- Stay in lens. Do not give a balanced view — other advisors cover other angles.\n- 200 words max.\n- Concrete > abstract. Name specific things.\n- No preamble. Start with the substance.`,
    },
    {
      role: "user",
      content: `QUESTION:\n${question}${contextBlock}`,
    },
  ];
}

function renderReviewPrompt(
  reviewerShort: string,
  anonymized: Array<{ label: string; content: string }>,
  question: string
): Message[] {
  const block = anonymized
    .map((a) => `=== Response ${a.label} ===\n${a.content}`)
    .join("\n\n");
  return [
    {
      role: "system",
      content: `You are peer-reviewer ${reviewerShort} on a decision-making council. You will read 5 anonymous responses to the same question and answer 3 questions.\n\nRules:\n- Judge on merit. You do not know who wrote what.\n- Be specific. Reference responses by letter (A/B/C/D/E).\n- 150 words max total.`,
    },
    {
      role: "user",
      content: `QUESTION the advisors were asked:\n${question}\n\n${block}\n\nAnswer these three, in order, each one clearly labelled:\n\nSTRONGEST: which response is strongest and why?\nBIGGEST_BLIND_SPOT: which response has the biggest blind spot?\nWHAT_ALL_FIVE_MISSED: what did all five miss?`,
    },
  ];
}

function renderChairmanPrompt(
  question: string,
  lenses: LensResponse[],
  reviews: ReviewResponse[]
): Message[] {
  const lensBlock = lenses
    .map((l) => `--- ${l.lens} ---\n${l.content}`)
    .join("\n\n");
  const reviewBlock = reviews
    .map(
      (r) =>
        `--- Reviewer ${r.reviewer} ---\nStrongest: ${r.strongest}\nBlind spot: ${r.biggestBlindSpot}\nAll five missed: ${r.whatAllFiveMissed}`
    )
    .join("\n\n");
  return [
    {
      role: "system",
      content: `You are the council chairman. You have 5 advisor responses and 5 peer reviews. Produce a single verdict.\n\nRules:\n- Be decisive. "It depends" is a cop-out — pick a path.\n- Quote specifics from the advisors/reviewers where helpful.\n- Do not add new opinions; synthesize what's already been said.`,
    },
    {
      role: "user",
      content: `QUESTION:\n${question}\n\nADVISORS:\n${lensBlock}\n\nPEER REVIEWS:\n${reviewBlock}\n\nProduce a verdict with exactly these five sections, each labelled on its own line:\n\nWHERE_AGREES: (where do multiple advisors converge independently?)\nWHERE_CLASHES: (genuine disagreements — present, don't smooth over)\nBLIND_SPOTS_CAUGHT: (things only peer review surfaced — the most valuable part)\nRECOMMENDATION: (one clear, direct answer)\nONE_THING_TO_DO_FIRST: (single concrete next step — not a list)`,
    },
  ];
}

function getContent(result: InvokeResult): string {
  const c = result.choices?.[0]?.message?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c.map((p) => ("text" in p ? p.text : "")).join("\n");
  }
  return "";
}

function parseReviewResponse(raw: string, reviewer: string): ReviewResponse {
  const pick = (label: string) => {
    const re = new RegExp(`${label}:?\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, "i");
    return (raw.match(re)?.[1] ?? "").trim();
  };
  return {
    reviewer,
    strongest: pick("STRONGEST") || pick("Strongest"),
    biggestBlindSpot: pick("BIGGEST_BLIND_SPOT") || pick("Biggest blind spot"),
    whatAllFiveMissed:
      pick("WHAT_ALL_FIVE_MISSED") || pick("What all five missed"),
    raw,
  };
}

function parseVerdict(raw: string): CouncilVerdict {
  const pick = (label: string) => {
    const re = new RegExp(`${label}:?\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, "i");
    return (raw.match(re)?.[1] ?? "").trim();
  };
  return {
    whereAgrees: pick("WHERE_AGREES"),
    whereClashes: pick("WHERE_CLASHES"),
    blindSpotsCaught: pick("BLIND_SPOTS_CAUGHT"),
    recommendation: pick("RECOMMENDATION"),
    oneThingToDoFirst: pick("ONE_THING_TO_DO_FIRST"),
    raw,
  };
}

/** Deterministic shuffle using a simple LCG so tests can fix the seed. */
function shuffle<T>(arr: T[], seed = Date.now()): T[] {
  const out = arr.slice();
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type RunCouncilOptions = {
  question: string;
  context?: string;
  lenses?: CouncilLens[];
  withPeerReview?: boolean;
  llmClient?: LlmClient;
  shuffleSeed?: number;
  onProgress?: (step: string) => void;
};

/**
 * Run a council deliberation. Returns the full trace.
 *
 * Cost budget: `lenses.length` (poll) + `lenses.length` (peer review) + 1 (chairman).
 * With 5 lenses + peer review, that's 11 Gemini calls. Don't call this from
 * the customer conversation path.
 */
export async function runCouncil(opts: RunCouncilOptions): Promise<CouncilResult> {
  const start = Date.now();
  const lenses = opts.lenses ?? STANDARD_LENSES;
  const withPeer = opts.withPeerReview !== false;
  const llm = opts.llmClient ?? defaultLlmClient;
  const emit = opts.onProgress ?? (() => {});
  let calls = 0;

  // Phase 1 — poll each lens
  emit(`Phase 1: polling ${lenses.length} lenses`);
  const polls: LensResponse[] = [];
  for (const lens of lenses) {
    const res = await llm({ messages: renderLensPrompt(lens, opts.question, opts.context), maxTokens: 600 });
    calls++;
    polls.push({ lens: lens.name, shortName: lens.shortName, content: getContent(res) });
  }

  // Phase 2 — peer review (skipped if disabled or <2 lenses)
  const reviews: ReviewResponse[] = [];
  if (withPeer && polls.length >= 2) {
    emit(`Phase 2: anonymous peer review`);
    const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const shuffled = shuffle(polls, opts.shuffleSeed).map((p, i) => ({
      label: labels[i]!,
      content: p.content,
    }));
    for (const reviewerLabel of shuffled.map((s) => s.label)) {
      const res = await llm({
        messages: renderReviewPrompt(reviewerLabel, shuffled, opts.question),
        maxTokens: 500,
      });
      calls++;
      reviews.push(parseReviewResponse(getContent(res), reviewerLabel));
    }
  }

  // Phase 3 — chairman verdict
  emit(`Phase 3: chairman verdict`);
  const chairmanRes = await llm({
    messages: renderChairmanPrompt(opts.question, polls, reviews),
    maxTokens: 900,
  });
  calls++;
  const verdict = parseVerdict(getContent(chairmanRes));

  return {
    question: opts.question,
    lenses: polls,
    reviews,
    verdict,
    stats: {
      totalLlmCalls: calls,
      durationMs: Date.now() - start,
    },
  };
}

/** Render a CouncilResult as a human-readable markdown report. */
export function renderCouncilMarkdown(result: CouncilResult): string {
  const lines: string[] = [];
  lines.push(`# Council Verdict`);
  lines.push("");
  lines.push(`> **Question:** ${result.question}`);
  lines.push("");
  lines.push(`> ${result.stats.totalLlmCalls} LLM calls in ${result.stats.durationMs}ms`);
  lines.push("");
  lines.push(`## Recommendation`);
  lines.push("");
  lines.push(result.verdict.recommendation || "_(empty)_");
  lines.push("");
  lines.push(`## One thing to do first`);
  lines.push("");
  lines.push(result.verdict.oneThingToDoFirst || "_(empty)_");
  lines.push("");
  lines.push(`## Where the council agrees`);
  lines.push("");
  lines.push(result.verdict.whereAgrees || "_(empty)_");
  lines.push("");
  lines.push(`## Where the council clashes`);
  lines.push("");
  lines.push(result.verdict.whereClashes || "_(empty)_");
  lines.push("");
  lines.push(`## Blind spots caught by peer review`);
  lines.push("");
  lines.push(result.verdict.blindSpotsCaught || "_(empty)_");
  lines.push("");
  lines.push(`## Advisor responses`);
  for (const l of result.lenses) {
    lines.push("");
    lines.push(`### ${l.lens}`);
    lines.push("");
    lines.push(l.content);
  }
  if (result.reviews.length > 0) {
    lines.push("");
    lines.push(`## Peer reviews (anonymized)`);
    for (const r of result.reviews) {
      lines.push("");
      lines.push(`### Reviewer ${r.reviewer}`);
      lines.push(`- **Strongest:** ${r.strongest}`);
      lines.push(`- **Biggest blind spot:** ${r.biggestBlindSpot}`);
      lines.push(`- **What all missed:** ${r.whatAllFiveMissed}`);
    }
  }
  return lines.join("\n");
}
