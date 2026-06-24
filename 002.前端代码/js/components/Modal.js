// 通用弹窗
export class Modal {
  static show({ title, content, confirmText = '确定', cancelText = '取消', showCancel = true, isDanger = false } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          ${title ? `<div class="modal__title">${title}</div>` : ''}
          <div class="modal__body">${content}</div>
          <div class="modal__actions">
            ${showCancel ? `<button class="btn btn--outline modal-cancel">${cancelText}</button>` : ''}
            <button class="btn ${isDanger ? 'btn--danger' : 'btn--primary'} modal-confirm">${confirmText}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      const close = (val) => {
        overlay.style.opacity = '0'; overlay.style.transition = 'opacity .2s';
        setTimeout(() => overlay.remove(), 200);
        resolve(val);
      };

      overlay.querySelector('.modal-cancel')?.addEventListener('click', () => close(false));
      overlay.querySelector('.modal-confirm')?.addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    });
  }

  static confirm(opts) { return this.show(opts); }
}
