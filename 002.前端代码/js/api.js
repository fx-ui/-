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
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  // 自动附加 Authorization header
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(BASE + url, config);
  const data = await res.json();

  if (!res.ok && res.status === 401) {
    // Token 过期或无效 — 清除登录状态
    removeToken();
    removeCurrentUser();
  }

  return { ok: res.ok, status: res.status, ...data };
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
