// 记账模板管理
import { getTemplates, addTemplate, deleteTemplate, getCategories, getSetting } from '../db.js';
import { store, EVENTS } from '../store.js';
import { router } from '../router.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';
import { formatCurrency } from '../utils/format.js';

export class TemplateManageView {
  constructor(container) {
    this.container = container;
  }

  async mount() {
    const templates = await getTemplates();
    const role = await getSetting('role') || 'personal';
    const categories = await getCategories(null, role);

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <button class="page-header__back" id="tpl-back">←</button>
          <span class="page-header__title">⚡ 记账模板</span>
          <button class="btn btn--sm btn--primary" id="tpl-add">+ 新建</button>
        </div>

        ${templates.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state__icon">⚡</div>
            <div class="empty-state__title">还没有记账模板</div>
            <div class="empty-state__text">把每天都要记的账单做成模板<br>一键就能记好～</div>
          </div>
        ` : templates.map(t => {
          const cat = categories.find(c => c.id === t.categoryId);
          return `
            <div class="template-card">
              <div class="template-card__header">
                <div>
                  <span style="font-size:24px;margin-right:8px">${cat?.icon || '📌'}</span>
                  <span class="template-card__name">${t.name}</span>
                </div>
                <span class="font-bold text-${t.type === 'expense' ? 'expense' : 'income'}" style="font-size:18px">
                  ${t.type === 'expense' ? '-' : '+'}${formatCurrency(t.amount)}
                </span>
              </div>
              <div style="display:flex;gap:8px;align-items:center;font-size:12px;color:var(--color-text-secondary)">
                <span>${cat?.name || '未知分类'}</span>
                ${t.note ? `<span>📝 ${t.note}</span>` : ''}
                <span>已用 ${t.useCount || 0} 次</span>
              </div>
              <div style="display:flex;gap:8px;margin-top:12px">
                <button class="btn btn--sm btn--primary" data-use-tpl="${t.id}">⚡ 快速记账</button>
                <button class="btn btn--sm btn--danger" data-del-tpl="${t.id}">删除</button>
              </div>
            </div>`;
        }).join('')}
        <div style="height:24px"></div>
      </div>`;

    this.container.querySelector('#tpl-back').addEventListener('click', () => router.back());
    this.container.querySelector('#tpl-add').addEventListener('click', () => this.showAddForm());

    this.container.querySelectorAll('[data-use-tpl]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tpl = templates.find(t => t.id === Number(btn.dataset.useTpl));
        if (tpl) {
          const { updateTemplate } = await import('../db.js');
          await updateTemplate(tpl.id, { useCount: (tpl.useCount || 0) + 1 });
          // 通过 sessionStorage 传递模板到 RecordView
          sessionStorage.setItem('useTemplate', JSON.stringify(tpl));
          router.navigate('#/record');
        }
      });
    });

    this.container.querySelectorAll('[data-del-tpl]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await Modal.confirm({ title: '删除模板', content: '确定删除这个记账模板吗？', isDanger: true });
        if (confirmed) {
          await deleteTemplate(Number(btn.dataset.delTpl));
          store.emit(EVENTS.TEMPLATE_UPDATED);
          Toast.success('已删除');
          this.mount();
        }
      });
    });
  }

  async showAddForm() {
    const role = await getSetting('role') || 'personal';
    const categories = await getCategories(null, role);

    const expenseCats = categories.filter(c => c.type === 'expense');
    const incomeCats = categories.filter(c => c.type === 'income');

    const content = `
      <div class="input-group"><label class="input-label">模板名称</label><input type="text" id="form-name" class="input" placeholder="如：早晨咖啡" maxlength="20"></div>
      <div class="input-group"><label class="input-label">金额</label><input type="text" id="form-amount" class="input" inputmode="decimal" placeholder="0.00"></div>
      <div class="input-group"><label class="input-label">类型</label><select id="form-type" class="input"><option value="expense">💸 支出</option><option value="income">💰 收入</option></select></div>
      <div class="input-group"><label class="input-label">分类</label><select id="form-cat" class="input">
        <optgroup label="支出分类">${expenseCats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</optgroup>
        <optgroup label="收入分类">${incomeCats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</optgroup>
      </select></div>
      <div class="input-group"><label class="input-label">备注</label><input type="text" id="form-note" class="input" placeholder="选填" maxlength="200"></div>`;

    const confirmed = await Modal.confirm({ title: '新建记账模板', content, confirmText: '创建' });
    if (!confirmed) return;

    const name = document.getElementById('form-name')?.value.trim();
    const amount = parseFloat(document.getElementById('form-amount')?.value);
    const type = document.getElementById('form-type')?.value;
    const categoryId = Number(document.getElementById('form-cat')?.value);
    const note = document.getElementById('form-note')?.value.trim();

    if (!name) { Toast.warning('请输入模板名称'); return; }
    if (isNaN(amount) || amount <= 0) { Toast.warning('请输入有效金额'); return; }

    await addTemplate({ name, amount, type, categoryId, note, icon: categories.find(c => c.id === categoryId)?.icon });
    store.emit(EVENTS.TEMPLATE_UPDATED);
    Toast.success('模板已创建');
    this.mount();
  }

  destroy() {}
}
