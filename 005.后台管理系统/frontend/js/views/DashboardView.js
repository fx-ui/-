import { getDashboard } from '../api.js';
import { fm } from '../utils/format.js';

export class DashboardView {
  constructor(container) { this.container = container; }

  async mount() {
    this.container.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">加载中...</div></div>';
    const res = await getDashboard();
    if (!res.ok || !res.data) {
      this.container.innerHTML = '<div class="empty"><div class="empty-i">❌</div><div class="empty-t">加载失败</div><div class="empty-d">'+(res.message||'未知错误')+'</div></div>';
      return;
    }
    const d = res.data;
    const balance = (d.monthIncome||0) - (d.monthExpense||0);

    this.container.innerHTML = `
      <h2 class="fw mb16" style="font-size:20px">📊 数据仪表盘</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">👥 用户总数</div><div class="stat-value" style="color:var(--p)">${d.totalUsers||0}</div></div>
        <div class="stat-card"><div class="stat-label">🆕 今日新增</div><div class="stat-value" style="color:var(--in)">${d.todayNewUsers||0}</div></div>
        <div class="stat-card"><div class="stat-label">📋 总流水</div><div class="stat-value" style="color:var(--ac)">${d.totalRecords||0} 笔</div></div>
        <div class="stat-card"><div class="stat-label">💰 本月收入</div><div class="stat-value" style="color:var(--in)">${fm(d.monthIncome||0)}</div></div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">💸 本月支出</div><div class="stat-value" style="color:var(--ex)">${fm(d.monthExpense||0)}</div></div>
        <div class="stat-card"><div class="stat-label">📊 本月结余</div><div class="stat-value" style="color:${balance>=0?'var(--in)':'var(--ex)'}">${fm(balance)}</div></div>
      </div>
      <div class="card"><h3 class="fw mb12" style="font-size:16px">📅 近7天收支趋势</h3>
        <div class="fx gap8" style="overflow-x:auto">${(d.recent7Days||[]).length ? d.recent7Days.map(day => `
          <div style="min-width:90px;background:var(--bg);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:11px;color:var(--ts);margin-bottom:4px">${(day.date||'').slice(5)}</div>
            <div style="font-size:13px;color:var(--in);font-weight:600">${fm(day.income||0)}</div>
            <div style="font-size:12px;color:var(--ex)">${fm(day.expense||0)}</div>
          </div>`).join('') : '<div class="empty-d">暂无数据</div>'}</div>
      </div>
      <div class="card"><h3 class="fw mb12" style="font-size:16px">📂 本月分类支出 TOP10</h3>
        ${(d.categoryPie||[]).length ? d.categoryPie.slice(0,10).map(c => `
          <div class="fx jsb aic" style="padding:8px 0;border-bottom:1px solid var(--bg)">
            <span>${c.icon||''} ${c.name||''}</span>
            <span class="fw" style="color:var(--ex)">${fm(c.total||0)}</span></div>`).join('') : '<div class="empty-d">暂无数据</div>'}
      </div>`;
  }
}
