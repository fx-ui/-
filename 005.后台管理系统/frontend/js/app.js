import { router } from './router.js';
import { isLoggedIn, getAdminProfile } from './api.js';
import { LoginView } from './views/LoginView.js';
import { DashboardView } from './views/DashboardView.js';
import { UsersView } from './views/UsersView.js';
import { UserDetailView } from './views/UserDetailView.js';
import { RecordsView } from './views/RecordsView.js';
import { StatsView } from './views/StatsView.js';
import { CategoriesView } from './views/CategoriesView.js';
import { AdminsView } from './views/AdminsView.js';

// Global toast
window.Toast = {
  init() {
    this.el = document.getElementById('toasts');
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'toast-ct';
      document.body.appendChild(this.el);
    }
  },
  show(msg, type, ms) {
    if (!this.el) this.init();
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type === 'ok' ? 'ok' : type === 'err' ? 'err' : 'info');
    t.textContent = msg;
    this.el.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity .2s';
      setTimeout(() => t.remove(), 200);
    }, ms || 2000);
  },
};

// Sidebar sync
window.syncSidebar = function(hash) {
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.toggle('active', hash.startsWith(el.dataset.hash));
  });
  // Show/hide sidebar
  const show = isLoggedIn() && !hash.startsWith('#/login');
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main-area');
  if (sidebar) sidebar.style.display = show ? 'flex' : 'none';
  if (main) main.style.marginLeft = show ? '220px' : '0';
};

window.updateSidebarUser = async function() {
  const el = document.getElementById('sidebar-user');
  if (!el) return;
  try {
    const res = await getAdminProfile();
    if (res.ok && res.data) {
      const a = res.data.admin || res.data;
      el.textContent = '\u{1F451} ' + (a.nickname || a.username);
      // Show admin management link only for super_admin
      const navAdmins = document.getElementById('nav-admins');
      if (navAdmins) navAdmins.style.display = a.role === 'super_admin' ? 'flex' : 'none';
    }
  } catch(e) {}
};

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  router
    .add(/^#\/login$/, LoginView)
    .add(/^#\/dashboard$/, DashboardView)
    .add(/^#\/users$/, UsersView)
    .add(/^#\/users\/(\d+)$/, UserDetailView)
    .add(/^#\/records$/, RecordsView)
    .add(/^#\/stats$/, StatsView)
    .add(/^#\/categories$/, CategoriesView)
    .add(/^#\/admins$/, AdminsView);

  const hash = window.location.hash || '';
  if (!isLoggedIn() && hash !== '#/login') {
    window.location.hash = '#/login';
  }
  if (isLoggedIn() && (!hash || hash === '#/' || hash === '#/login')) {
    window.location.hash = '#/dashboard';
  }

  router.init(app);
  syncSidebar(window.location.hash);
  updateSidebarUser();

  window.addEventListener('hashchange', () => {
    syncSidebar(window.location.hash);
    if (isLoggedIn()) updateSidebarUser();
  });

  // Sidebar navigation: bind click handlers to all sidebar items
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const hash = el.dataset.hash;
      if (hash) window.location.hash = hash;
    });
  });

  // Logout
  document.getElementById('sidebar-logout')?.addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.hash = '#/login';
  });
});
