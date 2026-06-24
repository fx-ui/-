// 横向滑动分类选择器
export class CategoryPicker {
  constructor(container) {
    this.container = container;
    this.categories = [];
    this.selectedId = null;
    this.onChange = null;
  }

  setCategories(categories) { this.categories = categories; this.render(); }
  setSelected(id) { this.selectedId = id; this.updateSelected(); }

  render() {
    this.container.innerHTML = `
      <div class="category-picker">
        ${this.categories.map(cat => `
          <div class="category-chip${cat.id === this.selectedId ? ' selected' : ''}" data-cat-id="${cat.id}">
            <span class="category-chip__icon">${cat.icon}</span>
            <span class="category-chip__name">${cat.name}</span>
          </div>
        `).join('')}
      </div>`;
    const picker = this.container.querySelector('.category-picker');
    picker.addEventListener('click', (e) => {
      const chip = e.target.closest('.category-chip');
      if (!chip) return;
      const catId = Number(chip.dataset.catId);
      this.selectedId = catId;
      this.updateSelected();
      const cat = this.categories.find(c => c.id === catId);
      if (cat && this.onChange) this.onChange(cat);
    });
  }

  updateSelected() {
    this.container.querySelectorAll('.category-chip').forEach(chip => {
      chip.classList.toggle('selected', Number(chip.dataset.catId) === this.selectedId);
    });
  }
}
