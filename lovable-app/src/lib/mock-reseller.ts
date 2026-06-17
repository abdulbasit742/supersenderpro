// Demo data for the AI Tools Reseller domain (mirrors backend at
// abdulbasit742/supersenderpro -> frontend/lib/demoData.js).
// Used as fallback when /api/business/* or /api/dealer-intelligence/* are offline.

export const businessOverview = {
  todayRevenue: 184500,
  todayProfit: 52750,
  todayOrders: 43,
  activeDealers: 218,
  trustedDealers: 64,
  pendingOrders: 9,
  pendingTrust: 7,
  lowStockCount: 5,
  avgMargin: 34.8,
  alerts: [
    { id: "a1", title: "Claude Max warranty stock low", severity: "warning" },
    { id: "a2", title: "3 pending payment screenshots", severity: "info" },
    { id: "a3", title: "Cursor Pro auto-recharge succeeded", severity: "info" },
  ],
};

export const profitSeries = {
  daily: [
    { date: "Mon", revenue: 118000, profit: 32200, orders: 24 },
    { date: "Tue", revenue: 144500, profit: 41600, orders: 31 },
    { date: "Wed", revenue: 136200, profit: 38800, orders: 28 },
    { date: "Thu", revenue: 173900, profit: 50200, orders: 39 },
    { date: "Fri", revenue: 159400, profit: 46950, orders: 34 },
    { date: "Sat", revenue: 192700, profit: 55100, orders: 47 },
    { date: "Sun", revenue: 184500, profit: 52750, orders: 43 },
  ],
  topTools: [
    { tool: "ChatGPT", quantity: 88, profit: 105600 },
    { tool: "Claude", quantity: 61, profit: 70150 },
    { tool: "Cursor", quantity: 42, profit: 43800 },
    { tool: "Gemini", quantity: 37, profit: 34400 },
    { tool: "Midjourney", quantity: 25, profit: 22100 },
  ],
  totalRevenue: 1109200,
  totalProfit: 317600,
  avgMargin: 35.2,
};

export const dealerRates = [
  { id: "r1", tool: "ChatGPT", plan: "Plus", buyPrice: 1750, sellPrice: 2600, dealerName: "Ali Raza", dealerCode: "D-001", trust: "trusted", parsedAt: new Date().toISOString() },
  { id: "r2", tool: "ChatGPT", plan: "Plus", buyPrice: 1840, sellPrice: 2600, dealerName: "Hamid SaaS", dealerCode: "D-003", trust: "trusted", parsedAt: new Date().toISOString() },
  { id: "r3", tool: "Claude", plan: "Pro", buyPrice: 1650, sellPrice: 2500, dealerName: "Usman Khan", dealerCode: "D-002", trust: "trusted", parsedAt: new Date().toISOString() },
  { id: "r4", tool: "Cursor", plan: "Pro", buyPrice: 2100, sellPrice: 3299, dealerName: "Adeel Digital", dealerCode: "D-004", trust: "trusted", parsedAt: new Date().toISOString() },
  { id: "r5", tool: "Gemini", plan: "Advanced", buyPrice: 1450, sellPrice: 2399, dealerName: "Fahad", dealerCode: "D-005", trust: "pending", parsedAt: new Date().toISOString() },
  { id: "r6", tool: "Midjourney", plan: "Basic", buyPrice: 1200, sellPrice: 1999, dealerName: "Usman Khan", dealerCode: "D-002", trust: "trusted", parsedAt: new Date().toISOString() },
];

export const trustedDealersData = [
  { id: "d1", dealerCode: "D-001", name: "Ali Raza", number: "923001112233", tools: ["chatgpt", "claude"], avgPrice: 1720, lowestPrice: 1650, trust: 96, orders: 148, lastActive: "5 min ago", status: "trusted" },
  { id: "d2", dealerCode: "D-002", name: "Usman Khan", number: "923004445566", tools: ["midjourney", "gemini"], avgPrice: 1390, lowestPrice: 1200, trust: 91, orders: 107, lastActive: "18 min ago", status: "trusted" },
  { id: "d3", dealerCode: "D-003", name: "Hamid SaaS", number: "923007778899", tools: ["chatgpt", "cursor"], avgPrice: 1980, lowestPrice: 1840, trust: 84, orders: 72, lastActive: "1 hour ago", status: "trusted" },
  { id: "d4", dealerCode: "D-004", name: "Adeel Digital", number: "923008881122", tools: ["cursor", "claude"], avgPrice: 2240, lowestPrice: 2100, trust: 78, orders: 44, lastActive: "2 hours ago", status: "trusted" },
  { id: "d5", dealerCode: "D-006", name: "New Seller 1", number: "923009990001", tools: ["chatgpt"], avgPrice: 1900, lowestPrice: 1900, trust: 40, orders: 2, lastActive: "today", status: "pending" },
  { id: "d6", dealerCode: "D-099", name: "Scam Account", number: "923009998877", tools: ["claude"], avgPrice: 900, lowestPrice: 900, trust: 5, orders: 0, lastActive: "—", status: "scammer" },
];

export const stockInventoryData = [
  { id: "s1", tool: "chatgpt", plan: "plus", accountType: "private", available: 15, total: 20, dealerCode: "D-001", threshold: 3 },
  { id: "s2", tool: "chatgpt", plan: "plus", accountType: "warranty", available: 8, total: 12, dealerCode: "D-001", threshold: 3 },
  { id: "s3", tool: "claude", plan: "pro", accountType: "private", available: 2, total: 10, dealerCode: "D-002", threshold: 3 },
  { id: "s4", tool: "claude", plan: "max", accountType: "warranty", available: 0, total: 5, dealerCode: "D-003", threshold: 2 },
  { id: "s5", tool: "cursor", plan: "pro", accountType: "non-warranty", available: 6, total: 8, dealerCode: "D-004", threshold: 3 },
  { id: "s6", tool: "midjourney", plan: "basic", accountType: "private", available: 11, total: 15, dealerCode: "D-002", threshold: 3 },
  { id: "s7", tool: "gemini", plan: "advanced", accountType: "warranty", available: 1, total: 6, dealerCode: "D-005", threshold: 2 },
];

