// Toast 轻提示
export const Toast = {
  container: null,
  timer: null,

  init() {
    // 优先使用 HTML 中已有的容器
    this.container = document.getElementById('toast-container') || document.querySelector('.toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(msg, type = 'info', duration = 2000) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = msg;
    this.container.appendChild(toast);

    // 自动移除
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error', 3000); },
  warning(msg) { this.show(msg, 'warning', 2500); },
  info(msg)    { this.show(msg, 'info'); },
};
