// 预算管理 API（CRUD）
const express = require('express');
const pool   = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ================================================================
//  GET /api/budgets?month=YYYY-MM
//  获取预算列表（含当月实际支出）
// ================================================================
router.get('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const month  = req.query.month || new Date().toISOString().slice(0, 7);

    // 获取预算
    const [budgets] = await conn.query(
      `SELECT b.id, b.category_id, b.amount, b.period_type, b.year_month, b.is_active,
              c.name AS category_name, c.icon AS category_icon
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND (b.year_month IS NULL OR b.year_month = ?)
       ORDER BY b.id`,
      [userId, month]
    );

    // 获取该月实际支出（按分类）
    const [spent] = await conn.query(
      `SELECT category_id, SUM(amount) AS total
       FROM records
       WHERE user_id = ? AND type = 'expense' AND is_deleted = 0
         AND DATE_FORMAT(record_date, '%Y-%m') = ?
       GROUP BY category_id`,
      [userId, month]
    );

    // 该月总支出
    const totalSpent = spent.reduce((s, r) => s + parseFloat(r.total), 0);

    // 合并数据
    const data = budgets.map(b => {
      const catSpent = spent.find(s => s.category_id === b.category_id);
      return {
        id: b.id,
        categoryId: b.category_id,
        categoryName: b.category_name || '总预算',
        categoryIcon: b.category_icon || '🎯',
        amount: parseFloat(b.amount),
        spent: catSpent ? parseFloat(catSpent.total) : 0,
        periodType: b.period_type,
        yearMonth: b.year_month,
        isActive: b.is_active,
      };
    });

    res.json({ code: 200, data: { budgets: data, totalSpent } });
  } catch (err) {
    console.error('Budgets GET error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  POST /api/budgets — 设置/更新预算
// ================================================================
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId     = req.user.id;
    const { categoryId, amount, periodType, yearMonth } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ code: 400, message: '预算金额必须大于0' });
    }

    const period = periodType || 'month';
    const ym     = yearMonth  || new Date().toISOString().slice(0, 7);

    // 检查是否已存在相同预算（相同 user + category + month），存在则更新
    const [existing] = await conn.query(
      `SELECT id FROM budgets
       WHERE user_id = ? AND (category_id <=> ?) AND (year_month = ? OR (year_month IS NULL AND ? IS NULL))
       LIMIT 1`,
      [userId, categoryId || null, ym, ym]
    );

    if (existing.length > 0) {
      await conn.query(
        'UPDATE budgets SET amount = ?, period_type = ?, is_active = 1 WHERE id = ?',
        [amount, period, existing[0].id]
      );
      return res.json({ code: 200, message: '预算已更新', data: { id: existing[0].id } });
    }

    const [result] = await conn.query(
      `INSERT INTO budgets (user_id, category_id, amount, period_type, year_month, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [userId, categoryId || null, amount, period, ym]
    );

    res.status(201).json({ code: 201, message: '预算已设置', data: { id: result.insertId } });
  } catch (err) {
    console.error('Budgets POST error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  DELETE /api/budgets/:id — 删除预算
// ================================================================
router.delete('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const id     = parseInt(req.params.id);

    const [rows] = await conn.query(
      'SELECT id FROM budgets WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '预算不存在' });
    }

    await conn.query('DELETE FROM budgets WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ code: 200, message: '已删除' });
  } catch (err) {
    console.error('Budgets DELETE error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

module.exports = router;
