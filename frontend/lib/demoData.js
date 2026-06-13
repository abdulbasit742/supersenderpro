export const tools = [
  { slug: 'chatgpt', name: 'ChatGPT Plus', plan: 'Plus', icon: '🤖' },
  { slug: 'claude', name: 'Claude Pro', plan: 'Pro', icon: '🧠' },
  { slug: 'midjourney', name: 'Midjourney', plan: 'Basic', icon: '🎨' },
  { slug: 'cursor', name: 'Cursor Pro', plan: 'Pro', icon: '⌨️' },
  { slug: 'gemini', name: 'Gemini Advanced', plan: 'Advanced', icon: '✨' }
];

export const overview = {
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
    { id: 'a1', title: 'Claude Max warranty stock low', severity: 'warning' },
    { id: 'a2', title: '3 pending payment screenshots', severity: 'info' }
  ]
};

export const profit = {
  daily: [
    { date: 'May 1', revenue: 118000, profit: 32200, orders: 24 },
    { date: 'May 2', revenue: 144500, profit: 41600, orders: 31 },
    { date: 'May 3', revenue: 136200, profit: 38800, orders: 28 },
    { date: 'May 4', revenue: 173900, profit: 50200, orders: 39 },
    { date: 'May 5', revenue: 159400, profit: 46950, orders: 34 },
    { date: 'May 6', revenue: 192700, profit: 55100, orders: 47 },
    { date: 'May 7', revenue: 184500, profit: 52750, orders: 43 }
  ],
  topTools: [
    { tool: 'ChatGPT Plus', quantity: 88, profit: 105600 },
    { tool: 'Claude Pro', quantity: 61, profit: 70150 },
    { tool: 'Cursor Pro', quantity: 42, profit: 43800 },
    { tool: 'Gemini Advanced', quantity: 37, profit: 34400 },
    { tool: 'Midjourney', quantity: 25, profit: 22100 }
  ],
  totalRevenue: 1109200,
  totalProfit: 317600,
  avgMargin: 35.2
};

export const dealerRates = [
  { id: 'r1', toolSlug: 'chatgpt', toolName: 'ChatGPT', planSlug: 'plus', planName: 'Plus', buyPrice: 1750, sellPrice: 2600, dealer: { name: 'Ali Raza', dealerCode: 'D-001' }, dealerCode: 'D-001', parsedAt: new Date().toISOString() },
  { id: 'r2', toolSlug: 'chatgpt', toolName: 'ChatGPT', planSlug: 'plus', planName: 'Plus', buyPrice: 1840, sellPrice: 2600, dealer: { name: 'Hamid', dealerCode: 'D-003' }, dealerCode: 'D-003', parsedAt: new Date().toISOString() },
  { id: 'r3', toolSlug: 'claude', toolName: 'Claude', planSlug: 'pro', planName: 'Pro', buyPrice: 1650, sellPrice: 2500, dealer: { name: 'Usman', dealerCode: 'D-002' }, dealerCode: 'D-002', parsedAt: new Date().toISOString() },
  { id: 'r4', toolSlug: 'cursor', toolName: 'Cursor', planSlug: 'pro', planName: 'Pro', buyPrice: 2100, sellPrice: 3299, dealer: { name: 'Adeel', dealerCode: 'D-004' }, dealerCode: 'D-004', parsedAt: new Date().toISOString() },
  { id: 'r5', toolSlug: 'gemini', toolName: 'Gemini', planSlug: 'advanced', planName: 'Advanced', buyPrice: 1450, sellPrice: 2399, dealer: { name: 'Fahad', dealerCode: 'D-005' }, dealerCode: 'D-005', parsedAt: new Date().toISOString() },
  { id: 'r6', toolSlug: 'midjourney', toolName: 'Midjourney', planSlug: 'basic', planName: 'Basic', buyPrice: 1200, sellPrice: 1999, dealer: { name: 'Usman', dealerCode: 'D-002' }, dealerCode: 'D-002', parsedAt: new Date().toISOString() }
];

