// 我的页 — 设置菜单 + 子页面
import { store } from '../store.js';
import { router } from '../router.js';
import { defaultAccounts } from '../data/accounts.js';
import { fmtMoney } from '../utils/format.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { getCurrentUser, isLoggedIn, removeToken, removeCurrentUser, fetchCategories, addCategory, deleteCategory } from '../api.js';

export class SettingsView {
  constructor(container, subpage) {
    this.container = container;
    this.subpage = subpage || '';  // 子页面标识
  }

  mount() {
    switch (this.subpage) {
      case 'accounts': return this.renderAccounts();
      case 'budget': return this.renderBudget();
      case 'categories': return this.renderCategories();
      case 'templates': return this.renderTemplates();
      case 'export': return this.renderExport();
      default: return this.renderMain();
    }
  }

  // ===== 主页面 =====
  renderMain() {
    const user = getCurrentUser();

    // 格式化注册时间
    let regDate = '';
    if (user && user.created_at) {
      const d = new Date(user.created_at);
      regDate = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    }

    // 显示昵称，没有则显示用户名
    const displayName = user ? (user.nickname || user.username) : '每日记账';

    const totalAssets = store.accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const recordCount = store.records.length;

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header"><span class="page-header__title">👤 我的</span></div>

        <div class="card mb-lg" style="background:linear-gradient(135deg, var(--color-primary-light), var(--color-bg));text-align:center">
          <div style="font-size:48px;margin-bottom:4px">🌸</div>
          <div style="font-size:var(--text-lg);font-weight:700;color:var(--color-primary-dark)">${displayName}</div>
          <div class="text-secondary" style="font-size:12px;margin-top:4px">
            ${regDate ? `📅 ${regDate} 加入` : ''}
          </div>
          <div class="text-secondary" style="font-size:12px;margin-top:2px">
            已记 ${recordCount} 笔 · 资产 ${fmtMoney(totalAssets)}
          </div>
          <button class="btn btn--sm btn--outline mt-md" id="settings-logout" style="color:var(--color-expense);border-color:var(--color-expense)">🚪 退出登录</button>
        </div>

        <div class="settings-menu mb-lg">
          ${[
            { icon:'🏦',bg:'#FFD6E0',label:'账户管理',hash:'#/settings/accounts',info:store.accounts.length+'个账户'},
            { icon:'🎯',bg:'#FFD166',label:'预算设置',hash:'#/settings/budget',info:store.budgets.length+'项预算'},
            { icon:'📂',bg:'#B8E6D0',label:'分类管理',hash:'#/settings/categories',info:'查看管理'},
            { icon:'⚡',bg:'#C599E8',label:'记账模板',hash:'#/settings/templates',info:store.templates.length+'个模板'},
            { icon:'📤',bg:'#FFB6C1',label:'数据管理',hash:'#/settings/export',info:'导出/导入'},
          ].map(m => `
            <div class="settings-menu__item" data-nav="${m.hash}" style="cursor:pointer">
              <div class="settings-menu__left">
                <div class="settings-menu__icon" style="background:${m.bg}">${m.icon}</div>
                <span class="settings-menu__label">${m.label}</span>
              </div>
              <div class="settings-menu__right"><span style="font-size:12px;margin-right:4px">${m.info}</span> ›</div>
            </div>
          `).join('')}
        </div>

        <div class="card text-center text-secondary" style="font-size:12px;line-height:2">
          🌸 每日记账 V1.0<br>粉嫩可爱的个人财务管理工具<br>原型演示版本
        </div>
        <div style="height:24px"></div>
      </div>`;

    // 菜单项点击跳转
    this.container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        router.go(el.dataset.nav);
      });
    });

    // 退出登录 — 直接退出，弹原生确认框
    this.container.querySelector('#settings-logout')?.addEventListener('click', () => {
      // 原生 confirm 最可靠
      if (confirm('确定要退出登录吗？\n本地记账数据不会丢失')) {
        removeToken();
        removeCurrentUser();
        // 直接设置 hash + 手动隐藏 TabBar
        window.location.hash = '#/login';
        const tb = document.getElementById('tab-bar');
        if (tb) tb.style.display = 'none';
        Toast.show('已退出登录', 'info');
      }
    });
  }

  // ===== 账户管理 =====
  renderAccounts() {
    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <button class="page-header__back" data-back>←</button>
          <span class="page-header__title">🏦 账户管理</span>
          <button class="btn btn--sm btn--primary" id="acc-add">+ 添加</button>
        </div>
        <div class="summary-card mb-lg" style="background:linear-gradient(135deg,var(--color-primary-light),var(--color-bg))">
          <div class="summary-card__label">💰 总资产</div>
          <div class="summary-card__value" style="color:var(--color-accent);font-size:28px">${fmtMoney(store.accounts.reduce((s,a)=>s+(a.balance||0),0))}</div>
        </div>
        ${store.accounts.map(a => `
          <div class="card mb-sm flex items-center gap-md">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--color-primary-light);display:flex;align-items:center;justify-content:center;font-size:22px">${a.icon}</div>
            <div class="flex-1"><div class="font-semibold">${a.name}</div><div class="text-secondary" style="font-size:12px">${a.type}</div></div>
            <div class="font-bold" style="font-size:18px;color:${a.balance>=0?'var(--color-income)':'var(--color-expense)'}">${fmtMoney(a.balance)}</div>
          </div>
        `).join('')}
        <div style="height:24px"></div>
      </div>`;
    this.bindBack();
    this.container.querySelector('#acc-add')?.addEventListener('click', () => {
      const name = prompt('账户名称（如：工资卡）：');
      if (name) {
        store.accounts.push({ id: Date.now(), name, icon: '🏦', type: 'bank', balance: 0 });
        Toast.success('已添加');
        this.renderAccounts();
      }
    });
  }

  // ===== 预算设置 =====
  renderBudget() {
    const totalBudget = store.budgets.find(b => b.catId === null);
    const totalSpent = store.records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const pct = totalBudget ? Math.min((totalSpent / totalBudget.amount) * 100, 100) : 0;
    const state = pct < 60 ? 'safe' : pct < 80 ? 'warning' : pct < 100 ? 'danger' : 'over';

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <button class="page-header__back" data-back>←</button>
          <span class="page-header__title">🎯 预算设置</span>
          <button class="btn btn--sm btn--primary" id="budget-set">设置</button>
        </div>
        <div class="card mb-lg">
          <div class="card__title">📊 月度总预算</div>
          ${totalBudget ? `
            <div class="text-secondary mb-sm" style="font-size:12px">预算 ${fmtMoney(totalBudget.amount)} · 已花 ${fmtMoney(totalSpent)}</div>
            <div class="progress-bar"><div class="progress-bar__fill ${state}" style="width:${pct}%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px">
              <span class="text-${state==='safe'?'income':'expense'}">${['安全','注意','警告','超支'][['safe','warning','danger','over'].indexOf(state)]}</span>
              <span class="text-secondary">${pct.toFixed(0)}%</span>
            </div>
          ` : '<div class="text-center text-secondary p-lg">还没有设置预算</div>'}
        </div>
        <div style="height:24px"></div>
      </div>`;
    this.bindBack();
    this.container.querySelector('#budget-set')?.addEventListener('click', () => {
      const amt = parseFloat(prompt('设置月度预算金额：', totalBudget?.amount || '5000'));
      if (!isNaN(amt) && amt > 0) {
        store.budgets = [{ id: 1, catId: null, amount: amt }];
        Toast.success('预算已保存');
        this.renderBudget();
      }
    });
  }

  // ===== 分类管理 =====
  async renderCategories() {
    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header"><button class="page-header__back" data-back>←</button><span class="page-header__title">📂 分类管理</span></div>
        <div id="cats-content" class="text-center p-lg" style="font-size:36px">🌸</div>
        <div style="height:24px"></div>
      </div>`;
    this.bindBack();
    await this.loadCategoriesList();
  }

  async loadCategoriesList() {
    const content = this.container.querySelector('#cats-content');
    if (!content) return;
    try {
      const [expRes, incRes] = await Promise.all([
        fetchCategories('expense'),
        fetchCategories('income'),
      ]);
      const expCats = expRes.ok ? (expRes.data || []) : [];
      const incCats = incRes.ok ? (incRes.data || []) : [];

      // 展平
      const flatExp = []; const flatInc = [];
      expCats.forEach(p => {
        flatExp.push({ ...p, isSystem: true });
        (p.children || []).forEach(c => flatExp.push({ ...c, parentName: p.name, isSystem: true }));
      });
      incCats.forEach(p => {
        flatInc.push({ ...p, isSystem: true });
        (p.children || []).forEach(c => flatInc.push({ ...c, parentName: p.name, isSystem: true }));
      });

      content.innerHTML = `
        <div class="card mb-lg">
          <div class="card__title" style="display:flex;justify-content:space-between;align-items:center">
            <span>💸 支出分类 (${flatExp.length})</span>
            <button class="btn btn--sm btn--primary" id="add-exp-cat">+ 添加</button>
          </div>
          ${flatExp.map(c => `
            <div class="flex items-center justify-between mb-sm" style="padding:8px 0;border-bottom:1px solid var(--color-bg)">
              <span>${c.icon} ${c.name} ${c.parentName ? `<span class="text-light" style="font-size:11px">←${c.parentName}</span>` : ''}</span>
              <span class="text-light" style="font-size:11px">${c.user_id ? '自定义' : '预置'}</span>
            </div>
          `).join('')}
        </div>
        <div class="card">
          <div class="card__title" style="display:flex;justify-content:space-between;align-items:center">
            <span>💰 收入分类 (${flatInc.length})</span>
            <button class="btn btn--sm btn--primary" id="add-inc-cat">+ 添加</button>
          </div>
          ${flatInc.map(c => `
            <div class="flex items-center justify-between mb-sm" style="padding:8px 0;border-bottom:1px solid var(--color-bg)">
              <span>${c.icon} ${c.name} ${c.parentName ? `<span class="text-light" style="font-size:11px">←${c.parentName}</span>` : ''}</span>
              <span class="text-light" style="font-size:11px">${c.user_id ? '自定义' : '预置'}</span>
            </div>
          `).join('')}
        </div>`;

      // 添加按钮
      this.container.querySelector('#add-exp-cat')?.addEventListener('click', () => this.handleAddCategory('expense', expCats));
      this.container.querySelector('#add-inc-cat')?.addEventListener('click', () => this.handleAddCategory('income', incCats));
    } catch (e) {
      content.innerHTML = '<div class="text-center text-secondary p-lg">加载失败</div>';
    }
  }

  async handleAddCategory(type, parents) {
    const name = prompt('分类名称：');
    if (!name || !name.trim()) return;
    const icon = prompt('图标（emoji），如 🍕：', '📌') || '📌';

    // 选择父分类
    let parentId = null;
    if (parents && parents.length > 0) {
      const list = parents.map((p, i) => `${i + 1}. ${p.icon} ${p.name}`).join('\n');
      const choice = prompt(`选择父分类（输入序号），不选则创建一级分类：\n0. 无（一级分类）\n${list}`, '0');
      if (choice && parseInt(choice) > 0 && parseInt(choice) <= parents.length) {
        parentId = parents[parseInt(choice) - 1].id;
      }
    }

    const res = await addCategory({ name: name.trim(), icon, type, parentId });
    if (res.ok) {
      Toast.success('分类已添加');
      await this.loadCategoriesList();
    } else {
      Toast.warning(res.message || '添加失败');
    }
  }

  // ===== 模板管理 =====
  renderTemplates() {
    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header"><button class="page-header__back" data-back>←</button><span class="page-header__title">⚡ 模板管理</span></div>
        ${store.templates.length === 0 ? `
          <div class="empty-state"><div class="empty-state__icon">⚡</div><div class="empty-state__title">还没有模板</div><div class="empty-state__text">把重复的账单做成模板<br>一键就能记好～</div>
          <button class="btn btn--primary mt-lg" id="tpl-add">创建模板</button></div>
        ` : store.templates.map(t => `
          <div class="template-card"><div class="flex items-center justify-between mb-sm"><span class="template-card__name">${t.name}</span><span class="font-bold text-expense">${fmtMoney(t.amount)}</span></div>
            <div class="flex gap-sm"><button class="btn btn--sm btn--primary" data-use-tpl="${t.id}">⚡ 使用</button><button class="btn btn--sm btn--danger" data-del-tpl="${t.id}">删除</button></div>
          </div>
        `).join('')}
        <div style="height:24px"></div>
      </div>`;
    this.bindBack();
    this.container.querySelector('#tpl-add')?.addEventListener('click', () => {
      const name = prompt('模板名称（如：早晨咖啡）：');
      if (name) {
        const amt = parseFloat(prompt('金额：'));
        if (!isNaN(amt) && amt > 0) {
          store.templates.push({ id: Date.now(), name, amount: amt, type: 'expense', categoryId: 3 });
          Toast.success('模板已创建');
          this.renderTemplates();
        }
      }
    });
  }

  // ===== 数据管理 =====
  renderExport() {
    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header"><button class="page-header__back" data-back>←</button><span class="page-header__title">📤 数据管理</span></div>
        <div class="card mb-lg">
          <div class="card__title">📊 数据概览</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="text-center"><div style="font-size:24px;font-weight:700;color:var(--color-primary-dark)">${store.records.length}</div><div class="text-secondary" style="font-size:12px">条记录</div></div>
            <div class="text-center"><div style="font-size:24px;font-weight:700;color:var(--color-accent)">${store.accounts.length}</div><div class="text-secondary" style="font-size:12px">个账户</div></div>
          </div>
        </div>
        <button class="btn btn--primary btn--block mb-sm" id="export-json">📥 导出 JSON</button>
        <button class="btn btn--danger btn--block" id="reset-data">🗑 重置示例数据</button>
        <div style="height:24px"></div>
      </div>`;
    this.bindBack();
    this.container.querySelector('#export-json')?.addEventListener('click', () => {
      const data = JSON.stringify({ records: store.records, accounts: store.accounts, budgets: store.budgets }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'daily-ledger-backup.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      Toast.success('导出成功');
    });
    this.container.querySelector('#reset-data')?.addEventListener('click', async () => {
      const ok = await Modal.confirm({ title: '⚠️ 确认重置', content: '将清除所有数据并恢复示例数据', confirmText: '确认', isDanger: true });
      if (ok) { store.records = []; store.accounts = defaultAccounts.map(a=>({...a})); Toast.success('已重置'); router.go('#/record'); }
    });
  }

  bindBack() {
    const btn = this.container.querySelector('[data-back]');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        router.go('#/settings');
      });
    }
  }

  destroy() {}
}
