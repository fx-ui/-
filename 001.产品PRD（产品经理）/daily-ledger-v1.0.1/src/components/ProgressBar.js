// 预算进度条
export class ProgressBar {
  static render(percentage) {
    let state, label;
    if (percentage < 60)      { state = 'safe';    label = '正常'; }
    else if (percentage < 80) { state = 'warning'; label = '注意'; }
    else if (percentage < 100){ state = 'danger';  label = '警告'; }
    else                      { state = 'over';    label = '超支'; }
    return `
      <div class="progress-bar">
        <div class="progress-bar__fill ${state}" style="width:${Math.min(percentage, 100)}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px">
        <span class="text-${state === 'safe' ? 'income' : 'expense'}">${label}</span>
        <span class="text-secondary">${percentage.toFixed(0)}%</span>
      </div>`;
  }
}
