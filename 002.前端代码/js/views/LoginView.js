// 登录页
import { router } from '../router.js';
import { isLoggedIn, login, setToken, setCurrentUser } from '../api.js';

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
            <input type="text" id="login-user" class="input" placeholder="请输入用户名" maxlength="20" autocomplete="username">
          </div>
          <div class="input-group">
            <label class="input-label">🔒 密码</label>
            <input type="password" id="login-pass" class="input" placeholder="至少 3 位" maxlength="50" autocomplete="current-password">
          </div>
          <div id="login-err" style="color:var(--color-expense);font-size:13px;text-align:center;min-height:20px;margin-bottom:8px"></div>
          <button id="login-btn" class="btn btn--primary btn--block" style="height:48px;font-size:16px">🌸 登录</button>
        </div>

        <div class="text-center mt-lg" style="font-size:14px">
          <span class="text-secondary">还没有账号？</span>
          <a href="#/register" style="color:var(--color-accent);font-weight:600">立即注册</a>
        </div>
      </div>`;

    document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());
    document.getElementById('login-pass').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
  }

  async handleLogin() {
    const u = document.getElementById('login-user')?.value?.trim();
    const p = document.getElementById('login-pass')?.value?.trim();
    const err = document.getElementById('login-err');
    const btn = document.getElementById('login-btn');

    if (!u) { if (err) err.textContent = '请输入用户名'; return; }
    if (!p || p.length < 3) { if (err) err.textContent = '密码至少 3 位'; return; }
    if (err) err.textContent = '';
    if (btn) { btn.textContent = '登录中...'; btn.disabled = true; }

    const res = await login(u, p);

    if (!res.ok) {
      if (err) err.textContent = res.message || '登录失败，请重试';
      if (btn) { btn.textContent = '🌸 登录'; btn.disabled = false; }
      return;
    }

    // 保存登录状态
    setToken(res.data.token);
    setCurrentUser(res.data.user);

    // 显示 TabBar 并直接跳转记账页
    const tb = document.getElementById('tab-bar');
    if (tb) tb.style.display = 'flex';
    window.location.hash = '#/record';
  }

  destroy() {}
}
