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

/** 修改个人信息（昵称、头像等） */
export function updateProfile(data) {
  return request('/auth/me', { method: 'PUT', body: JSON.stringify(data) });
}

/** 上传头像（multipart/form-data） */
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  try {
    const token = getToken();
    const res = await fetch(BASE + '/auth/avatar', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, ...data };
  } catch (err) {
    console.error('Avatar upload error:', err);
    return { ok: false, status: 0, message: '上传失败: ' + err.message };
  }
}

// ================================================================
//  账户 API
// ================================================================

/** 获取账户列表 */
export function getAccounts() {
  return request('/accounts');
}

/** 新增账户 */
export function createAccount(data) {
  return request('/accounts', { method: 'POST', body: JSON.stringify(data) });
}

/** 修改账户 */
export function updateAccount(id, data) {
  return request('/accounts/' + id, { method: 'PUT', body: JSON.stringify(data) });
}

/** 删除账户 */
export function deleteAccount(id) {
  return request('/accounts/' + id, { method: 'DELETE' });
}

/** 获取用户资产总览 */
export function getAccountsSummary() {
  return request('/accounts/summary');
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

/** 编辑记录 */
export function editRecord(id, data) {
  return request('/records/' + id, { method: 'PUT', body: JSON.stringify(data) });
}

/** 删除记录 */
export function deleteRecord(id) {
  return request('/records/' + id, { method: 'DELETE' });
}

// ================================================================
//  预算 API
// ================================================================

/** 获取预算列表 */
export function getBudgets(month) {
  const qs = month ? '?month=' + encodeURIComponent(month) : '';
  return request('/budgets' + qs);
}

/** 设置/更新预算 */
export function saveBudget(data) {
  return request('/budgets', { method: 'POST', body: JSON.stringify(data) });
}

/** 删除预算 */
export function deleteBudget(id) {
  return request('/budgets/' + id, { method: 'DELETE' });
}

// ================================================================
//  模板 API
// ================================================================

/** 获取模板列表 */
export function getTemplates() {
  return request('/templates');
}

/** 创建模板 */
export function createTemplate(data) {
  return request('/templates', { method: 'POST', body: JSON.stringify(data) });
}

/** 使用模板（增加计数） */
export function useTemplate(id) {
  return request('/templates/' + id + '/use', { method: 'POST' });
}

/** 删除模板 */
export function deleteTemplate(id) {
  return request('/templates/' + id, { method: 'DELETE' });
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

  // 构建工作表数据
  const sheetData = [
    [`${year}年 每日记账统计报告`],
    [],
    ['年度总览'],
    ['全年收入', '全年支出', '全年结余'],
    [s.income || 0, s.expense || 0, s.balance || 0],
    [],
    ['支出分类统计'],
    ['分类', '金额'],
  ];
  b.forEach(c => { sheetData.push([c.name, c.total]); });
  sheetData.push([]);
  sheetData.push(['月度趋势']);
  sheetData.push(['月份', '收入', '支出', '结余']);
  t.forEach(m => {
    sheetData.push([`${m.month}月`, m.income, m.expense, (m.income - m.expense).toFixed(2)]);
  });

  // 用 SheetJS 生成 .xlsx
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, `${year}年统计`);
  XLSX.writeFile(wb, `daily-ledger-${year}.xlsx`);
}
