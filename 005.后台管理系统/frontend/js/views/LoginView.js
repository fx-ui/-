import { adminLogin, isLoggedIn } from '../api.js';

export class LoginView {
  constructor(container) {
    this.container = container;
  }

  mount() {
    // Redirect if already logged in
    if (isLoggedIn()) {
      window.location.hash = '#/dashboard';
      return;
    }

    this.container.innerHTML = `
      <div class="login-box">
        <div class="login-card">
          <h1 class="fw tc mb24" style="font-size:22px">&#x1F527; 后台管理系统</h1>
          <div class="ig">
            <label class="il" for="login-user">用户名</label>
            <input class="inp" id="login-user" type="text" placeholder="请输入管理员用户名" autocomplete="username">
          </div>
          <div class="ig">
            <label class="il" for="login-pass">密码</label>
            <input class="inp" id="login-pass" type="password" placeholder="请输入密码" autocomplete="current-password">
          </div>
          <div id="login-err" style="color:var(--ex);font-size:13px;margin-bottom:12px;display:none"></div>
          <button class="btn btn-p btn-b" id="login-btn">登 录</button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const userEl = this.container.querySelector('#login-user');
    const passEl = this.container.querySelector('#login-pass');
    const errEl = this.container.querySelector('#login-err');
    const btnEl = this.container.querySelector('#login-btn');

    const doLogin = async () => {
      const username = userEl.value.trim();
      const password = passEl.value.trim();

      if (!username || !password) {
        errEl.textContent = '请输入用户名和密码';
        errEl.style.display = 'block';
        return;
      }

      btnEl.disabled = true;
      btnEl.textContent = '登录中...';
      errEl.style.display = 'none';

      try {
        const res = await adminLogin(username, password);
        if (res.ok && res.data) {
          localStorage.setItem('admin_token', res.data.token);
          localStorage.setItem('admin_user', JSON.stringify(res.data.admin));
          window.location.hash = '#/dashboard';
        } else {
          errEl.textContent = res.message || '登录失败，请检查用户名和密码';
          errEl.style.display = 'block';
        }
      } catch (e) {
        errEl.textContent = '网络错误，请稍后再试';
        errEl.style.display = 'block';
      } finally {
        btnEl.disabled = false;
        btnEl.textContent = '登 录';
      }
    };

    btnEl.addEventListener('click', doLogin);

    // Enter key on password field triggers login
    passEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });

    // Enter on username also moves to password or triggers login
    userEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') passEl.focus();
    });
  }
}
