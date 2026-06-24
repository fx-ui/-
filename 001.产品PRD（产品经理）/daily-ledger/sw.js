// Service Worker — 离线缓存
const CACHE_NAME = 'daily-ledger-v1.0.0';

// 安装时预缓存静态资源
const PRECACHE_URLS = [
  './',
  './index.html',
  './css/variables.css',
  './css/reset.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './src/app.js',
  './src/router.js',
  './src/store.js',
  './src/db.js',
  './src/utils/format.js',
  './src/utils/dom.js',
  './src/utils/validators.js',
  './src/components/TabBar.js',
  './src/components/Toast.js',
  './src/components/Modal.js',
  './src/components/CategoryPicker.js',
  './src/components/ProgressBar.js',
  './src/components/EmptyState.js',
  './src/components/OfflineBar.js',
  './src/views/RecordView.js',
  './src/views/BillListView.js',
  './src/views/BillEditView.js',
  './src/views/StatsView.js',
  './src/views/SettingsView.js',
  './src/views/AccountManageView.js',
  './src/views/BudgetSettingView.js',
  './src/views/CategoryManageView.js',
  './src/views/TemplateManageView.js',
  './src/views/DataExportView.js',
  './src/charts/PieChart.js',
  './src/charts/TrendChart.js',
  './data/default-categories.js',
  './data/default-accounts.js',
  './manifest.json',
];

// 安装
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching...');
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Precache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 激活 — 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截 — 缓存优先策略
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求
  if (event.request.method !== 'GET') return;

  // 跳过 chrome-extension 等
  if (!event.request.url.startsWith('http')) return;

  // CDN 资源 — 缓存优先
  if (event.request.url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // 本地资源 — 网络优先，缓存兜底
  event.respondWith(
    fetch(event.request).then((response) => {
      // 更新缓存
      const cloned = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
      return response;
    }).catch(() => {
      return caches.match(event.request).then((cached) => {
        return cached || new Response('Offline', { status: 503 });
      });
    })
  );
});
