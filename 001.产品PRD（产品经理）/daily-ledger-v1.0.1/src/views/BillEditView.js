// 编辑账单页面（复用 RecordView 逻辑）
import { getRecordById, updateRecord, deleteRecord } from '../db.js';
import { store, EVENTS } from '../store.js';
import { router } from '../router.js';
import { RecordView } from './RecordView.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';

export class BillEditView {
  constructor(container, recordId) {
    this.container = container;
    this.recordId = Number(recordId);
    this.recordView = null;
  }

  async mount() {
    const record = await getRecordById(this.recordId);
    if (!record) {
      Toast.error('记录不存在');
      router.navigate('#/bills');
      return;
    }

    this.container.innerHTML = `
      <div class="view active">
        <div class="page-header">
          <button class="page-header__back" id="edit-back">←</button>
          <span class="page-header__title">编辑记录</span>
          <button class="btn btn--sm btn--danger" id="edit-delete">🗑 删除</button>
        </div>
        <div id="edit-form"></div>
      </div>`;

    // 返回按钮
    const backBtn = this.container.querySelector('#edit-back');
    backBtn?.addEventListener('click', () => router.back());

    // 删除按钮
    const delBtn = this.container.querySelector('#edit-delete');
    delBtn?.addEventListener('click', async () => {
      const confirmed = await Modal.confirm({
        title: '确认删除',
        content: '删除后无法恢复哦～确定要删除这条记录吗？',
        confirmText: '删除',
        isDanger: true,
      });
      if (confirmed) {
        await deleteRecord(record.id);
        store.emit(EVENTS.RECORD_DELETED, { id: record.id });
        Toast.success('已删除');
        router.navigate('#/bills');
      }
    });

    // 复用 RecordView 表单
    const formContainer = this.container.querySelector('#edit-form');
    this.recordView = new RecordView(formContainer);
    // 设置为编辑模式
    this.recordView.editTarget = record;
    this.recordView.type = record.type;
    await this.recordView.mount();
  }

  destroy() {
    if (this.recordView?.destroy) this.recordView.destroy();
  }
}
