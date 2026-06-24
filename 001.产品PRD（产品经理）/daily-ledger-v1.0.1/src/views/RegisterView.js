// 注册页面
import { AuthStore } from '../auth.js';
import { router } from '../router.js';

export class RegisterView {
  constructor(container) {
    this.container = container;
    this.loading = false;
  }

  mount() {
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
        <div style="font-size:56px;margin-bottom:8px">🌟</div>
        <div style="font-size:24px;font-weight:700;color:var(--color-primary-dark);margin-bottom:4px">创建账号</div>
        <div class="text-secondary mb-lg" style="font-size:13px">开始你的记账之旅吧～</div>

        <div class="card" style="width:100%;max-width:320px">
          <div class="input-group">
            <label class="input-label">👤 用户名</label>
            <input type="text" id="reg-username" class="input" placeholder="2-20个字符" maxlength="20" autocomplete="username">
          </div>
          <div class="input-group">
            <label class="input-label">🔒 密码</label>
            <input type="password" id="reg-password" class="input" placeholder="至少 6 位密码" maxlength="50" autocomplete="new-password">
          </div>
          <div class="input-group">
            <label class="input-label">🔒 确认密码</label>
            <input type="password" id="reg-password2" class="input" placeholder="再次输入密码" maxlength="50" autocomplete="new-password">
          </div>
          <div id="reg-error" class="text-center mb-md" style="color:var(--color-expense);font-size:13px;display:none"></div>
          <button class="btn btn--primary btn--block" id="reg-btn" style="height:48px;font-size:16px">
            🌸 注册
          </button>
        </div>

        <div class="text-center mt-lg" style="font-size:14px">
          <span class="text-secondary">已有账号？</span>
          <a href="#/login" style="color:var(--color-accent);font-weight:600">立即登录</a>
        </div>
      </div>`;
  }

  bindEvents() {
    const usernameInput = this.container.querySelector('#reg-username');
    const passwordInput = this.container.querySelector('#reg-password');
    const password2Input = this.container.querySelector('#reg-password2');
    const errorDiv = this.container.querySelector('#reg-error');
    const regBtn = this.container.querySelector('#reg-btn');

    const doRegister = async () => {
      if (this.loading) return;
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();
      const password2 = password2Input.value.trim();

      if (!username) { this.showError(errorDiv, '请输入用户名'); usernameInput.focus(); return; }
      if (username.length < 2) { this.showError(errorDiv, '用户名至少 2 个字符'); usernameInput.focus(); return; }
      if (!password) { this.showError(errorDiv, '请输入密码'); passwordInput.focus(); return; }
      if (password.length < 6) { this.showError(errorDiv, '密码至少 6 位'); passwordInput.focus(); return; }
      if (password !== password2) { this.showError(errorDiv, '两次输入密码不一致'); password2Input.focus(); return; }

      this.loading = true;
      regBtn.textContent = '注册中...';
      regBtn.disabled = true;
      errorDiv.style.display = 'none';

      try {
        const result = await AuthStore.register(username, password);
        this.showWelcome(result.user.username);
      } catch (err) {
        this.showError(errorDiv, err.message);
        this.loading = false;
        regBtn.textContent = '🌸 注册';
        regBtn.disabled = false;
      }
    };

    regBtn.addEventListener('click', doRegister);
    password2Input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doRegister(); });
  }

  showWelcome(username) {
    this.container.innerHTML = `
      <div class="view active" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:85dvh;animation:fade-in 0.4s ease">
        <div style="font-size:72px;animation:bounce-in 0.6s cubic-bezier(0.25,0.8,0.25,1)">🌟</div>
        <div style="font-size:22px;font-weight:700;color:var(--color-primary-dark);margin-top:16px;animation:fade-in 0.5s ease 0.2s both">
          欢迎加入，${username}
        </div>
        <div style="font-size:14px;color:var(--color-text-secondary);margin-top:8px;animation:fade-in 0.5s ease 0.4s both">
          马上开始你的第一笔记账吧～
        </div>
      </div>`;

    const tabBar = document.getElementById('tab-bar');
    if (tabBar) tabBar.style.display = 'flex';

    setTimeout(() => {
      router.navigate('#/record');
    }, 1200);
  }

  showError(el, msg) {
    el.textContent = msg;
    el.style.display = 'block';
  }

  destroy() {}
}
