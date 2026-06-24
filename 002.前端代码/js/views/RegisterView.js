// 注册页
import { router } from '../router.js';
import { isLoggedIn, doLogin } from './LoginView.js';

export class RegisterView {
  constructor(container) {
    this.container = container;
  }

  mount() {
    if (isLoggedIn()) { router.go('#/record'); return; }
    this.render();
  }

  render() {
    const self = this;

    this.container.innerHTML = `
      <div class="view active" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90dvh;padding:32px">
        <div style="font-size:56px;margin-bottom:12px">🌟</div>
        <div style="font-size:24px;font-weight:700;color:var(--color-primary-dark);margin-bottom:4px">创建账号</div>
        <div class="text-secondary mb-lg" style="font-size:14px">开始你的记账之旅吧～</div>

        <div class="card" style="width:100%;max-width:320px">
          <div class="input-group">
            <label class="input-label">👤 用户名</label>
            <input type="text" id="reg-user" class="input" placeholder="2-20个字符" maxlength="20">
          </div>
          <div class="input-group">
            <label class="input-label">🔒 密码</label>
            <input type="password" id="reg-pass" class="input" placeholder="至少 3 位" maxlength="50">
          </div>
          <div class="input-group">
            <label class="input-label">🔒 确认密码</label>
            <input type="password" id="reg-pass2" class="input" placeholder="再次输入密码" maxlength="50">
          </div>
          <div id="reg-err" style="color:var(--color-expense);font-size:13px;text-align:center;min-height:20px;margin-bottom:8px"></div>
          <button class="btn btn--primary btn--block" style="height:48px;font-size:16px"
            onclick="window._regSubmit()">🌟 注册</button>
        </div>

        <div class="text-center mt-lg" style="font-size:14px">
          <span class="text-secondary">已有账号？</span>
          <a href="#/login" style="color:var(--color-accent);font-weight:600">立即登录</a>
        </div>
      </div>`;

    window._regSubmit = function () {
      const u = document.getElementById('reg-user')?.value?.trim();
      const p = document.getElementById('reg-pass')?.value?.trim();
      const p2 = document.getElementById('reg-pass2')?.value?.trim();
      const err = document.getElementById('reg-err');

      if (!u || u.length < 2) { if (err) err.textContent = '用户名至少 2 个字符'; return; }
      if (!p || p.length < 3) { if (err) err.textContent = '密码至少 3 位'; return; }
      if (p !== p2) { if (err) err.textContent = '两次密码不一致'; return; }
      if (err) err.textContent = '';

      doLogin(u);

      self.container.innerHTML = `
        <div class="view active" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90dvh">
          <div style="font-size:72px;animation:bounceIn .5s var(--ease)">🌟</div>
          <div style="font-size:22px;font-weight:700;color:var(--color-primary-dark);margin-top:16px">欢迎加入，${u}</div>
          <div style="font-size:14px;color:var(--color-text-secondary);margin-top:8px">马上开始第一笔记账吧～</div>
        </div>`;

      const tb = document.getElementById('tab-bar');
      if (tb) tb.style.display = 'flex';

      setTimeout(() => { router.go('#/record'); }, 800);
    };
  }

  destroy() { delete window._regSubmit; }
}
