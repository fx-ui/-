// 账单 Tab — 流水列表
import { getRecords, deleteRecord, getCategories, getSetting } from '../db.js';
import { store, EVENTS } from '../store.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { EmptyState } from '../components/EmptyState.js';
import { formatDateCN, formatAmount, today, formatMonthCN } from '../utils/format.js';

export class BillListView {
  constructor(container) {
    this.container = container;
    this.currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    this.records = [];
    this.categories = [];
    this.filterType = 'all';       // 'all' | 'expense' | 'income'
    this.searchKeyword = '';
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.swipedItem = null;
  }

  async mount() {
    await this.loadData();
    this.render();
    this.bindEvents();

    // 监听数据变更
    this._onRecordChanged = () => { this.loadData().then(() => this.render()); };
    store.on(EVENTS.RECORD_CREATED, this._onRecordChanged);
    store.on(EVENTS.RECORD_UPDATED, this._onRecordChanged);
    store.on(EVENTS.RECORD_DELETED, this._onRecordChanged);
  }

  async loadData() {
    const role = await getSetting('role') || 'personal';
    const startDate = this.currentMonth + '-01';
    const endDate = this.currentMonth + '-31'; // 简单处理，getRecords 会处理边界
    this.records = await getRecords({ startDate, endDate });
    this.categories = await getCategories(null, role);
  }

  render() {
    // 筛选
    let filtered = this.records;
    if (this.filterType !== 'all') filtered = filtered.filter(r => r.type === this.filterType);
    if (this.searchKeyword) {
      const kw = this.searchKeyword.toLowerCase();
      filtered = filtered.filter(r => {
        const cat = this.categories.find(c => c.id === r.categoryId);
        return (r.note || '').toLowerCase().includes(kw) ||
          (cat?.name || '').toLowerCase().includes(kw);
      });
    }

    // 按日期分组
    const grouped = {};
    filtered.forEach(r => {
      if (!grouped[r.date]) grouped[r.date] = [];
      grouped[r.date].push(r);
    });
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // 倒序

    // 汇总
    const totalExpense = filtered.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const totalIncome = filtered.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);

