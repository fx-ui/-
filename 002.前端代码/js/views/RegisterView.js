// 注册页
import { router } from '../router.js';
import { isLoggedIn, register, setToken, setCurrentUser } from '../api.js?v=14';

export class RegisterView {
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
        <div style="font-size:56px;margin-bottom:12px">🌟</div>
        <div style="font-size:24px;font-weight:700;color:var(--color-primary-dark);margin-bottom:4px">创建账号</div>
        <div class="text-secondary mb-lg" style="font-size:14px">开始你的记账之旅吧～</div>

        <div class="card" style="width:100%;max-width:320px">
          <div class="input-group">
            <label class="input-label">👤 用户名</label>
            <input type="text" id="reg-user" class="input" placeholder="2-20个字符" maxlength="20" autocomplete="username">
          </div>
          <div class="input-group">
            <label class="input-label">🔒 密码</label>
            <input type="password" id="reg-pass" class="input" placeholder="至少 3 位" maxlength="50" autocomplete="new-password">
          </div>
          <div class="input-group">
            <label class="input-label">🔒 确认密码</label>
            <input type="password" id="reg-pass2" class="input" placeholder="再次输入密码" maxlength="50" autocomplete="new-password">
          </div>
          <div id="reg-err" style="color:var(--color-expense);font-size:13px;text-align:center;min-height:20px;margin-bottom:8px"></div>
          <button id="reg-btn" class="btn btn--primary btn--block" style="height:48px;font-size:16px">🌟 注册</button>
        </div>

        <div class="text-center mt-lg" style="font-size:14px">
          <span class="text-secondary">已有账号？</span>
          <a href="#/login" style="color:var(--color-accent);font-weight:600">立即登录</a>
        </div>
      </div>`;

    document.getElementById('reg-btn').addEventListener('click', () => this.handleRegister());
    document.getElementById('reg-pass2').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleRegister();
    });
  }

  async handleRegister() {
    const u  = document.getElementById('reg-user')?.value?.trim();
    const p  = document.getElementById('reg-pass')?.value?.trim();
    const p2 = document.getElementById('reg-pass2')?.value?.trim();
    const err = document.getElementById('reg-err');
    const btn = document.getElementById('reg-btn');

    if (!u || u.length < 2) { if (err) err.textContent = '用户名至少 2 个字符'; return; }
    if (!p || p.length < 3) { if (err) err.textContent = '密码至少 3 位'; return; }
    if (p !== p2) { if (err) err.textContent = '两次密码不一致'; return; }
    if (err) err.textContent = '';
    if (btn) { btn.textContent = '注册中...'; btn.disabled = true; }

    const res = await register(u, p);

    if (!res.ok) {
      if (err) err.textContent = res.message || '注册失败，请重试';
      if (btn) { btn.textContent = '🌟 注册'; btn.disabled = false; }
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
