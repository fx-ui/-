// 应用入口
import { router } from './router.js';
import { TabBar } from './components/TabBar.js';
import { Toast } from './components/Toast.js';
import { RecordView } from './views/RecordView.js';
import { BillListView } from './views/BillListView.js';
import { StatsView } from './views/StatsView.js';
import { SettingsView } from './views/SettingsView.js';
import { LoginView } from './views/LoginView.js';
import { isLoggedIn } from './api.js?v=14';
import { RegisterView } from './views/RegisterView.js';

let tabBar = null;

/** TabBar 显隐 — 唯一控制入口 */
function syncTabBar() {
  const h = window.location.hash || '#/login';
  const show = isLoggedIn()
    && !h.startsWith('#/login')
    && !h.startsWith('#/register');
  const el = document.getElementById('tab-bar');
  if (el) el.style.display = show ? 'flex' : 'none';
  if (tabBar && show) tabBar.update();
}

/** 登录守卫：检查当前 hash 是否允许访问，不允许则重定向 */
function guardRoute() {
  const h = window.location.hash || '';
  if (!isLoggedIn()) {
    // 未登录只允许 login / register
    if (h !== '#/login' && !h.startsWith('#/register')) {
      router.go('#/login');
      return true; // 已重定向
    }
  } else {
    // 已登录不允许停留在 login / register
    if (h === '#/login' || h === '#/register') {
      router.go('#/record');
      return true;
    }
  }
  return false;
}

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  // 1. 注册所有路由
  router
    .add(/^#\/login$/,           LoginView)
    .add(/^#\/register$/,        RegisterView)
    .add(/^#\/record$/,          RecordView)
    .add(/^#\/bills$/,           BillListView)
    .add(/^#\/stats$/,           StatsView)
    .add(/^#\/settings$/,        SettingsView)
    .add(/^#\/settings\/(\w+)$/, SettingsView);

  // 2. 根据登录状态修正初始 hash（无 hash 时设置默认值）
  const hash = window.location.hash || '';
  if (!hash || hash === '#/' || hash === '#') {
    window.location.hash = isLoggedIn() ? '#/record' : '#/login';
  }

  // 3. 初始化路由（内部会调用 resolve() 渲染当前 hash 对应的页面）
  router.init(app);

  // 4. TabBar
  tabBar = new TabBar(document.getElementById('tab-bar'));
  tabBar.mount();

  // 5. Toast
  Toast.init();

  // 6. 如果初始 hash 需要守卫重定向（非预期的 hash），则额外触发一次
  if (guardRoute()) {
    // guardRoute 已通过 router.go 修改 hash，hashchange 会触发 resolve + syncTabBar
  }

  // 7. 同步 TabBar + 监听后续 hash 变化
  syncTabBar();
  window.addEventListener('hashchange', () => {
    if (guardRoute()) return; // 被守卫拦截，已重定向
    syncTabBar();
  });
});
