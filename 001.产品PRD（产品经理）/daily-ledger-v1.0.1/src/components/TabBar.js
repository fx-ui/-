import { router } from '../router.js';

// 底部导航栏
export class TabBar {
  constructor(container) {
    this.container = container;
  }

  tabs = [
    { hash: '#/record',  icon: '📝', label: '记账' },
    { hash: '#/bills',   icon: '📋', label: '账单' },
    { hash: '#/stats',   icon: '📊', label: '统计' },
    { hash: '#/settings',icon: '👤', label: '我的' },
  ];

  mount() {
    this.render();
    this.updateActive();
    window.addEventListener('hashchange', () => this.updateActive());
  }

  render() {
    this.container.innerHTML = this.tabs.map(tab => `
      <div class="tab-bar__item" data-hash="${tab.hash}">
        <span class="tab-bar__icon">${tab.icon}</span>
        <span class="tab-bar__label">${tab.label}</span>
      </div>
    `).join('');

    // 事件委托
    this.container.querySelectorAll('.tab-bar__item').forEach(el => {
      el.addEventListener('click', () => {
        const hash = el.dataset.hash;
        if (window.location.hash === hash) return;
        router.navigate(hash);
      });
    });
  }

  updateActive() {
    const current = window.location.hash || '#/record';
    this.container.querySelectorAll('.tab-bar__item').forEach(el => {
      const isActive = el.dataset.hash === current ||
        (el.dataset.hash === '#/record' && (current.startsWith('#/record') || current === '#/'));
      el.classList.toggle('active', isActive);
    });
  }
}
