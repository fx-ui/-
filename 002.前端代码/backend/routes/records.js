// 账单记录 CRUD
const express = require('express');
const pool   = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware); // 所有接口都需要登录

// ================================================================
//  POST /api/records — 新建一笔记录
// ================================================================
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { type, amount, categoryId, accountId, recordDate, note } = req.body;
    const userId = req.user.id;

    if (!type || !amount || !categoryId || !recordDate) {
      return res.status(400).json({ code: 400, message: '缺少必填字段' });
    }
    if (!['expense', 'income'].includes(type)) {
      return res.status(400).json({ code: 400, message: '类型错误' });
    }

    const [result] = await conn.query(
      `INSERT INTO records (user_id, type, amount, category_id, account_id, record_date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, amount, categoryId, accountId || null, recordDate, note || null]
    );

    // 更新账户余额
    if (accountId) {
      const delta = type === 'income' ? amount : -amount;
      await conn.query(
        'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
        [delta, accountId, userId]
      );
    }

    res.status(201).json({
      code: 201,
      message: '记账成功',
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error('Create record error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/records — 查询记录列表
//     ?month=YYYY-MM  &type=expense|income  &limit=10  &offset=0
// ================================================================
router.get('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId    = req.user.id;
    const month     = req.query.month  || '';       // YYYY-MM
    const type      = req.query.type   || '';       // expense|income
    const limit     = parseInt(req.query.limit)  || 20;
    const offset    = parseInt(req.query.offset) || 0;

    // WHERE 条件
    let where = 'WHERE r.user_id = ?';
    const params = [userId];

    if (month) {
      where += ' AND DATE_FORMAT(r.record_date, "%Y-%m") = ?';
      params.push(month);
    }
    if (type) {
      where += ' AND r.type = ?';
      params.push(type);
    }

    // 获取总数
    const countSql = `SELECT COUNT(*) AS total FROM records r ${where}`;
    const [countRows] = await conn.query(countSql, params);
    const total = countRows[0].total;

    // 查询数据
    const sql = `
      SELECT r.id, r.type, r.amount, r.record_date, r.note,
             r.category_id, r.account_id, r.created_at,
             c.name AS category_name, c.icon AS category_icon,
             a.name AS account_name, a.icon AS account_icon
      FROM records r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN accounts a   ON r.account_id  = a.id
      ${where}
      ORDER BY r.record_date DESC, r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const [rows] = await conn.query(sql, params);

    res.json({
      code: 200,
      data: { list: rows, total },
    });
  } catch (err) {
    console.error('List records error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  PUT /api/records/:id — 编辑一条记录
// ================================================================
router.put('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const id     = parseInt(req.params.id);
    const { type, amount, categoryId, accountId, recordDate, note } = req.body;

    // 查出原记录
    const [rows] = await conn.query(
      'SELECT id, type, amount, account_id FROM records WHERE id = ? AND user_id = ? AND is_deleted = 0',
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '记录不存在' });
    }

    const old = rows[0];
    const newType       = type       || old.type;
    const newAmount     = amount     !== undefined ? amount     : old.amount;
    const newCategoryId = categoryId || null;
    const newAccountId  = accountId  !== undefined ? accountId  : old.account_id;
    const newDate       = recordDate || null;
    const newNote       = note       !== undefined ? note       : null;

    if (newAmount <= 0) {
      return res.status(400).json({ code: 400, message: '金额必须大于0' });
    }

    // 事务：更新记录 + 修正账户余额
    await conn.beginTransaction();
    try {
      // 1. 回滚旧账户余额
      if (old.account_id) {
        const oldDelta = old.type === 'income' ? -old.amount : old.amount;
        await conn.query(
          'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
          [oldDelta, old.account_id, userId]
        );
      }

      // 2. 更新记录
      await conn.query(
        `UPDATE records SET type = ?, amount = ?, category_id = ?, account_id = ?, record_date = ?, note = ?
         WHERE id = ? AND user_id = ?`,
        [newType, newAmount, newCategoryId, newAccountId || null, newDate, newNote, id, userId]
      );

      // 3. 应用新账户余额
      if (newAccountId) {
        const newDelta = newType === 'income' ? newAmount : -newAmount;
        await conn.query(
          'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
          [newDelta, newAccountId, userId]
        );
      }

      await conn.commit();
      res.json({ code: 200, message: '已更新' });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('Update record error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  DELETE /api/records/:id — 硬删除一条记录
// ================================================================
router.delete('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const id     = parseInt(req.params.id);

    // 查出记录信息，用于回滚账户余额
    const [rows] = await conn.query(
      'SELECT type, amount, account_id FROM records WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '记录不存在' });
    }

    const rec = rows[0];

    // 硬删除
    await conn.query('DELETE FROM records WHERE id = ? AND user_id = ?', [id, userId]);

    // 回滚账户余额
    if (rec.account_id) {
      const delta = rec.type === 'income' ? -rec.amount : rec.amount;
      await conn.query(
        'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
        [delta, rec.account_id, userId]
      );
    }

    res.json({ code: 200, message: '已删除' });
  } catch (err) {
    console.error('Delete record error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

module.exports = router;
