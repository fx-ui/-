import { getRecords, deleteRecord } from '../api.js';
import { fm, fd } from '../utils/format.js';

export class RecordsView {
  constructor(container) {
    this.container = container;
    this.page = 1;
    this.filters = { search: '', type: '', startDate: '', endDate: '' };
  }

  async mount() {
    this.container.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">加载中...</div></div>';
    await this.loadData();
  }

  async loadData() {
    const params = { page: this.page, size: 20, search: this.filters.search, type: this.filters.type, startDate: this.filters.startDate, endDate: this.filters.endDate };
    const res = await getRecords(params);
    this.render(res);
  }

  render(res) {
    if (!res.ok) { this.container.innerHTML = '<div class="empty"><div class="empty-i">❌</div><div class="empty-t">加载失败</div></div>'; return; }
    const list = res.data?.list || [];
    const total = res.data?.total || 0;
    const totalPages = Math.ceil(total / 20) || 1;

    this.container.innerHTML = `
      <h2 class="fw mb16" style="font-size:20px">📋 流水管理（共 ${total} 条）</h2>
      <div class="card">
        <div class="filter-bar">
          <input class="inp" id="rec-search" type="text" placeholder="搜索用户名..." value="${this.esc(this.filters.search)}" style="flex:1;min-width:140px">
          <select class="sel" id="rec-type" style="width:110px">
            <option value="" ${!this.filters.type?'selected':''}>全部</option>
            <option value="expense" ${this.filters.type==='expense'?'selected':''}>支出</option>
            <option value="income" ${this.filters.type==='income'?'selected':''}>收入</option>
          </select>
          <input class="inp" id="rec-start" type="date" value="${this.filters.startDate}" style="width:140px">
          <span class="ts">至</span>
          <input class="inp" id="rec-end" type="date" value="${this.filters.endDate}" style="width:140px">
          <button class="btn btn-p btn-s" id="rec-search-btn">🔍 搜索</button>
          <button class="btn btn-o btn-s" id="rec-reset-btn">重置</button>
        </div>
        <div class="table-ct">
          <table><thead><tr><th>用户名</th><th>类型</th><th>金额</th><th>分类</th><th>日期</th><th>备注</th><th>操作</th></tr></thead>
          <tbody>${list.length ? list.map(r => `
            <tr>
              <td>${this.esc(r.username||'-')}</td>
              <td><span class="badge ${r.type==='income'?'badge-in':'badge-ex'}">${r.type==='income'?'收入':'支出'}</span></td>
              <td class="fw" style="color:${r.type==='income'?'var(--in)':'var(--ex)'}">${fm(parseFloat(r.amount)||0)}</td>
              <td>${r.category_icon||''} ${this.esc(r.category_name||'-')}</td>
              <td>${fd(r.record_date)}</td>
              <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.esc(r.note||'-')}</td>
              <td><button class="btn btn-d btn-s" data-del="${r.id}">删除</button></td>
            </tr>`).join('') : '<tr><td colspan="7" class="tc ts">暂无数据</td></tr>'}</tbody></table>
        </div>
        <div class="pagination">
          <button class="btn btn-o btn-s" id="rec-prev" ${this.page<=1?'disabled':''}>上一页</button>
          <span style="font-size:13px;color:var(--ts)">第 ${this.page}/${totalPages} 页</span>
          <button class="btn btn-o btn-s" id="rec-next" ${this.page>=totalPages?'disabled':''}>下一页</button>
        </div>
      </div>`;

    this.container.querySelector('#rec-search-btn')?.addEventListener('click', ()=>{ this.gatherFilters(); this.page=1; this.loadData(); });
    this.container.querySelector('#rec-reset-btn')?.addEventListener('click', ()=>{ this.filters={search:'',type:'',startDate:'',endDate:''}; this.page=1; this.loadData(); });
    this.container.querySelector('#rec-search')?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ this.gatherFilters(); this.page=1; this.loadData(); } });
    this.container.querySelector('#rec-prev')?.addEventListener('click', ()=>{ if(this.page>1){ this.page--; this.loadData(); } });
    this.container.querySelector('#rec-next')?.addEventListener('click', ()=>{ if(this.page<totalPages){ this.page++; this.loadData(); } });
    this.container.querySelectorAll('[data-del]').forEach(btn=>{ btn.addEventListener('click', async ()=>{ if(!confirm('确定删除此记录？'))return; const r=await deleteRecord(btn.dataset.del); if(r.ok){ Toast.show('已删除','ok'); this.loadData(); } else Toast.show(r.message||'失败','err'); }); });
  }

  gatherFilters() {
    this.filters.search = this.container.querySelector('#rec-search')?.value?.trim()||'';
    this.filters.type = this.container.querySelector('#rec-type')?.value||'';
    this.filters.startDate = this.container.querySelector('#rec-start')?.value||'';
    this.filters.endDate = this.container.querySelector('#rec-end')?.value||'';
  }

  esc(s) { if(!s)return''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
}
