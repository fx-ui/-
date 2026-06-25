// 我的页 — 设置菜单 + 子页面
import { store } from '../store.js';
import { router } from '../router.js';
import { defaultAccounts } from '../data/accounts.js';
import { fmtMoney } from '../utils/format.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { getCurrentUser, setCurrentUser, getProfile, isLoggedIn, removeToken, removeCurrentUser, fetchCategories, addCategory, deleteCategory, getAccounts, createAccount, deleteAccount, getAccountsSummary, getBudgets, saveBudget, deleteBudget, getTemplates, createTemplate, deleteTemplate, useTemplate, updateProfile, uploadAvatar } from '../api.js?v=15';

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
  async renderMain() {
    const user = getCurrentUser();

    // 格式化注册时间
    let regDate = '';
    if (user && user.created_at) {
      const d = new Date(user.created_at);
      regDate = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    }

    // 显示昵称，没有则显示用户名
    const displayName = user ? (user.nickname || user.username) : '每日记账';

    // 从后端获取实时数据
    let summary = { totalBalance: 0, accountCount: 0, recordCount: 0 };
    try {
      const res = await getAccountsSummary();
      if (res.ok && res.data) summary = res.data;
    } catch (e) {
      console.error('Load summary error:', e);
    }

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header"><span class="page-header__title">👤 我的</span></div>

        <div class="card mb-lg" style="background:linear-gradient(135deg, var(--color-primary-light), var(--color-bg));text-align:center">
          <div id="avatar-area" style="display:inline-block;cursor:pointer;position:relative;margin-bottom:4px" title="点击更换头像">
            ${user?.avatar_url
              ? `<img src="${user.avatar_url}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.1)" alt="头像">`
              : '<div style="font-size:48px">🌸</div>'
            }
            <div style="position:absolute;bottom:0;right:0;background:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.1)">📷</div>
          </div>
          <div style="font-size:var(--text-lg);font-weight:700;color:var(--color-primary-dark);display:flex;align-items:center;justify-content:center;gap:8px">
            <span id="display-name-text">${displayName}</span>
            <button class="btn btn--sm" id="edit-nickname-btn" style="padding:2px 8px;font-size:14px;background:rgba(255,255,255,.6);border-radius:12px;min-height:28px" title="修改昵称">✏️</button>
          </div>
          <div class="text-secondary" style="font-size:12px;margin-top:4px">
            @${user ? user.username : ''} ${regDate ? `· 📅 ${regDate} 加入` : ''}
          </div>
          <div class="text-secondary" style="font-size:12px;margin-top:2px">
            已记 ${summary.recordCount} 笔 · 资产 ${fmtMoney(summary.totalBalance)}
          </div>
          <button class="btn btn--sm btn--outline mt-md" id="settings-logout" style="color:var(--color-expense);border-color:var(--color-expense)">🚪 退出登录</button>
        </div>

        <div class="settings-menu mb-lg">
          ${[
            { icon:'🏦',bg:'#FFD6E0',label:'账户管理',hash:'#/settings/accounts',info:summary.accountCount+'个账户'},
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
          🌸 每日记账 V1.0<br>粉嫩可爱的个人财务管理工具
        </div>
        <div style="height:24px"></div>
      </div>`;

    // 菜单项点击跳转
    this.container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        router.go(el.dataset.nav);
      });
    });

    // 修改昵称
    this.container.querySelector('#edit-nickname-btn')?.addEventListener('click', () => this.handleEditNickname());

    // 上传头像
    this.container.querySelector('#avatar-area')?.addEventListener('click', () => this.handleUploadAvatar());

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
  async renderAccounts() {
    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <button class="page-header__back" data-back>←</button>
          <span class="page-header__title">🏦 账户管理</span>
          <button class="btn btn--sm btn--primary" id="acc-add">+ 添加</button>
        </div>
        <div id="acc-content" class="text-center p-lg" style="font-size:36px">🌸</div>
        <div style="height:24px"></div>
      </div>`;
    this.bindBack();
    this.container.querySelector('#acc-add')?.addEventListener('click', () => this.handleAddAccount());
    await this.loadAccountsList();
  }

  async loadAccountsList() {
    const content = this.container.querySelector('#acc-content');
    if (!content) return;
    try {
      const res = await getAccounts();
      if (res.ok && res.data) {
        store.accounts = res.data;
        const accounts = res.data;
        const total = accounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0);
        content.innerHTML = `
          <div class="summary-card mb-lg" style="background:linear-gradient(135deg,var(--color-primary-light),var(--color-bg))">
            <div class="summary-card__label">💰 总资产</div>
            <div class="summary-card__value" style="color:var(--color-accent);font-size:28px">${fmtMoney(total)}</div>
          </div>
          ${accounts.map(a => `
            <div class="card mb-sm flex items-center gap-md">
              <div style="width:44px;height:44px;border-radius:50%;background:var(--color-primary-light);display:flex;align-items:center;justify-content:center;font-size:22px">${a.icon || '🏦'}</div>
              <div class="flex-1"><div class="font-semibold">${a.name}</div><div class="text-secondary" style="font-size:12px">${a.type}</div></div>
              <div class="font-bold" style="font-size:18px;color:${parseFloat(a.balance||0)>=0?'var(--color-income)':'var(--color-expense)'}">${fmtMoney(a.balance)}</div>
              <button class="btn-del-account" data-del-acc="${a.id}" style="background:none;border:none;font-size:16px;cursor:pointer;color:#ccc;padding:4px" title="删除">🗑</button>
            </div>
          `).join('')}
        `;

        // 删除按钮
        content.querySelectorAll('[data-del-acc]').forEach(btn => {
          btn.addEventListener('click', () => this.handleDeleteAccount(parseInt(btn.dataset.delAcc)));
        });
      } else {
        content.innerHTML = '<div class="text-center text-secondary p-lg">加载失败</div>';
      }
    } catch (e) {
      content.innerHTML = '<div class="text-center text-secondary p-lg">加载失败</div>';
    }
  }

  async handleAddAccount() {
    const name = prompt('账户名称（如：工资卡）：');
    if (!name || !name.trim()) return;
    const icon = prompt('图标（emoji），如 🏦：', '🏦') || '🏦';
    const types = { '现金':'cash', '银行卡':'bank', '电子钱包':'ewallet', '其他':'other' };
    const typeChoice = prompt('账户类型：1.现金 2.银行卡 3.电子钱包 4.其他', '2');
    const typeKeys = ['cash', 'bank', 'ewallet', 'other'];
    const type = typeKeys[parseInt(typeChoice) - 1] || 'bank';
    const initialBalance = parseFloat(prompt('初始余额：', '0')) || 0;

    const res = await createAccount({ name: name.trim(), icon, type, initialBalance });
    if (res.ok) {
      Toast.success('账户已添加');
      await this.loadAccountsList();
    } else {
      Toast.warning(res.message || '添加失败');
    }
  }

  async handleDeleteAccount(id) {
    if (!confirm('确定要删除这个账户吗？')) return;
    const res = await deleteAccount(id);
    if (res.ok) {
      Toast.success('已删除');
      await this.loadAccountsList();
    } else {
      Toast.warning(res.message || '删除失败');
    }
  }

  // ===== 预算设置 =====
  async renderBudget() {
    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <button class="page-header__back" data-back>←</button>
          <span class="page-header__title">🎯 预算设置</span>
          <button class="btn btn--sm btn--primary" id="budget-set">设置</button>
        </div>
        <div id="budget-content" class="text-center p-lg" style="font-size:36px">🌸</div>
        <div style="height:24px"></div>
      </div>`;
    this.bindBack();
    this.container.querySelector('#budget-set')?.addEventListener('click', () => this.handleSetBudget());
    await this.loadBudgetList();
  }

  async loadBudgetList() {
    const content = this.container.querySelector('#budget-content');
    if (!content) return;
    try {
      const res = await getBudgets();
      if (res.ok && res.data) {
        const { budgets, totalSpent } = res.data;
        store.budgets = budgets;

        const totalBudget = budgets.find(b => b.categoryId === null);
        const pct = totalBudget ? Math.min((totalSpent / totalBudget.amount) * 100, 100) : 0;
        const state = pct < 60 ? 'safe' : pct < 80 ? 'warning' : pct < 100 ? 'danger' : 'over';

        content.innerHTML = `
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
          ${budgets.length > 0 ? `
            <div class="card">
              <div class="card__title">📂 预算明细</div>
              ${budgets.map(b => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-bg)">
                  <span>${b.categoryIcon} ${b.categoryName}</span>
                  <span style="font-size:14px"><span class="font-bold" style="color:var(--color-expense)">${fmtMoney(b.spent)}</span> <span class="text-secondary">/ ${fmtMoney(b.amount)}</span></span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        `;
      } else {
        content.innerHTML = '<div class="text-center text-secondary p-lg">加载失败</div>';
      }
    } catch (e) {
      console.error('Load budgets error:', e);
      content.innerHTML = '<div class="text-center text-secondary p-lg">加载失败</div>';
    }
  }

  async handleSetBudget() {
    const amt = parseFloat(prompt('设置月度总预算金额：', '5000'));
    if (!isNaN(amt) && amt > 0) {
      const res = await saveBudget({ amount: amt, categoryId: null, periodType: 'month' });
      if (res.ok) {
        Toast.success('预算已保存');
        await this.loadBudgetList();
      } else {
        Toast.warning(res.message || '保存失败');
      }
    }
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
  async renderTemplates() {
    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header"><button class="page-header__back" data-back>←</button><span class="page-header__title">⚡ 模板管理</span></div>
        <div id="tpl-content" class="text-center p-lg" style="font-size:36px">🌸</div>
        <div style="height:24px"></div>
      </div>`;
    this.bindBack();
    await this.loadTemplateList();
  }

  async loadTemplateList() {
    const content = this.container.querySelector('#tpl-content');
    if (!content) return;
    try {
      const res = await getTemplates();
      if (res.ok && res.data) {
        const templates = res.data;
        store.templates = templates;

        if (templates.length === 0) {
          content.innerHTML = `
            <div class="empty-state"><div class="empty-state__icon">⚡</div><div class="empty-state__title">还没有模板</div><div class="empty-state__text">把重复的账单做成模板<br>一键就能记好～</div>
            <button class="btn btn--primary mt-lg" id="tpl-add">创建模板</button></div>`;
        } else {
          content.innerHTML = `
            ${templates.map(t => `
              <div class="template-card" style="background:var(--color-bg);border-radius:12px;padding:16px;margin-bottom:12px">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                  <span style="font-weight:600">${t.category_icon || '📌'} ${t.name}</span>
                  <span style="font-weight:700;color:${t.type==='income'?'var(--color-income)':'var(--color-expense)'}">${fmtMoney(t.amount)}</span>
                </div>
                <div class="text-secondary" style="font-size:12px;margin-bottom:8px">${t.category_name || ''} · 已用 ${t.use_count} 次</div>
                <div style="display:flex;gap:8px">
                  <button class="btn btn--sm btn--primary" data-use-tpl="${t.id}">⚡ 使用</button>
                  <button class="btn btn--sm btn--danger" data-del-tpl="${t.id}">删除</button>
                </div>
              </div>
            `).join('')}
            <button class="btn btn--outline btn--block mt-lg" id="tpl-add">+ 新建模板</button>`;
        }
      } else {
        content.innerHTML = '<div class="text-center text-secondary p-lg">加载失败</div>';
      }
    } catch (e) {
      content.innerHTML = '<div class="text-center text-secondary p-lg">加载失败</div>';
      return;
    }

    // 绑定事件
    this.container.querySelector('#tpl-add')?.addEventListener('click', () => this.handleAddTemplate());

    this.container.querySelectorAll('[data-use-tpl]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.useTpl);
        const tpl = (store.templates || []).find(t => t.id === id);
        if (tpl) {
          await useTemplate(id);
          router.go('#/record');
          // 延迟填充记账页
          setTimeout(() => {
            // 尝试通过 DOM 预填
            const amtEl = document.querySelector('#rec-amount');
            if (amtEl) amtEl.value = tpl.amount;
          }, 300);
        }
      });
    });

    this.container.querySelectorAll('[data-del-tpl]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.delTpl);
        if (confirm('确定删除此模板？')) {
          const res = await deleteTemplate(id);
          if (res.ok) {
            Toast.success('已删除');
            await this.loadTemplateList();
          } else {
            Toast.warning(res.message || '删除失败');
          }
        }
      });
    });
  }

  async handleAddTemplate() {
    const name = prompt('模板名称（如：早晨咖啡）：');
    if (!name || !name.trim()) return;
    const amt = parseFloat(prompt('金额：'));
    if (isNaN(amt) || amt <= 0) return;

    // 选择分类
    try {
      const catRes = await fetchCategories('expense');
      const cats = [];
      if (catRes.ok && catRes.data) {
        catRes.data.forEach(p => {
          cats.push({ id: p.id, name: p.name, icon: p.icon });
          (p.children || []).forEach(c => cats.push({ id: c.id, name: c.name, icon: c.icon, parent: p.name }));
        });
      }
      const list = cats.map((c, i) => `${i + 1}. ${c.icon} ${c.name}`).join('\n');
      const choice = prompt(`选择分类（输入序号）：\n${list}`, '1');
      const idx = parseInt(choice) - 1;
      if (isNaN(idx) || idx < 0 || idx >= cats.length) return;

      const res = await createTemplate({
        name: name.trim(),
        amount: amt,
        type: 'expense',
        categoryId: cats[idx].id,
      });

      if (res.ok) {
        Toast.success('模板已创建');
        await this.loadTemplateList();
      } else {
        Toast.warning(res.message || '创建失败');
      }
    } catch (e) {
      Toast.warning('创建失败');
    }
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

  async handleEditNickname() {
    const user = getCurrentUser();
    const currentNick = user?.nickname || user?.username || '';
    const nickname = prompt('修改昵称（留空则清除）：', currentNick);
    if (nickname === null) return; // 取消

    const res = await updateProfile({ nickname: nickname.trim() || null });
    if (res.ok && res.data?.user) {
      setCurrentUser(res.data.user);
      Toast.success('昵称已更新');
      this.renderMain(); // 重新渲染
    } else {
      Toast.warning(res.message || '修改失败');
    }
  }

  handleUploadAvatar() {
    // 创建隐藏的 file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) { input.remove(); return; }

      // 检查大小
      if (file.size > 2 * 1024 * 1024) {
        Toast.warning('图片不能超过 2MB');
        input.remove();
        return;
      }

      Toast.show('上传中...', 'info', 1000);
      const res = await uploadAvatar(file);

      if (res.ok) {
        // 刷新用户信息
        const profileRes = await getProfile();
        if (profileRes.ok && profileRes.data?.user) {
          setCurrentUser(profileRes.data.user);
        }
        Toast.success('头像已更新 🌸');
        this.renderMain();
      } else {
        Toast.warning(res.message || '上传失败');
      }
      input.remove();
    });

    input.click();
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
