import { getUserDetail } from '../api.js';
import { fm, fd } from '../utils/format.js';

export class UserDetailView {
  constructor(container, userId) {
    this.container = container;
    this.userId = userId;
  }

  async mount() {
    this.container.innerHTML = '<div class="empty"><div class="empty-i">&#x23F3;</div><div class="empty-t">加载中...</div></div>';

    const res = await getUserDetail(this.userId);

    if (!res.ok || !res.data) {
      this.container.innerHTML = `
        <div class="empty">
          <div class="empty-i">&#x274C;</div>
          <div class="empty-t">加载失败</div>
          <div class="empty-d">${res.message || '用户不存在或已被删除'}</div>
          <a class="btn btn-o btn-s mt16" href="#/users">返回用户列表</a>
        </div>
      `;
      return;
    }

    const u = res.data.user || res.data;
    const stats = res.data.stats || u.stats || {};
    const accounts = res.data.accounts || u.accounts || [];
    const recentRecords = res.data.recentRecords || u.recentRecords || [];

    this.container.innerHTML = `
      <a class="btn btn-o btn-s mb16" href="#/users">&#x2190; 返回用户列表</a>
      <h2 class="fw mb16" style="font-size:20px">&#x1F464; 用户详情</h2>

      <div class="card">
        <h3 class="fw mb12" style="font-size:16px">基本信息</h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
          <div>
            <div class="stat-label">用户名</div>
            <div style="font-weight:600">${this.escHtml(u.username)}</div>
          </div>
          <div>
            <div class="stat-label">昵称</div>
            <div style="font-weight:600">${this.escHtml(u.nickname || '-')}</div>
          </div>
          <div>
            <div class="stat-label">角色</div>
            <div style="font-weight:600">${this.escHtml(u.role || 'user')}</div>
          </div>
          <div>
            <div class="stat-label">状态</div>
            <span class="badge ${u.status === 1 || u.status === 'active' ? 'badge-on' : 'badge-off'}">${u.status === 1 || u.status === 'active' ? '正常' : '禁用'}</span>
          </div>
          <div>
            <div class="stat-label">注册时间</div>
            <div style="font-weight:600">${fd(u.createdAt || u.created_at)}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="fw mb12" style="font-size:16px">账户统计</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">总收入</div>
            <div class="stat-value" style="color:var(--in);font-size:22px">${fm(stats.totalIncome ?? 0)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">总支出</div>
            <div class="stat-value" style="color:var(--ex);font-size:22px">${fm(stats.totalExpense ?? 0)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">结余</div>
            <div class="stat-value" style="color:${(stats.balance ?? 0) >= 0 ? 'var(--in)' : 'var(--ex)'};font-size:22px">${fm(stats.balance ?? 0)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">记录总数</div>
            <div class="stat-value" style="color:var(--ac);font-size:22px">${stats.recordCount ?? recentRecords.length}</div>
          </div>
        </div>
      </div>

      ${accounts.length ? `
      <div class="card">
        <h3 class="fw mb12" style="font-size:16px">账户列表</h3>
        <div class="table-ct">
          <table>
            <thead><tr><th>账户名</th><th>类型</th><th>余额</th></tr></thead>
            <tbody>
              ${accounts.map(a => `
                <tr>
                  <td>${this.escHtml(a.name)}</td>
                  <td>${this.escHtml(a.type || '现金')}</td>
                  <td class="fw">${fm(a.balance ?? 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      <div class="card">
        <h3 class="fw mb12" style="font-size:16px">最近记录</h3>
        ${recentRecords.length ? `
        <div class="table-ct">
          <table>
            <thead><tr><th>类型</th><th>金额</th><th>分类</th><th>日期</th><th>备注</th></tr></thead>
            <tbody>
              ${recentRecords.map(r => `
                <tr>
                  <td><span class="badge ${r.type === 'income' ? 'badge-in' : 'badge-ex'}">${r.type === 'income' ? '收入' : '支出'}</span></td>
                  <td class="fw" style="color:${r.type === 'income' ? 'var(--in)' : 'var(--ex)'}">${fm(r.amount ?? 0)}</td>
                  <td>${this.escHtml(r.category?.name || r.categoryName || '-')}</td>
                  <td>${fd(r.date || r.createdAt)}</td>
                  <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.escHtml(r.note || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : '<div class="empty-d">暂无记录</div>'}
      </div>
    `;
  }

  escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