    this.container.innerHTML = `
      <div class="view active">
        <!-- 月份切换 -->
        <div class="month-switcher">
          <button class="month-switcher__btn" id="month-prev">◀</button>
          <span class="month-switcher__label">${formatMonthCN(this.currentMonth)}</span>
          <button class="month-switcher__btn" id="month-next">▶</button>
        </div>

        <!-- 收支汇总 -->
        <div class="summary-row">
          <div class="summary-card">
            <div class="summary-card__label">支出</div>
            <div class="summary-card__value expense">-${formatAmount(totalExpense)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card__label">收入</div>
            <div class="summary-card__value income">+${formatAmount(totalIncome)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card__label">结余</div>
            <div class="summary-card__value balance">${formatAmount(totalIncome - totalExpense)}</div>
          </div>
        </div>

        <!-- 搜索 -->
        <div class="search-bar">
          <span class="search-bar__icon">🔍</span>
          <input type="text" class="search-bar__input" id="bill-search" placeholder="搜索备注或分类..."
            value="${this.searchKeyword}">
        </div>

        <!-- 筛选 -->
        <div class="filter-chips">
          <button class="filter-chip ${this.filterType === 'all' ? 'active' : ''}" data-filter="all">全部</button>
          <button class="filter-chip ${this.filterType === 'expense' ? 'active' : ''}" data-filter="expense">💸 支出</button>
          <button class="filter-chip ${this.filterType === 'income' ? 'active' : ''}" data-filter="income">💰 收入</button>
        </div>

        <!-- 账单列表 -->
        <div id="bill-list" class="mt-md">
          ${filtered.length === 0 ? EmptyState.render({
            icon: '📋',
            title: '还没有账单记录',
            text: '去记账页面开始记录你的第一笔吧~ 🌸',
            actionText: '去记账',
            actionHash: '#/record'
          }) : dates.map(date => `
            <div class="bill-date-header">
              <span class="bill-date-header__date">${formatDateCN(date)}</span>
              <span class="bill-date-header__total">
                ${grouped[date].filter(r => r.type === 'expense').length > 0
                  ? `支出 ${formatAmount(grouped[date].filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0))}`
                  : ''}
                ${grouped[date].filter(r => r.type === 'expense').length > 0 && grouped[date].filter(r => r.type === 'income').length > 0 ? ' · ' : ''}
                ${grouped[date].filter(r => r.type === 'income').length > 0
                  ? `收入 ${formatAmount(grouped[date].filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0))}`
                  : ''}
              </span>
            </div>
            ${grouped[date].map(r => {
              const cat = this.categories.find(c => c.id === r.categoryId);
              return `
                <div class="bill-item" data-id="${r.id}" data-date="${r.date}">
                  <div class="bill-item__icon">${cat?.icon || '📌'}</div>
                  <div class="bill-item__info">
                    <div class="bill-item__category">${cat?.name || '未知'}</div>
                    ${r.note ? `<div class="bill-item__note">${r.note}</div>` : ''}
                  </div>
                  <div class="bill-item__amount ${r.type === 'expense' ? 'text-expense' : 'text-income'}">
                    ${r.type === 'expense' ? '-' : '+'}${formatAmount(r.amount)}
                  </div>
                  <div class="bill-item__delete-bg">删除</div>
                </div>`;
            }).join('')}
          `).join('')}
        </div>
      </div>`;
  }

  bindEvents() {
    // 月份切换
    this.container.querySelector('#month-prev')?.addEventListener('click', () => {
      const [y, m] = this.currentMonth.split('-').map(Number);
      const d = new Date(y, m - 2, 1);
      this.currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      this.loadData().then(() => this.render());
    });
    this.container.querySelector('#month-next')?.addEventListener('click', () => {
      const [y, m] = this.currentMonth.split('-').map(Number);
      const d = new Date(y, m, 1);
      this.currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      this.loadData().then(() => this.render());
    });

    // 搜索
    let searchTimer;
    this.container.querySelector('#bill-search')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.searchKeyword = e.target.value.trim();
        this.render();
      }, 300);
    });

    // 筛选
    this.container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.filterType = chip.dataset.filter;
        this.render();
      });
    });

    // 账单项点击 -> 编辑
    this.container.querySelectorAll('.bill-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        window.location.hash = `#/bills/edit/${id}`;
      });
    });

    // 滑动删除
    this.setupSwipeDelete();
  }

  setupSwipeDelete() {
    this.container.querySelectorAll('.bill-item').forEach(item => {
      item.addEventListener('touchstart', (e) => {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        // 重置其他项
        if (this.swipedItem && this.swipedItem !== item) {
          this.swipedItem.style.transform = 'translateX(0)';
        }
      }, { passive: true });

      item.addEventListener('touchmove', (e) => {
        const dx = e.touches[0].clientX - this.touchStartX;
        const dy = e.touches[0].clientY - this.touchStartY;
        // 仅水平滑动
        if (Math.abs(dx) > Math.abs(dy) && dx < 0) {
          item.style.transform = `translateX(${Math.max(dx, -80)}px)`;
          item.style.transition = 'none';
        }
      }, { passive: true });

      item.addEventListener('touchend', async (e) => {
        const dx = (e.changedTouches[0]?.clientX || this.touchStartX) - this.touchStartX;
        if (dx < -40) {
          item.style.transform = 'translateX(-80px)';
          item.style.transition = 'transform 0.2s ease';
          this.swipedItem = item;
        } else {
          item.style.transform = 'translateX(0)';
          item.style.transition = 'transform 0.2s ease';
          this.swipedItem = null;
        }
      });

      // 删除按钮
      const deleteBg = item.querySelector('.bill-item__delete-bg');
      if (deleteBg) {
        deleteBg.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = Number(item.dataset.id);
          const confirmed = await Modal.confirm({
            title: '确认删除',
            content: '删除后无法恢复哦～确定要删除这条记录吗？',
            confirmText: '删除',
            isDanger: true,
          });
          if (confirmed) {
            await deleteRecord(id);
            store.emit(EVENTS.RECORD_DELETED, { id });
            Toast.success('已删除');
            this.loadData().then(() => this.render());
          }
        });
      }
    });
  }

  destroy() {
    if (this._onRecordChanged) {
      store.off(EVENTS.RECORD_CREATED, this._onRecordChanged);
      store.off(EVENTS.RECORD_UPDATED, this._onRecordChanged);
      store.off(EVENTS.RECORD_DELETED, this._onRecordChanged);
    }
  }
}
