/**
 * Tests for the operator-takeover (`aiDisabled`) gating logic.
 *
 * The actual gating is inlined in `lineWebhook.ts` and `routers.ts` for
 * minimal blast radius. Following the repo convention in `line-webhook.test.ts`,
 * we replicate the decision predicates here and assert they hold for every
 * conversation state the webhook/router will hit.
 *
 * What we're locking down:
 *   - aiDisabled=1 ALWAYS blocks the AI (overrides everything: rich menu,
 *     30-min timeout, "new inquiry" reactivation, etc.)
 *   - aiDisabled=0 + human_handoff keeps the existing temporary-handoff
 *     behavior (rich menu / new inquiry / expired timeout reactivate AI)
 *   - aiDisabled=0 + status=active → AI replies normally
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { isOperator, getOperatorUserIds, parseOperatorCommand } from "./lineUtils";
import { validateLLMOutput } from "./security";

// Mirror of the lineWebhook.ts + routers.ts gating logic. If the webhook
// changes, update this predicate to match — both must stay in lockstep.
type ConvLike = {
  status: "active" | "closed" | "follow_up" | "human_handoff";
  aiDisabled: number;
  updatedAt: Date;
};

function decideAiGate(
  conv: ConvLike | undefined | null,
  userMessage: string,
  now: number = Date.now()
): "ai_replies" | "ai_silent_operator_lock" | "ai_silent_handoff" | "ai_replies_handoff_reactivated" {
  if (!conv) return "ai_replies"; // new conversation, AI replies

  // OPERATOR LOCK — highest priority, never bypassed
  if (conv.aiDisabled === 1) return "ai_silent_operator_lock";

  if (conv.status === "human_handoff") {
    const isRichMenuAction = /看車庫存|預約賞車|關於崑家|最新優惠/.test(userMessage);
    const isNewInquiry = /我想詢問這台車|我想了解/.test(userMessage);
    const handoffAge = now - conv.updatedAt.getTime();
    const HANDOFF_TIMEOUT_MS = 30 * 60 * 1000;
    const isHandoffExpired = handoffAge > HANDOFF_TIMEOUT_MS;

    if (isRichMenuAction || isNewInquiry || isHandoffExpired) {
      return "ai_replies_handoff_reactivated";
    }
    return "ai_silent_handoff";
  }

  return "ai_replies";
}

describe("aiDisabled operator-takeover gating", () => {
  describe("aiDisabled=1 overrides everything (permanent lock)", () => {
    it("blocks AI even on a brand-new user message", () => {
      const conv: ConvLike = { status: "active", aiDisabled: 1, updatedAt: new Date() };
      expect(decideAiGate(conv, "你好，想看看車")).toBe("ai_silent_operator_lock");
    });

    it("blocks AI even when user taps a rich-menu button", () => {
      const conv: ConvLike = { status: "active", aiDisabled: 1, updatedAt: new Date() };
      expect(decideAiGate(conv, "看車庫存")).toBe("ai_silent_operator_lock");
    });

    it("blocks AI even when user says '我想詢問這台車' (new inquiry)", () => {
      const conv: ConvLike = { status: "active", aiDisabled: 1, updatedAt: new Date() };
      expect(decideAiGate(conv, "我想詢問這台車")).toBe("ai_silent_operator_lock");
    });

    it("blocks AI even after the 30-min handoff timeout would expire", () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const conv: ConvLike = { status: "human_handoff", aiDisabled: 1, updatedAt: oneHourAgo };
      expect(decideAiGate(conv, "你好")).toBe("ai_silent_operator_lock");
    });

    it("blocks AI for an indefinitely old conversation (no auto-recovery ever)", () => {
      const daysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const conv: ConvLike = { status: "human_handoff", aiDisabled: 1, updatedAt: daysAgo };
      expect(decideAiGate(conv, "我想了解")).toBe("ai_silent_operator_lock");
    });
  });

  describe("aiDisabled=0 preserves the existing temporary-handoff flow", () => {
    it("AI silent within 30-min window on plain message", () => {
      const recent = new Date(Date.now() - 5 * 60 * 1000);
      const conv: ConvLike = { status: "human_handoff", aiDisabled: 0, updatedAt: recent };
      expect(decideAiGate(conv, "還在嗎")).toBe("ai_silent_handoff");
    });

    it("rich-menu action reactivates AI (within window)", () => {
      const recent = new Date(Date.now() - 5 * 60 * 1000);
      const conv: ConvLike = { status: "human_handoff", aiDisabled: 0, updatedAt: recent };
      expect(decideAiGate(conv, "看車庫存")).toBe("ai_replies_handoff_reactivated");
    });

    it("new-inquiry phrase reactivates AI (within window)", () => {
      const recent = new Date(Date.now() - 5 * 60 * 1000);
      const conv: ConvLike = { status: "human_handoff", aiDisabled: 0, updatedAt: recent };
      expect(decideAiGate(conv, "我想了解")).toBe("ai_replies_handoff_reactivated");
    });

    it("expired 30-min handoff reactivates AI", () => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const conv: ConvLike = { status: "human_handoff", aiDisabled: 0, updatedAt: hourAgo };
      expect(decideAiGate(conv, "你好")).toBe("ai_replies_handoff_reactivated");
    });
  });

  describe("active conversation, AI responds normally", () => {
    it("status=active + aiDisabled=0 → AI replies", () => {
      const conv: ConvLike = { status: "active", aiDisabled: 0, updatedAt: new Date() };
      expect(decideAiGate(conv, "有什麼車在賣")).toBe("ai_replies");
    });

    it("no conversation (first contact) → AI replies", () => {
      expect(decideAiGate(null, "你好")).toBe("ai_replies");
    });
  });
});

describe("operatorReply LINE session-id parsing", () => {
  // operatorReply extracts the LINE userId from sessionId="line-<userId>".
  // Lock down that parse contract.
  function extractLineUserId(sessionId: string): string | null {
    if (!sessionId.startsWith("line-")) return null;
    return sessionId.slice("line-".length) || null;
  }

  it("extracts userId from 'line-U1234...' session id", () => {
    expect(extractLineUserId("line-U1234567890abcdef")).toBe("U1234567890abcdef");
  });

  it("returns null for non-line sessions (web, fb, etc.)", () => {
    expect(extractLineUserId("web-abc123")).toBeNull();
    expect(extractLineUserId("facebook-xyz")).toBeNull();
  });

  it("returns null for empty line- prefix", () => {
    expect(extractLineUserId("line-")).toBeNull();
  });
});

describe("handoff trigger predicates (set-points that auto-flip aiDisabled)", () => {
  // Mirrors of the inline patterns in lineWebhook.ts. If these predicates
  // change, the test fails — protecting the contract that "any of these inputs
  // permanently locks the AI" (per Jerry's 2026-04-15 requirement).

  describe("'wants real human' pattern (lineWebhook.ts ~885)", () => {
    const humanHandoffPattern = /想跟真人|想和真人|找真人|要真人|真人客服|人工客服|轉真人|不想跟機器人|找人處理|我想跟真人業務聊聊這台車/;

    it.each([
      "我想跟真人聊",
      "想和真人講話",
      "可以幫我找真人嗎",
      "我要真人，不要機器人",
      "請接真人客服",
      "我要找人工客服",
      "幫我轉真人",
      "我不想跟機器人聊",
      "麻煩找人處理一下",
      "我想跟真人業務聊聊這台車",
    ])("matches: %s", (msg) => {
      expect(humanHandoffPattern.test(msg)).toBe(true);
    });

    it.each([
      "你好，我想看車",
      "這台車多少錢",
      "BMW X1 還在嗎",
    ])("does NOT match safe message: %s", (msg) => {
      expect(humanHandoffPattern.test(msg)).toBe(false);
    });
  });

  describe("flexible-time silent handoff pattern (lineWebhook.ts ~1174)", () => {
    const flexTimePattern = /時間彈性|你們幫我安排|幫我安排就好|幫我安排時間|都可以.*安排|你安排/;

    it.each([
      "我時間彈性",
      "你們幫我安排",
      "幫我安排就好",
      "幫我安排時間",
      "都可以，你們安排",
      "你安排吧",
    ])("matches: %s", (msg) => {
      expect(flexTimePattern.test(msg)).toBe(true);
    });

    it("does NOT match plain availability questions", () => {
      expect(flexTimePattern.test("你們幾點到幾點")).toBe(false);
    });
  });

  describe("AI [HUMAN_HANDOFF] token detection (lineWebhook.ts ~1431)", () => {
    function detectAndStripHandoff(replyText: string): { isHandoff: boolean; cleaned: string } {
      const isHandoff = replyText.includes("[HUMAN_HANDOFF]");
      const cleaned = replyText.replace(/\s*\[HUMAN_HANDOFF\]\s*/g, "").trim();
      return { isHandoff, cleaned };
    }

    it("detects + strips a single [HUMAN_HANDOFF] token", () => {
      const r = detectAndStripHandoff("我幫你查 [HUMAN_HANDOFF]");
      expect(r.isHandoff).toBe(true);
      expect(r.cleaned).toBe("我幫你查");
    });

    it("strips multiple occurrences cleanly", () => {
      const r = detectAndStripHandoff("[HUMAN_HANDOFF] 嗨 [HUMAN_HANDOFF]");
      expect(r.isHandoff).toBe(true);
      expect(r.cleaned).toBe("嗨");
    });

    it("does not flag normal replies as handoff", () => {
      const r = detectAndStripHandoff("這台 BMW 還在喔！");
      expect(r.isHandoff).toBe(false);
      expect(r.cleaned).toBe("這台 BMW 還在喔！");
    });
  });

  describe("uncertainty-detection backup trigger (lineWebhook.ts ~1440)", () => {
    const uncertaintyPattern = /我幫你確認一下|我幫你問問|我幫你查|我不太確定|這個我要確認|我幫您確認|我幫您查/;

    it.each([
      "我幫你確認一下",
      "我幫你問問業務",
      "這個我要確認",
      "我不太確定耶",
    ])("flags uncertain phrase: %s", (msg) => {
      expect(uncertaintyPattern.test(msg)).toBe(true);
    });

    it("does NOT flag confident replies", () => {
      expect(uncertaintyPattern.test("這台車現在還在！")).toBe(false);
    });
  });
});

