// 应用入口
import { router } from './router.js';
import { store, EVENTS } from './store.js';
import { initSeedData, getSetting } from './db.js';
import { AuthStore } from './auth.js';

// 视图
import { RecordView } from './views/RecordView.js';
import { BillListView } from './views/BillListView.js';
import { BillEditView } from './views/BillEditView.js';
import { StatsView } from './views/StatsView.js';
import { SettingsView } from './views/SettingsView.js';
import { AccountManageView } from './views/AccountManageView.js';
import { BudgetSettingView } from './views/BudgetSettingView.js';
import { CategoryManageView } from './views/CategoryManageView.js';
import { TemplateManageView } from './views/TemplateManageView.js';
import { DataExportView } from './views/DataExportView.js';
import { LoginView } from './views/LoginView.js';
import { RegisterView } from './views/RegisterView.js';

// 组件
import { TabBar } from './components/TabBar.js';
import { Toast } from './components/Toast.js';
import { OfflineBar } from './components/OfflineBar.js';

// 注册 Service Worker
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js', { scope: '/' });
        console.log('SW registered:', registration.scope);
      } catch (err) {
        console.warn('SW registration failed:', err);
      }
    });
  }
}

// 控制 TabBar 显示/隐藏
function updateTabBar(hash) {
  const tabBar = document.getElementById('tab-bar');
  if (!tabBar) return;
  const noTabRoutes = ['#/login', '#/register'];
  const hide = noTabRoutes.some(r => hash === r || hash.startsWith(r));
  tabBar.style.display = hide ? 'none' : 'flex';
}

// 初始化应用
async function initApp() {
  // 初始化数据库和种子数据
  await initSeedData();

  // 尝试恢复登录态
  const loggedIn = await AuthStore.checkLogin();
  console.log('Auth restored:', loggedIn);

  // 应用字体大小设置
  const largeFont = await getSetting('largeFontMode');
  if (largeFont === true || largeFont === 'true') {
    document.documentElement.setAttribute('data-large-font', 'true');
  }

  // 监听设置变更
  store.on(EVENTS.SETTINGS_CHANGED, async () => {
    const lf = await getSetting('largeFontMode');
    document.documentElement.setAttribute('data-large-font', lf === true || lf === 'true' ? 'true' : 'false');
  });

  // 设置路由（auth 路由优先）
  const appContainer = document.getElementById('app');
  router
    .add(/^#\/login$/,          LoginView)
    .add(/^#\/register$/,       RegisterView)
    .add(/^#\/record$/,         RecordView)
    .add(/^#\/bills$/,          BillListView)
    .add(/^#\/bills\/edit\/(\d+)$/, BillEditView)
    .add(/^#\/stats$/,          StatsView)
    .add(/^#\/settings$/,       SettingsView)
    .add(/^#\/accounts$/,       AccountManageView)
    .add(/^#\/budget$/,         BudgetSettingView)
    .add(/^#\/categories$/,     CategoryManageView)
    .add(/^#\/templates$/,      TemplateManageView)
    .add(/^#\/export$/,         DataExportView);

  // 默认跳转到记账页
  if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
    window.location.hash = '#/record';
  }

  // 初始化路由
  router.init(appContainer);

  // 挂载 TabBar
  const tabBarContainer = document.getElementById('tab-bar');
  const tabBar = new TabBar(tabBarContainer);
  tabBar.mount();

  // 路由变化时更新 TabBar 显示
  updateTabBar(window.location.hash);
  window.addEventListener('hashchange', () => {
    updateTabBar(window.location.hash);
  });

  // 挂载 Toast 容器
  Toast.init();

  // 挂载离线提示
  OfflineBar.init();

  // 注册 SW
  registerSW();
}

// 启动
document.addEventListener('DOMContentLoaded', initApp);
