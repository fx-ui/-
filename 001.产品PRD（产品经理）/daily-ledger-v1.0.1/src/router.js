// Hash SPA 路由
class Router {
  constructor() {
    this.routes = [];
    this.currentView = null;
    this.viewContainer = null;
  }

  /** 初始化路由 */
  init(container) {
    this.viewContainer = container;
    window.addEventListener('hashchange', () => this.resolve());
    // 初始加载
    if (!window.location.hash) {
      window.location.hash = '#/record';
    }
    this.resolve();
  }

  /** 注册路由 */
  add(pattern, viewClass) {
    this.routes.push({ pattern, viewClass });
    return this;
  }

  /** 解析当前 hash */
  resolve() {
    const hash = window.location.hash || '#/record';
    const match = this.matchRoute(hash);
    if (match) {
      this.mountView(match.viewClass, match.params);
    }
  }

  /** 匹配路由 */
  matchRoute(hash) {
    for (const route of this.routes) {
      const result = hash.match(route.pattern);
      if (result) {
        return {
          viewClass: route.viewClass,
          params: result.slice(1),
        };
      }
    }
    // 默认跳转到记账页
    return {
      viewClass: this.routes[0]?.viewClass || null,
      params: [],
    };
  }

  /** 挂载视图 */
  mountView(ViewClass, params = []) {
    if (!ViewClass) return;

    // 卸载当前视图
    if (this.currentView && this.currentView.destroy) {
      this.currentView.destroy();
    }

    // 清空容器
    if (this.viewContainer) {
      this.viewContainer.innerHTML = '';
    }

    // 挂载新视图
    this.currentView = new ViewClass(this.viewContainer, ...params);
    if (this.currentView.mount) {
      this.currentView.mount();
    }
  }

  /** 导航到指定路径 */
  static navigate(hash) {
    window.location.hash = hash;
  }

  /** 返回 */
  static back() {
    window.history.back();
  }

  /** 替换当前路径（不产生历史记录） */
  static replace(hash) {
    window.location.replace(`#${hash}`);
  }
}

export const router = new Router();