export const trustedDealers = [
  { id: 'd1', dealerCode: 'D-001', dealerName: 'Ali Raza', dealerNumber: '923001112233', toolsList: ['chatgpt', 'claude'], avgPrice: 1720, lowestPrice: 1650, trustScore: 96, ordersCompleted: 148, lastActive: '5 min ago' },
  { id: 'd2', dealerCode: 'D-002', dealerName: 'Usman Khan', dealerNumber: '923004445566', toolsList: ['midjourney', 'gemini'], avgPrice: 1390, lowestPrice: 1200, trustScore: 91, ordersCompleted: 107, lastActive: '18 min ago' },
  { id: 'd3', dealerCode: 'D-003', dealerName: 'Hamid SaaS', dealerNumber: '923007778899', toolsList: ['chatgpt', 'cursor'], avgPrice: 1980, lowestPrice: 1840, trustScore: 84, ordersCompleted: 72, lastActive: '1 hour ago' },
  { id: 'd4', dealerCode: 'D-004', dealerName: 'Adeel Digital', dealerNumber: '923008881122', toolsList: ['cursor', 'claude'], avgPrice: 2240, lowestPrice: 2100, trustScore: 78, ordersCompleted: 44, lastActive: '2 hours ago' }
];

export const pendingTrust = [
  { id: 'p1', dealerNumber: '923009990001', dealerName: 'New Seller 1', toolsMentioned: ['chatgpt:plus'], yesVotes: 2, noVotes: 0, groupName: 'AI Dealers PK' },
  { id: 'p2', dealerNumber: '923009990002', dealerName: 'Unknown Claude', toolsMentioned: ['claude:pro'], yesVotes: 1, noVotes: 2, groupName: 'Premium Tools Rates' }
];

export const stockInventory = [
  { id: 's1', toolSlug: 'chatgpt', planSlug: 'plus', accountType: 'private', quantityAvailable: 15, quantityTotal: 20, primaryDealerCode: 'D-001', lowStockThreshold: 3 },
  { id: 's2', toolSlug: 'chatgpt', planSlug: 'plus', accountType: 'warranty', quantityAvailable: 8, quantityTotal: 12, primaryDealerCode: 'D-001', lowStockThreshold: 3 },
  { id: 's3', toolSlug: 'claude', planSlug: 'pro', accountType: 'private', quantityAvailable: 2, quantityTotal: 10, primaryDealerCode: 'D-002', lowStockThreshold: 3 },
  { id: 's4', toolSlug: 'claude', planSlug: 'max', accountType: 'warranty', quantityAvailable: 0, quantityTotal: 5, primaryDealerCode: 'D-003', lowStockThreshold: 2 },
  { id: 's5', toolSlug: 'cursor', planSlug: 'pro', accountType: 'non_warranty', quantityAvailable: 6, quantityTotal: 8, primaryDealerCode: 'D-004', lowStockThreshold: 3 }
];

export const availability = stockInventory.map((row) => ({
  tool: row.toolSlug.charAt(0).toUpperCase() + row.toolSlug.slice(1),
  toolSlug: row.toolSlug,
  plan: row.planSlug,
  planSlug: row.planSlug,
  accountType: row.accountType,
  accountLabel: row.accountType.replace('_', '-'),
  price: row.accountType === 'private' ? 999 : row.accountType === 'warranty' ? 1800 : 1200,
  slots: row.quantityAvailable,
  inStock: row.quantityAvailable > 0,
  low: row.quantityAvailable > 0 && row.quantityAvailable <= row.lowStockThreshold,
  limitedTime: row.accountType === 'private',
  limitedLabel: 'LIMITED TIME'
}));

export const orders = [
  { id: 'o1', orderId: 'ORD-431221', customer: { name: 'Saad', whatsapp: '923011111111' }, tool: { name: 'ChatGPT' }, plan: { name: 'Plus' }, accountType: { label: 'Private' }, quantity: 1, sellPrice: 999, buyPrice: 720, profit: 279, status: 'awaiting_verification', issues: [] },
  { id: 'o2', orderId: 'ORD-431222', customer: { name: 'Hira', whatsapp: '923022222222' }, tool: { name: 'Claude' }, plan: { name: 'Pro' }, accountType: { label: 'Warranty' }, quantity: 1, sellPrice: 2500, buyPrice: 1650, profit: 850, status: 'delivered', issues: [{ id: 'i1', status: 'resolved', description: 'Login OTP issue' }] },
  { id: 'o3', orderId: 'ORD-431223', customer: { name: 'Bilal', whatsapp: '923033333333' }, tool: { name: 'Cursor' }, plan: { name: 'Pro' }, accountType: { label: 'Non-Warranty' }, quantity: 2, sellPrice: 3299, buyPrice: 2100, profit: 2398, status: 'awaiting_payment', issues: [] }
];

