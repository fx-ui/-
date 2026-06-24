// API 请求工具
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('auth_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('auth_token', token);
  else localStorage.removeItem('auth_token');
}

export function getAuthHeader() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

export const api = {
  /** 注册 */
  register(username, password) {
    return request('POST', '/auth/register', { username, password });
  },
  /** 登录 */
  login(username, password) {
    return request('POST', '/auth/login', { username, password });
  },
  /** 获取当前用户 */
  getMe() {
    return request('GET', '/auth/me');
  },
  /** 更新用户偏好 */
  updateProfile(data) {
    return request('PUT', '/auth/profile', data);
  },
};
