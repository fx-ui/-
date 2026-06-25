// 记账模板 API（CRUD + 使用计数）
const express = require('express');
const pool   = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ================================================================
//  GET /api/templates — 获取模板列表
// ================================================================
router.get('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;

    const [rows] = await conn.query(
      `SELECT t.id, t.name, t.type, t.amount, t.category_id, t.account_id, t.note, t.sort_order, t.use_count,
              c.name AS category_name, c.icon AS category_icon,
              a.name AS account_name, a.icon AS account_icon
       FROM templates t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN accounts a   ON t.account_id  = a.id
       WHERE t.user_id = ?
       ORDER BY t.use_count DESC, t.sort_order, t.id`,
      [userId]
    );

    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('Templates GET error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  POST /api/templates — 创建模板
// ================================================================
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { name, type, amount, categoryId, accountId, note } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: '模板名称不能为空' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ code: 400, message: '金额必须大于0' });
    }
    if (!categoryId) {
      return res.status(400).json({ code: 400, message: '请选择分类' });
    }

    const [result] = await conn.query(
      `INSERT INTO templates (user_id, name, type, amount, category_id, account_id, note, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, 99)`,
      [userId, name.trim(), type || 'expense', amount, categoryId, accountId || null, note || null]
    );

    res.status(201).json({
      code: 201,
      message: '模板已创建',
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error('Templates POST error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  POST /api/templates/:id/use — 使用模板（增加计数）
// ================================================================
router.post('/:id/use', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const id     = parseInt(req.params.id);

    await conn.query(
      'UPDATE templates SET use_count = use_count + 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({ code: 200, message: 'ok' });
  } catch (err) {
    console.error('Templates use error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  PUT /api/templates/:id — 修改模板
// ================================================================
router.put('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const id     = parseInt(req.params.id);
    const { name, type, amount, categoryId, accountId, note } = req.body;

    const [rows] = await conn.query(
      'SELECT id FROM templates WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '模板不存在' });
    }

    const updates = [];
    const params = [];
    if (name !== undefined)       { updates.push('name = ?'); params.push(name); }
    if (type !== undefined)       { updates.push('type = ?'); params.push(type); }
    if (amount !== undefined)     { updates.push('amount = ?'); params.push(amount); }
    if (categoryId !== undefined) { updates.push('category_id = ?'); params.push(categoryId); }
    if (accountId !== undefined)  { updates.push('account_id = ?'); params.push(accountId); }
    if (note !== undefined)       { updates.push('note = ?'); params.push(note); }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有需要修改的字段' });
    }

    params.push(id, userId);
    await conn.query(`UPDATE templates SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);

    res.json({ code: 200, message: '已更新' });
  } catch (err) {
    console.error('Templates PUT error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  DELETE /api/templates/:id — 删除模板
// ================================================================
router.delete('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const id     = parseInt(req.params.id);

    const [rows] = await conn.query(
      'SELECT id FROM templates WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '模板不存在' });
    }

    await conn.query('DELETE FROM templates WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ code: 200, message: '已删除' });
  } catch (err) {
    console.error('Templates DELETE error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

module.exports = router;