export const customers = [
  { id: 'c1', name: 'Saad', whatsapp: '923011111111', totalOrders: 6, totalSpent: 12400, isVip: true, isScammer: false, lastOrder: 'Today' },
  { id: 'c2', name: 'Hira', whatsapp: '923022222222', totalOrders: 3, totalSpent: 7600, isVip: false, isScammer: false, lastOrder: 'Yesterday' },
  { id: 'c3', name: 'Blocked Lead', whatsapp: '923099999999', totalOrders: 0, totalSpent: 0, isVip: false, isScammer: true, lastOrder: '-' }
];

export const notifyMe = [
  { id: 'n1', phone: '923044444444', tool: { name: 'Claude' }, plan: { name: 'Max' }, accountType: 'warranty', status: 'waiting' },
  { id: 'n2', phone: '923055555555', tool: { name: 'Midjourney' }, plan: { name: 'Standard' }, accountType: 'private', status: 'waiting' }
];

export const insights = {
  whyBuy: [
    { reason: 'Price', count: 82 },
    { reason: 'Fast delivery', count: 71 },
    { reason: 'Trust', count: 65 }
  ],
  whyNotBuy: [
    { reason: 'Price too high', count: 74 },
    { reason: 'No trust', count: 61 },
    { reason: 'Slow reply', count: 49 }
  ],
  hourly: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    orders: [0, 0, 0, 0, 0, 1, 2, 3, 6, 9, 11, 14, 18, 16, 13, 19, 22, 27, 25, 21, 15, 8, 4, 1][hour],
    intensity: [0, 0, 0, 0, 0, 0.04, 0.07, 0.11, 0.22, 0.33, 0.41, 0.52, 0.67, 0.59, 0.48, 0.7, 0.81, 1, 0.93, 0.78, 0.56, 0.3, 0.15, 0.04][hour]
  })),
  topToolsDonut: [
    { name: 'ChatGPT', value: 88 },
    { name: 'Claude', value: 61 },
    { name: 'Cursor', value: 42 },
    { name: 'Gemini', value: 37 },
    { name: 'Midjourney', value: 25 }
  ],
  funnel: [
    { stage: 'Inquiries', value: 420 },
    { stage: 'Qualified', value: 286 },
    { stage: 'Orders', value: 173 },
    { stage: 'Paid', value: 151 },
    { stage: 'Delivered', value: 145 }
  ],
  conversionRate: 0.41,
  retentionRate: 0.36,
  suggestions: [
    'Reply under 3 seconds on price queries; fast reply is the current deal closer.',
    'Use private Rs 999 as entry offer, then upsell warranty accounts after trust is built.',
    'Push broadcasts between 5 PM and 8 PM; this dashboard shows the strongest order heat.',
    'Retarget no-reply leads after 2 hours, then again after 24 hours with one clear offer.'
  ],
  agentPerformance: [
    { name: 'Bot', responseTime: 3, resolved: 68, revenue: 71000 },
    { name: 'Ali', responseTime: 46, resolved: 31, revenue: 52200 },
    { name: 'Sara', responseTime: 58, resolved: 24, revenue: 41800 },
    { name: 'Hamza', responseTime: 71, resolved: 19, revenue: 28700 }
  ]
};

export const broadcasts = [
  { id: 'b1', title: 'Daily Rates', message: 'ChatGPT Plus Rs 999 limited slots', status: 'sent', sentAt: new Date().toISOString(), delivered: 812, read: 641, replies: 87 },
  { id: 'b2', title: 'Renewal Reminder', message: 'Your subscription is ending soon', status: 'scheduled', scheduledAt: new Date(Date.now() + 86400000).toISOString(), delivered: 0, read: 0, replies: 0 }
];

export const settings = {
  ADMIN_NUMBER: '923001234567',
  JAZZCASH_NUMBER: '0300-1234567',
  EASYPAISA_NUMBER: '0321-9876543',
  BANK_ACCOUNT: 'MCB-1234567890',
  BANK_NAME: 'MCB Bank',
  GOOGLE_SHEETS_ID: '',
  LOW_STOCK_THRESHOLD: '3'
};