describe("operator command parser (lineUtils.parseOperatorCommand)", () => {
  it("returns null for messages without a command prefix", () => {
    expect(parseOperatorCommand("你好")).toBeNull();
    expect(parseOperatorCommand("")).toBeNull();
  });

  it("any prefixed-but-unknown command returns 'help' (not null)", () => {
    // Critical: if an operator typos a command, we must NOT fall through to
    // customer-flow handling. Returning 'help' guarantees the slash-command
    // handler always intercepts and never accidentally treats the operator's
    // command as a sales message.
    expect(parseOperatorCommand("/")).toEqual({ kind: "help" });
    expect(parseOperatorCommand("/foo")).toEqual({ kind: "help" });
    expect(parseOperatorCommand("/dev")).toEqual({ kind: "help" });
  });

  it("parses /lock with no target → most-recent intent", () => {
    expect(parseOperatorCommand("/lock")).toEqual({ kind: "lock", target: null });
    expect(parseOperatorCommand("!lock")).toEqual({ kind: "lock", target: null });
  });

  it("parses /lock <last8>", () => {
    expect(parseOperatorCommand("/lock abc12345")).toEqual({ kind: "lock", target: "abc12345" });
    expect(parseOperatorCommand("/lock   abc12345  ")).toEqual({ kind: "lock", target: "abc12345" });
  });

  it("parses /unlock <last8>", () => {
    expect(parseOperatorCommand("/unlock xyz")).toEqual({ kind: "unlock", target: "xyz" });
  });

  it("parses /list and /ls (with optional 'full' modifier)", () => {
    expect(parseOperatorCommand("/list")).toEqual({ kind: "list", target: null });
    expect(parseOperatorCommand("/ls")).toEqual({ kind: "list", target: null });
    expect(parseOperatorCommand("/list full")).toEqual({ kind: "list", target: "full" });
  });

  it("parses /status <last8>", () => {
    expect(parseOperatorCommand("/status abc")).toEqual({ kind: "status", target: "abc" });
  });

  it("parses /help and aliases", () => {
    expect(parseOperatorCommand("/help")).toEqual({ kind: "help" });
    expect(parseOperatorCommand("/?")).toEqual({ kind: "help" });
    expect(parseOperatorCommand("/？")).toEqual({ kind: "help" });
  });

  it("accepts Chinese command names", () => {
    expect(parseOperatorCommand("/鎖")).toEqual({ kind: "lock", target: null });
    expect(parseOperatorCommand("/鎖定 abc")).toEqual({ kind: "lock", target: "abc" });
    expect(parseOperatorCommand("/接手")).toEqual({ kind: "lock", target: null });
    expect(parseOperatorCommand("/解鎖 abc")).toEqual({ kind: "unlock", target: "abc" });
    expect(parseOperatorCommand("/清單")).toEqual({ kind: "list", target: null });
  });

  it("does NOT match messages without / or ! prefix (no false positives)", () => {
    expect(parseOperatorCommand("lock abc12345")).toBeNull();
    expect(parseOperatorCommand("接手這位客人")).toBeNull();
  });

  it("accepts full-width ／and ！ prefixes (Chinese IME default)", () => {
    expect(parseOperatorCommand("／lock")).toEqual({ kind: "lock", target: null });
    expect(parseOperatorCommand("！list")).toEqual({ kind: "list", target: null });
  });
});

