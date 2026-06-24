// 记账 Tab — 核心录入页面
import { addRecord, getCategories, getSetting, getAccounts, getTemplates } from '../db.js';
import { store, EVENTS } from '../store.js';
import { Toast } from '../components/Toast.js';
import { CategoryPicker } from '../components/CategoryPicker.js';
import { today } from '../utils/format.js';
import { validateAmount } from '../utils/validators.js';

export class RecordView {
  constructor(container) {
    this.container = container;
    this.type = 'expense';          // 'expense' | 'income'
    this.selectedCategory = null;
    this.categories = [];
    this.accounts = [];
    this.templates = [];
    this.selectedAccountId = null;
    this.editTarget = null;         // 如果编辑已有记录
  }

  async mount() {
    await this.loadData();

    // 检查是否有来自模板页的预设数据
    const pendingTemplate = sessionStorage.getItem('useTemplate');
    if (pendingTemplate) {
      try {
        const tpl = JSON.parse(pendingTemplate);
        sessionStorage.removeItem('useTemplate');
        this.pendingTemplate = tpl;
        this.type = tpl.type || 'expense';
        // 重新加载对应类型的分类
        const role = await getSetting('role') || 'personal';
        this.categories = await getCategories(this.type, role);
      } catch (e) { /* ignore */ }
    }

    this.render();
    this.bindEvents();

    // 应用模板预设
    if (this.pendingTemplate) {
      const tpl = this.pendingTemplate;
      this.pendingTemplate = null;
      const amountInput = this.container.querySelector('#record-amount');
      if (amountInput) amountInput.value = tpl.amount;
      if (tpl.categoryId) {
        this.categoryPicker?.setSelected(tpl.categoryId);
        this.selectedCategory = this.categories.find(c => c.id === tpl.categoryId);
      }
      const noteArea = this.container.querySelector('#record-note');
      if (noteArea && tpl.note) noteArea.value = tpl.note;
      const accountSelect = this.container.querySelector('#record-account');
      if (accountSelect && tpl.accountId) accountSelect.value = tpl.accountId;
    }
  }

  async loadData() {
    const role = await getSetting('role') || 'personal';
    this.accounts = await getAccounts();
    this.categories = await getCategories(this.type, role);
    this.templates = await getTemplates();
    if (this.accounts.length > 0) this.selectedAccountId = this.accounts[0].id;
  }

