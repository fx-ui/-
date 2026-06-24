// 默认账户
export const defaultAccounts = [
  { id: 1, name: '现金钱包', type: 'cash', balance: 0, currency: 'CNY', icon: '💵', isDefault: true },
  { id: 2, name: '银行卡',   type: 'bank', balance: 0, currency: 'CNY', icon: '🏦', isDefault: false },
  { id: 3, name: '支付宝',   type: 'ewallet', balance: 0, currency: 'CNY', icon: '📱', isDefault: false },
  { id: 4, name: '微信钱包', type: 'ewallet', balance: 0, currency: 'CNY', icon: '💬', isDefault: false },
];

// 默认设置
export const defaultSettings = [
  { key: 'role',           value: 'personal' },
  { key: 'currency',       value: 'CNY' },
  { key: 'firstDayOfWeek', value: 'monday' },
  { key: 'largeFontMode',  value: false },
  { key: 'budgetPeriod',   value: 'monthly' },
];