describe("isOperator whitelist matching (lineUtils.isOperator)", () => {
  // Save + restore env between tests
  const saved = {
    op: process.env.LINE_OPERATOR_USER_IDS,
    owner: process.env.LINE_OWNER_USER_ID,
    extra: process.env.LINE_ADDITIONAL_NOTIFY_USER_IDS,
  };
  beforeEach(() => {
    delete process.env.LINE_OPERATOR_USER_IDS;
    delete process.env.LINE_OWNER_USER_ID;
    delete process.env.LINE_ADDITIONAL_NOTIFY_USER_IDS;
  });
  afterAll(() => {
    if (saved.op) process.env.LINE_OPERATOR_USER_IDS = saved.op; else delete process.env.LINE_OPERATOR_USER_IDS;
    if (saved.owner) process.env.LINE_OWNER_USER_ID = saved.owner; else delete process.env.LINE_OWNER_USER_ID;
    if (saved.extra) process.env.LINE_ADDITIONAL_NOTIFY_USER_IDS = saved.extra; else delete process.env.LINE_ADDITIONAL_NOTIFY_USER_IDS;
  });

  it("returns false when no env is configured", () => {
    expect(isOperator("Uany")).toBe(false);
    expect(getOperatorUserIds()).toEqual([]);
  });

  it("matches against LINE_OPERATOR_USER_IDS (preferred)", () => {
    process.env.LINE_OPERATOR_USER_IDS = "Umegan,Uowner";
    expect(isOperator("Umegan")).toBe(true);
    expect(isOperator("Uother")).toBe(false);
  });

  it("falls back to LINE_OWNER_USER_ID", () => {
    process.env.LINE_OWNER_USER_ID = "Uowner123";
    expect(isOperator("Uowner123")).toBe(true);
  });

  it("falls back to LINE_ADDITIONAL_NOTIFY_USER_IDS", () => {
    process.env.LINE_ADDITIONAL_NOTIFY_USER_IDS = "Ujerry, Uassist";
    expect(isOperator("Ujerry")).toBe(true);
    expect(isOperator("Uassist")).toBe(true);
  });

  it("merges all three sources with dedup", () => {
    process.env.LINE_OPERATOR_USER_IDS = "Umegan";
    process.env.LINE_OWNER_USER_ID = "Umegan"; // duplicate
    process.env.LINE_ADDITIONAL_NOTIFY_USER_IDS = "Ujerry";
    const ids = getOperatorUserIds();
    expect(ids.sort()).toEqual(["Ujerry", "Umegan"]);
  });

  it("returns false for null/empty userId", () => {
    process.env.LINE_OPERATOR_USER_IDS = "Umegan";
    expect(isOperator(null)).toBe(false);
    expect(isOperator(undefined)).toBe(false);
    expect(isOperator("")).toBe(false);
  });
});

