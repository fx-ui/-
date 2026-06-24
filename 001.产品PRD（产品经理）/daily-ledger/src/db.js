// IndexedDB 数据库操作
// 使用原生 IndexedDB（避免 idb 库依赖，减少体积）

const DB_NAME = 'DailyLedgerDB';
const DB_VERSION = 1;

/** 打开数据库 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // records store
      if (!db.objectStoreNames.contains('records')) {
        const recordsStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
        recordsStore.createIndex('date', 'date', { unique: false });
        recordsStore.createIndex('type', 'type', { unique: false });
        recordsStore.createIndex('categoryId', 'categoryId', { unique: false });
        recordsStore.createIndex('accountId', 'accountId', { unique: false });
        recordsStore.createIndex('date_type', ['date', 'type'], { unique: false });
      }

      // accounts store
      if (!db.objectStoreNames.contains('accounts')) {
        const accountsStore = db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
        accountsStore.createIndex('type', 'type', { unique: false });
      }

      // budgets store
      if (!db.objectStoreNames.contains('budgets')) {
        const budgetsStore = db.createObjectStore('budgets', { keyPath: 'id', autoIncrement: true });
        budgetsStore.createIndex('categoryId', 'categoryId', { unique: false });
      }

      // categories store
      if (!db.objectStoreNames.contains('categories')) {
        const categoriesStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
        categoriesStore.createIndex('type', 'type', { unique: false });
        categoriesStore.createIndex('role', 'role', { unique: false });
      }

      // templates store
      if (!db.objectStoreNames.contains('templates')) {
        const templatesStore = db.createObjectStore('templates', { keyPath: 'id', autoIncrement: true });
      }

      // settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/** Promise 包裹的事务操作 */