export const recentOrders = [
  { id: "o1", orderId: "ORD-431221", customerName: "Saad", whatsapp: "923011111111", tool: "ChatGPT", plan: "Plus", accountType: "Private", qty: 1, sellPrice: 999, profit: 279, status: "awaiting_verification" },
  { id: "o2", orderId: "ORD-431222", customerName: "Hira", whatsapp: "923022222222", tool: "Claude", plan: "Pro", accountType: "Warranty", qty: 1, sellPrice: 2500, profit: 850, status: "delivered" },
  { id: "o3", orderId: "ORD-431223", customerName: "Bilal", whatsapp: "923033333333", tool: "Cursor", plan: "Pro", accountType: "Non-Warranty", qty: 2, sellPrice: 3299, profit: 2398, status: "awaiting_payment" },
  { id: "o4", orderId: "ORD-431224", customerName: "Ayesha", whatsapp: "923044444444", tool: "Gemini", plan: "Advanced", accountType: "Warranty", qty: 1, sellPrice: 2399, profit: 949, status: "delivered" },
  { id: "o5", orderId: "ORD-431225", customerName: "Hamza", whatsapp: "923055555555", tool: "Midjourney", plan: "Basic", accountType: "Private", qty: 1, sellPrice: 1999, profit: 799, status: "delivered" },
];

export const purchasesData = [
  { id: "pu1", date: "2026-06-12", dealer: "Ali Raza", dealerCode: "D-001", tool: "ChatGPT Plus", qty: 10, unitCost: 1750, total: 17500, status: "received" },
  { id: "pu2", date: "2026-06-11", dealer: "Usman Khan", dealerCode: "D-002", tool: "Midjourney Basic", qty: 5, unitCost: 1200, total: 6000, status: "received" },
  { id: "pu3", date: "2026-06-10", dealer: "Hamid SaaS", dealerCode: "D-003", tool: "Cursor Pro", qty: 4, unitCost: 2100, total: 8400, status: "pending" },
  { id: "pu4", date: "2026-06-09", dealer: "Fahad", dealerCode: "D-005", tool: "Gemini Advanced", qty: 6, unitCost: 1450, total: 8700, status: "received" },
];

export const salesData = [
  { id: "sa1", date: "2026-06-13", customer: "Saad", tool: "ChatGPT Plus", qty: 1, sellPrice: 2600, cost: 1750, profit: 850, channel: "WhatsApp DM" },
  { id: "sa2", date: "2026-06-13", customer: "Hira", tool: "Claude Pro", qty: 1, sellPrice: 2500, cost: 1650, profit: 850, channel: "Group" },
  { id: "sa3", date: "2026-06-12", customer: "Ayesha", tool: "Gemini Advanced", qty: 1, sellPrice: 2399, cost: 1450, profit: 949, channel: "Channel" },
  { id: "sa4", date: "2026-06-12", customer: "Bilal", tool: "Cursor Pro", qty: 2, sellPrice: 3299, cost: 2100, profit: 2398, channel: "WhatsApp DM" },
  { id: "sa5", date: "2026-06-11", customer: "Hamza", tool: "Midjourney Basic", qty: 1, sellPrice: 1999, cost: 1200, profit: 799, channel: "Bot" },
];

export const zeroTouchJobs = [
  { id: "zt1", name: "Dealer rate scrape", schedule: "Every 10 min", lastRun: "2 min ago", status: "ok", nextRun: "in 8 min" },
  { id: "zt2", name: "Auto-fulfill paid orders", schedule: "Every 1 min", lastRun: "30 sec ago", status: "ok", nextRun: "in 30 sec" },
  { id: "zt3", name: "Channel forwarding", schedule: "Every 5 min", lastRun: "4 min ago", status: "ok", nextRun: "in 1 min" },
  { id: "zt4", name: "Low stock alert", schedule: "Every 30 min", lastRun: "12 min ago", status: "ok", nextRun: "in 18 min" },
  { id: "zt5", name: "Sheets sync", schedule: "Hourly", lastRun: "20 min ago", status: "warn", nextRun: "in 40 min" },
  { id: "zt6", name: "Trust score refresh", schedule: "Daily 03:00", lastRun: "Today", status: "ok", nextRun: "Tomorrow 03:00" },
];

export const giveawaysData = [
  { id: "gv1", name: "Weekly ChatGPT Plus", entries: 412, target: 500, prize: "ChatGPT Plus 1 month", endsIn: "2d 4h", status: "active" },
  { id: "gv2", name: "Claude Pro Quick Draw", entries: 187, target: 200, prize: "Claude Pro 1 month", endsIn: "6h", status: "active" },
  { id: "gv3", name: "Mid-month Bundle", entries: 643, target: 600, prize: "AI Bundle", endsIn: "Ended", status: "completed" },
];

export const pendingTrustData = [
  { id: "p1", dealerNumber: "923009990001", dealerName: "New Seller 1", toolsMentioned: ["chatgpt:plus"], yesVotes: 2, noVotes: 0, groupName: "AI Dealers PK" },
  { id: "p2", dealerNumber: "923009990002", dealerName: "Unknown Claude", toolsMentioned: ["claude:pro"], yesVotes: 1, noVotes: 2, groupName: "Premium Tools Rates" },
];
