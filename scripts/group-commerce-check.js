// scripts/group-commerce-check.js - Smoke Test & Integrity checks for Group Commerce OS
const path = require('path');

console.log("=== Group Commerce OS Integrity Check ===");

try {
  // 1. Verify file imports
  console.log("1. Verifying file loads...");
  const store = require('../lib/groupCommerce/store');
  const groupRegistry = require('../lib/groupCommerce/groupRegistry');
  const commandRouter = require('../lib/groupCommerce/commandRouter');
  const messageAnalyzer = require('../lib/groupCommerce/messageAnalyzer');
  const catalog = require('../lib/groupCommerce/catalog');
  const ecommerceBridge = require('../lib/groupCommerce/ecommerceBridge');
  const relayPlanner = require('../lib/groupCommerce/relayPlanner');
  const agentRegistry = require('../lib/groupCommerce/agentRegistry');
  const pauseManager = require('../lib/groupCommerce/pauseManager');
  const flowNodes = require('../lib/groupCommerce/flowNodes');

  console.log("✅ All modules imported successfully!");

  // 2. Test Group Registration
  console.log("\n2. Testing Group Registration...");
  const testGroup = {
    groupId: "group-smoke-test",
    groupName: "Smoke Testing Marketplace",
    platform: "whatsapp",
    adminNumbers: ["+923001234567"]
  };
  const registered = groupRegistry.registerGroup(testGroup);
  if (registered.groupId === "group-smoke-test" && registered.groupName === "Smoke Testing Marketplace") {
    console.log("✅ Group Registry operates correctly!");
  } else {
    throw new Error("Group registration returned incorrect values");
  }

  // 3. Test Temporary Pause
  console.log("\n3. Testing Pause timers...");
  pauseManager.pauseGroup("group-smoke-test", 5);
  if (pauseManager.isGroupPaused("group-smoke-test")) {
    console.log("✅ Group paused successfully.");
  } else {
    throw new Error("Group pauseManager failed to set state");
  }

  pauseManager.resumeGroup("group-smoke-test");
  if (!pauseManager.isGroupPaused("group-smoke-test")) {
    console.log("✅ Group resumed successfully.");
  } else {
    throw new Error("Group pauseManager failed to resume state");
  }

  // 4. Test Chat Command Router
  console.log("\n4. Testing command Router execution...");
  const cmdStatus = commandRouter.executeCommand("group-smoke-test", "admin-number", "/status");
  if (cmdStatus.success && cmdStatus.actionTaken === "status_checked") {
    console.log("✅ Command router executed (/status) successfully!");
  } else {
    throw new Error("Command router failed execution");
  }

  // 5. Test Semantic Analysis NLP Extractions
  console.log("\n5. Testing Semantic Extractions NLP...");
  const sampleMessage = "Selling MacBook Air M1 2 pcs available for rs 165,000 Lahore SKU-MAC-M1-SMOKE";
  const analysis = messageAnalyzer.analyzeMessage(sampleMessage);

  if (analysis.sku === "SKU-MAC-M1-SMOKE" && analysis.price === 165000 && analysis.quantity === 2 && analysis.roleIntent === "seller") {
    console.log("✅ Semantic parser analyzed entities flawlessly!");
  } else {
    console.log("Analysis Output:", analysis);
    throw new Error("Semantic analysis entity values are inaccurate");
  }

  // 6. Test Data Masking
  console.log("\n6. Testing Data Masking / Privacy Shields...");
  const maskedPhone = store.maskPhoneNumber("+923001234567");
  const maskedEmail = store.maskEmail("test.user@domain.pk");
  const generalMasked = store.maskSensitiveInfo("Ecom buyer paid Rs 5000 to +923331234567 check proof.");

  if (maskedPhone.includes("***") && maskedEmail.includes("***") && generalMasked.includes("***")) {
    console.log("✅ Sensitive customer information masked securely!");
  } else {
    throw new Error("Sensitive values leaked through privacy shields");
  }

  // 7. Test new feature modules
  console.log("\n7. Testing new feature modules (matching, price intel, leaderboard, scheduler)...");
  const matchingEngine = require('../lib/groupCommerce/matchingEngine');
  const priceIntelligence = require('../lib/groupCommerce/priceIntelligence');
  const leaderboard = require('../lib/groupCommerce/leaderboard');
  const scheduler = require('../lib/groupCommerce/scheduler');

  const matchRes = matchingEngine.matchBuyerToSellers("group-123", "need iPhone 13 1 pcs");
  if (!matchRes.success || !Array.isArray(matchRes.matches)) { throw new Error("Matching engine failed"); }
  console.log("\u2705 Buyer-Seller matching engine works! Matches found: " + matchRes.matchCount);

  const intel = priceIntelligence.analyzeSku("group-123", "SKU-IPH13");
  if (!intel.success || typeof intel.pricePosition !== 'number') { throw new Error("Price intelligence failed"); }
  console.log("\u2705 Price intelligence works! Signal: " + intel.signal);

  const overview = priceIntelligence.marketOverview("group-123");
  if (!overview.success || typeof overview.totalSkus !== 'number') { throw new Error("Market overview failed"); }
  console.log("\u2705 Market overview works! Total SKUs: " + overview.totalSkus);

  const board = leaderboard.buildLeaderboard("group-123");
  if (!board.success || !Array.isArray(board.leaderboard)) { throw new Error("Leaderboard failed"); }
  console.log("\u2705 Seller leaderboard works! Sellers ranked: " + board.sellerCount);

  const sched = scheduler.planScheduledBroadcast("group-123", { frequency: "daily", timeOfDay: "09:30" });
  if (!sched.success || !sched.schedule.cron) { throw new Error("Scheduler failed"); }
  console.log("\u2705 Scheduled broadcast planner works! Cron: " + sched.schedule.cron);

  console.log("\n==================================================");
  console.log("🏆 Group Commerce OS Integrity Check: PASSED");
  console.log("==================================================");
  process.exit(0);

} catch (e) {
  console.error("\n❌ INTEGRITY CHECK FAILED:");
  console.error(e);
  process.exit(1);
}
