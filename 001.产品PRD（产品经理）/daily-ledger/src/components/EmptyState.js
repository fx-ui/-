// 空状态组件
export class EmptyState {
  static render({ icon = '📝', title = '暂无数据', text = '', actionText = '', actionHash = '' } = {}) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">${icon}</div>
        <div class="empty-state__title">${title}</div>
        ${text ? `<div class="empty-state__text">${text}</div>` : ''}
        ${actionText ? `<a href="${actionHash}" class="btn btn--primary mt-lg">${actionText}</a>` : ''}
      </div>`;
  }
}
