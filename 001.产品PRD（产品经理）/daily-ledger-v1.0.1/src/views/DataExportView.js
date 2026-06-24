// 数据导出 / 导入 / 备份
import { getRecords, getAccounts, getBudgets, getTemplates, getCategories, getAllSettings, addRecord, addAccount } from '../db.js';
import { store, EVENTS } from '../store.js';
import { router } from '../router.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';
import { formatDate, today } from '../utils/format.js';

export class DataExportView {
  constructor(container) {
    this.container = container;
  }

  async mount() {
    // 获取统计信息
    const records = await getRecords();
    const accounts = await getAccounts();
    const budgets = await getBudgets();
    const templates = await getTemplates();
    const categories = await getCategories();
    const settings = await getAllSettings();

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <button class="page-header__back" id="export-back">←</button>
          <span class="page-header__title">📤 数据管理</span>
        </div>

        <div class="card mb-lg">
          <div class="card__title">📊 数据概览</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="text-center"><div style="font-size:24px;font-weight:700;color:var(--color-primary-dark)">${records.length}</div><div class="text-secondary" style="font-size:12px">条记录</div></div>
            <div class="text-center"><div style="font-size:24px;font-weight:700;color:var(--color-accent)">${accounts.length}</div><div class="text-secondary" style="font-size:12px">个账户</div></div>
            <div class="text-center"><div style="font-size:24px;font-weight:700;color:var(--color-warning)">${budgets.length}</div><div class="text-secondary" style="font-size:12px">项预算</div></div>
            <div class="text-center"><div style="font-size:24px;font-weight:700;color:var(--color-income)">${templates.length}</div><div class="text-secondary" style="font-size:12px">个模板</div></div>
          </div>
        </div>

        <!-- 导出 -->
        <div class="card mb-lg">
          <div class="card__title">📤 导出数据</div>
          <p class="text-secondary mb-md" style="font-size:12px">将所有数据导出为 JSON 文件，可用于备份或迁移</p>
          <button class="btn btn--primary btn--block" id="export-json">📥 导出 JSON</button>
          <button class="btn btn--outline btn--block mt-sm" id="export-csv">📊 导出 CSV（仅账单记录）</button>
        </div>

        <!-- 导入 -->
        <div class="card mb-lg">
          <div class="card__title">📥 导入数据</div>
          <p class="text-secondary mb-md" style="font-size:12px">从之前导出的 JSON 备份文件恢复数据（将合并到现有数据中）</p>
          <input type="file" id="import-file" accept=".json" style="display:none">
          <button class="btn btn--outline btn--block" id="import-btn">📂 选择文件导入</button>
        </div>

        <!-- 清除 -->
        <div class="card">
          <div class="card__title" style="color:var(--color-expense)">⚠️ 清除数据</div>
          <p class="text-secondary mb-md" style="font-size:12px">清除所有本地数据，此操作不可恢复！</p>
          <button class="btn btn--danger btn--block" id="clear-data">🗑 清除所有数据</button>
        </div>

        <div style="height:24px"></div>
      </div>`;

    this.container.querySelector('#export-back').addEventListener('click', () => router.back());

    // 导出 JSON
    this.container.querySelector('#export-json').addEventListener('click', () => {
      const data = { version: '1.0', exportedAt: new Date().toISOString(), records, accounts, budgets, templates, categories, settings };
      this.downloadFile(`daily-ledger-backup-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
      Toast.success('导出成功！文件已下载');
    });

    // 导出 CSV
    this.container.querySelector('#export-csv').addEventListener('click', () => {
      const header = '日期,类型,分类,金额,账户,备注';
      const rows = records.map(r => {
        const cat = categories.find(c => c.id === r.categoryId);
        const acc = accounts.find(a => a.id === r.accountId);
        return [r.date, r.type === 'expense' ? '支出' : '收入', cat?.name || '', r.amount, acc?.name || '', (r.note || '').replace(/,/g, '，')].join(',');
      });
      this.downloadFile(`daily-ledger-${today()}.csv`, '﻿' + header + '\n' + rows.join('\n'), 'text/csv');
      Toast.success('CSV 已导出');
    });

    // 导入
    this.container.querySelector('#import-btn').addEventListener('click', () => {
      this.container.querySelector('#import-file').click();
    });

    this.container.querySelector('#import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.version) { Toast.error('无效的备份文件'); return; }

        const confirmed = await Modal.confirm({
          title: '确认导入',
          content: `将导入 ${data.records?.length || 0} 条记录、${data.accounts?.length || 0} 个账户。现有数据不会被覆盖。`,
          confirmText: '开始导入',
        });

        if (!confirmed) return;

        let imported = 0;
        // 导入记录（使用原始字段）
        if (data.records) {
          for (const r of data.records) {
            await addRecord({
              amount: r.amount, type: r.type, categoryId: r.categoryId,
              date: r.date, accountId: r.accountId, note: r.note || '',
            });
            imported++;
          }
        }

        store.emit(EVENTS.RECORD_CREATED, {});
        store.emit(EVENTS.ACCOUNT_UPDATED);
        Toast.success(`导入完成！共导入 ${imported} 条记录`);
        this.mount();
      } catch (err) {
        Toast.error('文件解析失败，请检查文件格式');
        console.error(err);
      }
      e.target.value = '';
    });

    // 清除数据
    this.container.querySelector('#clear-data').addEventListener('click', async () => {
      const confirmed = await Modal.confirm({
        title: '⚠️ 确认清除',
        content: '此操作将永久删除所有记账数据、账户、预算、模板和分类！<br><br><b>此操作不可恢复！</b>',
        confirmText: '确认清除',
        isDanger: true,
      });
      if (confirmed) {
        const DBDeleteRequest = indexedDB.deleteDatabase('DailyLedgerDB');
        DBDeleteRequest.onsuccess = () => {
          Toast.success('数据已清除，请刷新页面');
          setTimeout(() => location.reload(), 1500);
        };
        DBDeleteRequest.onerror = () => Toast.error('清除失败');
      }
    });
  }

  downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  destroy() {}
}
