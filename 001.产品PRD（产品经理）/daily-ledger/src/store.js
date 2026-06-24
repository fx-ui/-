// 全局事件总线（Pub/Sub）
class Store {
  #listeners = new Map();

  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const set = this.#listeners.get(event);
    if (set) set.delete(callback);
  }

  emit(event, data) {
    const set = this.#listeners.get(event);
    if (set) set.forEach(cb => { try { cb(data); } catch (e) { console.error(e); } });
  }
}

// 全局单例
export const store = new Store();

// 事件名称常量
export const EVENTS = {
  RECORD_CREATED:  'record:created',
  RECORD_UPDATED:  'record:updated',
  RECORD_DELETED:  'record:deleted',
  ACCOUNT_UPDATED: 'account:updated',
  BUDGET_UPDATED:  'budget:updated',
  CATEGORY_UPDATED:'category:updated',
  TEMPLATE_UPDATED:'template:updated',
  SETTINGS_CHANGED:'settings:changed',
  ROLE_CHANGED:    'role:changed',
};
