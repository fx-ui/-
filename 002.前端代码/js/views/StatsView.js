// 统计页 — 图表分析
import { store } from '../store.js';
import { findCategory } from '../data/categories.js';
import { fmtMoney, fmtMonthCN } from '../utils/format.js';

const CLRS = ['#FFB6C1','#FF8A80','#FFD166','#B8E6D0','#C599E8','#FFAB91','#90CAF9','#F48FB1','#CE93D8','#A5D6A7'];

export class StatsView {
  constructor(container) {
    this.container = container;
    this.range = 'month';   // month|3m|6m|12m
    this.pieChart = null;
    this.trendChart = null;
  }

  mount() { this.render(); }

  getRangeDates() {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    switch (this.range) {
      case '3m': return { start: new Date(y, m - 2, 1), months: 3 };
      case '6m': return { start: new Date(y, m - 5, 1), months: 6 };
      case '12m': return { start: new Date(y - 1, m, 1), months: 12 };
      default: return { start: new Date(y, m, 1), months: 3 };
    }
  }

  render() {
    const { start, months } = this.getRangeDates();
    const startStr = start.toISOString().slice(0, 10);
    const endStr = new Date().toISOString().slice(0, 10);

    const filtered = store.records.filter(r => r.date >= startStr && r.date <= endStr);
    const totalOut = filtered.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const totalIn = filtered.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);

    // 分类统计
    const catMap = {};
    filtered.filter(r => r.type === 'expense').forEach(r => {
      catMap[r.categoryId] = (catMap[r.categoryId] || 0) + r.amount;
    });
    const catStats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    // 月度统计
    const monthStats = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mr = store.records.filter(r => r.date.startsWith(ms));
      monthStats.push({
        month: ms,
        income: mr.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0),
        expense: mr.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
      });
    }

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header"><span class="page-header__title">📊 统计分析</span></div>

        <div class="filter-chips mb-lg">
          <button class="filter-chip ${this.range === 'month' ? 'active' : ''}" data-r="month">本月</button>
          <button class="filter-chip ${this.range === '3m' ? 'active' : ''}" data-r="3m">近3月</button>
          <button class="filter-chip ${this.range === '6m' ? 'active' : ''}" data-r="6m">近6月</button>
          <button class="filter-chip ${this.range === '12m' ? 'active' : ''}" data-r="12m">近1年</button>
        </div>

        ${filtered.length === 0 ? this.emptyHTML() : `
          <div class="summary-row">
            <div class="summary-card"><div class="summary-card__label">💸 支出</div><div class="summary-card__value expense">${fmtMoney(totalOut)}</div></div>
            <div class="summary-card"><div class="summary-card__label">💰 收入</div><div class="summary-card__value income">${fmtMoney(totalIn)}</div></div>
            <div class="summary-card"><div class="summary-card__label">💜 结余</div><div class="summary-card__value balance">${fmtMoney(totalIn - totalOut)}</div></div>
          </div>

          <div class="card mb-lg"><div class="card__title">支出分类分布</div>
            <div style="max-width:280px;margin:0 auto"><canvas id="pie-chart"></canvas></div>
          </div>

          <div class="card mb-lg"><div class="card__title">收支趋势</div>
            <div style="height:240px"><canvas id="trend-chart"></canvas></div>
          </div>

          <div class="card"><div class="card__title">支出排行 TOP5</div>
            ${catStats.slice(0, 5).map(([catId, amt], i) => {
              const cat = findCategory(parseInt(catId));
              return `<div class="flex items-center justify-between mb-sm" style="padding:8px 0;border-bottom:1px solid var(--color-bg)">
                <span>${['🥇','🥈','🥉','④','⑤'][i]} ${cat?.icon||'📌'} ${cat?.name||'未知'}</span>
                <span class="font-semibold text-expense">${fmtMoney(amt)} <span style="font-size:12px;color:#888">${totalOut ? ((amt/totalOut)*100).toFixed(1) : 0}%</span></span>
              </div>`;
            }).join('')}
            ${catStats.length === 0 ? '<div class="text-center text-secondary p-lg">暂无支出</div>' : ''}
          </div>
        `}
        <div style="height:24px"></div>
      </div>`;

    this.container.querySelectorAll('.filter-chip').forEach(c => {
      c.addEventListener('click', () => { this.range = c.dataset.r; this.destroyCharts(); this.render(); });
    });

    if (filtered.length > 0) setTimeout(() => this.renderCharts(catStats, monthStats, totalOut), 100);
  }

  renderCharts(catStats, monthStats, totalOut) {
    // 饼图
    const pieCtx = this.container.querySelector('#pie-chart');
    if (pieCtx) {
      this.pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: catStats.slice(0, 8).map(([id]) => findCategory(parseInt(id))?.name || '未知'),
          datasets: [{ data: catStats.slice(0, 8).map(([, a]) => a), backgroundColor: CLRS, borderColor: '#fff', borderWidth: 3, borderRadius: 4 }],
        },
        options: {
          cutout: '62%',
          plugins: {
            legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } },
            tooltip: { callbacks: { label: (ctx) => ` ¥${ctx.parsed.toFixed(2)} (${((ctx.parsed / totalOut) * 100).toFixed(1)}%)` } },
          },
        },
        plugins: [{ id: 'center', afterDraw: (c) => {
          const { ctx, chartArea: { w, h, t, l } } = c;
          ctx.save(); ctx.font = "600 13px 'PingFang SC'"; ctx.fillStyle = '#888'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('总支出', l + w / 2, t + h / 2 - 8);
          ctx.font = "700 16px 'PingFang SC'"; ctx.fillStyle = '#2D2D2D';
          ctx.fillText(fmtMoney(totalOut).replace('¥', '¥'), l + w / 2, t + h / 2 + 12);
          ctx.restore();
        } }],
      });
    }

    // 趋势图
    const trendCtx = this.container.querySelector('#trend-chart');
    if (trendCtx) {
      this.trendChart = new Chart(trendCtx, {
        type: 'bar',
        data: {
          labels: monthStats.map(s => fmtMonthCN(s.month)),
          datasets: [
            { label: '支出', data: monthStats.map(s => s.expense), backgroundColor: 'rgba(255,138,128,0.7)', borderRadius: 6, borderSkipped: false, order: 2 },
            { label: '收入', data: monthStats.map(s => s.income), backgroundColor: 'rgba(184,230,208,0.7)', borderRadius: 6, borderSkipped: false, order: 2 },
            { label: '结余', data: monthStats.map(s => s.income - s.expense), type: 'line', borderColor: '#C599E8', borderWidth: 2.5, pointRadius: 5, pointBgColor: '#C599E8', tension: .4, fill: true, backgroundColor: 'rgba(197,153,232,0.08)', order: 1 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } } },
          scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } }, x: { grid: { display: false } } },
        },
      });
    }
  }

  emptyHTML() {
    return `<div class="empty-state"><div class="empty-state__icon">📊</div><div class="empty-state__title">暂无数据</div><div class="empty-state__text">记几笔后再来看分析吧～</div></div>`;
  }

  destroyCharts() {
    if (this.pieChart) { this.pieChart.destroy(); this.pieChart = null; }
    if (this.trendChart) { this.trendChart.destroy(); this.trendChart = null; }
  }

  destroy() { this.destroyCharts(); }
}
