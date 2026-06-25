// 用户管理 — 后台查看 / 禁用 / 删除用户
const express = require('express');
const pool   = require('../config/db');
const { adminAuth, superAdminOnly } = require('../middleware/auth');

const router = express.Router();

// ================================================================
//  GET /api/admin/users — 用户列表（分页 + 搜索）
// ================================================================
router.get('/users', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const page   = parseInt(req.query.page)  || 1;
    const size   = parseInt(req.query.size)  || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * size;

    let where = 'WHERE 1 = 1';
    const params = [];

    if (search) {
      where += ' AND (u.username LIKE ? OR u.nickname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 总数
    const countSql = `SELECT COUNT(*) AS total FROM users u ${where}`;
    const [[{ total }]] = await conn.query(countSql, params);

    // 分页数据（含记账条数）
    const dataSql = `
      SELECT u.*,
        (SELECT COUNT(*) FROM records r WHERE r.user_id = u.id AND r.is_deleted = 0) AS record_count
      FROM users u
      ${where}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(size, offset);
    const [list] = await conn.query(dataSql, params);

    res.json({
      code: 200,
      data: { list, total },
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/admin/users/:id — 用户详情 + 统计
// ================================================================
router.get('/users/:id', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = parseInt(req.params.id);

    // 用户基本信息
    const [userRows] = await conn.query(
      'SELECT id, username, nickname, avatar_url, role, status, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const user = userRows[0];

    // 收支合计
    const [[stats]] = await conn.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
      FROM records WHERE user_id = ? AND is_deleted = 0`,
      [userId]
    );

    // 账户列表
    const [accounts] = await conn.query(
      'SELECT id, name, icon, type, balance FROM accounts WHERE user_id = ? ORDER BY sort_order',
      [userId]
    );

    // 最近 10 笔记录
    const [recentRecords] = await conn.query(
      `SELECT r.id, r.type, r.amount, r.record_date, r.note, r.created_at,
        c.name AS category_name, c.icon AS category_icon
      FROM records r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND r.is_deleted = 0
      ORDER BY r.record_date DESC, r.created_at DESC
      LIMIT 10`,
      [userId]
    );

    res.json({
      code: 200,
      data: {
        user,
        total_income:  parseFloat(stats.total_income),
        total_expense: parseFloat(stats.total_expense),
        accounts,
        recentRecords,
      },
    });
  } catch (err) {
    console.error('Get user detail error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  PUT /api/admin/users/:id/status — 启用/禁用用户
// ================================================================
router.put('/users/:id/status', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    if (status !== 0 && status !== 1) {
      return res.status(400).json({ code: 400, message: 'status 必须是 0 或 1' });
    }

    const [rows] = await conn.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    await conn.query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

    res.json({
      code: 200,
      message: status === 1 ? '已启用' : '已禁用',
    });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  DELETE /api/admin/users/:id — 删除用户及全部关联数据（超级管理员专有）
// ================================================================
router.delete('/users/:id', superAdminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = parseInt(req.params.id);

    const [rows] = await conn.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    // 事务：删除用户及所有关联数据
    await conn.beginTransaction();
    try {
      await conn.query('DELETE FROM records   WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM accounts  WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM budgets   WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM templates WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM users     WHERE id = ?', [userId]);

      await conn.commit();
      res.json({ code: 200, message: '已删除用户及关联数据' });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
