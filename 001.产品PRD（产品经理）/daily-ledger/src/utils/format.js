// 工具函数：格式化

/** 格式化金额（带货币符号） */
export function formatCurrency(amount, currency = 'CNY') {
  const symbols = { CNY: '¥', USD: '$', EUR: '€', JPY: '¥' };
  const symbol = symbols[currency] || currency;
  const num = Number(amount);
  if (isNaN(num)) return `${symbol}0.00`;
  return `${symbol}${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 格式化金额（不带符号，仅数字） */
export function formatAmount(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 格式化日期 YYYY-MM-DD */
export function formatDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 格式化日期为中文显示 */
export function formatDateCN(dateStr) {
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const w = weekdays[d.getDay()];
  return `${m}月${day}日 周${w}`;
}

/** 格式化月份 YYYY-MM */
export function formatMonth(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** 格式化月份为中文显示 */
export function formatMonthCN(monthStr) {
  const [y, m] = monthStr.split('-');
  return `${y}年${parseInt(m)}月`;
}

/** 获取今日 YYYY-MM-DD */
export function today() {
  return formatDate(new Date());
}

/** 获取本月 YYYY-MM */
export function thisMonth() {
  return formatMonth(new Date());
}

/** 获取 ISO 时间戳 */
export function nowISO() {
  return new Date().toISOString();
}

/** 简要时间显示 */
export function timeAgo(isoStr) {
  const now = Date.now();
  const past = new Date(isoStr).getTime();
  const diff = now - past;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return formatDate(isoStr);
}
