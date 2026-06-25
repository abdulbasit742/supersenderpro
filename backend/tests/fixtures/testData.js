const testUser = { id: 'user-1', name: 'Test Admin', email: 'admin@test.com', role: 'ADMIN', active: true };
const testCustomer = { id: 'cust-1', phone: '923001234567', name: 'Test Customer', tier: 'Silver', promoOptIn: true };
const testDealer = { id: 'dealer-1', phone: '923009999999', name: 'Test Dealer', dCode: 'D001', trusted: true, active: true };
const testOrder = { id: 'order-1', customerId: 'cust-1', tool: 'ChatGPT Plus', type: 'Monthly', amount: 1800, status: 'PENDING' };
const testStock = { id: 'stock-1', tool: 'ChatGPT Plus', type: 'Monthly', dealerCode: 'D001', credentials: 'encrypted:test', delivered: false };
const testStockItem = { id: 'stock-1', tool: 'ChatGPT Plus', type: 'Monthly', availableQty: 10, reservedQty: 0, avgCost: 1500, lowThreshold: 3, low: false };
const testLowStockItem = { id: 'stock-2', tool: 'Claude Pro', type: 'Monthly', availableQty: 1, reservedQty: 0, avgCost: 1600, lowThreshold: 3, low: true };
module.exports = { testUser, testCustomer, testDealer, testOrder, testStock, testStockItem, testLowStockItem };