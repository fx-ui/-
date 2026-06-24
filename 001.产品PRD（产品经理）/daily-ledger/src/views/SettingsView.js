// 我的 Tab — 设置菜单
import { getSetting, setSetting } from '../db.js';
import { store, EVENTS } from '../store.js';
import { router } from '../router.js';
import { Toast } from '../components/Toast.js';

export class SettingsView {
  constructor(container) {
    this.container = container;
  }

  async mount() {
    const role = (await getSetting('role')) || 'personal';
    const largeFont = (await getSetting('largeFontMode')) === true || (await getSetting('largeFontMode')) === 'true';

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
            🌸 每日记账 V1.0<br>
            粉嫩可爱的个人财务管理工具<br>
            数据仅存储在你的浏览器中
          </div>
        </div>

        <div style="height:24px"></div>
      </div>`;

    // 角色切换
    this.container.querySelector('#role-select')?.addEventListener('change', async (e) => {
      await setSetting('role', e.target.value);
      store.emit(EVENTS.ROLE_CHANGED, e.target.value);
      store.emit(EVENTS.SETTINGS_CHANGED);
      Toast.show('已切换记账模式', 'info');
    });

    // 大字模式
    this.container.querySelector('#toggle-font')?.addEventListener('click', async () => {
      const current = (await getSetting('largeFontMode')) === true || (await getSetting('largeFontMode')) === 'true';
      await setSetting('largeFontMode', !current);
      store.emit(EVENTS.SETTINGS_CHANGED);
      this.mount();
    });
  }

  destroy() {}
}
