// 离线提示条
export const OfflineBar = {
  bar: null,
  _visible: false,

  init() {
    this.bar = document.createElement('div');
    this.bar.className = 'offline-bar';
    this.bar.textContent = '📡 当前处于离线模式，数据保存在本地';
    document.body.appendChild(this.bar);

    window.addEventListener('online', () => this.hide());
    window.addEventListener('offline', () => this.show());

    if (!navigator.onLine) this.show();
  },

  show() {
    if (this._visible) return;
    this._visible = true;
    this.bar.classList.add('show');
    setTimeout(() => this.hide(), 3000);
  },

  hide() {
    this._visible = false;
    this.bar.classList.remove('show');
  },
};
