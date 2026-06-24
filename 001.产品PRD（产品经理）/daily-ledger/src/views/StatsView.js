// 统计 Tab — 图表与报表
import { getStatsByCategory, getStatsByMonth, getCategories, getSetting, getRecords } from '../db.js';
import { PieChart } from '../charts/PieChart.js';
import { TrendChart } from '../charts/TrendChart.js';
import { EmptyState } from '../components/EmptyState.js';
import { formatCurrency, formatMonthCN } from '../utils/format.js';

export class StatsView {
  constructor(container) {
    this.container = container;
    this.timeRange = 'month'; // 'month' | '3months' | '6months' | 'year'
    this.pieChart = null;
    this.trendChart = null;
  }

  async mount() {
    await this.loadAndRender();
  }

  async loadAndRender() {
    const now = new Date();
    let startDate, endDate, trendMonths;

    if (this.timeRange === 'month') {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
      trendMonths = 3;
    } else if (this.timeRange === '3months') {
      const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
      trendMonths = 3;
    } else if (this.timeRange === '6months') {
      const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
      trendMonths = 6;
    } else {
      const d = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
      trendMonths = 12;
    }

    const role = await getSetting('role') || 'personal';
    const categories = await getCategories(null, role);
    const catStats = await getStatsByCategory({ startDate, endDate, type: 'expense' });
    const monthStats = await getStatsByMonth({ months: trendMonths });

    // 总览
    const allRecords = await getRecords({ startDate, endDate });
    const totalExpense = allRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const totalIncome = allRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
    const hasData = allRecords.length > 0;

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <span class="page-header__title">📊 统计分析</span>
        </div>

        <!-- 时间范围 -->
        <div class="filter-chips mb-lg">
          <button class="filter-chip ${this.timeRange === 'month' ? 'active' : ''}" data-range="month">本月</button>
          <button class="filter-chip ${this.timeRange === '3months' ? 'active' : ''}" data-range="3months">近3月</button>
          <button class="filter-chip ${this.timeRange === '6months' ? 'active' : ''}" data-range="6months">近6月</button>
          <button class="filter-chip ${this.timeRange === 'year' ? 'active' : ''}" data-range="year">近1年</button>
        </div>

        ${!hasData ? EmptyState.render({ icon: '📊', title: '暂无数据', text: '记几笔账后再来看看统计分析吧～' }) : `
          <!-- 总览 -->
          <div class="summary-row">
            <div class="summary-card">
              <div class="summary-card__label">💸 总支出</div>
              <div class="summary-card__value expense">${formatCurrency(totalExpense)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-card__label">💰 总收入</div>
              <div class="summary-card__value income">${formatCurrency(totalIncome)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-card__label">💜 结余</div>
              <div class="summary-card__value balance">${formatCurrency(totalIncome - totalExpense)}</div>
            </div>
          </div>

          <!-- 分类饼图 -->
          <div class="card mb-lg">
            <div class="card__title">支出分类分布</div>
            <div style="max-width:300px;margin:0 auto">
              <canvas id="pie-chart"></canvas>
            </div>
          </div>

          <!-- 月度趋势 -->
          <div class="card mb-lg">
            <div class="card__title">收支趋势</div>
            <div style="height:260px">
              <canvas id="trend-chart"></canvas>
            </div>
          </div>

          <!-- 分类排行 -->
          <div class="card">
            <div class="card__title">支出排行 TOP5</div>
            ${catStats.slice(0, 5).map((s, i) => {
              const cat = categories.find(c => c.id === s.categoryId);
              const pct = totalExpense > 0 ? ((s.total / totalExpense) * 100).toFixed(1) : 0;
              return `
                <div class="flex items-center justify-between mb-sm" style="padding:8px 0;border-bottom:1px solid var(--color-bg)">
                  <span>${['🥇','🥈','🥉','④','⑤'][i]} ${cat?.icon || '📌'} ${cat?.name || '未知'}</span>
                  <span class="font-semibold text-expense">${formatCurrency(s.total)} <span style="font-size:12px;color:#888">${pct}%</span></span>
                </div>`;
            }).join('')}
            ${catStats.length === 0 ? '<div class="text-center text-secondary p-lg">暂无支出记录</div>' : ''}
          </div>
        `}

        <div style="height:24px"></div>
      </div>`;

    // 绑定筛选
    this.container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.timeRange = chip.dataset.range;
        this.loadAndRender();
      });
    });

    // 渲染图表
    if (hasData) {
      this.renderCharts(categories, catStats, monthStats, totalExpense);
    }
  }

  renderCharts(categories, catStats, monthStats, totalExpense) {
    // 饼图
    const pieCanvas = this.container.querySelector('#pie-chart');
    if (pieCanvas) {
      const labels = catStats.slice(0, 8).map(s => {
        const cat = categories.find(c => c.id === s.categoryId);
        return cat?.name || '未知';
      });
      const data = catStats.slice(0, 8).map(s => s.total);
      // 其他
      const rest = catStats.slice(8).reduce((s, c) => s + c.total, 0);
      if (rest > 0) { labels.push('其他'); data.push(rest); }

      this.pieChart = new PieChart(pieCanvas);
      this.pieChart.render({ labels, data, centerText: `总支出\n${formatCurrency(totalExpense)}` });
    }

    // 趋势图
    const trendCanvas = this.container.querySelector('#trend-chart');
    if (trendCanvas) {
      this.trendChart = new TrendChart(trendCanvas);
      this.trendChart.render({
        labels: monthStats.map(s => formatMonthCN(s.month)),
        incomeData: monthStats.map(s => s.income),
        expenseData: monthStats.map(s => s.expense),
        balanceData: monthStats.map(s => s.income - s.expense),
      });
    }
  }

  destroy() {
    if (this.pieChart) { this.pieChart.destroy(); this.pieChart = null; }
    if (this.trendChart) { this.trendChart.destroy(); this.trendChart = null; }
  }
}
