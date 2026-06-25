class Router {
  constructor() {
    this.routes = [];
    this.current = null;
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
    for (const r of this.routes) {
      const m = hash.match(r.pattern);
      if (m) {
        this.mount(r.ViewClass, m.slice(1));
        return;
      }
    }
    if (!hash || hash === '#/' || hash === '#') {
      window.location.hash = '#/dashboard';
      return;
    }
    window.location.hash = '#/dashboard';
  }

  mount(ViewClass, params = []) {
    if (this.current?.destroy) this.current.destroy();
    this.container.innerHTML = '';
    this.current = new ViewClass(this.container, ...params);
    if (this.current.mount) this.current.mount();
  }

  static go(hash) { window.location.hash = hash; }
}

export const router = new Router();
