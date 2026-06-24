// 分类查询 API
const express = require('express');
const pool   = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/categories?type=expense|income
router.get('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const type = req.query.type || 'expense';

    // 查一级分类
    const [parents] = await conn.query(
      `SELECT id, name, icon, type, sort_order FROM categories
       WHERE (user_id IS NULL OR user_id = ?) AND parent_id IS NULL AND type = ?
       ORDER BY sort_order`,
      [req.user.id, type]
    );

    // 查二级分类
    const [children] = await conn.query(
      `SELECT id, name, icon, type, sort_order, parent_id FROM categories
       WHERE (user_id IS NULL OR user_id = ?) AND parent_id IS NOT NULL AND type = ?
       ORDER BY sort_order`,
      [req.user.id, type]
    );

    // 组装树形结构
    const list = parents.map(p => ({
      ...p,
      children: children.filter(c => c.parent_id === p.id),
    }));

    res.json({ code: 200, data: list });
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

module.exports = router;
