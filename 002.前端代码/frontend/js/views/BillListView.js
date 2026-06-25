// 账单列表页（首页）— 月度总览 + 分类TOP3 + 最近记账 + 删除 + 编辑
import { store, EV } from '../store.js';
import { fmtMoney, fmtDateCN, today } from '../utils/format.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import {
  getRecords, deleteRecord, editRecord, getMonthlySummary, getCategoryRanking, fetchCategories,
} from '../api.js?v=14';

export class BillListView {
  constructor(container) {
    this.container = container;
    this.month   = new Date().toISOString().slice(0, 7);
    this.filter  = 'all';
    this.summary = { income: 0, expense: 0, balance: 0 };
    this.topCats = [];
    this.records = [];
    this.total   = 0;           // 总记录数
    this.pageSize = 10;         // 每页条数
    this.hasMore = false;       // 是否有更多
    this.loadingMore = false;   // 是否正在加载更多
    this._onChange = null;
    this._editingRecord = null;  // 正在编辑的记录
  }

  monthLabel() {
    const [y, m] = this.month.split('-');
    return `${y}年${parseInt(m)}月`;
  }

  prevMonth() { this.changeMonth(-1); }
  nextMonth() { this.changeMonth(1); }

  changeMonth(delta) {
    const d = new Date(this.month + '-01');
    d.setMonth(d.getMonth() + delta);
    this.month = d.toISOString().slice(0, 7);
    this.refresh();
  }

  async mount() {
    this._onChange = () => this.refresh();
    store.on(EV.RECORD_CHANGED, this._onChange);
    await this.refresh();
  }

  async refresh() {
    await Promise.all([
      this.loadSummary(),
      this.loadTopCats(),
    ]);
    // 重置分页，加载第一页
    this.records = [];
    this.total = 0;
    this.hasMore = false;
    await this.loadRecords(0);
    this.render();
  }

  async loadSummary() {
    try { const res = await getMonthlySummary(this.month); if (res.ok) this.summary = res.data; } catch {}
  }

  async loadTopCats() {
    try { const res = await getCategoryRanking(this.month, 3); if (res.ok) this.topCats = res.data; } catch {}
  }

  async loadRecords(offset = 0) {
    if (this.loadingMore) return;
    this.loadingMore = true;
    try {
      const params = { month: this.month, limit: this.pageSize, offset };
      if (this.filter !== 'all') params.type = this.filter;
      const res = await getRecords(params);
      if (res.ok) {
        const list = res.data.list || [];
        this.total = res.data.total || 0;
        this.hasMore = this.records.length + list.length < this.total;
        if (offset === 0) {
          this.records = list;
        } else {
          this.records = this.records.concat(list);
        }
      }
    } catch (e) {
      console.error('Load records error:', e);
    }
    this.loadingMore = false;
  }

  async loadMore() {
    await this.loadRecords(this.records.length);
    this.render();
  }

  async setFilter(filter) {
    this.filter = filter;
    await this.refresh();
  }

  async handleDelete(id) {
    if (!confirm('确定要删除这条记录吗？')) return;
    const res = await deleteRecord(id);
    if (res.ok) {
      Toast.success('已删除');
      await this.refresh();
    } else {
      Toast.warning(res.message || '删除失败');
    }
  }

  async handleEdit(record) {
    // 加载分类列表用于编辑
    let cats = [];
    try {
      const res = await fetchCategories(record.type);
      if (res.ok && res.data) {
        res.data.forEach(p => {
          cats.push({ id: p.id, name: p.name, icon: p.icon, type: record.type });
          (p.children || []).forEach(c => {
            cats.push({ id: c.id, name: c.name, icon: c.icon, type: record.type });
          });
        });
      }
    } catch (e) { /* ignore */ }

    this._editingRecord = record;
    this.renderEditModal(record, cats);
  }

