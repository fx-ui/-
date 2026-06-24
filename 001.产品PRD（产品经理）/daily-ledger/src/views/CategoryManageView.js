// 自定义分类管理
import { getCategories, addCategory, deleteCategory, getSetting } from '../db.js';
import { store, EVENTS } from '../store.js';
import { router } from '../router.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export class CategoryManageView {
  constructor(container) {
    this.container = container;
  }

  async mount() {
    const role = await getSetting('role') || 'personal';
    const categories = await getCategories(null, role);

    const expenseCats = categories.filter(c => c.type === 'expense');
    const incomeCats = categories.filter(c => c.type === 'income');

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <button class="page-header__back" id="cat-back">←</button>
          <span class="page-header__title">📂 分类管理</span>
          <button class="btn btn--sm btn--primary" id="cat-add">+ 添加</button>
        </div>

        <div class="card mb-lg">
          <div class="card__title">💸 支出分类</div>
          ${expenseCats.map(c => `
            <div class="flex items-center justify-between mb-sm" style="padding:8px 0;border-bottom:1px solid var(--color-bg)">
              <span>${c.icon} ${c.name} <span class="text-light" style="font-size:11px">${c.parentName || ''}</span></span>
              ${!c.isPreset ? `<button class="btn--ghost" data-del-cat="${c.id}" style="font-size:12px;color:var(--color-expense)">删除</button>` : '<span class="text-light" style="font-size:11px">预置</span>'}
            </div>`).join('')}
        </div>

        <div class="card">
          <div class="card__title">💰 收入分类</div>
          ${incomeCats.map(c => `
            <div class="flex items-center justify-between mb-sm" style="padding:8px 0;border-bottom:1px solid var(--color-bg)">
              <span>${c.icon} ${c.name} <span class="text-light" style="font-size:11px">${c.parentName || ''}</span></span>
              ${!c.isPreset ? `<button class="btn--ghost" data-del-cat="${c.id}" style="font-size:12px;color:var(--color-expense)">删除</button>` : '<span class="text-light" style="font-size:11px">预置</span>'}
            </div>`).join('')}
        </div>
        <div style="height:24px"></div>
      </div>`;

    this.container.querySelector('#cat-back').addEventListener('click', () => router.back());
    this.container.querySelector('#cat-add').addEventListener('click', () => this.showAddForm());

    this.container.querySelectorAll('[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await Modal.confirm({ title: '删除分类', content: '确定删除这个自定义分类吗？', isDanger: true });
        if (confirmed) {
          await deleteCategory(Number(btn.dataset.delCat));
          store.emit(EVENTS.CATEGORY_UPDATED);
          Toast.success('已删除');
          this.mount();
        }
      });
    });
  }

  async showAddForm() {
    const content = `
      <div class="input-group"><label class="input-label">分类图标（Emoji）</label><input type="text" id="form-icon" class="input" value="🔸" maxlength="2"></div>
      <div class="input-group"><label class="input-label">分类名称</label><input type="text" id="form-name" class="input" maxlength="10" placeholder="如：宠物"></div>
      <div class="input-group"><label class="input-label">类型</label><select id="form-type" class="input"><option value="expense">💸 支出</option><option value="income">💰 收入</option></select></div>`;
    const confirmed = await Modal.confirm({ title: '添加自定义分类', content, confirmText: '添加' });
    if (!confirmed) return;
    const name = document.getElementById('form-name')?.value.trim();
    const icon = document.getElementById('form-icon')?.value.trim() || '🔸';
    const type = document.getElementById('form-type')?.value;
    if (!name) { Toast.warning('请输入分类名称'); return; }
    const role = await getSetting('role') || 'personal';
    await addCategory({ name, icon, type, role, sortOrder: 99, isPreset: false, parentId: null });
    store.emit(EVENTS.CATEGORY_UPDATED);
    Toast.success('分类已添加');
    this.mount();
  }

  destroy() {}
}