function tx(db, storeName, mode = 'readonly') {
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

/** 通用 Promise 包装 */
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// ===== 数据库初始化 =====

let dbInstance = null;

export async function getDB() {
  if (!dbInstance) {
    dbInstance = await openDB();
  }
  return dbInstance;
}

/** 初始化种子数据 */
export async function initSeedData() {
  const db = await getDB();

  // 检查是否已初始化
  const count = await countRecords(db, 'categories');
  if (count > 0) return; // 已初始化

  const { defaultCategories } = await import('../data/default-categories.js');
  const { defaultAccounts, defaultSettings } = await import('../data/default-accounts.js');

  // 添加分类
  const catStore = tx(db, 'categories', 'readwrite');
  for (const cat of defaultCategories) {
    await promisify(catStore.add(cat));
  }

  // 添加账户
  const accStore = tx(db, 'accounts', 'readwrite');
  for (const acc of defaultAccounts) {
    await promisify(accStore.add(acc));
  }

  // 添加设置
  const setStore = tx(db, 'settings', 'readwrite');
  for (const setting of defaultSettings) {
    await promisify(setStore.add(setting));
  }
}

function countRecords(db, storeName) {
  return new Promise((resolve, reject) => {
    const store = tx(db, storeName);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ===== Records CRUD =====

export async function addRecord(data) {
  const db = await getDB();
  const store = tx(db, 'records', 'readwrite');
  const record = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const id = await promisify(store.add(record));

  // 更新账户余额
  if (data.accountId) {
    const delta = data.type === 'income' ? data.amount : -data.amount;
    await updateAccountBalance(db, data.accountId, delta);
  }

  return { ...record, id };
}

export async function getRecordById(id) {
  const db = await getDB();
  const store = tx(db, 'records');
  return promisify(store.get(id));
}

export async function updateRecord(id, data) {
  const db = await getDB();
  const store = tx(db, 'records', 'readwrite');

  // 获取原记录以处理账户余额回退
  const original = await promisify(store.get(id));
  if (!original) throw new Error('记录不存在');

  // 回退原账户余额
  if (original.accountId) {
    const origDelta = original.type === 'income' ? -original.amount : original.amount;
    await updateAccountBalance(db, original.accountId, origDelta);
  }

  // 应用新账户余额
  if (data.accountId) {
    const newDelta = data.type === 'income' ? data.amount : -data.amount;
    await updateAccountBalance(db, data.accountId, newDelta);
  }

  const updated = {
    ...original,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await promisify(store.put(updated));
  return updated;
}

export async function deleteRecord(id) {
  const db = await getDB();
  const store = tx(db, 'records', 'readwrite');
  const record = await promisify(store.get(id));
  if (!record) return;

  // 回退账户余额
  if (record.accountId) {
    const delta = record.type === 'income' ? -record.amount : record.amount;
    await updateAccountBalance(db, record.accountId, delta);
  }

  await promisify(store.delete(id));
  return record;
}

export async function getRecords({ startDate, endDate, type, categoryId, accountId, keyword, limit = 100, offset = 0 } = {}) {
  const db = await getDB();
  const store = tx(db, 'records');

  // 使用 date 索引获取数据
  const index = store.index('date');
  const range = startDate && endDate
    ? IDBKeyRange.bound(startDate, endDate)
    : null;

  const results = [];
  const request = range ? index.openCursor(range, 'prev') : index.openCursor(null, 'prev');

  return new Promise((resolve, reject) => {
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor && results.length < limit + offset) {
        const record = cursor.value;
        let match = true;

        if (type && record.type !== type) match = false;
        if (categoryId && record.categoryId !== categoryId) match = false;
        if (accountId && record.accountId !== accountId) match = false;
        if (keyword) {
          const kw = keyword.toLowerCase();
          const note = (record.note || '').toLowerCase();
          if (!note.includes(kw)) match = false;
        }

        if (match) results.push(record);
        cursor.continue();
      } else {
        resolve(results.slice(offset));
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ===== 统计查询 =====

/** 按分类统计 */
export async function getStatsByCategory({ startDate, endDate, type = 'expense' } = {}) {
  const records = await getAllRecordsInRange(startDate, endDate);
  const filtered = records.filter(r => r.type === type);

  const stats = {};
  filtered.forEach(r => {
    const catId = r.categoryId;
    if (!stats[catId]) stats[catId] = { categoryId: catId, total: 0, count: 0 };
    stats[catId].total += r.amount;
    stats[catId].count += 1;
  });

  return Object.values(stats).sort((a, b) => b.total - a.total);
}

/** 按月统计 */
export async function getStatsByMonth({ months = 6 } = {}) {
  const all = await getAllRecords();
  const now = new Date();
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthRecords = all.filter(r => r.date.startsWith(monthStr));

    result.push({
      month: monthStr,
      income: monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0),
      expense: monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
      count: monthRecords.length,
    });
  }

  return result;
}

async function getAllRecordsInRange(startDate, endDate) {
  const db = await getDB();
  const store = tx(db, 'records');
  const index = store.index('date');
  const range = startDate && endDate ? IDBKeyRange.bound(startDate, endDate) : null;

  const results = [];
  return new Promise((resolve, reject) => {
    const request = range ? index.openCursor(range) : index.openCursor();
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { results.push(cursor.value); cursor.continue(); }
      else resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getAllRecords() {
  const db = await getDB();
  const store = tx(db, 'records');
  const results = [];
  return new Promise((resolve, reject) => {
    const request = store.openCursor();
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { results.push(cursor.value); cursor.continue(); }
      else resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

// ===== Accounts =====

async function updateAccountBalance(db, accountId, delta) {
  const store = tx(db, 'accounts', 'readwrite');
  const account = await promisify(store.get(accountId));
  if (account) {
    account.balance = (account.balance || 0) + delta;
    await promisify(store.put(account));
  }
}

export async function getAccounts() {
  const db = await getDB();
  const store = tx(db, 'accounts');
  return promisify(store.getAll());
}

export async function getAccountById(id) {
  const db = await getDB();
  const store = tx(db, 'accounts');
  return promisify(store.get(id));
}

export async function addAccount(data) {
  const db = await getDB();
  const store = tx(db, 'accounts', 'readwrite');
  const id = await promisify(store.add({ ...data, balance: data.balance || 0 }));
  return { ...data, id };
}

export async function updateAccount(id, data) {
  const db = await getDB();
  const store = tx(db, 'accounts', 'readwrite');
  const original = await promisify(store.get(id));
  if (!original) throw new Error('账户不存在');
  const updated = { ...original, ...data };
  await promisify(store.put(updated));
  return updated;
}

export async function deleteAccount(id) {
  const db = await getDB();
  const store = tx(db, 'accounts', 'readwrite');
  await promisify(store.delete(id));
}

// ===== Categories =====

export async function getCategories(type, role) {
  const db = await getDB();
  const results = await promisify(tx(db, 'categories').getAll());
  return results.filter(c => {
    if (type && c.type !== type) return false;
    if (role && c.role !== role) return false;
    return true;
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getCategoryById(id) {
  const db = await getDB();
  return promisify(tx(db, 'categories').get(id));
}

export async function addCategory(data) {
  const db = await getDB();
  const store = tx(db, 'categories', 'readwrite');
  const id = await promisify(store.add({ ...data, isPreset: false }));
  return { ...data, id };
}

export async function deleteCategory(id) {
  const db = await getDB();
  const store = tx(db, 'categories', 'readwrite');
  await promisify(store.delete(id));
}

// ===== Budgets =====

export async function getBudgets() {
  const db = await getDB();
  return promisify(tx(db, 'budgets').getAll());
}

export async function setBudget(data) {
  const db = await getDB();
  const store = tx(db, 'budgets', 'readwrite');

  // 如果已有同 categoryId 的预算则更新
  const all = await promisify(store.getAll());
  const existing = all.find(b => b.categoryId === data.categoryId);
  if (existing) {
    existing.amount = data.amount;
    existing.period = data.period || 'monthly';
    await promisify(store.put(existing));
    return existing;
  }

  const id = await promisify(store.add({
    categoryId: data.categoryId || null,
    amount: data.amount,
    period: data.period || 'monthly',
    startDate: data.startDate || new Date().toISOString().slice(0, 7) + '-01',
  }));
  return { ...data, id };
}

export async function deleteBudget(id) {
  const db = await getDB();
  const store = tx(db, 'budgets', 'readwrite');
  await promisify(store.delete(id));
}

// ===== Templates =====

export async function getTemplates() {
  const db = await getDB();
  return promisify(tx(db, 'templates').getAll());
}

export async function addTemplate(data) {
  const db = await getDB();
  const store = tx(db, 'templates', 'readwrite');
  const id = await promisify(store.add({ ...data, useCount: 0 }));
  return { ...data, id };
}

export async function updateTemplate(id, data) {
  const db = await getDB();
  const store = tx(db, 'templates', 'readwrite');
  const original = await promisify(store.get(id));
  if (!original) throw new Error('模板不存在');
  const updated = { ...original, ...data };
  await promisify(store.put(updated));
  return updated;
}

export async function deleteTemplate(id) {
  const db = await getDB();
  const store = tx(db, 'templates', 'readwrite');
  await promisify(store.delete(id));
}

// ===== Settings =====

export async function getSetting(key) {
  const db = await getDB();
  const store = tx(db, 'settings');
  const result = await promisify(store.get(key));
  return result ? result.value : null;
}

export async function setSetting(key, value) {
  const db = await getDB();
  const store = tx(db, 'settings', 'readwrite');
  await promisify(store.put({ key, value }));
}

export async function getAllSettings() {
  const db = await getDB();
  return promisify(tx(db, 'settings').getAll());
}
