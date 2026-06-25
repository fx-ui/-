// 统计页 — 年份选择 + 全年统计 + 饼图 + 趋势折线图 + Excel 导出
import { fmtMoney } from '../utils/format.js';
import {
  getYearlySummary, getCategoryBreakdown, getMonthlyTrend, downloadExcel,
} from '../api.js?v=14';

const CLRS = ['#FF8A80','#FFB6C1','#FFD166','#B8E6D0','#C599E8','#FFAB91','#90CAF9','#F48FB1','#CE93D8','#A5D6A7','#80CBC4','#E6EE9C'];

export class StatsView {
  constructor(container) {
    this.container = container;
    this.year      = new Date().getFullYear();
    this.summary   = { income: 0, expense: 0, balance: 0 };
    this.breakdown = [];
    this.trend     = [];
    this.loading   = false;
    this.pieChart  = null;
    this.lineChart = null;
  }

  async mount() {
    await this.loadData();
    this.render();
  }

  async loadData() {
    this.loading = true;
    try {
      const [sRes, cRes, tRes] = await Promise.all([
        getYearlySummary(this.year),
        getCategoryBreakdown(this.year, 'expense'),
        getMonthlyTrend(this.year),
      ]);
      if (sRes.ok) this.summary   = sRes.data;
      if (cRes.ok) this.breakdown = cRes.data || [];
      if (tRes.ok) this.trend     = tRes.data?.months || [];
    } catch (e) {
      console.error('Stats load error:', e);
    }
    this.loading = false;
  }

  async changeYear(y) {
    this.year = y;
    this.destroyCharts();
    await this.loadData();
    this.render();
  }

  // ================================================================
  render() {
    const years = [];
    const curY = new Date().getFullYear();
    for (let y = curY; y >= curY - 3; y--) years.push(y);

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <span class="page-header__title">📊 统计分析</span>
        </div>

        <!-- ===== 年份选择 ===== -->
        <div class="filter-chips mb-lg" style="justify-content:center">
          ${years.map(y => `
            <button class="filter-chip ${this.year === y ? 'active' : ''}" data-year="${y}">${y}年</button>
          `).join('')}
        </div>

        ${this.loading ? '<div class="text-center p-lg" style="font-size:36px">🌸</div>' : `
          <!-- ===== 1. 年度收支总览 ===== -->
          <div class="summary-row mb-lg">
            <div class="summary-card">
              <div class="summary-card__label">💰 全年收入</div>
              <div class="summary-card__value income">${fmtMoney(this.summary.income)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-card__label">💸 全年支出</div>
              <div class="summary-card__value expense">${fmtMoney(this.summary.expense)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-card__label">📊 全年结余</div>
              <div class="summary-card__value" style="color:${this.summary.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">${fmtMoney(this.summary.balance)}</div>
            </div>
          </div>

          <!-- ===== 2. 支出分类饼图 ===== -->
          <div class="card mb-lg">
            <div class="card__title">📂 支出分类分布（${this.year}年）</div>
            ${this.breakdown.length === 0
              ? '<div class="text-center text-secondary p-lg">暂无数据</div>'
              : '<div style="max-width:280px;margin:0 auto"><canvas id="pie-chart"></canvas></div>'
            }
          </div>

          <!-- ===== 3. 收支趋势折线图 ===== -->
          <div class="card mb-lg">
            <div class="card__title">📈 收支趋势（${this.year}年 1-12月）</div>
            ${this.trend.every(t => t.income === 0 && t.expense === 0)
              ? '<div class="text-center text-secondary p-lg">暂无数据</div>'
              : '<div style="height:240px"><canvas id="trend-chart"></canvas></div>'
            }
          </div>
        `}

        <!-- ===== 4. 导出按钮 ===== -->
        <button class="btn btn--primary btn--block" id="export-btn" style="height:48px;font-size:15px">
          📥 导出 ${this.year}年统计 Excel
        </button>
        <div style="height:16px"></div>
      </div>`;

    // 年份切换
    this.container.querySelectorAll('.filter-chip').forEach(c => {
      c.addEventListener('click', () => this.changeYear(parseInt(c.dataset.year)));
    });

    // 导出
    this.container.querySelector('#export-btn')?.addEventListener('click', () => {
      downloadExcel(this.year, this.summary, this.breakdown, this.trend);
    });

    // 渲染图表
    if (this.breakdown.length > 0 || this.trend.length > 0) {
      setTimeout(() => this.renderCharts(), 100);
    }
  }

  renderCharts() {
    // ===== 饼图 =====
    const pieCtx = this.container.querySelector('#pie-chart');
    if (pieCtx && this.breakdown.length > 0) {
      const total = this.breakdown.reduce((s, c) => s + parseFloat(c.total), 0);
      const top  = this.breakdown.slice(0, 10);
      const other = this.breakdown.slice(10).reduce((s, c) => s + parseFloat(c.total), 0);
      const labels = top.map(c => c.name);
      const data   = top.map(c => c.total);
      if (other > 0) { labels.push('其他'); data.push(other); }

      this.pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data, backgroundColor: CLRS.slice(0, data.length),
            borderColor: '#fff', borderWidth: 3, borderRadius: 4,
          }],
        },
        options: {
          cutout: '62%',
          plugins: {
            legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } },
            tooltip: { callbacks: { label: (ctx) => ` ¥${parseFloat(ctx.parsed).toFixed(2)} (${total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0}%)` } },
          },
        },
        plugins: [{
          id: 'center',
          afterDraw: (c) => {
            const { ctx, chartArea: { w, h, t, l } } = c;
            ctx.save(); ctx.font = "600 12px 'PingFang SC'"; ctx.fillStyle = '#888'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('总支出', l + w / 2, t + h / 2 - 8);
            ctx.font = "700 15px 'PingFang SC'"; ctx.fillStyle = '#2D2D2D';
            ctx.fillText(fmtMoney(total), l + w / 2, t + h / 2 + 12);
            ctx.restore();
          },
        }],
      });
    }

    // ===== 折线图 =====
    const trendCtx = this.container.querySelector('#trend-chart');
    if (trendCtx && this.trend.length > 0) {
      this.lineChart = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: this.trend.map(t => t.month + '月'),
          datasets: [
            {
              label: '收入', data: this.trend.map(t => t.income),
              borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.08)',
              borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#4CAF50',
              tension: 0.4, fill: true,
            },
            {
              label: '支出', data: this.trend.map(t => t.expense),
              borderColor: '#FF8A80', backgroundColor: 'rgba(255,138,128,0.08)',
              borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#FF8A80',
              tension: 0.4, fill: true,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ¥${parseFloat(ctx.parsed.y).toFixed(2)}` } },
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
            x: { grid: { display: false } },
          },
        },
      });
    }
  }

  destroyCharts() {
    if (this.pieChart)  { this.pieChart.destroy();  this.pieChart  = null; }
    if (this.lineChart) { this.lineChart.destroy(); this.lineChart = null; }
  }

  destroy() { this.destroyCharts(); }
}
