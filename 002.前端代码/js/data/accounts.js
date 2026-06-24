// 默认账户数据
export const defaultAccounts = [
  { id: 1, name: '现金钱包', icon: '💵', type: 'cash', balance: 0 },
  { id: 2, name: '银行卡',   icon: '🏦', type: 'bank', balance: 0 },
  { id: 3, name: '支付宝',   icon: '📱', type: 'ewallet', balance: 0 },
  { id: 4, name: '微信钱包', icon: '💬', type: 'ewallet', balance: 0 },
];

// 预设的示例账单数据（原型演示用）
export const sampleRecords = [
  { id: 1, amount: 35.50, type: 'expense', categoryId: 3,  date: '2026-06-24', accountId: 3, note: '星巴克拿铁' },
  { id: 2, amount: 28.00, type: 'expense', categoryId: 1,  date: '2026-06-24', accountId: 1, note: '午餐外卖' },
  { id: 3, amount: 15.00, type: 'expense', categoryId: 6,  date: '2026-06-24', accountId: 3, note: '地铁通勤' },
  { id: 4, amount: 120.00,type: 'expense', categoryId: 9,  date: '2026-06-23', accountId: 4, note: '超市采购' },
  { id: 5, amount: 45.00, type: 'expense', categoryId: 14, date: '2026-06-23', accountId: 3, note: '看电影' },
  { id: 6, amount: 200.00,type: 'expense', categoryId: 8,  date: '2026-06-22', accountId: 2, note: '买T恤' },
  { id: 7, amount: 1500.00,type:'income', categoryId: 24, date: '2026-06-15', accountId: 2, note: '6月工资' },
  { id: 8, amount: 200.00,type: 'income',  categoryId: 26, date: '2026-06-20', accountId: 4, note: '周末兼职' },
  { id: 9, amount: 68.00, type: 'expense', categoryId: 4,  date: '2026-06-21', accountId: 3, note: '朋友聚餐AA' },
  { id: 10,amount: 300.00,type: 'expense', categoryId: 11, date: '2026-06-01', accountId: 4, note: '房租' },
];