describe("hallucinated-vehicle guardrail (security.validateLLMOutput)", () => {
  // Mirror of detectHallucinatedVehicles + critical-fail logic. We test via the
  // public validateLLMOutput because the helper is module-private.
  // Lock down: any AI mention of common popular Taiwan-market cars NOT in our
  // 11-car inventory must trigger a critical violation.
  const REAL_INVENTORY = [
    "Mazda CX-5", "BMW X1", "Mazda CX-30", "Toyota Corolla Cross",
    "MG G50 Plus", "Toyota Vios", "Kia Stonic", "Kia Carens",
    "Volkswagen Tiguan", "Hyundai Tucson", "Mitsubishi Colt Plus",
  ];

  it("flags Toyota RAV4 (the actual bug Jerry reported)", () => {
    const result = validateLLMOutput(
      "我們目前有Honda CR-V Toyota RAV4 Nissan Kicks這些車款",
      { inventory: REAL_INVENTORY }
    );
    expect(result.violations.some(v => v.startsWith('hallucinated_vehicle:'))).toBe(true);
    expect(result.safe).toBe(false); // critical → caller falls back to rule-based
  });

  it("flags Honda CR-V", () => {
    const result = validateLLMOutput("我推薦你看 Honda CR-V", { inventory: REAL_INVENTORY });
    expect(result.violations.some(v => v.includes('crv') || v.includes('cr-v'))).toBe(true);
  });

  it("does NOT flag cars actually in our inventory", () => {
    const result = validateLLMOutput(
      "Toyota Corolla Cross 是熱門車款，我們也有 Toyota Vios",
      { inventory: REAL_INVENTORY }
    );
    expect(result.violations.filter(v => v.startsWith('hallucinated_vehicle:'))).toEqual([]);
  });

  it("does not false-positive on the brand alone (e.g. just 'Toyota')", () => {
    const result = validateLLMOutput(
      "Toyota 是日本品牌，品質好",
      { inventory: REAL_INVENTORY }
    );
    expect(result.violations.filter(v => v.startsWith('hallucinated_vehicle:'))).toEqual([]);
  });

  it("flags multiple ghosts in one reply", () => {
    const result = validateLLMOutput(
      "你可以看 Camry、Civic、Altis 這些選擇",
      { inventory: REAL_INVENTORY }
    );
    const ghosts = result.violations.filter(v => v.startsWith('hallucinated_vehicle:'));
    expect(ghosts.length).toBeGreaterThanOrEqual(2);
  });
});

