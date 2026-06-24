// Toast 轻提示
export const Toast = {
  init() {
    this.el = document.getElementById('toast-container');
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'toast-container';
      document.body.appendChild(this.el);
    }
  },

  show(msg, type = 'info', ms = 2000) {
    if (!this.el) this.init();
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.textContent = msg;
    this.el.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .2s'; setTimeout(() => t.remove(), 200); }, ms);
  },

  success(msg) { this.show(msg, 'success'); },
  warning(msg) { this.show(msg, 'info', 2500); },
  error(msg)   { this.show(msg, 'error', 3000); },
};
