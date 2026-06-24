// 账单列表页
import { store, EV } from '../store.js';
import { findCategory } from '../data/categories.js';
import { fmtMoney, fmtDateCN, fmtMonthCN } from '../utils/format.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export class BillListView {
  constructor(container) {
    this.container = container;
    this.month = new Date().toISOString().slice(0, 7);
    this.filter = 'all';    // 'all'|'expense'|'income'
    this.keyword = '';
    this._onChange = null;
  }

  mount() {
    this._onChange = () => this.render();
    store.on(EV.RECORD_CHANGED, this._onChange);
    this.render();
  }

  getFiltered() {
    let list = store.records.filter(r => r.date.startsWith(this.month));
    if (this.filter !== 'all') list = list.filter(r => r.type === this.filter);
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => {
        const cat = findCategory(r.categoryId);
        return (r.note || '').toLowerCase().includes(kw) || (cat?.name || '').toLowerCase().includes(kw);
      });
    }
    return list;
  }

  render() {
    const list = this.getFiltered();
    const totalOut = list.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const totalIn = list.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);

    // 日期分组
    const groups = {};
    list.forEach(r => {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    this.container.innerHTML = `
      <div class="view active">
        <!-- 月份切换 -->
        <div class="month-switcher">
          <button class="month-switcher__btn" id="bill-prev">◀</button>
          <span class="month-switcher__label">${fmtMonthCN(this.month)}</span>
          <button class="month-switcher__btn" id="bill-next">▶</button>
        </div>

        <!-- 汇总 -->
        <div class="summary-row">
          <div class="summary-card"><div class="summary-card__label">💸 支出</div><div class="summary-card__value expense">${fmtMoney(totalOut)}</div></div>
          <div class="summary-card"><div class="summary-card__label">💰 收入</div><div class="summary-card__value income">${fmtMoney(totalIn)}</div></div>
          <div class="summary-card"><div class="summary-card__label">💜 结余</div><div class="summary-card__value balance">${fmtMoney(totalIn - totalOut)}</div></div>
        </div>

        <!-- 搜索 -->
        <div class="search-bar">
          <span class="search-bar__icon">🔍</span>
          <input type="text" class="search-bar__input" id="bill-search" placeholder="搜索备注或分类..." value="${this.keyword}">
        </div>

        <!-- 筛选 -->
        <div class="filter-chips">
          <button class="filter-chip ${this.filter === 'all' ? 'active' : ''}" data-f="all">全部</button>
          <button class="filter-chip ${this.filter === 'expense' ? 'active' : ''}" data-f="expense">💸 支出</button>
          <button class="filter-chip ${this.filter === 'income' ? 'active' : ''}" data-f="income">💰 收入</button>
        </div>

        <!-- 列表 -->
        <div id="bill-list" class="mt-md">
          ${list.length === 0 ? this.emptyHTML() : dates.map(d => `
            <div class="bill-date-header">
              <span class="bill-date-header__date">${fmtDateCN(d)}</span>
              <span class="bill-date-header__total">
                ${groups[d].filter(r => r.type === 'expense').length ? `支出 ${fmtMoney(groups[d].filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0))}` : ''}
                ${groups[d].filter(r => r.type === 'expense').length && groups[d].filter(r => r.type === 'income').length ? ' · ' : ''}
                ${groups[d].filter(r => r.type === 'income').length ? `收入 ${fmtMoney(groups[d].filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0))}` : ''}
              </span>
            </div>
            ${groups[d].map(r => {
              const cat = findCategory(r.categoryId);
              return `
                <div class="bill-item" data-id="${r.id}" data-date="${r.date}">
                  <div class="bill-item__icon">${cat?.icon || '📌'}</div>
                  <div class="bill-item__info">
                    <div class="bill-item__category">${cat?.name || '未知'}</div>
                    ${r.note ? `<div class="bill-item__note">${r.note}</div>` : ''}
                  </div>
                  <div class="bill-item__amount ${r.type === 'expense' ? 'text-expense' : 'text-income'}">
                    ${r.type === 'expense' ? '-' : '+'}${fmtMoney(r.amount).replace('¥', '')}
                  </div>
                  <div class="bill-item__delete">删除</div>
                </div>`;
            }).join('')}
          `).join('')}
        </div>
      </div>`;

    this.bind();
    this.bindSwipe();
  }

  emptyHTML() {
    return `<div class="empty-state">
      <div class="empty-state__icon">📋</div>
      <div class="empty-state__title">还没有账单</div>
      <div class="empty-state__text">去记账页开始记录吧～🌸</div>
      <a href="#/record" class="btn btn--primary mt-lg">去记账</a>
    </div>`;
  }

  bind() {
    // 月份
    this.container.querySelector('#bill-prev')?.addEventListener('click', () => {
      const [y, m] = this.month.split('-').map(Number);
      this.month = `${y - (m === 1 ? 1 : 0)}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
      this.render();
    });
    this.container.querySelector('#bill-next')?.addEventListener('click', () => {
      const [y, m] = this.month.split('-').map(Number);
      this.month = `${y + (m === 12 ? 1 : 0)}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
      this.render();
    });

    // 搜索
    let t;
    this.container.querySelector('#bill-search')?.addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { this.keyword = e.target.value.trim(); this.render(); }, 300);
    });

    // 筛选
    this.container.querySelectorAll('.filter-chip').forEach(c => {
      c.addEventListener('click', () => { this.filter = c.dataset.f; this.render(); });
    });
  }

  bindSwipe() {
    let startX = 0;
    this.container.querySelectorAll('.bill-item').forEach(item => {
      item.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
      item.addEventListener('touchmove', (e) => {
        const dx = e.touches[0].clientX - startX;
        if (dx < 0) { item.style.transform = `translateX(${Math.max(dx, -72)}px)`; item.style.transition = 'none'; }
      }, { passive: true });
      item.addEventListener('touchend', (e) => {
        const dx = (e.changedTouches[0]?.clientX || startX) - startX;
        item.style.transition = 'transform .2s';
        item.style.transform = dx < -40 ? 'translateX(-72px)' : 'translateX(0)';
      });

      // 删除按钮
      item.querySelector('.bill-item__delete')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(item.dataset.id);
        const ok = await Modal.confirm({ title: '确认删除', content: '删除后无法恢复哦～', confirmText: '删除', isDanger: true });
        if (ok) {
          store.records = store.records.filter(r => r.id !== id);
          store.emit(EV.RECORD_CHANGED);
          Toast.success('已删除');
          this.render();
        }
      });
    });
  }

  destroy() {
    if (this._onChange) store.off(EV.RECORD_CHANGED, this._onChange);
  }
}