describe("trade-in / old-car estimation trigger (standard template)", () => {
  // The "🔄 舊車想換這台" quick-reply chip sends this exact text.
  // Template written by Jerry 2026-04-16 — bot must short-circuit LLM entirely
  // and return the formal estimation request template. Lock down the regex
  // that gates this short-circuit.
  const tradeInPattern = /我有一台舊車|舊車想換|舊車.*換新|換車.*估|估價.*舊車|舊車.*估價|折讓|我的車.*換|目前開.*換|現在開.*換|想換車|以舊換新/;

  it.each([
    "我有一台舊車想換新車，可以估價嗎？", // the quick-reply chip text
    "舊車想換",
    "舊車換新",
    "換車估價",
    "估價舊車",
    "舊車估價",
    "折讓",
    "我的車想換",
    "目前開一台Civic想換",
    "現在開Altis想換",
    "以舊換新",
    "想換車",
  ])("matches: %s", (msg) => {
    expect(tradeInPattern.test(msg)).toBe(true);
  });

  it.each([
    "你好",                         // plain greeting
    "我想看車",                     // viewing intent, not trade-in
    "這台多少錢",                   // price query
    "預約看車",                     // appointment
    "有什麼車可以推薦",             // recommendation
  ])("does NOT match non-trade-in message: %s", (msg) => {
    expect(tradeInPattern.test(msg)).toBe(false);
  });
});

