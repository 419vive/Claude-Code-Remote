/**
 * Live-equivalent end-to-end simulation of the 4 conversation scenarios
 * Jerry asked me to verify on 2026-04-24.
 *
 * Runs the EXACT code paths the production LINE webhook runs, except
 * the actual LLM API call (which needs Gemini). For the LLM scenarios,
 * we print the FULL system-prompt instruction the LLM would receive,
 * so Jerry can see what wording the LLM is being told to use.
 *
 * Run: tsx server/_endToEndTest.ts
 */

import { detectCustomerIntents, buildIntentInstructions, detectVehicleFromMessage, buildVehicleIndex } from "./vehicleDetectionService";
import { generateRuleBasedReply } from "./ruleBasedReply";

const inventory = [
  { id: 1, brand: "Toyota", model: "Corolla Cross GR Sport", modelYear: 2024, priceDisplay: "85萬", price: 85, status: "available" },
  { id: 2, brand: "Mazda", model: "CX-5", modelYear: 2021, priceDisplay: "55萬", price: 55, status: "available" },
];
const vIndex = buildVehicleIndex(inventory);

const scenarios = [
  { id: 1, label: "Trade-in inquiry", message: "我有舊車想估價" },
  { id: 2, label: "Trade-in inquiry (variant)", message: "車換車可以嗎" },
  { id: 3, label: "Price negotiation step 1", message: "這台可以再便宜嗎?" },
  { id: 4, label: "Price negotiation step 2 (customer named price)", message: "60萬可以嗎" },
  { id: 5, label: "Price negotiation '可以殺多少'", message: "可以殺多少" },
  { id: 6, label: "Price negotiation '有議價空間嗎'", message: "有議價空間嗎" },
];

console.log("\n========================================================");
console.log("END-TO-END SCRIPT VERIFICATION — 2026-04-24");
console.log("========================================================\n");

for (const sc of scenarios) {
  console.log(`\n━━━ Scenario ${sc.id}: ${sc.label} ━━━`);
  console.log(`📨 Customer says: "${sc.message}"`);

  const intents = detectCustomerIntents(sc.message);
  const detection = detectVehicleFromMessage(sc.message, inventory, [], vIndex);
  console.log(`🔍 Intents detected: [${intents.join(", ") || "none"}]`);
  console.log(`🚗 Vehicle detected: ${detection.vehicle ? `${detection.vehicle.brand} ${detection.vehicle.model}` : "none"} (type=${detection.type})`);

  const llmInstruction = buildIntentInstructions(intents, sc.message, "人客", null, detection.vehicle);
  if (llmInstruction) {
    console.log(`\n📋 LLM gets this instruction (verbatim — what the live LLM is told):`);
    console.log("─".repeat(56));
    console.log(llmInstruction);
    console.log("─".repeat(56));
  }

  const ruleReply = generateRuleBasedReply({
    userMessage: sc.message,
    greeting: "人客",
    detection,
    intents,
    customerContact: null,
  });
  console.log(`\n💬 Rule-based fallback (what fires if LLM fails / is blocked):`);
  console.log(`>>> ${ruleReply.replace(/\n/g, "\n>>> ")}`);
  console.log("");
}

console.log("\n========================================================");
console.log("END");
console.log("========================================================\n");
