// 横向滑动分类选择器
export class CategoryPicker {
  constructor(container) {
    this.el = container;
    this.cats = [];
    this.selectedId = null;
    this.onChange = null;
  }

  setCategories(cats) { this.cats = cats; this.render(); }
  setSelected(id) { this.selectedId = id; this.updateUI(); }

  render() {
    this.el.innerHTML = `<div class="category-picker">
      ${this.cats.map(c => `
        <div class="category-chip${c.id === this.selectedId ? ' selected' : ''}"
             data-cid="${c.id}">
          <span class="category-chip__icon">${c.icon}</span>
          <span class="category-chip__name">${c.name}</span>
        </div>
      `).join('')}
    </div>`;

    const picker = this.el.querySelector('.category-picker');
    if (!picker) return;

    // 只响应 click（移动端 tap），不阻止滑动
    picker.addEventListener('click', (e) => {
      const chip = e.target.closest('.category-chip');
      if (!chip) return;
      const cid = parseInt(chip.dataset.cid);
      if (isNaN(cid)) return;
      this.selectedId = cid;
      this.updateUI();
      const cat = this.cats.find(c => c.id === this.selectedId);
      if (cat && this.onChange) this.onChange(cat);
    });
  }

  updateUI() {
    this.el.querySelectorAll('.category-chip').forEach(c => {
      c.classList.toggle('selected', parseInt(c.dataset.cid) === this.selectedId);
    });
  }
}
