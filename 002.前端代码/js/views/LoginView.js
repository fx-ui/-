// 登录页
import { router } from '../router.js';

const KEY = 'dl_user';

export function isLoggedIn()      { return !!localStorage.getItem(KEY); }
export function getCurrentUser()  { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
export function doLogin(u)        { localStorage.setItem(KEY, JSON.stringify({ username: u })); }
export function doLogout()        { localStorage.removeItem(KEY); }

export class LoginView {
  constructor(container) {
    this.container = container;
  }

  mount() {
    if (isLoggedIn()) { router.go('#/record'); return; }
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="view active" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90dvh;padding:32px">
        <div style="font-size:72px;margin-bottom:12px">🌸</div>
        <div style="font-size:26px;font-weight:700;color:var(--color-primary-dark);margin-bottom:4px">每日记账</div>
        <div class="text-secondary mb-lg" style="font-size:14px">粉嫩可爱 · 轻量记账</div>

        <div class="card" style="width:100%;max-width:320px">
          <div class="input-group">
            <label class="input-label">👤 用户名</label>
            <input type="text" id="login-user" class="input" placeholder="请输入用户名" maxlength="20">
          </div>
          <div class="input-group">
            <label class="input-label">🔒 密码</label>
            <input type="password" id="login-pass" class="input" placeholder="至少 3 位" maxlength="50">
          </div>
          <div id="login-err" style="color:var(--color-expense);font-size:13px;text-align:center;min-height:20px;margin-bottom:8px"></div>
          <button class="btn btn--primary btn--block" style="height:48px;font-size:16px"
            onclick="window._loginSubmit()">🌸 登录</button>
        </div>

        <div class="text-center mt-lg" style="font-size:14px">
          <span class="text-secondary">还没有账号？</span>
          <a href="#/register" style="color:var(--color-accent);font-weight:600">立即注册</a>
        </div>
      </div>`;

    // 把提交函数挂到 window 上，让 onclick 能调用
    const self = this;
    window._loginSubmit = function () {
      const u = document.getElementById('login-user')?.value?.trim();
      const p = document.getElementById('login-pass')?.value?.trim();
      const err = document.getElementById('login-err');
      const btn = document.querySelector('#login-btn') || document.querySelector('.btn--primary');

      if (!u) { if (err) err.textContent = '请输入用户名'; return; }
      if (!p || p.length < 3) { if (err) err.textContent = '密码至少 3 位'; return; }
      if (err) err.textContent = '';
      if (btn) { btn.textContent = '登录中...'; btn.disabled = true; }

      doLogin(u);

      // 欢迎动画
      self.container.innerHTML = `
        <div class="view active" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90dvh">
          <div style="font-size:72px;animation:bounceIn .5s var(--ease)">🌸</div>
          <div style="font-size:22px;font-weight:700;color:var(--color-primary-dark);margin-top:16px">欢迎回来，${u}</div>
          <div style="font-size:14px;color:var(--color-text-secondary);margin-top:8px">正在进入记账本...</div>
        </div>`;

      // TabBar 出现
      const tb = document.getElementById('tab-bar');
      if (tb) tb.style.display = 'flex';

      setTimeout(() => { router.go('#/record'); }, 800);
    };
  }

  destroy() { delete window._loginSubmit; }
}
