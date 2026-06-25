// 记账页 — 核心录入（对接后端 API，从数据库获取分类和账户）
import { store, EV } from '../store.js';
import { today, fmtMoney } from '../utils/format.js';
import { Toast } from '../components/Toast.js';
import { CategoryPicker } from '../components/CategoryPicker.js';
import { createRecord, fetchCategories, getAccounts } from '../api.js?v=14';

export class RecordView {
  constructor(container) {
    this.container = container;
    this.type      = 'expense';
    this.selectedCat = null;
    this.cats      = [];        // 扁平分类 [{id, name, icon, parent}]
    this.accounts  = [];        // 从后端加载的账户列表
    this.picker    = null;
    this.saving    = false;
  }

  async mount() {
    await Promise.all([
      this.loadCategories(),
      this.loadAccounts(),
    ]);
    this.render();
  }

  async loadCategories() {
    try {
      const res = await fetchCategories(this.type);
      if (res.ok && res.data) {
        // 将树形结构展平为列表（二级子类在前，方便选择）
        const flat = [];
        (res.data || []).forEach(parent => {
          flat.push({ id: parent.id, name: parent.name, icon: parent.icon, parent: '' });
          (parent.children || []).forEach(child => {
            flat.push({ id: child.id, name: child.name, icon: child.icon, parent: parent.name });
          });
        });
        this.cats = flat;
      }
    } catch (e) {
      console.error('Load categories error:', e);
    }
  }

  async loadAccounts() {
    try {
      const res = await getAccounts();
      if (res.ok && res.data) {
        this.accounts = res.data;
        store.accounts = res.data;
      }
    } catch (e) {
      console.error('Load accounts error:', e);
    }
  }

  async switchType(type) {
    this.type = type;
    this.selectedCat = null;
    await this.loadCategories();
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="view active">
        <div class="type-toggle mb-lg">
          <button class="type-toggle__btn expense ${this.type === 'expense' ? 'active' : ''}" data-type="expense">🔴 支出</button>
          <button class="type-toggle__btn income ${this.type === 'income' ? 'active' : ''}" data-type="income">🟢 收入</button>
        </div>

        <div class="card mb-lg" style="text-align:center">
          <div class="text-secondary mb-sm" style="font-size:12px">${this.type === 'expense' ? '💸 花了多少？' : '💰 收入多少？'}</div>
          <input type="text" inputmode="decimal" id="rec-amount" class="input input--amount" placeholder="0.00" maxlength="12" autocomplete="off">
        </div>

        <div class="card mb-lg">
          <div class="card__title">选择分类</div>
          <div id="cat-picker"></div>
        </div>

        <div class="card mb-lg">
          <div class="input-group">
            <label class="input-label">📅 日期</label>
            <input type="date" id="rec-date" class="input" value="${today()}">
          </div>
          <div class="input-group">
            <label class="input-label">🏦 账户</label>
            <select id="rec-account" class="input">
              ${this.accounts.map(a => `<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">📝 备注</label>
            <textarea id="rec-note" class="textarea" placeholder="写点备注吧～" maxlength="200"></textarea>
          </div>
        </div>

        <button class="btn btn--primary btn--block" id="rec-save" style="height:52px;font-size:18px">✅ 记录这笔</button>
        <div style="height:32px"></div>
      </div>`;

    // 分类选择器
    this.picker = new CategoryPicker(this.container.querySelector('#cat-picker'));
    this.picker.setCategories(this.cats);
    this.picker.onChange = (cat) => { this.selectedCat = cat; };

    // 类型切换
    this.container.querySelectorAll('.type-toggle__btn').forEach(b => {
      b.addEventListener('click', () => this.switchType(b.dataset.type));
    });

    this.container.querySelector('#rec-save').addEventListener('click', () => this.save());
    this.container.querySelector('#rec-amount')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.save();
    });

    setTimeout(() => this.container.querySelector('#rec-amount')?.focus(), 200);
  }

  async save() {
    if (this.saving) return;

    const amount    = parseFloat(this.container.querySelector('#rec-amount')?.value);
    const date      = this.container.querySelector('#rec-date')?.value;
    const note      = this.container.querySelector('#rec-note')?.value.trim();
    const accountId = parseInt(this.container.querySelector('#rec-account')?.value);

    if (isNaN(amount) || amount <= 0) { Toast.warning('请输入有效金额'); return; }
    if (!this.selectedCat) { Toast.warning('请选择分类'); return; }

    this.saving = true;
    const btn = this.container.querySelector('#rec-save');
    if (btn) btn.textContent = '保存中...';

    const res = await createRecord({
      type:       this.type,
      amount,
      categoryId: this.selectedCat.id,
      accountId:  accountId || null,   // 从下拉选择获取真实账户 ID
      recordDate: date,
      note:       note || null,
    });

    this.saving = false;
    if (btn) btn.textContent = '✅ 记录这笔';

    if (!res.ok) {
      Toast.warning(res.message || '保存失败');
      return;
    }

    store.emit(EV.RECORD_CHANGED);
    Toast.success(`记好啦～ ${this.type === 'expense' ? '💸' : '💰'} ¥${amount.toFixed(2)}`);

    this.container.querySelector('#rec-amount').value = '';
    this.container.querySelector('#rec-note').value = '';
    this.selectedCat = null;
    this.picker.setSelected(null);
    this.container.querySelector('#rec-amount')?.focus();
  }

  destroy() {}
}
