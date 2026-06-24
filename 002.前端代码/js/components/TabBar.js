// 底部导航栏
export class TabBar {
  constructor(container) {
    this.el = container;
    this.tabs = [
      { hash: '#/record',  icon: '📝', label: '记账' },
      { hash: '#/bills',   icon: '📋', label: '账单' },
      { hash: '#/stats',   icon: '📊', label: '统计' },
      { hash: '#/settings',icon: '👤', label: '我的' },
    ];
  }

  mount() {
    this.el.innerHTML = this.tabs.map(t => `
      <div class="tab-bar__item" data-hash="${t.hash}">
        <span class="tab-bar__icon">${t.icon}</span>
        <span class="tab-bar__label">${t.label}</span>
      </div>
    `).join('');

    this.el.querySelectorAll('.tab-bar__item').forEach(el => {
      el.addEventListener('click', () => {
        window.location.hash = el.dataset.hash;
      });
    });

    this.update();
    window.addEventListener('hashchange', () => this.update());
  }

  update() {
    const h = window.location.hash || '#/record';
    this.el.querySelectorAll('.tab-bar__item').forEach(el => {
      const match = el.dataset.hash === h || (el.dataset.hash === '#/record' && (h === '#/record' || h === '#/'));
      el.classList.toggle('active', match);
    });
  }
}
