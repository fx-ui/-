// 认证状态管理
import { api, setToken, getAuthHeader } from './utils/api.js';

export class AuthStore {
  static user = null;
  static isLoggedIn = false;
  static listeners = [];

  /** 监听登录状态变化 */
  static onChange(cb) {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }

  static notify() {
    this.listeners.forEach(cb => cb(this.isLoggedIn, this.user));
  }

  /** 检查是否已登录（通过 token 验证） */
  static async checkLogin() {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    try {
      const data = await api.getMe();
      this.user = data.user;
      this.isLoggedIn = true;
      this.notify();
      return true;
    } catch {
      // token 过期或无效
      localStorage.removeItem('auth_token');
      this.user = null;
      this.isLoggedIn = false;
      this.notify();
      return false;
    }
  }

  /** 登录 */
  static async login(username, password) {
    const data = await api.login(username, password);
    setToken(data.token);
    this.user = data.user;
    this.isLoggedIn = true;
    this.notify();
    return data;
  }

  /** 注册 */
  static async register(username, password) {
    const data = await api.register(username, password);
    setToken(data.token);
    this.user = data.user;
    this.isLoggedIn = true;
    this.notify();
    return data;
  }

  /** 登出 */
  static logout() {
    setToken(null);
    this.user = null;
    this.isLoggedIn = false;
    this.notify();
  }

  /** 更新用户偏好 */
  static async updateProfile(data) {
    const result = await api.updateProfile(data);
    this.user = { ...this.user, ...result.user };
    this.notify();
    return result;
  }
}
