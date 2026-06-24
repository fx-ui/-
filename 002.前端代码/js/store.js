// 简易事件总线 + 全局状态
export const store = {
  _events: {},

  on(ev, cb) {
    (this._events[ev] = this._events[ev] || []).push(cb);
    return () => this.off(ev, cb);
  },

  off(ev, cb) {
    const arr = this._events[ev];
    if (arr) this._events[ev] = arr.filter(fn => fn !== cb);
  },

  emit(ev, data) {
    (this._events[ev] || []).forEach(cb => { try { cb(data); } catch (e) { console.error(e); } });
  },

  // 全局内存数据（原型演示，刷新后重置为示例数据）
  records: [],
  accounts: [],
  budgets: [],
  templates: [],
};

export const EV = {
  RECORD_CHANGED: 'record:changed',
  ACCOUNT_CHANGED: 'account:changed',
  BUDGET_CHANGED: 'budget:changed',
};
