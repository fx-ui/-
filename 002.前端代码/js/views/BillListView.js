// 账单列表页（首页）— 月度总览 + 分类TOP3 + 最近3笔
import { store, EV } from '../store.js';
import { fmtMoney, fmtDateCN } from '../utils/format.js';
import {
  getRecords, getMonthlySummary, getCategoryRanking,
} from '../api.js';

export class BillListView {
  constructor(container) {
    this.container = container;
    this.month   = new Date().toISOString().slice(0, 7); // YYYY-MM
    this.filter  = 'all';
    this.keyword = '';
    this.summary = { income: 0, expense: 0, balance: 0 };
    this.topCats = [];
    this.records = [];
    this._onChange = null;
  }

  monthLabel() {
    const [y, m] = this.month.split('-');
    return `${y}年${parseInt(m)}月`;
  }

  prevMonth() {
    const d = new Date(this.month + '-01');
    d.setMonth(d.getMonth() - 1);
    this.month = d.toISOString().slice(0, 7);
    this.refresh();
  }

  nextMonth() {
    const d = new Date(this.month + '-01');
    d.setMonth(d.getMonth() + 1);
    this.month = d.toISOString().slice(0, 7);
    this.refresh();
  }

  async mount() {
    this._onChange = () => this.refresh();
    store.on(EV.RECORD_CHANGED, this._onChange);
    await this.refresh();
  }

  async refresh() {
    await Promise.all([
      this.loadSummary(),
      this.loadTopCats(),
      this.loadRecords(),
    ]);
    this.render();
  }

  async loadSummary() {
    try {
      const res = await getMonthlySummary(this.month);
      if (res.ok) this.summary = res.data;
    } catch { /* ignore */ }
  }

  async loadTopCats() {
    try {
      const res = await getCategoryRanking(this.month, 3);
      if (res.ok) this.topCats = res.data;
    } catch { /* ignore */ }
  }

  async loadRecords() {
    try {
      const params = { month: this.month, limit: 3 };
      if (this.filter !== 'all') params.type = this.filter;
      const res = await getRecords(params);
      if (res.ok) this.records = res.data.list || [];
    } catch { /* ignore */ }
  }

  // ================================================================
  render() {
    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <span class="page-header__title">📋 账单</span>
        </div>

        <!-- ===== 月份切换 ===== -->
        <div class="month-switcher">
          <button class="month-switcher__btn" id="bill-prev">←</button>
          <span class="month-switcher__label">${this.monthLabel()}</span>
          <button class="month-switcher__btn" id="bill-next">→</button>
        </div>

        <!-- ===== 1. 月度收支总览 ===== -->
        <div class="card mb-lg">
          <div style="display:flex;justify-content:space-around;text-align:center">
            <div>
              <div class="text-secondary" style="font-size:12px">💰 收入</div>
              <div style="font-size:20px;font-weight:700;color:var(--color-income)">${fmtMoney(this.summary.income)}</div>
            </div>
            <div>
              <div class="text-secondary" style="font-size:12px">💸 支出</div>
              <div style="font-size:20px;font-weight:700;color:var(--color-expense)">${fmtMoney(this.summary.expense)}</div>
            </div>
            <div>
              <div class="text-secondary" style="font-size:12px">📊 结余</div>
              <div style="font-size:20px;font-weight:700;color:${this.summary.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">${fmtMoney(this.summary.balance)}</div>
            </div>
          </div>
        </div>

        <!-- ===== 2. 分类支出 TOP3 ===== -->
        <div class="card mb-lg">
          <div class="card__title">📂 分类支出 TOP3</div>
          ${this.topCats.length === 0
            ? '<div class="text-center text-secondary p-md" style="font-size:13px">本月暂无支出</div>'
            : this.topCats.map((c, i) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--color-bg)">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:24px">${c.icon || '📌'}</span>
                  <div>
                    <div style="font-weight:600;font-size:14px">${c.name}</div>
                    <div class="text-secondary" style="font-size:11px">TOP ${i + 1}</div>
                  </div>
                </div>
                <span style="font-weight:700;color:var(--color-expense);font-size:16px">${fmtMoney(c.total)}</span>
              </div>
            `).join('')
          }
        </div>

        <!-- ===== 3. 最近记账（3条） ===== -->
        <div class="card mb-lg">
          <div class="card__title">🕐 最近记账</div>
          ${this.records.length === 0
            ? '<div class="text-center text-secondary p-md" style="font-size:13px">本月还没有记账哦～</div>'
            : this.records.map(r => {
              return `
                <div class="bill-item" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--color-bg)">
                  <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:24px">${r.category_icon || '📌'}</span>
                    <div>
                      <div style="font-weight:500;font-size:14px">${r.category_name || '未分类'}</div>
                      <div class="text-secondary" style="font-size:11px">${fmtDateCN(r.record_date)}${r.note ? ' · ' + r.note : ''}</div>
                    </div>
                  </div>
                  <span style="font-weight:700;font-size:16px;color:${r.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'}">
                    ${r.type === 'income' ? '+' : '-'}${fmtMoney(r.amount).replace('¥', '')}
                  </span>
                </div>`;
            }).join('')
          }
        </div>

        <div style="height:24px"></div>
      </div>`;

    // 月份切换
    this.container.querySelector('#bill-prev')?.addEventListener('click', () => this.prevMonth());
    this.container.querySelector('#bill-next')?.addEventListener('click', () => this.nextMonth());
  }

  destroy() {
    if (this._onChange) store.off(EV.RECORD_CHANGED, this._onChange);
  }
}
