// 账户管理 API（CRUD）
const express = require('express');
const pool   = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ================================================================
//  GET /api/accounts/summary — 用户资产总览
// ================================================================
router.get('/summary', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;

    const [accRows] = await conn.query(
      'SELECT COUNT(*) AS account_count, COALESCE(SUM(balance), 0) AS total_balance FROM accounts WHERE user_id = ?',
      [userId]
    );
    const [recRows] = await conn.query(
      'SELECT COUNT(*) AS record_count FROM records WHERE user_id = ? AND is_deleted = 0',
      [userId]
    );

    res.json({
      code: 200,
      data: {
        accountCount: accRows[0].account_count,
        totalBalance: parseFloat(accRows[0].total_balance),
        recordCount:  recRows[0].record_count,
      },
    });
  } catch (err) {
    console.error('Accounts summary error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/accounts — 获取当前用户的所有账户
// ================================================================
router.get('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;

    const [rows] = await conn.query(
      `SELECT id, name, icon, type, balance, initial_balance, is_default, sort_order, remark
       FROM accounts WHERE user_id = ? ORDER BY sort_order, id`,
      [userId]
    );

    // 如果没有账户，创建默认账户
    if (rows.length === 0) {
      const defaults = [
        ['现金钱包', '💵', 'cash', 0],
        ['银行卡',   '🏦', 'bank', 0],
        ['支付宝',   '📱', 'ewallet', 0],
        ['微信钱包', '💬', 'ewallet', 0],
      ];
      for (const [name, icon, type, bal] of defaults) {
        await conn.query(
          `INSERT INTO accounts (user_id, name, icon, type, balance, initial_balance, is_default, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, name, icon, type, bal, bal, 0, 0]
        );
      }
      const [newRows] = await conn.query(
        `SELECT id, name, icon, type, balance, initial_balance, is_default, sort_order, remark
         FROM accounts WHERE user_id = ? ORDER BY sort_order, id`,
        [userId]
      );
      return res.json({ code: 200, data: newRows });
    }

    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('Accounts GET error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  POST /api/accounts — 新增账户
// ================================================================
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { name, icon, type, initialBalance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: '账户名称不能为空' });
    }
    if (name.length > 30) {
      return res.status(400).json({ code: 400, message: '账户名称不超过30字符' });
    }

    const validTypes = ['cash', 'bank', 'ewallet', 'other'];
    const accType = validTypes.includes(type) ? type : 'other';
    const initBal = parseFloat(initialBalance) || 0;

    const [result] = await conn.query(
      `INSERT INTO accounts (user_id, name, icon, type, balance, initial_balance, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 99)`,
      [userId, name.trim(), icon || '🏦', accType, initBal, initBal]
    );

    res.status(201).json({
      code: 201,
      message: '账户已添加',
      data: { id: result.insertId, name: name.trim(), icon: icon || '🏦', type: accType, balance: initBal },
    });
  } catch (err) {
    console.error('Accounts POST error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  PUT /api/accounts/:id — 修改账户（名称、图标等）
// ================================================================
router.put('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const id     = parseInt(req.params.id);
    const { name, icon, type } = req.body;

    // 检查账户是否属于当前用户
    const [rows] = await conn.query(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '账户不存在' });
    }

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (icon !== undefined) { updates.push('icon = ?'); params.push(icon); }
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有需要修改的字段' });
    }

    params.push(id, userId);
    await conn.query(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);

    res.json({ code: 200, message: '已更新' });
  } catch (err) {
    console.error('Accounts PUT error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  DELETE /api/accounts/:id — 删除账户
// ================================================================
router.delete('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const id     = parseInt(req.params.id);

    // 检查账户是否存在
    const [rows] = await conn.query(
      'SELECT id, balance FROM accounts WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '账户不存在' });
    }

    // 检查是否有记录关联
    const [recs] = await conn.query(
      'SELECT COUNT(*) AS cnt FROM records WHERE account_id = ? AND user_id = ? AND is_deleted = 0',
      [id, userId]
    );
    if (recs[0].cnt > 0) {
      return res.status(400).json({ code: 400, message: `该账户下还有 ${recs[0].cnt} 条记录，无法删除` });
    }

    await conn.query('DELETE FROM accounts WHERE id = ? AND user_id = ?', [id, userId]);

    res.json({ code: 200, message: '已删除' });
  } catch (err) {
    console.error('Accounts DELETE error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

module.exports = router;
