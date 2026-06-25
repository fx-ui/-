// 格式化工具
export const $ = (s) => (s.startsWith('#') ? document.querySelector(s) : document.querySelectorAll(s));

export function fmtMoney(n) {
  if (isNaN(n)) return '¥0.00';
  return '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDateCN(d) {
  const dt = new Date(d);
  const w = ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()];
  return `${dt.getMonth() + 1}月${dt.getDate()}日 周${w}`;
}

export function fmtMonthCN(m) {
  const [y, mo] = m.split('-');
  return `${y}年${parseInt(mo)}月`;
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
