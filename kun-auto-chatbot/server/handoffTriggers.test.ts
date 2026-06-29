import { describe, it, expect } from "vitest";
import { detectCriticalHandoff } from "./handoffTriggers";
import { detectCustomerIntents } from "./vehicleDetectionService";

// Helper: build signals from a raw message using the REAL intent detector,
// so these tests also verify the wiring assumptions used in lineWebhook.ts.
function fromMessage(message: string, hasVehicle: boolean) {
  return detectCriticalHandoff({
    message,
    intents: detectCustomerIntents(message),
    hasVehicle,
  });
}

describe("detectCriticalHandoff — 殺價/議價 (always critical)", () => {
  it("triggers on 殺價", () => {
    const r = fromMessage("這台可以殺價嗎", true);
    expect(r.triggered).toBe(true);
    expect(r.reason).toBe("殺價議價");
  });

  it("triggers on 議價空間", () => {
    expect(fromMessage("有議價空間嗎？", true).triggered).toBe(true);
  });

  it("triggers on 可以再便宜嗎", () => {
    expect(fromMessage("可以再便宜一點嗎", true).triggered).toBe(true);
  });

  it("triggers on an explicit offer 我出 80 萬", () => {
    expect(fromMessage("我出80萬可以嗎", true).triggered).toBe(true);
  });

  it("triggers even without a detected vehicle (negotiation is unambiguous)", () => {
    expect(fromMessage("可以殺多少", false).triggered).toBe(true);
  });
});

describe("detectCriticalHandoff — 詢價 (critical only with a vehicle)", () => {
  it("triggers on 多少錢 when a vehicle is in context", () => {
    const r = fromMessage("這台多少錢", true);
    expect(r.triggered).toBe(true);
    expect(r.reason).toBe("詢問車價");
  });

  it("triggers on 價格 when a vehicle is in context", () => {
    expect(fromMessage("這台的價格是多少", true).triggered).toBe(true);
  });

  it("does NOT trigger on generic price browsing with no vehicle", () => {
    expect(fromMessage("你們最便宜的車多少錢", false).triggered).toBe(false);
  });
});

describe("detectCriticalHandoff — 問車況 (always critical)", () => {
  it("triggers on 有沒有事故", () => {
    const r = fromMessage("這台有沒有事故", true);
    expect(r.triggered).toBe(true);
    expect(r.reason).toBe("詢問車況");
  });

  it("triggers on 泡水車", () => {
    expect(fromMessage("這是泡水車嗎", true).triggered).toBe(true);
  });

  it("triggers on 認證報告", () => {
    expect(fromMessage("有認證報告可以看嗎", true).triggered).toBe(true);
  });

  it("triggers on 車況", () => {
    expect(fromMessage("車況如何", true).triggered).toBe(true);
  });

  it("triggers on 烤漆/鈑件", () => {
    expect(fromMessage("有重新烤漆過嗎", true).triggered).toBe(true);
  });

  it("triggers even without a detected vehicle (condition phrasing is specific)", () => {
    expect(fromMessage("有沒有泡過水", false).triggered).toBe(true);
  });
});

describe("detectCriticalHandoff — 還在不在 (critical only with a vehicle)", () => {
  it("triggers on 還在嗎 when a vehicle is in context", () => {
    const r = fromMessage("這台還在嗎", true);
    expect(r.triggered).toBe(true);
    expect(r.reason).toBe("詢問是否還在");
  });

  it("triggers on 賣掉了嗎 with a vehicle", () => {
    expect(fromMessage("這台賣掉了嗎", true).triggered).toBe(true);
  });

  it("does NOT trigger on 還在嗎 with no vehicle in context", () => {
    expect(fromMessage("還在嗎", false).triggered).toBe(false);
  });
});

describe("detectCriticalHandoff — NOT critical (AI keeps answering)", () => {
  it("greeting", () => {
    expect(fromMessage("你好", false).triggered).toBe(false);
  });

  it("business hours", () => {
    expect(fromMessage("你們幾點開", false).triggered).toBe(false);
  });

  it("loan / financing is intentionally excluded", () => {
    expect(fromMessage("可以分期嗎", true).triggered).toBe(false);
    expect(fromMessage("貸款利率多少", true).triggered).toBe(false);
  });

  it("how-to-browse", () => {
    expect(fromMessage("怎麼看車", false).triggered).toBe(false);
  });

  it("non-critical specs (mileage / colour / year) stay on the AI", () => {
    expect(fromMessage("里程多少", true).triggered).toBe(false);
    expect(fromMessage("什麼顏色", true).triggered).toBe(false);
    expect(fromMessage("幾年的車", true).triggered).toBe(false);
  });

  it("empty / whitespace message", () => {
    expect(detectCriticalHandoff({ message: "", intents: [], hasVehicle: true }).triggered).toBe(false);
    expect(detectCriticalHandoff({ message: "   ", intents: [], hasVehicle: true }).triggered).toBe(false);
  });

  it("generic 'any other cars' browsing does not match availability", () => {
    expect(fromMessage("還有其他車可以看嗎", false).triggered).toBe(false);
  });
});

describe("detectCriticalHandoff — pure-signal calls (no intent detector)", () => {
  it("respects explicitly-passed price_negotiation intent", () => {
    expect(
      detectCriticalHandoff({ message: "anything", intents: ["price_negotiation"], hasVehicle: false }).reason,
    ).toBe("殺價議價");
  });

  it("pricing without hasVehicle does not trigger", () => {
    expect(
      detectCriticalHandoff({ message: "多少錢", intents: ["pricing"], hasVehicle: false }).triggered,
    ).toBe(false);
  });

  it("pricing with hasVehicle triggers", () => {
    expect(
      detectCriticalHandoff({ message: "多少錢", intents: ["pricing"], hasVehicle: true }).triggered,
    ).toBe(true);
  });
});