describe("/lock self-protection (operator can't lock their own conversation)", () => {
  // Mirror of the selection logic in lineWebhook.ts handleOperatorCommand.
  // This is the UX bug Jerry hit: running `/lock` (no target) resolved to the
  // "most recent active LINE conversation" which happened to be HIS OWN session,
  // silencing the bot for him too.

  type ConvLike = {
    id: number;
    sessionId: string;
    aiDisabled: number;
  };

  function pickLockCandidate(
    items: ConvLike[],
    operatorUserId: string
  ): ConvLike | undefined {
    const operatorSessionId = `line-${operatorUserId}`;
    return items.find(c => c.aiDisabled !== 1 && c.sessionId !== operatorSessionId);
  }

  function wouldReject(target: ConvLike, operatorUserId: string): boolean {
    return target.sessionId === `line-${operatorUserId}`;
  }

  it("skips operator's own conversation when /lock has no target", () => {
    const items: ConvLike[] = [
      { id: 1, sessionId: "line-Ujerry", aiDisabled: 0 }, // Jerry himself
      { id: 2, sessionId: "line-Ucust1", aiDisabled: 0 }, // real customer
    ];
    const picked = pickLockCandidate(items, "Ujerry");
    expect(picked?.id).toBe(2);
    expect(picked?.sessionId).not.toBe("line-Ujerry");
  });

  it("rejects /lock with explicit target pointing to operator themselves", () => {
    const operatorUserId = "Ujerry";
    const selfConv: ConvLike = { id: 1, sessionId: "line-Ujerry", aiDisabled: 0 };
    expect(wouldReject(selfConv, operatorUserId)).toBe(true);
  });

  it("accepts /lock against any OTHER conversation", () => {
    const operatorUserId = "Ujerry";
    const otherConv: ConvLike = { id: 2, sessionId: "line-Ucustomer", aiDisabled: 0 };
    expect(wouldReject(otherConv, operatorUserId)).toBe(false);
  });

  it("returns undefined if only candidate is the operator", () => {
    const items: ConvLike[] = [
      { id: 1, sessionId: "line-Ujerry", aiDisabled: 0 },
    ];
    expect(pickLockCandidate(items, "Ujerry")).toBeUndefined();
  });

  it("returns undefined if all non-self conversations are already locked", () => {
    const items: ConvLike[] = [
      { id: 1, sessionId: "line-Ujerry", aiDisabled: 0 },   // self (skipped)
      { id: 2, sessionId: "line-Ucust1", aiDisabled: 1 },   // already locked
    ];
    expect(pickLockCandidate(items, "Ujerry")).toBeUndefined();
  });
});

