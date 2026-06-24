// 通用弹窗
export class Modal {
  constructor() {
    this.overlay = null;
    this.resolve = null;
  }

  show({ title, content, confirmText = '确定', cancelText = '取消', showCancel = true, isDanger = false } = {}) {
    return new Promise((resolve) => {
      this.resolve = resolve;

      this.overlay = document.createElement('div');
      this.overlay.className = 'modal-overlay';
      this.overlay.innerHTML = `
        <div class="modal">
          ${title ? `<div class="modal__title">${title}</div>` : ''}
          <div class="modal__body">${content}</div>
          <div class="modal__actions">
            ${showCancel ? `<button class="btn btn--outline modal__cancel">${cancelText}</button>` : ''}
            <button class="btn ${isDanger ? 'btn--danger' : 'btn--primary'} modal__confirm">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(this.overlay);

      // 事件
      this.overlay.querySelector('.modal__cancel')?.addEventListener('click', () => this.close(false));
      this.overlay.querySelector('.modal__confirm')?.addEventListener('click', () => this.close(true));
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close(false);
      });
    });
  }

  close(result) {
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      this.overlay.style.transition = 'opacity 0.2s ease';
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
      }, 200);
    }
    if (this.resolve) {
      this.resolve(result);
      this.resolve = null;
    }
  }

  static async confirm({ title, content, confirmText = '确定', cancelText = '取消', isDanger = false } = {}) {
    const modal = new Modal();
    return modal.show({ title, content, confirmText, cancelText, showCancel: true, isDanger });
  }

  static async alert({ title, content, confirmText = '知道了' } = {}) {
    const modal = new Modal();
    return modal.show({ title, content, confirmText, showCancel: false });
  }
}