  render() {
    const filteredCats = this.categories.filter(c => c.type === this.type);

    this.container.innerHTML = `
      <div class="view active">
        <!-- 类型切换 -->
        <div class="type-toggle mb-lg">
          <button class="type-toggle__btn expense ${this.type === 'expense' ? 'active' : ''}" data-type="expense">
            🔴 支出
          </button>
          <button class="type-toggle__btn income ${this.type === 'income' ? 'active' : ''}" data-type="income">
            🟢 收入
          </button>
        </div>

        <!-- 金额输入 -->
        <div class="card mb-lg" style="text-align:center">
          <div class="text-secondary mb-sm" style="font-size:12px">${this.type === 'expense' ? '💸 花了多少？' : '💰 收入多少？'}</div>
          <input type="text" inputmode="decimal" id="record-amount"
            class="input input--amount" placeholder="0.00" maxlength="12"
            value="${this.editTarget ? this.editTarget.amount : ''}"
            autocomplete="off">
        </div>

        <!-- 分类选择 -->
        <div class="card mb-lg">
          <div class="card__title">选择分类</div>
          <div id="category-picker"></div>
        </div>

        <!-- 附加信息 -->
        <div class="card mb-lg">
          <div class="input-group">
            <label class="input-label">📅 日期</label>
            <input type="date" id="record-date" class="input"
              value="${this.editTarget ? this.editTarget.date : today()}">
          </div>
          <div class="input-group">
            <label class="input-label">🏦 账户</label>
            <select id="record-account" class="input">
              ${this.accounts.map(a => `
                <option value="${a.id}" ${(this.editTarget ? this.editTarget.accountId : this.selectedAccountId) === a.id ? 'selected' : ''}>
                  ${a.icon} ${a.name}
                </option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">📝 备注</label>
            <textarea id="record-note" class="textarea" placeholder="写点备注吧～" maxlength="200">${this.editTarget?.note || ''}</textarea>
          </div>
        </div>

        <!-- 模板快捷区 -->
        ${this.templates.length > 0 ? `
        <div class="card mb-lg">
          <div class="card__title">⚡ 快捷模板</div>
          <div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0">
            ${this.templates.map(t => `
              <button class="template-card__use-btn" data-template-id="${t.id}" style="flex-shrink:0">
                ${t.icon || ''} ${t.name} ¥${t.amount}
              </button>
            `).join('')}
          </div>
        </div>` : ''}

        <!-- 保存按钮 -->
        <button class="btn btn--primary btn--block" id="record-save" style="height:52px;font-size:18px">
          ${this.editTarget ? '💾 保存修改' : '✅ 记录这笔'}
        </button>
        <div style="height:32px"></div>
      </div>`;

    // 渲染分类选择器
    const catContainer = this.container.querySelector('#category-picker');
    this.categoryPicker = new CategoryPicker(catContainer);
    this.categoryPicker.setCategories(filteredCats);

    // 如果有编辑目标，选中其分类
    if (this.editTarget) {
      this.categoryPicker.setSelected(this.editTarget.categoryId);
      this.selectedCategory = filteredCats.find(c => c.id === this.editTarget.categoryId);
    }

    this.categoryPicker.onChange = (cat) => {
      this.selectedCategory = cat;
    };
  }

  bindEvents() {
    // 类型切换
    this.container.querySelectorAll('.type-toggle__btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.type = btn.dataset.type;
        this.selectedCategory = null;
        const role = await getSetting('role') || 'personal';
        this.categories = await getCategories(this.type, role);
        this.render();
        this.bindEvents();
        // 聚焦金额输入
        this.container.querySelector('#record-amount')?.focus();
      });
    });

    // 模板点击
    this.container.querySelectorAll('[data-template-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tpl = this.templates.find(t => t.id === Number(btn.dataset.templateId));
        if (tpl) {
          // 填充表单
          this.type = tpl.type;
          const role = await getSetting('role') || 'personal';
          this.categories = await getCategories(this.type, role);
          this.render();
          this.bindEvents();

          const amountInput = this.container.querySelector('#record-amount');
          if (amountInput) amountInput.value = tpl.amount;

          this.categoryPicker.setSelected(tpl.categoryId);
          this.selectedCategory = this.categories.find(c => c.id === tpl.categoryId);

          const noteArea = this.container.querySelector('#record-note');
          if (noteArea) noteArea.value = tpl.note || '';

          // 更新模板使用次数
          const { updateTemplate } = await import('../db.js');
          updateTemplate(tpl.id, { useCount: (tpl.useCount || 0) + 1 });
        }
      });
    });

    // 保存
    this.container.querySelector('#record-save').addEventListener('click', async () => {
      await this.save();
    });

    // 回车保存
    this.container.querySelector('#record-amount')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.save();
    });
  }

  async save() {
    const amountStr = this.container.querySelector('#record-amount').value.trim();
    const dateVal = this.container.querySelector('#record-date').value;
    const noteVal = this.container.querySelector('#record-note').value.trim();
    const accountVal = this.container.querySelector('#record-account').value;

    // 验证
    const amountCheck = validateAmount(amountStr);
    if (!amountCheck.valid) { Toast.warning(amountCheck.msg); return; }
    if (!this.selectedCategory) { Toast.warning('请选择一个分类'); return; }
    if (!dateVal) { Toast.warning('请选择日期'); return; }

    const recordData = {
      amount: Number(Number(amountStr).toFixed(2)),
      type: this.type,
      categoryId: this.selectedCategory.id,
      date: dateVal,
      accountId: accountVal ? Number(accountVal) : null,
      note: noteVal || '',
    };

    try {
      if (this.editTarget) {
        const { updateRecord } = await import('../db.js');
        await updateRecord(this.editTarget.id, recordData);
        store.emit(EVENTS.RECORD_UPDATED, recordData);
        Toast.success('✅ 记录已更新');

        // 返回账单列表
        const { router } = await import('../router.js');
        router.navigate('#/bills');
      } else {
        const saved = await addRecord(recordData);
        store.emit(EVENTS.RECORD_CREATED, saved);
        Toast.success(`记好啦～ ${this.type === 'expense' ? '💸' : '💰'} ¥${recordData.amount.toFixed(2)}`);

        // 清空表单
        if (!this.editTarget) {
          this.container.querySelector('#record-amount').value = '';
          this.container.querySelector('#record-note').value = '';
          this.container.querySelector('#record-amount').focus();
        }
      }
    } catch (err) {
      Toast.error('保存失败，请重试');
      console.error(err);
    }
  }

  destroy() {
    // 清理
  }
}
