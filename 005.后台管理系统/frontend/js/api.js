const BASE = '/api/admin';
const TOKEN_KEY = 'admin_token';
const USER_KEY  = 'admin_user';

export function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function removeToken() { localStorage.removeItem(TOKEN_KEY); }

export function getAdmin() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}
export function setAdmin(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
export function removeAdmin() { localStorage.removeItem(USER_KEY); }
export function isLoggedIn() { return !!getToken(); }

async function request(url, options = {}) {
  try {
    const config = { headers: { 'Content-Type': 'application/json' }, ...options };
    const token = getToken();
    if (token) config.headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(BASE + url, config);
    let data;
    try { data = await res.json(); } catch { data = { message: '服务器错误: ' + res.status }; }
    if (!res.ok && res.status === 401) { removeToken(); removeAdmin(); }
    return { ok: res.ok, status: res.status, ...data };
  } catch (err) {
    return { ok: false, status: 0, message: '网络请求失败: ' + err.message };
  }
}

// Auth
export function adminLogin(username, password) { return request('/login', { method: 'POST', body: JSON.stringify({ username, password }) }); }
export function getAdminProfile() { return request('/me'); }
export function updateAdminProfile(data) { return request('/me', { method: 'PUT', body: JSON.stringify(data) }); }
export function getAdmins() { return request('/admins'); }
export function createAdmin(data) { return request('/admins', { method: 'POST', body: JSON.stringify(data) }); }
export function updateAdminStatus(id, status) { return request('/admins/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) }); }

// Dashboard
export function getDashboard() { return request('/dashboard'); }

// Users
export function getUsers(params) { return request('/users?' + new URLSearchParams(params).toString()); }
export function getUserDetail(id) { return request('/users/' + id); }
export function updateUserStatus(id, status) { return request('/users/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) }); }
export function deleteUser(id) { return request('/users/' + id, { method: 'DELETE' }); }

// Records
export function getRecords(params) { return request('/records?' + new URLSearchParams(params).toString()); }
export function deleteRecord(id) { return request('/records/' + id, { method: 'DELETE' }); }

// Stats
export function getDailyStats(days) { return request('/stats/daily?days=' + (days || 30)); }
export function getMonthlyStats(year) { return request('/stats/monthly?year=' + (year || new Date().getFullYear())); }
export function getCategoryRanking(type, limit) { return request('/stats/category-ranking?type=' + type + '&limit=' + (limit || 10)); }
export function getUserRanking(limit) { return request('/stats/user-ranking?limit=' + (limit || 10)); }

// Categories
export function getCategories(type) { return request('/categories?type=' + (type || 'expense')); }
export function createCat(data) { return request('/categories', { method: 'POST', body: JSON.stringify(data) }); }
export function updateCat(id, data) { return request('/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteCat(id) { return request('/categories/' + id, { method: 'DELETE' }); }
