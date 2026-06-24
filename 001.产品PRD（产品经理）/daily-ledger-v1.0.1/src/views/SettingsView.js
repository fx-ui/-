// 我的 Tab — 设置菜单
import { getSetting, setSetting } from '../db.js';
import { store, EVENTS } from '../store.js';
import { router } from '../router.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { AuthStore } from '../auth.js';

export class SettingsView {
  constructor(container) {
    this.container = container;
    // 监听登录状态
    this._unsub = AuthStore.onChange(() => this.mount());
  }

  async mount() {
    const role = (await getSetting('role')) || 'personal';
    const largeFont = (await getSetting('largeFontMode')) === true || (await getSetting('largeFontMode')) === 'true';
    const isLoggedIn = AuthStore.isLoggedIn;
    const user = AuthStore.user;

    const menuItems = [
      { icon: '🏦', bg: '#FFD6E0', label: '账户管理', hash: '#/accounts' },
      { icon: '🎯', bg: '#FFD166', label: '预算设置', hash: '#/budget' },
      { icon: '📂', bg: '#B8E6D0', label: '分类管理', hash: '#/categories' },
      { icon: '⚡', bg: '#C599E8', label: '记账模板', hash: '#/templates' },
      { icon: '📤', bg: '#FFB6C1', label: '数据管理', hash: '#/export' },
    ];

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <span class="page-header__title">👤 我的</span>
        </div>

        <!-- 用户信息卡片 -->
        ${isLoggedIn && user ? `
          <div class="card mb-lg" style="background:linear-gradient(135deg, var(--color-primary-light), var(--color-bg));text-align:center">
            <div style="font-size:48px;margin-bottom:8px">🌸</div>
            <div style="font-size:var(--font-size-lg);font-weight:700;color:var(--color-primary-dark)">${user.username}</div>
            <div class="text-secondary" style="font-size:12px;margin-top:4px">
              已登录 · 数据可云端同步
            </div>
            <div style="display:flex;gap:12px;justify-content:center;margin-top:12px">
              <button class="btn btn--sm btn--outline" id="settings-logout">🚪 退出登录</button>
            </div>
          </div>
        ` : `
          <div class="card mb-lg" style="background:linear-gradient(135deg, var(--color-primary-light), var(--color-bg));text-align:center;padding:24px">
            <div style="font-size:40px;margin-bottom:8px">🔐</div>
            <div style="font-weight:600;margin-bottom:4px">登录后享受更多功能</div>
            <div class="text-secondary" style="font-size:12px;margin-bottom:16px">云端同步 · 多设备访问 · 数据永不丢失</div>
            <div style="display:flex;gap:12px;justify-content:center">
              <a href="#/login" class="btn btn--sm btn--primary">🌸 登录</a>
              <a href="#/register" class="btn btn--sm btn--outline">🌟 注册</a>
            </div>
          </div>
        `}

        <!-- 角色切换 -->
        <div class="card mb-lg">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-semibold">记账模式</div>
              <div class="text-secondary" style="font-size:12px">切换个人/小微经营分类体系</div>
            </div>
            <select id="role-select" class="input" style="width:120px;height:40px">
              <option value="personal" ${role === 'personal' ? 'selected' : ''}>🏠 个人</option>
              <option value="business" ${role === 'business' ? 'selected' : ''}>🏪 小微经营</option>
            </select>
          </div>
        </div>

        <!-- 功能菜单 -->
        <div class="settings-menu mb-lg">
          ${menuItems.map(item => `
            <a href="${item.hash}" class="settings-menu__item">
              <div class="settings-menu__left">
                <div class="settings-menu__icon" style="background:${item.bg}">${item.icon}</div>
                <span class="settings-menu__label">${item.label}</span>
              </div>
              <span class="settings-menu__right">›</span>
            </a>
          `).join('')}
        </div>

        <!-- 偏好设置 -->
        <div class="card mb-lg">
          <div class="card__title">偏好设置</div>
          <div class="flex items-center justify-between mb-md">
            <span>🔤 大字模式</span>
            <button id="toggle-font" class="btn btn--sm ${largeFont ? 'btn--primary' : 'btn--outline'}">
              ${largeFont ? '已开启' : '已关闭'}
            </button>
          </div>
        </div>

        <!-- 关于 -->
        <div class="card">
          <div class="text-center text-secondary" style="font-size:12px;line-height:2">
            🌸 每日记账 V1.0.1<br>
            粉嫩可爱的个人财务管理工具<br>
            ${isLoggedIn ? '已登录 · 数据支持云端同步' : '数据仅存储在你的浏览器中'}
          </div>
        </div>

        <div style="height:24px"></div>
      </div>`;

    // 退出登录
    this.container.querySelector('#settings-logout')?.addEventListener('click', async () => {
      const confirmed = await Modal.confirm({
        title: '退出登录',
        content: '退出后本地数据不会丢失，下次登录可继续使用。',
        confirmText: '退出',
        cancelText: '取消',
      });
      if (confirmed) {
        AuthStore.logout();
        Toast.show('已退出登录，本地数据不受影响', 'info');
        // 重新渲染由 onChange 自动触发
      }
    });

    // 角色切换
    this.container.querySelector('#role-select')?.addEventListener('change', async (e) => {
      await setSetting('role', e.target.value);
      store.emit(EVENTS.ROLE_CHANGED, e.target.value);
      store.emit(EVENTS.SETTINGS_CHANGED);
      // 已登录则同步偏好到云端
      if (AuthStore.isLoggedIn) {
        AuthStore.updateProfile({ role: e.target.value }).catch(() => {});
      }
      Toast.show('已切换记账模式', 'info');
    });

    // 大字模式
    this.container.querySelector('#toggle-font')?.addEventListener('click', async () => {
      const current = (await getSetting('largeFontMode')) === true || (await getSetting('largeFontMode')) === 'true';
      await setSetting('largeFontMode', !current);
      store.emit(EVENTS.SETTINGS_CHANGED);
      if (AuthStore.isLoggedIn) {
        AuthStore.updateProfile({ largeFontMode: !current }).catch(() => {});
      }
      // 不需要重新 mount，CSS 变量会自动切换；但按钮文字需要更新
      this.mount();
    });
  }

  destroy() {
    if (this._unsub) this._unsub();
  }
}
