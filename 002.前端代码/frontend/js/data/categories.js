// 预置分类数据
export const presetCategories = {
  expense: [
    { id: 1,  name: '三餐',     icon: '🍚', parent: '餐饮' },
    { id: 2,  name: '零食',     icon: '🍿', parent: '餐饮' },
    { id: 3,  name: '饮品',     icon: '🧋', parent: '餐饮' },
    { id: 4,  name: '聚餐',     icon: '🍲', parent: '餐饮' },
    { id: 5,  name: '公交地铁', icon: '🚇', parent: '交通' },
    { id: 6,  name: '打车',     icon: '🚕', parent: '交通' },
    { id: 7,  name: '加油',     icon: '⛽',  parent: '交通' },
    { id: 8,  name: '服饰',     icon: '👗', parent: '购物' },
    { id: 9,  name: '日用品',   icon: '🧴', parent: '购物' },
    { id: 10, name: '数码',     icon: '📱', parent: '购物' },
    { id: 11, name: '房租',     icon: '🏠', parent: '居住' },
    { id: 12, name: '水电',     icon: '💡', parent: '居住' },
    { id: 13, name: '物业',     icon: '🏢', parent: '居住' },
    { id: 14, name: '电影',     icon: '🎬', parent: '娱乐' },
    { id: 15, name: '游戏',     icon: '🎮', parent: '娱乐' },
    { id: 16, name: '旅游',     icon: '✈️', parent: '娱乐' },
    { id: 17, name: '看病',     icon: '🏥', parent: '医疗' },
    { id: 18, name: '买药',     icon: '💊', parent: '医疗' },
    { id: 19, name: '书籍',     icon: '📚', parent: '学习' },
    { id: 20, name: '课程',     icon: '🎓', parent: '学习' },
    { id: 21, name: '送礼',     icon: '🎁', parent: '社交' },
    { id: 22, name: '红包',     icon: '🧧', parent: '社交' },
    { id: 23, name: '其他',     icon: '🔸', parent: '其他' },
  ],
  income: [
    { id: 24, name: '工资',     icon: '💰', parent: '薪资' },
    { id: 25, name: '奖金',     icon: '🏆', parent: '薪资' },
    { id: 26, name: '兼职',     icon: '💼', parent: '兼职' },
    { id: 27, name: '稿费',     icon: '✍️', parent: '兼职' },
    { id: 28, name: '理财收益', icon: '📈', parent: '投资' },
    { id: 29, name: '退款',     icon: '↩️', parent: '其他' },
    { id: 30, name: '其他',     icon: '🔹', parent: '其他' },
  ],
};

// 获取某类型的所有分类
export function getCategories(type = 'expense') {
  return presetCategories[type] || [];
}

// 根据 ID 查找
export function findCategory(id) {
  for (const cats of Object.values(presetCategories)) {
    const found = cats.find(c => c.id === id);
    if (found) return found;
  }
  return null;
}
