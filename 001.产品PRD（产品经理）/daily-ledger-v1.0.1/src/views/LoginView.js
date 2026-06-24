// 登录页面
import { AuthStore } from '../auth.js';
import { router } from '../router.js';

export class LoginView {
  constructor(container) {
    this.container = container;
    this.loading = false;
  }

  mount() {
    // 如果已经登录，直接跳转
    if (AuthStore.isLoggedIn) {
      router.navigate('#/record');
      return;
    }
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="view active" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:85dvh;padding:32px">
        <div style="font-size:64px;margin-bottom:8px">🌸</div>
        <div style="font-size:24px;font-weight:700;color:var(--color-primary-dark);margin-bottom:4px">每日记账</div>
        <div class="text-secondary mb-lg" style="font-size:13px">粉嫩可爱的个人财务管理工具</div>

        <div class="card" style="width:100%;max-width:320px">
          <div class="input-group">
            <label class="input-label">👤 用户名</label>
            <input type="text" id="login-username" class="input" placeholder="请输入用户名" maxlength="20" autocomplete="username">
          </div>
          <div class="input-group">
            <label class="input-label">🔒 密码</label>
            <input type="password" id="login-password" class="input" placeholder="请输入密码" maxlength="50" autocomplete="current-password">
          </div>
          <div id="login-error" class="text-center mb-md" style="color:var(--color-expense);font-size:13px;display:none"></div>
          <button class="btn btn--primary btn--block" id="login-btn" style="height:48px;font-size:16px">
            🌸 登录
          </button>
        </div>

        <div class="text-center mt-lg" style="font-size:14px">
          <span class="text-secondary">还没有账号？</span>
          <a href="#/register" style="color:var(--color-accent);font-weight:600">立即注册</a>
        </div>

        <div class="text-center mt-lg">
          <button id="skip-login" class="btn--ghost" style="font-size:13px;color:var(--color-text-light)">
            暂不登录，离线使用
          </button>
        </div>
      </div>`;
  }

  bindEvents() {
    const usernameInput = this.container.querySelector('#login-username');
    const passwordInput = this.container.querySelector('#login-password');
    const errorDiv = this.container.querySelector('#login-error');
    const loginBtn = this.container.querySelector('#login-btn');

    const doLogin = async () => {
      if (this.loading) return;
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      if (!username) { this.showError(errorDiv, '请输入用户名'); usernameInput.focus(); return; }
      if (!password) { this.showError(errorDiv, '请输入密码'); passwordInput.focus(); return; }
      if (password.length < 6) { this.showError(errorDiv, '密码至少 6 位'); passwordInput.focus(); return; }

      this.loading = true;
      loginBtn.textContent = '登录中...';
      loginBtn.disabled = true;
      errorDiv.style.display = 'none';

      try {
        const result = await AuthStore.login(username, password);
        // 登录成功 → 显示欢迎 → 跳转
        this.showWelcome(result.user.username);
      } catch (err) {
        this.showError(errorDiv, err.message);
        this.loading = false;
        loginBtn.textContent = '🌸 登录';
        loginBtn.disabled = false;
      }
    };

    loginBtn.addEventListener('click', doLogin);
    passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

    this.container.querySelector('#skip-login')?.addEventListener('click', () => {
      router.navigate('#/record');
    });
  }

  showWelcome(username) {
    // 替换整个页面为欢迎动画
    this.container.innerHTML = `
      <div class="view active" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:85dvh;animation:fade-in 0.4s ease">
        <div style="font-size:72px;animation:bounce-in 0.6s cubic-bezier(0.25,0.8,0.25,1)">🌸</div>
        <div style="font-size:22px;font-weight:700;color:var(--color-primary-dark);margin-top:16px;animation:fade-in 0.5s ease 0.2s both">
          欢迎回来，${username}
        </div>
        <div style="font-size:14px;color:var(--color-text-secondary);margin-top:8px;animation:fade-in 0.5s ease 0.4s both">
          正在进入记账本...
        </div>
      </div>`;

    // 显示 TabBar
    const tabBar = document.getElementById('tab-bar');
    if (tabBar) tabBar.style.display = 'flex';

    // 短暂停留后跳转
    setTimeout(() => {
      router.navigate('#/record');
    }, 1000);
  }

  showError(el, msg) {
    el.textContent = msg;
    el.style.display = 'block';
  }

  destroy() {}
}
