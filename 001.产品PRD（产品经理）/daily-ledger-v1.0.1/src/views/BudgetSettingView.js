// 预算设置
import { getBudgets, setBudget, deleteBudget, getCategories, getRecords, getSetting } from '../db.js';
import { store, EVENTS } from '../store.js';
import { router } from '../router.js';
import { Modal } from '../components/Modal.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { Toast } from '../components/Toast.js';
import { formatCurrency } from '../utils/format.js';

export class BudgetSettingView {
  constructor(container) {
    this.container = container;
  }

  async mount() {
    const budgets = await getBudgets();
    const role = await getSetting('role') || 'personal';
    const categories = await getCategories('expense', role);
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
    const records = await getRecords({ startDate: monthStart, endDate: monthEnd });

    const totalBudget = budgets.find(b => b.categoryId === null);
    const totalSpent = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const totalPct = totalBudget ? (totalSpent / totalBudget.amount) * 100 : 0;

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <button class="page-header__back" id="budget-back">←</button>
          <span class="page-header__title">🎯 预算设置</span>
          <button class="btn btn--sm btn--primary" id="budget-total-set">总预算</button>
        </div>

        <!-- 总预算 -->
        <div class="card mb-lg">
          <div class="card__title">📊 月度总预算</div>
          ${totalBudget ? `
            <div class="text-secondary mb-sm" style="font-size:12px">预算 ${formatCurrency(totalBudget.amount)} · 已花 ${formatCurrency(totalSpent)}</div>
            ${ProgressBar.render(totalPct)}
            <div style="text-align:right;margin-top:4px">
              <button class="btn--ghost" id="budget-total-del" style="font-size:12px;color:var(--color-expense)">移除预算</button>
            </div>
          ` : `
            <div class="text-center text-secondary p-lg">还没有设置月度预算</div>
            <button class="btn btn--outline btn--block btn--sm" id="budget-total-set2">设置月度总预算</button>
          `}
        </div>

        <!-- 分类预算 -->
        <div class="card">
          <div class="card__title">📂 分类预算</div>
          ${categories.map(cat => {
            const catBudget = budgets.find(b => b.categoryId === cat.id);
            const catSpent = records.filter(r => r.type === 'expense' && r.categoryId === cat.id).reduce((s, r) => s + r.amount, 0);
            const catPct = catBudget ? (catSpent / catBudget.amount) * 100 : 0;

            return `
              <div class="flex items-center justify-between mb-md" style="padding:8px 0;border-bottom:1px solid var(--color-bg)">
                <div class="flex-1">
                  <div class="flex items-center gap-sm">
                    <span>${cat.icon} ${cat.name}</span>
                    ${catBudget ? `<span class="text-secondary" style="font-size:11px">${formatCurrency(catSpent)} / ${formatCurrency(catBudget.amount)}</span>` : ''}
                  </div>
                  ${catBudget ? ProgressBar.render(catPct) : '<span class="text-light" style="font-size:12px">未设置预算</span>'}
                </div>
                <button class="btn--ghost" data-cat-id="${cat.id}" data-cat-name="${cat.name}" data-cat-icon="${cat.icon}" data-action="set-budget" style="font-size:12px;margin-left:8px">${catBudget ? '修改' : '设置'}</button>
              </div>`;
          }).join('')}
        </div>
        <div style="height:24px"></div>
      </div>`;

    this.container.querySelector('#budget-back').addEventListener('click', () => router.back());

    // 总预算设置
    const setTotalBudget = async () => {
      const content = '<input type="text" id="budget-amount" class="input" inputmode="decimal" placeholder="如：5000" value="' + (totalBudget?.amount || '') + '">';
      const confirmed = await Modal.confirm({ title: '设置月度总预算', content, confirmText: '保存' });
      if (confirmed) {
        const amount = parseFloat(document.getElementById('budget-amount')?.value);
        if (isNaN(amount) || amount <= 0) { Toast.warning('请输入有效金额'); return; }
        await setBudget({ categoryId: null, amount, period: 'monthly' });
        store.emit(EVENTS.BUDGET_UPDATED);
        Toast.success('预算已保存');
        this.mount();
      }
    };
    this.container.querySelector('#budget-total-set')?.addEventListener('click', setTotalBudget);
    this.container.querySelector('#budget-total-set2')?.addEventListener('click', setTotalBudget);
    this.container.querySelector('#budget-total-del')?.addEventListener('click', async () => {
      if (totalBudget) { await deleteBudget(totalBudget.id); store.emit(EVENTS.BUDGET_UPDATED); Toast.success('已移除'); this.mount(); }
    });

    // 分类预算设置
    this.container.querySelectorAll('[data-action="set-budget"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const catId = Number(btn.dataset.catId);
        const catName = btn.dataset.catName;
        const existingBudgets = await getBudgets();
        const existing = existingBudgets.find(b => b.categoryId === catId);
        const content = `<input type="text" id="budget-amount" class="input" inputmode="decimal" placeholder="如：1500" value="${existing?.amount || ''}"><div class="text-secondary" style="font-size:12px;margin-top:8px">为"${catName}"设置月度预算上限</div>`;
        const confirmed = await Modal.confirm({ title: `${btn.dataset.catIcon} ${catName}预算`, content, confirmText: '保存', cancelText: existing ? '移除' : '取消' });
        if (confirmed) {
          const amount = parseFloat(document.getElementById('budget-amount')?.value);
          if (isNaN(amount) || amount <= 0) { Toast.warning('请输入有效金额'); return; }
          await setBudget({ categoryId: catId, amount, period: 'monthly' });
          store.emit(EVENTS.BUDGET_UPDATED);
          Toast.success('预算已保存');
          this.mount();
        } else if (existing) {
          await deleteBudget(existing.id);
          store.emit(EVENTS.BUDGET_UPDATED);
          Toast.success('已移除分类预算');
          this.mount();
        }
      });
    });
  }

  destroy() {}
}
