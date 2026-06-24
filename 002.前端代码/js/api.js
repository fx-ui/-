// API 请求模块 — 封装对后端的所有 HTTP 请求
const BASE = '/api';

const TOKEN_KEY = 'dl_token';
const USER_KEY  = 'dl_user';

// ================================================================
//  Token 管理
// ================================================================
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ================================================================
//  用户信息管理
// ================================================================
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeCurrentUser() {
  localStorage.removeItem(USER_KEY);
}

// ================================================================
//  登录状态
// ================================================================
export function isLoggedIn() {
  return !!getToken();
}

// ================================================================
//  通用请求方法
// ================================================================
async function request(url, options = {}) {
  try {
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };

    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(BASE + url, config);

    // 如果响应不是 JSON（比如 HTML 错误页），安全处理
    let data;
    try {
      data = await res.json();
    } catch {
      data = { message: '服务器返回了非 JSON 数据，状态码: ' + res.status };
    }

    if (!res.ok && res.status === 401) {
      removeToken();
      removeCurrentUser();
    }

    return { ok: res.ok, status: res.status, ...data };
  } catch (err) {
    // 网络错误等
    console.error('API 请求失败:', url, err.message);
    return { ok: false, status: 0, message: '网络请求失败: ' + err.message };
  }
}

// ================================================================
//  API 接口
// ================================================================

/** 注册 */
export function register(username, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

/** 登录 */
export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

/** 获取当前用户信息（需登录） */
export function getProfile() {
  return request('/auth/me');
}

// ================================================================
//  分类 API
// ================================================================

/** 获取分类列表（从数据库） */
export function fetchCategories(type = 'expense') {
  return request('/categories?type=' + type);
}

/** 新增自定义分类 */
export function addCategory(data) {
  return request('/categories', { method: 'POST', body: JSON.stringify(data) });
}

/** 删除自定义分类 */
export function deleteCategory(id) {
  return request('/categories/' + id, { method: 'DELETE' });
}

// ================================================================
//  账单记录 API
// ================================================================

/** 创建记录 */
export function createRecord(data) {
  return request('/records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 查询记录列表 */
export function getRecords(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request('/records' + (qs ? '?' + qs : ''));
}

/** 删除记录 */
export function deleteRecord(id) {
  return request('/records/' + id, { method: 'DELETE' });
}

// ================================================================
//  统计 API
// ================================================================

/** 月度收支总览 */
export function getMonthlySummary(month) {
  return request('/stats/monthly-summary?month=' + encodeURIComponent(month));
}

/** 分类支出排名 */
export function getCategoryRanking(month, limit = 3) {
  return request(`/stats/category-ranking?month=${encodeURIComponent(month)}&limit=${limit}`);
}

/** 年度收支总览 */
export function getYearlySummary(year) {
  return request('/stats/yearly-summary?year=' + year);
}

/** 分类统计（饼图） */
export function getCategoryBreakdown(year, type = 'expense') {
  return request(`/stats/category-breakdown?year=${year}&type=${type}`);
}

/** 月度趋势（折线图） */
export function getMonthlyTrend(year) {
  return request('/stats/monthly-trend?year=' + year);
}

/** 导出 Excel（HTML 表格格式，Excel 可直接打开） */
export function downloadExcel(year, summary, breakdown, trend) {
  const s = summary || {};
  const b = breakdown || [];
  const t = trend || [];

  let csv = '';
  csv += `${year}年 每日记账统计报告\n\n`;
  csv += '年度总览\n';
  csv += '全年收入,全年支出,全年结余\n';
  csv += `${s.income || 0},${s.expense || 0},${s.balance || 0}\n\n`;
  csv += '支出分类统计\n';
  csv += '分类,金额\n';
  b.forEach(c => { csv += `${c.name},${c.total}\n`; });
  csv += '\n月度趋势\n';
  csv += '月份,收入,支出,结余\n';
  t.forEach(m => { csv += `${m.month}月,${m.income},${m.expense},${(m.income - m.expense).toFixed(2)}\n`; });

  // UTF-8 BOM 二进制写入，Excel 正确识别中文
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const enc = new TextEncoder().encode(csv);
  const buf = new Uint8Array(bom.length + enc.length);
  buf.set(bom);
  buf.set(enc, bom.length);

  const blob = new Blob([buf], { type: 'text/csv;charset=UTF-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `daily-ledger-${year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
