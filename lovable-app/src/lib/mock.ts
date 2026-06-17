// Centralized mock data for demo mode.

export type Plan = {
  id: string;
  category: string;
  emoji: string;
  name: string;
  pricePkr: number;
  duration: string;
  features: string[];
  available: boolean;
};

export const planCategories = [
  "Giveaway", "ChatGPT", "Claude", "Perplexity", "Gemini",
  "Canva", "CapCut", "Kimi", "Turnitin", "Bundles", "Laptops",
];

export const mockPlans: Plan[] = [
  { id: "p1", category: "ChatGPT", emoji: "🤖", name: "ChatGPT Plus 1 Month", pricePkr: 1500, duration: "30 days", features: ["GPT-4o","Voice","DALL·E"], available: true },
  { id: "p2", category: "ChatGPT", emoji: "🤖", name: "ChatGPT Plus 3 Months", pricePkr: 4000, duration: "90 days", features: ["GPT-4o","Voice","Priority"], available: true },
  { id: "p3", category: "Claude", emoji: "🟣", name: "Claude Pro 1 Month", pricePkr: 1700, duration: "30 days", features: ["Claude 3.5","200k context"], available: true },
  { id: "p4", category: "Perplexity", emoji: "🔍", name: "Perplexity Pro Yearly", pricePkr: 5500, duration: "1 year", features: ["Pro Search","File upload"], available: false },
  { id: "p5", category: "Gemini", emoji: "✨", name: "Gemini Advanced", pricePkr: 1800, duration: "30 days", features: ["Gemini 1.5 Pro","2TB Drive"], available: true },
  { id: "p6", category: "Canva", emoji: "🎨", name: "Canva Pro 1 Year", pricePkr: 3000, duration: "12 months", features: ["Magic Studio","Brand Kit"], available: true },
  { id: "p7", category: "CapCut", emoji: "🎬", name: "CapCut Pro", pricePkr: 2200, duration: "12 months", features: ["No watermark","4K Export"], available: true },
  { id: "p8", category: "Kimi", emoji: "🌙", name: "Kimi Premium", pricePkr: 1200, duration: "30 days", features: ["Long context"], available: true },
  { id: "p9", category: "Turnitin", emoji: "📝", name: "Turnitin Student", pricePkr: 2500, duration: "Per check", features: ["AI Detection","Similarity"], available: true },
  { id: "p10", category: "Bundles", emoji: "📦", name: "Student All-in-One", pricePkr: 4500, duration: "30 days", features: ["GPT+Claude+Canva"], available: true },
  { id: "p11", category: "Laptops", emoji: "💻", name: "Dell Latitude 7490 i7", pricePkr: 78000, duration: "Stock", features: ["16GB RAM","512GB SSD"], available: true },
  { id: "p12", category: "Giveaway", emoji: "🎁", name: "Weekly Giveaway Entry", pricePkr: 0, duration: "Weekly", features: ["Free Entry"], available: true },
];

export const kpis = {
  activeLeads: 248,
  messagesToday: 1342,
  totalRevenuePkr: 845_000,
  products: 86,
  ordersPending: 14,
  whatsappStatus: "connected" as "connected" | "disconnected",
};

export const revenueTrend = Array.from({ length: 14 }).map((_, i) => ({
  day: `D${i + 1}`,
  revenue: Math.round(20000 + Math.random() * 60000),
}));

export const topCategories = [
  { name: "ChatGPT", value: 42 },
  { name: "Canva", value: 22 },
  { name: "Laptops", value: 18 },
  { name: "Claude", value: 12 },
  { name: "Other", value: 6 },
];

export const botStats = Array.from({ length: 7 }).map((_, i) => ({
  day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
  replies: 200 + Math.round(Math.random() * 200),
  avgMs: 400 + Math.round(Math.random() * 600),
}));

