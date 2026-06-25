// Hash SPA 路由
class Router {
  constructor() {
    this.routes = [];
    this.current = null;
    this.fallback = '#/login';  // 未匹配时的默认跳转
  }

  init(container) {
    this.container = container;
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }

  add(pattern, ViewClass) {
    this.routes.push({ pattern, ViewClass });
    return this;
  }

  resolve() {
    const hash = window.location.hash;
    if (!hash || hash === '#/' || hash === '#') {
      // 空 hash：跳转到默认页
      this.container.innerHTML = `<div class="view active" style="display:flex;align-items:center;justify-content:center;min-height:80dvh"><div style="font-size:48px">🌸</div></div>`;
      return;
    }
    for (const r of this.routes) {
      const m = hash.match(r.pattern);
      if (m) {
        this.mount(r.ViewClass, m.slice(1));
        return;
      }
    }
    // 未匹配任何路由 → 回退
    console.warn('[Router] 未匹配的路由:', hash, '→ 回退到', this.fallback);
    Router.go(this.fallback);
  }

  mount(ViewClass, params = []) {
    if (this.current?.destroy) this.current.destroy();
    this.container.innerHTML = '';
    this.current = new ViewClass(this.container, ...params);
    if (this.current.mount) this.current.mount();
  }

  static go(hash) { window.location.hash = hash; }
  static back() { window.history.back(); }
}

export const router = new Router();
