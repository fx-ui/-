// 分类管理 API（查询 + 新增 + 删除）
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
    const userId = req.user.id;

    const [parents] = await conn.query(
      `SELECT id, name, icon, type, sort_order FROM categories
       WHERE (user_id IS NULL OR user_id = ?) AND parent_id IS NULL AND type = ?
       ORDER BY sort_order`,
      [userId, type]
    );

    const [children] = await conn.query(
      `SELECT id, name, icon, type, sort_order, parent_id FROM categories
       WHERE (user_id IS NULL OR user_id = ?) AND parent_id IS NOT NULL AND type = ?
       ORDER BY sort_order`,
      [userId, type]
    );

    const list = parents.map(p => ({
      ...p,
      children: children.filter(c => c.parent_id === p.id),
    }));

    res.json({ code: 200, data: list });
  } catch (err) {
    console.error('Categories GET error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// POST /api/categories — 新增自定义分类
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId   = req.user.id;
    const { name, icon, type, parentId } = req.body;

    if (!name || !type) {
      return res.status(400).json({ code: 400, message: '名称和类型不能为空' });
    }
    if (!['expense', 'income'].includes(type)) {
      return res.status(400).json({ code: 400, message: '类型错误' });
    }
    if (name.length > 30) {
      return res.status(400).json({ code: 400, message: '分类名不超过30字符' });
    }

    const [result] = await conn.query(
      `INSERT INTO categories (user_id, parent_id, name, icon, type, sort_order, is_system)
       VALUES (?, ?, ?, ?, ?, 99, 0)`,
      [userId, parentId || null, name, icon || '📌', type]
    );

    res.status(201).json({
      code: 201,
      message: '分类已添加',
      data: { id: result.insertId, name, icon: icon || '📌', type },
    });
  } catch (err) {
    console.error('Categories POST error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// DELETE /api/categories/:id — 删除自定义分类
router.delete('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const id     = parseInt(req.params.id);

    // 只允许删除自己创建的分类
    const [rows] = await conn.query(
      'SELECT id FROM categories WHERE id = ? AND user_id = ? AND is_system = 0',
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '分类不存在或不可删除' });
    }

    await conn.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ code: 200, message: '已删除' });
  } catch (err) {
    console.error('Categories DELETE error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

module.exports = router;
