// DOM 辅助工具

/** 快捷创建元素 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'className') el.className = val;
    else if (key === 'dataset') Object.assign(el.dataset, val);
    else if (key === 'style' && typeof val === 'object') Object.assign(el.style, val);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
    else el.setAttribute(key, val);
  });
  if (typeof children === 'string') el.textContent = children;
  else if (Array.isArray(children)) children.forEach(c => { if (c) el.appendChild(c); });
  else if (children instanceof Node) el.appendChild(children);
  return el;
}

/** HTML 转义 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** 防抖 */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/** 节流 */
export function throttle(fn, delay = 100) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/** 获取视口高度（解决移动端 100vh 问题） */
export function viewportHeight() {
  return document.documentElement.clientHeight || window.innerHeight;
}

/** 设置 CSS 变量 */
export function setCSSVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

/** 获取 CSS 变量 */
export function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
