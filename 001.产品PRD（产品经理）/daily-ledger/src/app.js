// 应用入口
import { router } from './router.js';
import { store, EVENTS } from './store.js';
import { initSeedData, getSetting, setSetting } from './db.js';

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

// 初始化应用
async function initApp() {
  // 初始化数据库和种子数据
  await initSeedData();

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

  // 设置路由
  const appContainer = document.getElementById('app');
  router
    .add(/^#\/record$/,          RecordView)
    .add(/^#\/bills$/,           BillListView)
    .add(/^#\/bills\/edit\/(\d+)$/, BillEditView)
    .add(/^#\/stats$/,           StatsView)
    .add(/^#\/settings$/,        SettingsView)
    .add(/^#\/accounts$/,        AccountManageView)
    .add(/^#\/budget$/,          BudgetSettingView)
    .add(/^#\/categories$/,      CategoryManageView)
    .add(/^#\/templates$/,       TemplateManageView)
    .add(/^#\/export$/,          DataExportView);

  // 初始化路由
  router.init(appContainer);

  // 挂载 TabBar
  const tabBarContainer = document.getElementById('tab-bar');
  const tabBar = new TabBar(tabBarContainer);
  tabBar.mount();

  // 挂载 Toast 容器
  Toast.init();

  // 挂载离线提示
  OfflineBar.init();

  // 注册 SW
  registerSW();
}

// 启动
document.addEventListener('DOMContentLoaded', initApp);
