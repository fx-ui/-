import { getDailyStats, getMonthlyStats, getCategoryRanking, getUserRanking } from '../api.js';
import { fm, fd } from '../utils/format.js';

export class StatsView {
  constructor(container) { this.container = container; this.tab = 'daily'; }

  async mount() {
    this.container.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">加载中...</div></div>';
    const y = new Date().getFullYear();
    const [daily, monthly, cat, user] = await Promise.all([getDailyStats(30), getMonthlyStats(y), getCategoryRanking('expense',10), getUserRanking(10)]);
    this._daily = daily.ok ? (daily.data||[]) : [];
    this._monthly = monthly.ok ? (monthly.data||[]) : [];
    this._cat = cat.ok ? (cat.data||[]) : [];
    this._user = user.ok ? (user.data||[]) : [];
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <h2 class="fw mb16" style="font-size:20px">📈 统计分析</h2>
      <div class="fx gap8 mb16" style="flex-wrap:wrap">
        <button class="btn ${this.tab==='daily'?'btn-p':'btn-o'} btn-s" data-t="daily">每日(30天)</button>
        <button class="btn ${this.tab==='monthly'?'btn-p':'btn-o'} btn-s" data-t="monthly">月度</button>
        <button class="btn ${this.tab==='category'?'btn-p':'btn-o'} btn-s" data-t="category">分类排行</button>
        <button class="btn ${this.tab==='user'?'btn-p':'btn-o'} btn-s" data-t="user">用户排行</button>
      </div><div id="stats-ct"></div>`;
    this.container.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{ this.tab=b.dataset.t; this.render(); }));
    this.renderTab();
  }

  renderTab() {
    const ct = this.container.querySelector('#stats-ct'); if(!ct)return;
    switch(this.tab) {
      case 'daily': ct.innerHTML = `<div class="card"><h3 class="fw mb12">📅 近30天收支</h3><div class="table-ct" style="max-height:500px;overflow-y:auto"><table><thead><tr><th>日期</th><th>收入</th><th>支出</th><th>净额</th></tr></thead><tbody>${this._daily.length?this._daily.map(d=>{const n=(d.income||0)-(d.expense||0);return`<tr><td>${fd(d.date)}</td><td style="color:var(--in);font-weight:600">${fm(d.income||0)}</td><td style="color:var(--ex);font-weight:600">${fm(d.expense||0)}</td><td class="fw" style="color:${n>=0?'var(--in)':'var(--ex)'}">${fm(n)}</td></tr>`;}).join(''):'<tr><td colspan="4" class="tc ts">暂无数据</td></tr>'}</tbody></table></div></div>`; break;
      case 'monthly': ct.innerHTML = `<div class="card"><h3 class="fw mb12">📅 月度收支</h3><div class="table-ct"><table><thead><tr><th>月份</th><th>收入</th><th>支出</th><th>净额</th></tr></thead><tbody>${this._monthly.length?this._monthly.map(m=>{const n=(m.income||0)-(m.expense||0);return`<tr><td>${m.month||m._id||'-'}</td><td style="color:var(--in);font-weight:600">${fm(m.income||0)}</td><td style="color:var(--ex);font-weight:600">${fm(m.expense||0)}</td><td class="fw" style="color:${n>=0?'var(--in)':'var(--ex)'}">${fm(n)}</td></tr>`;}).join(''):'<tr><td colspan="4" class="tc ts">暂无数据</td></tr>'}</tbody></table></div></div>`; break;
      case 'category': ct.innerHTML = `<div class="card"><h3 class="fw mb12">📂 支出分类 TOP10</h3><div class="table-ct"><table><thead><tr><th>#</th><th>图标</th><th>分类</th><th>金额</th></tr></thead><tbody>${this._cat.length?this._cat.map((c,i)=>`<tr><td class="fw">#${i+1}</td><td>${c.icon||''}</td><td>${this.esc(c.name||'')}</td><td class="fw" style="color:var(--ex)">${fm(c.total||0)}</td></tr>`).join(''):'<tr><td colspan="4" class="tc ts">暂无数据</td></tr>'}</tbody></table></div></div>`; break;
      case 'user': ct.innerHTML = `<div class="card"><h3 class="fw mb12">🏆 用户支出 TOP10</h3><div class="table-ct"><table><thead><tr><th>#</th><th>用户</th><th>支出金额</th><th>记录数</th></tr></thead><tbody>${this._user.length?this._user.map((u,i)=>`<tr><td class="fw">#${i+1}</td><td>${this.esc(u.username||u.nickname||'')}</td><td class="fw" style="color:var(--ex)">${fm(u.total_expense||u.total||0)}</td><td class="ts">${u.count||0}</td></tr>`).join(''):'<tr><td colspan="4" class="tc ts">暂无数据</td></tr>'}</tbody></table></div></div>`; break;
    }
  }

  esc(s) { if(!s)return''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
}