  renderEditModal(record, cats) {
    // 移除旧编辑弹窗
    const old = document.getElementById('edit-modal-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'edit-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-height:90vh;overflow-y:auto">
        <div class="modal__title">✏️ 编辑记录</div>
        <div class="modal__body">
          <div class="type-toggle mb-lg" style="display:flex;background:var(--color-bg);border-radius:24px;padding:4px;gap:4px">
            <button class="type-toggle__btn expense edit-type-btn ${record.type === 'expense' ? 'active' : ''}" data-type="expense" style="flex:1;padding:8px;border-radius:20px;font-size:15px;font-weight:600;border:none;cursor:pointer;background:${record.type==='expense'?'#fff':'transparent'};color:${record.type==='expense'?'var(--color-expense)':'var(--text-secondary)'}">🔴 支出</button>
            <button class="type-toggle__btn income edit-type-btn ${record.type === 'income' ? 'active' : ''}" data-type="income" style="flex:1;padding:8px;border-radius:20px;font-size:15px;font-weight:600;border:none;cursor:pointer;background:${record.type==='income'?'#fff':'transparent'};color:${record.type==='income'?'var(--color-income)':'var(--text-secondary)'}">🟢 收入</button>
          </div>

          <div class="input-group">
            <label class="input-label">💰 金额</label>
            <input type="text" inputmode="decimal" id="edit-amount" class="input input--amount" value="${record.amount}" maxlength="12" style="font-size:28px;font-weight:700;text-align:center;height:56px">
          </div>

          <div class="input-group">
            <label class="input-label">📂 分类</label>
            <div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0" id="edit-cat-list">
              ${cats.map(c => `
                <div class="edit-cat-chip ${record.category_id === c.id ? 'selected' : ''}" data-cid="${c.id}" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;border-radius:16px;background:${record.category_id===c.id?'var(--color-primary-light)':'#fff'};box-shadow:0 2px 8px rgba(0,0,0,.06);cursor:pointer;min-width:60px">
                  <span style="font-size:22px">${c.icon}</span>
                  <span style="font-size:11px;font-weight:500">${c.name}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">📅 日期</label>
            <input type="date" id="edit-date" class="input" value="${record.record_date}">
          </div>

          <div class="input-group">
            <label class="input-label">📝 备注</label>
            <textarea id="edit-note" class="textarea" placeholder="备注" maxlength="200">${record.note || ''}</textarea>
          </div>
        </div>
        <div class="modal__actions" style="display:flex;gap:12px;margin-top:16px">
          <button class="btn btn--outline flex-1" id="edit-cancel">取消</button>
          <button class="btn btn--primary flex-1" id="edit-save">💾 保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    let editType = record.type;
    let editCatId = record.category_id;

    // 关闭
    const close = () => { overlay.style.opacity = '0'; overlay.style.transition = 'opacity .2s'; setTimeout(() => overlay.remove(), 200); };
    overlay.querySelector('#edit-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // 类型切换
    overlay.querySelectorAll('.edit-type-btn').forEach(b => {
      b.addEventListener('click', () => {
        editType = b.dataset.type;
        overlay.querySelectorAll('.edit-type-btn').forEach(eb => {
          eb.classList.toggle('active', eb.dataset.type === editType);
          eb.style.background = eb.dataset.type === editType ? '#fff' : 'transparent';
          eb.style.color = eb.dataset.type === editType
            ? (editType === 'expense' ? 'var(--color-expense)' : 'var(--color-income)')
            : 'var(--text-secondary)';
        });
        // 重新加载分类
        this.reloadEditCats(editType, editCatId, overlay);
      });
    });

    // 分类选择
    overlay.querySelector('#edit-cat-list').addEventListener('click', (e) => {
      const chip = e.target.closest('.edit-cat-chip');
      if (!chip) return;
      editCatId = parseInt(chip.dataset.cid);
      overlay.querySelectorAll('.edit-cat-chip').forEach(c => {
        c.classList.toggle('selected', parseInt(c.dataset.cid) === editCatId);
        c.style.background = parseInt(c.dataset.cid) === editCatId ? 'var(--color-primary-light)' : '#fff';
      });
    });

    // 保存
    overlay.querySelector('#edit-save').addEventListener('click', async () => {
      const amount = parseFloat(overlay.querySelector('#edit-amount')?.value);
      const date = overlay.querySelector('#edit-date')?.value;
      const note = overlay.querySelector('#edit-note')?.value?.trim();

      if (isNaN(amount) || amount <= 0) { Toast.warning('请输入有效金额'); return; }
      if (!editCatId) { Toast.warning('请选择分类'); return; }

      const btn = overlay.querySelector('#edit-save');
      btn.textContent = '保存中...';
      btn.disabled = true;

      const res = await editRecord(record.id, {
        type: editType,
        amount,
        categoryId: editCatId,
        accountId: record.account_id,
        recordDate: date,
        note: note || null,
      });

      if (res.ok) {
        Toast.success('已更新');
        close();
        await this.refresh();
      } else {
        Toast.warning(res.message || '保存失败');
        btn.textContent = '💾 保存';
        btn.disabled = false;
      }
    });
  }

  async reloadEditCats(type, currentCatId, overlay) {
    const list = overlay.querySelector('#edit-cat-list');
    if (!list) return;
    try {
      const res = await fetchCategories(type);
      const cats = [];
      if (res.ok && res.data) {
        res.data.forEach(p => {
          cats.push({ id: p.id, name: p.name, icon: p.icon });
          (p.children || []).forEach(c => cats.push({ id: c.id, name: c.name, icon: c.icon }));
        });
      }
      list.innerHTML = cats.map(c => `
        <div class="edit-cat-chip ${c.id === currentCatId ? 'selected' : ''}" data-cid="${c.id}" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;border-radius:16px;background:${c.id===currentCatId?'var(--color-primary-light)':'#fff'};box-shadow:0 2px 8px rgba(0,0,0,.06);cursor:pointer;min-width:60px">
          <span style="font-size:22px">${c.icon}</span>
          <span style="font-size:11px;font-weight:500">${c.name}</span>
        </div>
      `).join('');
    } catch (e) { /* ignore */ }
  }

  // ================================================================
  render() {
    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <span class="page-header__title">📋 账单</span>
        </div>

        <!-- 月份切换 -->
        <div class="month-switcher">
          <button class="month-switcher__btn" id="bill-prev">←</button>
          <span class="month-switcher__label">${this.monthLabel()}</span>
          <button class="month-switcher__btn" id="bill-next">→</button>
        </div>

        <!-- 1. 月度收支总览 -->
        <div class="card mb-lg">
          <div style="display:flex;justify-content:space-around;text-align:center">
            <div>
              <div class="text-secondary" style="font-size:12px">💰 收入</div>
              <div style="font-size:20px;font-weight:700;color:var(--color-income)">${fmtMoney(this.summary.income)}</div>
            </div>
            <div>
              <div class="text-secondary" style="font-size:12px">💸 支出</div>
              <div style="font-size:20px;font-weight:700;color:var(--color-expense)">${fmtMoney(this.summary.expense)}</div>
            </div>
            <div>
              <div class="text-secondary" style="font-size:12px">📊 结余</div>
              <div style="font-size:20px;font-weight:700;color:${this.summary.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">${fmtMoney(this.summary.balance)}</div>
            </div>
          </div>
        </div>

        <!-- 2. 分类支出 TOP3 -->
        <div class="card mb-lg">
          <div class="card__title">📂 分类支出 TOP3</div>
          ${this.topCats.length === 0
            ? '<div class="text-center text-secondary p-md" style="font-size:13px">本月暂无支出</div>'
            : this.topCats.map((c, i) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--color-bg)">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:24px">${c.icon || '📌'}</span>
                  <div>
                    <div style="font-weight:600;font-size:14px">${c.name}</div>
                    <div class="text-secondary" style="font-size:11px">TOP ${i + 1}</div>
                  </div>
                </div>
                <span style="font-weight:700;color:var(--color-expense);font-size:16px">${fmtMoney(c.total)}</span>
              </div>
            `).join('')
          }
        </div>

        <!-- 3. 最近记账（含删除、编辑、分页） -->
        <div class="card mb-lg">
          <div class="card__title">🕐 最近记账（${this.total}条，已加载${this.records.length}条）</div>
          ${this.records.length === 0
            ? '<div class="text-center text-secondary p-md" style="font-size:13px">本月还没有记账哦～</div>'
            : this.records.map(r => `
              <div class="bill-item" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--color-bg)">
                <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
                  <span style="font-size:24px">${r.category_icon || '📌'}</span>
                  <div style="min-width:0">
                    <div style="font-weight:500;font-size:14px">${r.category_name || '未分类'}</div>
                    <div class="text-secondary" style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${fmtDateCN(r.record_date)}${r.note ? ' · ' + r.note : ''}</div>
                  </div>
                </div>
                <span style="font-weight:700;font-size:16px;margin-right:12px;white-space:nowrap;color:${r.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'}">
                  ${r.type === 'income' ? '+' : '-'}${fmtMoney(r.amount).replace('¥', '')}
                </span>
                <button class="btn-del" data-edit="${r.id}" style="background:none;border:none;font-size:16px;cursor:pointer;padding:4px 4px;color:#ccc" title="编辑">✏️</button>
                <button class="btn-del" data-del="${r.id}" style="background:none;border:none;font-size:18px;cursor:pointer;padding:4px 4px;color:#ccc" title="删除">🗑</button>
              </div>
            `).join('')
          }
        </div>

        ${this.hasMore ? `
          <div style="text-align:center;margin-top:12px">
            <button class="btn btn--outline" id="load-more-btn" style="width:100%">📥 加载更多（${this.total - this.records.length}条剩余）</button>
          </div>
        ` : ''}
        <div style="height:24px"></div>
      </div>`;

    // 月份切换
    this.container.querySelector('#bill-prev')?.addEventListener('click', () => this.prevMonth());
    this.container.querySelector('#bill-next')?.addEventListener('click', () => this.nextMonth());

    // 加载更多
    this.container.querySelector('#load-more-btn')?.addEventListener('click', () => this.loadMore());

    // 编辑按钮
    this.container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.edit);
        const record = this.records.find(r => r.id === id);
        if (record) this.handleEdit(record);
      });
    });

    // 删除按钮
    this.container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.del);
        if (id) this.handleDelete(id);
      });
    });
  }

  destroy() {
    if (this._onChange) store.off(EV.RECORD_CHANGED, this._onChange);
  }
}
