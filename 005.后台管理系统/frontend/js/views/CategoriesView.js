import { getCategories, createCat, updateCat, deleteCat } from '../api.js';

export class CategoriesView {
  constructor(container) { this.container = container; this.type = 'expense'; }

  async mount() {
    this.container.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">加载中...</div></div>';
    await this.loadData();
  }

  async loadData() {
    this.container.innerHTML = '<div class="empty"><div class="empty-i">⏳</div><div class="empty-t">加载中...</div></div>';
    const res = await getCategories(this.type);
    if (!res.ok) { this.container.innerHTML = '<div class="empty"><div class="empty-i">❌</div><div class="empty-t">加载失败</div></div>'; return; }
    this._cats = res.data || [];
    this.render();
  }

  render() {
    const cats = this._cats;
    // Build tree: parents + children
    const parents = cats.filter(c => !c.parent_id);
    const children = cats.filter(c => c.parent_id);
    const tree = parents.map(p => ({ ...p, subs: children.filter(c => c.parent_id === p.id) }));

    this.container.innerHTML = `
      <h2 class="fw mb16" style="font-size:20px">📂 分类管理</h2>
      <div class="card">
        <div class="fx jsb aic mb16">
          <div class="fx gap8">
            <button class="btn ${this.type==='expense'?'btn-p':'btn-o'} btn-s" data-type="expense">💸 支出</button>
            <button class="btn ${this.type==='income'?'btn-p':'btn-o'} btn-s" data-type="income">💰 收入</button>
          </div>
          <button class="btn btn-p btn-s" id="cat-add">➕ 新增</button>
        </div>
        ${tree.map(p => `
          <div style="margin-bottom:16px">
            <div class="fx jsb aic" style="padding:10px 0;border-bottom:2px solid var(--bg)">
              <span style="font-weight:700;font-size:15px">${p.icon||''} ${this.esc(p.name)}</span>
              <span class="ts" style="font-size:12px">${p.record_count||0} 笔</span>
              <div class="fx gap8">
                <button class="btn btn-o btn-s" data-edit="${p.id}" data-name="${this.esc(p.name)}" data-icon="${p.icon||''}">编辑</button>
                <button class="btn btn-d btn-s" data-del="${p.id}" data-name="${this.esc(p.name)}">删除</button>
              </div>
            </div>
            ${p.subs.length ? p.subs.map(s => `
              <div class="fx jsb aic" style="padding:8px 0 8px 24px;border-bottom:1px solid var(--bg)">
                <span>${s.icon||''} ${this.esc(s.name)} <span class="ts" style="font-size:11px">←${this.esc(p.name)}</span></span>
                <span class="ts" style="font-size:12px">${s.record_count||0} 笔</span>
                <div class="fx gap8">
                  <button class="btn btn-o btn-s" data-edit="${s.id}" data-name="${this.esc(s.name)}" data-icon="${s.icon||''}">编辑</button>
                  <button class="btn btn-d btn-s" data-del="${s.id}" data-name="${this.esc(s.name)}">删除</button>
                </div>
              </div>`).join('') : '<div class="ts" style="padding:8px 24px;font-size:12px">暂无子分类</div>'}
          </div>`).join('') || '<div class="empty-d">暂无分类</div>'}
      </div>`;

    this.container.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{ this.type=b.dataset.type; this.loadData(); }));
    this.container.querySelector('#cat-add')?.addEventListener('click',()=>{
      const parents = tree.map((p,i)=>(i+1)+'. '+p.name).join('\n');
      const name = prompt('分类名称：'); if(!name||!name.trim())return;
      const icon = prompt('图标(emoji)：','📌')||'📌';
      let pid = null;
      if(parents){ const c=prompt('父分类(0=顶级)：\n'+parents,'0'); if(c&&parseInt(c)>0&&parseInt(c)<=tree.length) pid=tree[parseInt(c)-1].id; }
      createCat({name:name.trim(),icon,type:this.type,parentId:pid}).then(r=>{ if(r.ok){ Toast.show('已添加','ok'); this.loadData(); } else Toast.show(r.message||'失败','err'); });
    });
    this.container.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{
      const n=prompt('新名称：',b.dataset.name); if(!n||!n.trim())return;
      const i=prompt('新图标：',b.dataset.icon); const p={name:n.trim()}; if(i!==null)p.icon=i.trim();
      updateCat(b.dataset.edit,p).then(r=>{ if(r.ok){ Toast.show('已更新','ok'); this.loadData(); } else Toast.show(r.message||'失败','err'); });
    }));
    this.container.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{
      if(!confirm('删除「'+b.dataset.name+'」？'))return;
      deleteCat(b.dataset.del).then(r=>{ if(r.ok){ Toast.show('已删除','ok'); this.loadData(); } else Toast.show(r.message||'失败','err'); });
    }));
  }

  esc(s) { if(!s)return''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
}