export const customers = Array.from({ length: 12 }).map((_, i) => ({
  id: `c${i+1}`,
  name: ["Ali","Sara","Bilal","Ayesha","Hamza","Zainab","Usman","Mehak","Rizwan","Fatima","Hassan","Noor"][i],
  phone: `+9230012345${(10+i).toString().padStart(2,"0")}`,
  tags: ["ChatGPT","Canva","VIP"].slice(0, (i % 3) + 1),
  totalOrders: Math.floor(Math.random() * 20),
  totalSpent: Math.floor(Math.random() * 50000),
  vip: ["Bronze","Silver","Gold","Platinum"][i % 4],
  lastMessage: "Sir price kya hai?",
}));

export const orders = Array.from({ length: 10 }).map((_, i) => ({
  id: `ORD-${1000 + i}`,
  customer: customers[i % customers.length].name,
  product: mockPlans[i % mockPlans.length].name,
  type: ["AI Tool","Laptop","Bundle"][i % 3],
  pricePkr: mockPlans[i % mockPlans.length].pricePkr,
  status: ["pending","approved","delivered","refunded"][i % 4],
  paymentStatus: ["unpaid","paid","verifying","refunded"][i % 4],
  screenshot: i % 2 === 0,
}));

export const bots = [
  { id: "ai", name: "AI Tools Bot", active: true, replies: 412 },
  { id: "give", name: "Giveaway Bot", active: true, replies: 188 },
  { id: "lap", name: "Laptop Bot", active: false, replies: 64 },
  { id: "acc", name: "Accessories Bot", active: true, replies: 92 },
  { id: "dry", name: "Dry Fruits Bot", active: true, replies: 51 },
  { id: "shirt", name: "Shirts Bot", active: false, replies: 22 },
  { id: "pizza", name: "Pizza Bot", active: true, replies: 33 },
  { id: "scholar", name: "Scholarship Bot", active: true, replies: 71 },
  { id: "ilm", name: "Ilm o Daanish Bot", active: true, replies: 18 },
  { id: "real", name: "Real Estate Bot", active: false, replies: 9 },
];

export const sourceChannels = [
  { id: "s1", name: "AI Deals PK", link: "wa.me/ch/aideals", enabled: true },
  { id: "s2", name: "Tech News Urdu", link: "wa.me/ch/technews", enabled: true },
  { id: "s3", name: "Student Offers", link: "wa.me/ch/students", enabled: false },
];
export const targetChannels = [
  { id: "t1", name: "SuperSender Main", link: "wa.me/ch/supersender", enabled: true },
  { id: "t2", name: "SuperSender Lite", link: "wa.me/ch/lite", enabled: true },
];
export const forwardingLogs = Array.from({ length: 8 }).map((_, i) => ({
  id: `f${i}`,
  time: `${10 + i}:${(i * 7) % 60}`.padStart(5, "0"),
  source: sourceChannels[i % sourceChannels.length].name,
  target: targetChannels[i % targetChannels.length].name,
  status: i % 4 === 0 ? "queued" : "sent",
  preview: "ChatGPT Plus 1 Month — PKR 1500…",
}));

export const groups = [
  { id: "g1", type: "Selling", name: "AI Tools Selling PK", members: 980, health: 92, lastSeen: "2m ago", dataCount: 1240, parser: "ok" },
  { id: "g2", type: "Customer", name: "VIP Customers", members: 240, health: 88, lastSeen: "10m ago", dataCount: 320, parser: "ok" },
  { id: "g3", type: "Source", name: "Wholesale Rates", members: 520, health: 64, lastSeen: "1h ago", dataCount: 802, parser: "warn" },
  { id: "g4", type: "Dealer", name: "Laptop Dealers", members: 130, health: 77, lastSeen: "30m ago", dataCount: 150, parser: "ok" },
];

export const socialAccounts = [
  { id: "fb", platform: "Facebook", name: "SuperSender Pro Page", connected: true, lastPost: "Posted 2h ago" },
  { id: "ig", platform: "Instagram", name: "@supersender.pro", connected: true, lastPost: "Posted 5h ago" },
  { id: "li", platform: "LinkedIn", name: "SuperSender", connected: false, lastPost: "—" },
  { id: "tt", platform: "TikTok", name: "@supersender", connected: false, lastPost: "—" },
];
