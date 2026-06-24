// 记账页 — 核心录入
import { store, EV } from '../store.js';
import { router } from '../router.js';
import { getCategories } from '../data/categories.js';
import { defaultAccounts } from '../data/accounts.js';
import { today } from '../utils/format.js';
import { Toast } from '../components/Toast.js';
import { CategoryPicker } from '../components/CategoryPicker.js';

export class RecordView {
  constructor(container) {
    this.container = container;
    this.type = 'expense';
    this.selectedCat = null;
    this.cats = getCategories('expense');
    this.picker = null;
  }

  mount() {
    // 初始化默认账户（新用户也需要有账户可选）
    if (store.accounts.length === 0) {
      store.accounts = defaultAccounts.map(a => ({ ...a }));
    }
    this.render();
  }

  render() {
    this.cats = getCategories(this.type);
    this.container.innerHTML = `
      <div class="view active">
        <!-- 类型切换 -->
        <div class="type-toggle mb-lg">
          <button class="type-toggle__btn expense ${this.type === 'expense' ? 'active' : ''}" data-type="expense">🔴 支出</button>
          <button class="type-toggle__btn income ${this.type === 'income' ? 'active' : ''}" data-type="income">🟢 收入</button>
        </div>

        <!-- 金额 -->
        <div class="card mb-lg" style="text-align:center">
          <div class="text-secondary mb-sm" style="font-size:12px">${this.type === 'expense' ? '💸 花了多少？' : '💰 收入多少？'}</div>
          <input type="text" inputmode="decimal" id="rec-amount" class="input input--amount" placeholder="0.00" maxlength="12" autocomplete="off">
        </div>

        <!-- 分类 -->
        <div class="card mb-lg">
          <div class="card__title">选择分类</div>
          <div id="cat-picker"></div>
        </div>

        <!-- 附加 -->
        <div class="card mb-lg">
          <div class="input-group">
            <label class="input-label">📅 日期</label>
            <input type="date" id="rec-date" class="input" value="${today()}">
          </div>
          <div class="input-group">
            <label class="input-label">🏦 账户</label>
            <select id="rec-account" class="input">
              ${store.accounts.map(a => `<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">📝 备注</label>
            <textarea id="rec-note" class="textarea" placeholder="写点备注吧～" maxlength="200"></textarea>
          </div>
        </div>

        <!-- 保存 -->
        <button class="btn btn--primary btn--block" id="rec-save" style="height:52px;font-size:18px">✅ 记录这笔</button>
        <div style="height:32px"></div>
      </div>`;

    // 分类选择器
    this.picker = new CategoryPicker(this.container.querySelector('#cat-picker'));
    this.picker.setCategories(this.cats);
    this.picker.onChange = (cat) => { this.selectedCat = cat; };

    // 事件
    this.container.querySelectorAll('.type-toggle__btn').forEach(b => {
      b.addEventListener('click', () => {
        this.type = b.dataset.type;
        this.selectedCat = null;
        this.render();
        setTimeout(() => this.container.querySelector('#rec-amount')?.focus(), 100);
      });
    });

    this.container.querySelector('#rec-save').addEventListener('click', () => this.save());
    this.container.querySelector('#rec-amount')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.save();
    });

    // 聚焦金额
    setTimeout(() => this.container.querySelector('#rec-amount')?.focus(), 200);
  }

  save() {
    const amount = parseFloat(this.container.querySelector('#rec-amount')?.value);
    const date = this.container.querySelector('#rec-date')?.value;
    const note = this.container.querySelector('#rec-note')?.value.trim();
    const accountId = parseInt(this.container.querySelector('#rec-account')?.value);

    if (isNaN(amount) || amount <= 0) { Toast.warning('请输入有效金额'); return; }
    if (!this.selectedCat) { Toast.warning('请选择分类'); return; }

    const record = {
      id: Date.now(),
      amount, type: this.type,
      categoryId: this.selectedCat.id,
      date, accountId, note,
    };
    store.records.unshift(record);
    store.emit(EV.RECORD_CHANGED, record);

    // 更新账户余额
    const acc = store.accounts.find(a => a.id === accountId);
    if (acc) acc.balance += this.type === 'income' ? amount : -amount;

    Toast.success(`记好啦～ ${this.type === 'expense' ? '💸' : '💰'} ¥${amount.toFixed(2)}`);

    // 清空
    this.container.querySelector('#rec-amount').value = '';
    this.container.querySelector('#rec-note').value = '';
    this.selectedCat = null;
    this.picker.setSelected(null);
    this.container.querySelector('#rec-amount').focus();
  }

  destroy() {}
}
