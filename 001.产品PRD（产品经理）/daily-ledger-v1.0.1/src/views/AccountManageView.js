// 多账户管理
import { getAccounts, addAccount, updateAccount, deleteAccount } from '../db.js';
import { store, EVENTS } from '../store.js';
import { router } from '../router.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';
import { formatCurrency } from '../utils/format.js';

export class AccountManageView {
  constructor(container) {
    this.container = container;
  }

  async mount() {
    const accounts = await getAccounts();
    const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <button class="page-header__back" id="acc-back">←</button>
          <span class="page-header__title">🏦 账户管理</span>
          <button class="btn btn--sm btn--primary" id="acc-add">+ 添加</button>
        </div>

        <div class="summary-card mb-lg">
          <div class="summary-card__label">💰 总资产</div>
          <div class="summary-card__value" style="color:var(--color-accent);font-size:28px">${formatCurrency(totalBalance)}</div>
        </div>

        <div id="account-list">
          ${accounts.map(a => `
            <div class="card mb-sm" data-acc-id="${a.id}" style="display:flex;align-items:center;gap:12px">
              <div style="width:44px;height:44px;border-radius:50%;background:var(--color-primary-light);display:flex;align-items:center;justify-content:center;font-size:22px">${a.icon}</div>
              <div class="flex-1">
                <div class="font-semibold">${a.name}</div>
                <div class="text-secondary" style="font-size:12px">${a.type}</div>
              </div>
              <div style="text-align:right">
                <div class="font-bold" style="font-size:18px;color:${(a.balance || 0) >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">${formatCurrency(a.balance)}</div>
                <button class="btn--ghost" data-action="edit" data-id="${a.id}" style="font-size:12px">编辑</button>
                <button class="btn--ghost" data-action="delete" data-id="${a.id}" style="font-size:12px;color:var(--color-expense)">删除</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;

    this.container.querySelector('#acc-back').addEventListener('click', () => router.back());
    this.container.querySelector('#acc-add').addEventListener('click', () => this.showForm());

    this.container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const account = accounts.find(a => a.id === Number(btn.dataset.id));
        if (account) this.showForm(account);
      });
    });

    this.container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await Modal.confirm({ title: '确认删除', content: '删除账户将同时清除其关联的收支记录', isDanger: true });
        if (confirmed) {
          await deleteAccount(Number(btn.dataset.id));
          store.emit(EVENTS.ACCOUNT_UPDATED);
          Toast.success('账户已删除');
          this.mount();
        }
      });
    });
  }

  async showForm(editAccount = null) {
    const types = [
      { value: 'cash', label: '💵 现金' },
      { value: 'bank', label: '🏦 银行卡' },
      { value: 'ewallet', label: '📱 电子钱包' },
    ];

    const content = `
      <div class="input-group">
        <label class="input-label">账户名称</label>
        <input type="text" id="form-name" class="input" value="${editAccount?.name || ''}" maxlength="20" placeholder="如：工资卡">
      </div>
      <div class="input-group">
        <label class="input-label">账户类型</label>
        <select id="form-type" class="input">${types.map(t => `<option value="${t.value}" ${editAccount?.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
      </div>
      <div class="input-group">
        <label class="input-label">当前余额</label>
        <input type="text" id="form-balance" class="input" inputmode="decimal" value="${editAccount?.balance || '0'}" placeholder="0.00">
      </div>`;

    const confirmed = await Modal.confirm({
      title: editAccount ? '编辑账户' : '添加账户',
      content,
      confirmText: editAccount ? '保存' : '添加',
    });

    if (!confirmed) return;

    const name = document.getElementById('form-name')?.value.trim();
    const type = document.getElementById('form-type')?.value;
    const balance = parseFloat(document.getElementById('form-balance')?.value) || 0;

    if (!name) { Toast.warning('请输入账户名称'); return; }

    if (editAccount) {
      await updateAccount(editAccount.id, { name, type, balance });
    } else {
      await addAccount({ name, type, balance, currency: 'CNY', icon: types.find(t => t.value === type)?.label.slice(0, 2) || '💵' });
    }
    store.emit(EVENTS.ACCOUNT_UPDATED);
    Toast.success(editAccount ? '已更新' : '已添加');
    this.mount();
  }

  destroy() {}
}
