import { getAdmins, createAdmin, updateAdminStatus } from '../api.js';
import { fd } from '../utils/format.js';

export class AdminsView {
  constructor(container) { this.container = container; }

  async mount() {
    this.container.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">加载中...</div></div>';
    await this.loadData();
  }

  async loadData() {
    this.container.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">加载中...</div></div>';
    const res = await getAdmins();
    if (!res.ok) { this.container.innerHTML = '<div class="empty"><div class="empty-i">❌</div><div class="empty-t">加载失败</div></div>'; return; }
    this._admins = res.data || [];
    this.render();
  }

  render() {
    const admins = this._admins;
    this.container.innerHTML = `
      <h2 class="fw mb16" style="font-size:20px">👑 管理员管理</h2>
      <div class="card">
        <h3 class="fw mb12" style="font-size:16px">➕ 新增管理员</h3>
        <div class="fx gap12 aic" style="flex-wrap:wrap">
          <input class="inp" id="new-user" placeholder="用户名" style="flex:1;min-width:120px">
          <input class="inp" id="new-pass" type="password" placeholder="密码" style="flex:1;min-width:120px">
          <input class="inp" id="new-nick" placeholder="昵称(可选)" style="flex:1;min-width:120px">
          <select class="sel" id="new-role" style="width:130px"><option value="admin">管理员</option><option value="super_admin">超级管理员</option></select>
          <button class="btn btn-p btn-s" id="admin-add">创建</button>
        </div>
      </div>
      <div class="card">
        <h3 class="fw mb12" style="font-size:16px">管理员列表（${admins.length}人）</h3>
        <div class="table-ct">
          <table><thead><tr><th>用户名</th><th>昵称</th><th>角色</th><th>状态</th><th>最后登录</th><th>操作</th></tr></thead>
          <tbody>${admins.length ? admins.map(a => `
            <tr>
              <td class="fw">${this.esc(a.username)}</td>
              <td>${this.esc(a.nickname||'-')}</td>
              <td><span class="badge ${a.role==='super_admin'?'badge-in':'badge-on'}">${a.role==='super_admin'?'超级':'普通'}</span></td>
              <td><span class="badge ${a.status===1?'badge-on':'badge-off'}">${a.status===1?'正常':'禁用'}</span></td>
              <td>${a.last_login_at?fd(a.last_login_at):'-'}</td>
              <td><button class="btn btn-s ${a.status===1?'btn-d':'btn-p'}" data-tog="${a.id}" data-st="${a.status===1?0:1}">${a.status===1?'禁用':'启用'}</button></td>
            </tr>`).join('') : '<tr><td colspan="6" class="tc ts">暂无</td></tr>'}</tbody></table>
        </div>
      </div>`;

    this.container.querySelector('#admin-add')?.addEventListener('click',async()=>{
      const u=this.container.querySelector('#new-user')?.value?.trim();
      const p=this.container.querySelector('#new-pass')?.value?.trim();
      const n=this.container.querySelector('#new-nick')?.value?.trim();
      const r=this.container.querySelector('#new-role')?.value||'admin';
      if(!u){ Toast.show('请输入用户名','err'); return; }
      if(!p||p.length<6){ Toast.show('密码至少6位','err'); return; }
      const res=await createAdmin({username:u,password:p,nickname:n||undefined,role:r});
      if(res.ok){ Toast.show('已创建','ok'); ['new-user','new-pass','new-nick'].forEach(id=>{const el=this.container.querySelector('#'+id);if(el)el.value='';}); this.loadData(); }
      else Toast.show(res.message||'创建失败','err');
    });

    this.container.querySelectorAll('[data-tog]').forEach(b=>b.addEventListener('click',async()=>{
      const s=parseInt(b.dataset.st);
      const res=await updateAdminStatus(b.dataset.tog,s);
      if(res.ok){ Toast.show(s===1?'已启用':'已禁用','ok'); this.loadData(); }
      else Toast.show(res.message||'失败','err');
    }));
  }

  esc(s) { if(!s)return''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
}