describe("new-customer notification gating", () => {
  // Lock down the gate predicate: notification fires ONCE per conversation,
  // on the FIRST user message (history.length === 1 right after save).
  function shouldNotifyNewCustomer(historyLengthAfterSave: number): boolean {
    return historyLengthAfterSave === 1;
  }

  it("fires on the very first message", () => {
    expect(shouldNotifyNewCustomer(1)).toBe(true);
  });

  it("does NOT re-fire on later messages from the same customer", () => {
    expect(shouldNotifyNewCustomer(2)).toBe(false);
    expect(shouldNotifyNewCustomer(5)).toBe(false);
    expect(shouldNotifyNewCustomer(50)).toBe(false);
  });

  it("does not fire on zero-history (impossible state — message always saved before check)", () => {
    expect(shouldNotifyNewCustomer(0)).toBe(false);
  });
});

describe("operator_takeover postback data format", () => {
  // The postback button on the handoff/lead Flex card sends:
  //   action=operator_takeover&convId=<id>
  // Lock down both the URL-encoding shape AND the conversation-id parse.
  function parsePostback(data: string): { action: string | null; convId: number } {
    const params = new URLSearchParams(data);
    return {
      action: params.get("action"),
      convId: parseInt(params.get("convId") || "0", 10),
    };
  }

  it("parses action + convId from the buttons we render", () => {
    const r = parsePostback("action=operator_takeover&convId=42");
    expect(r.action).toBe("operator_takeover");
    expect(r.convId).toBe(42);
  });

  it("returns falsy convId (handler rejects) when missing or non-numeric", () => {
    // The handler uses `if (!targetConvId)` to reject — so 0, NaN, undefined
    // all short-circuit. We just lock down the falsy contract.
    expect(parsePostback("action=operator_takeover").convId).toBeFalsy();
    expect(parsePostback("action=operator_takeover&convId=").convId).toBeFalsy();
    expect(parsePostback("action=operator_takeover&convId=abc").convId).toBeFalsy();
  });

  it("doesn't accept other actions as takeover", () => {
    expect(parsePostback("action=appointment_datetime&convId=42").action).not.toBe("operator_takeover");
  });
});

describe("operatorReply LINE-push status semantics", () => {
  // Mirror of the linePushStatus state machine in adminRoutes.ts operatorReply.
  // Ensures the 4-state contract (sent / failed / no_token / skipped) maps
  // correctly so the frontend can reliably distinguish "ok to lock" vs "retry".
  type Channel = "line" | "web" | "facebook" | "youtube" | "other";
  type Status = "sent" | "failed" | "no_token" | "skipped";

  function decideStatus(channel: Channel, sessionId: string, hasToken: boolean, pushOk: boolean | null): Status {
    if (!(channel === "line" && sessionId.startsWith("line-"))) return "skipped";
    const userId = sessionId.slice("line-".length);
    if (!hasToken || !userId) return "no_token";
    if (pushOk === true) return "sent";
    return "failed";
  }

  it("non-LINE channel → skipped (operator handles delivery)", () => {
    expect(decideStatus("web", "web-xyz", true, null)).toBe("skipped");
    expect(decideStatus("facebook", "fb-1", true, null)).toBe("skipped");
  });

  it("LINE without token → no_token", () => {
    expect(decideStatus("line", "line-Uabc", false, null)).toBe("no_token");
  });

  it("LINE with empty user id → no_token", () => {
    expect(decideStatus("line", "line-", true, null)).toBe("no_token");
  });

  it("LINE push 200 ok → sent", () => {
    expect(decideStatus("line", "line-Uabc", true, true)).toBe("sent");
  });

  it("LINE push non-2xx or thrown → failed", () => {
    expect(decideStatus("line", "line-Uabc", true, false)).toBe("failed");
  });

  it("delivered = true ONLY for 'sent' or 'skipped' (the lock guard)", () => {
    const delivered = (s: Status) => s === "sent" || s === "skipped";
    expect(delivered("sent")).toBe(true);
    expect(delivered("skipped")).toBe(true);
    expect(delivered("failed")).toBe(false);
    expect(delivered("no_token")).toBe(false);
  });
});
