import { getUsers, updateUserStatus, deleteUser } from '../api.js';
import { fd } from '../utils/format.js';
import { router } from '../router.js';

export class UsersView {
  constructor(container) { this.container = container; this.page = 1; this.search = ''; }

  async mount() {
    this.container.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">加载中...</div></div>';
    await this.loadData();
  }

  async loadData() {
    this.container.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">加载中...</div></div>';
    const res = await getUsers({ page: this.page, size: 20, search: this.search });
    this._res = res;
    this.render();
  }

  render() {
    const res = this._res;
    if (!res || !res.ok) { this.container.innerHTML = '<div class="empty"><div class="empty-i">❌</div><div class="empty-t">加载失败</div></div>'; return; }
    const users = res.data?.list || [];
    const total = res.data?.total || 0;
    const totalPages = Math.ceil(total / 20) || 1;

    this.container.innerHTML = `
      <h2 class="fw mb16" style="font-size:20px">👥 用户管理（共 ${total} 人）</h2>
      <div class="card">
        <div class="filter-bar">
          <input class="inp" id="user-search" type="text" placeholder="搜索用户名..." value="${this.esc(this.search)}" style="flex:1;min-width:180px">
          <button class="btn btn-p btn-s" id="user-search-btn">🔍 搜索</button>
        </div>
        <div class="table-ct">
          <table><thead><tr><th>用户名</th><th>昵称</th><th>记录数</th><th>状态</th><th>注册时间</th><th>操作</th></tr></thead>
          <tbody>${users.length ? users.map(u => `
            <tr>
              <td><a href="#/users/${u.id}" style="color:var(--p);font-weight:600">${this.esc(u.username)}</a></td>
              <td>${this.esc(u.nickname||'-')}</td>
              <td>${u.record_count||u.recordCount||0}</td>
              <td><span class="badge ${u.status===1?'badge-on':'badge-off'}">${u.status===1?'正常':'禁用'}</span></td>
              <td>${fd(u.created_at||u.createdAt)}</td>
              <td class="fx gap8">
                <button class="btn btn-o btn-s" data-detail="${u.id}">详情</button>
                <button class="btn btn-s ${u.status===1?'btn-d':'btn-p'}" data-toggle="${u.id}" data-newstatus="${u.status===1?0:1}">${u.status===1?'禁用':'启用'}</button>
                <button class="btn btn-d btn-s" data-del="${u.id}" data-name="${this.esc(u.username)}">删除</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="6" class="tc ts">暂无数据</td></tr>'}</tbody></table>
        </div>
        <div class="pagination">
          <button class="btn btn-o btn-s" id="user-prev" ${this.page<=1?'disabled':''}>上一页</button>
          <span style="font-size:13px;color:var(--ts)">第 ${this.page}/${totalPages} 页</span>
          <button class="btn btn-o btn-s" id="user-next" ${this.page>=totalPages?'disabled':''}>下一页</button>
        </div>
      </div>`;

    this.container.querySelector('#user-search-btn')?.addEventListener('click', ()=>{ this.search=this.container.querySelector('#user-search')?.value?.trim()||''; this.page=1; this.loadData(); });
    this.container.querySelector('#user-search')?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ this.search=this.container.querySelector('#user-search')?.value?.trim()||''; this.page=1; this.loadData(); } });
    this.container.querySelector('#user-prev')?.addEventListener('click', ()=>{ if(this.page>1){ this.page--; this.loadData(); } });
    this.container.querySelector('#user-next')?.addEventListener('click', ()=>{ if(this.page<totalPages){ this.page++; this.loadData(); } });
    this.container.querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>router.go('#/users/'+b.dataset.detail)));
    this.container.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',async()=>{ const s=parseInt(b.dataset.newstatus); const r=await updateUserStatus(b.dataset.toggle,s); if(r.ok){ Toast.show(s===1?'已启用':'已禁用','ok'); this.loadData(); } else Toast.show(r.message||'失败','err'); }));
    this.container.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',async()=>{ if(!confirm('确定删除用户「'+b.dataset.name+'」？此操作不可恢复！'))return; const r=await deleteUser(b.dataset.del); if(r.ok){ Toast.show('已删除','ok'); this.loadData(); } else Toast.show(r.message||'失败','err'); }));
  }

  esc(s) { if(!s)return''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
}
