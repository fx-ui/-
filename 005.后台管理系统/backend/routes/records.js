// 账单记录管理 — 后台查看 / 删除记录
const express = require('express');
const pool   = require('../config/db');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// ================================================================
//  GET /api/admin/records — 记录列表（分页、多条件筛选）
// ================================================================
router.get('/records', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const page      = parseInt(req.query.page)  || 1;
    const size      = parseInt(req.query.size)  || 20;
    const userId    = req.query.userId    || '';
    const type      = req.query.type      || '';
    const startDate = req.query.startDate || '';
    const endDate   = req.query.endDate   || '';
    const search    = req.query.search    || '';
    const offset    = (page - 1) * size;

    let where = 'WHERE r.is_deleted = 0';
    const params = [];

    if (userId) {
      where += ' AND r.user_id = ?';
      params.push(parseInt(userId));
    }
    if (type && ['expense', 'income'].includes(type)) {
      where += ' AND r.type = ?';
      params.push(type);
    }
    if (startDate) {
      where += ' AND r.record_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND r.record_date <= ?';
      params.push(endDate);
    }
    if (search) {
      where += ' AND u.username LIKE ?';
      params.push(`%${search}%`);
    }

    // 总数
    const countSql = `
      SELECT COUNT(*) AS total
      FROM records r
      JOIN users u ON r.user_id = u.id
      ${where}
    `;
    const [[{ total }]] = await conn.query(countSql, params);

    // 分页数据
    const dataSql = `
      SELECT r.id, r.type, r.amount, r.record_date, r.note, r.created_at,
             r.category_id, r.account_id,
             u.username, u.nickname AS user_nickname,
             c.name AS category_name, c.icon AS category_icon
      FROM records r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN categories c ON r.category_id = c.id
      ${where}
      ORDER BY r.record_date DESC, r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(size, offset);
    const [list] = await conn.query(dataSql, params);

    res.json({
      code: 200,
      data: { list, total },
    });
  } catch (err) {
    console.error('List records error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  DELETE /api/admin/records/:id — 硬删除记录 + 回滚账户余额
// ================================================================
router.delete('/records/:id', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id = parseInt(req.params.id);

    // 查出记录信息，用于回滚账户余额
    const [rows] = await conn.query(
      'SELECT id, type, amount, account_id FROM records WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '记录不存在' });
    }

    const rec = rows[0];

    await conn.beginTransaction();
    try {
      // 硬删除
      await conn.query('DELETE FROM records WHERE id = ?', [id]);

      // 回滚账户余额
      if (rec.account_id) {
        const delta = rec.type === 'income' ? -rec.amount : rec.amount;
        await conn.query(
          'UPDATE accounts SET balance = balance + ? WHERE id = ?',
          [delta, rec.account_id]
        );
      }

      await conn.commit();
      res.json({ code: 200, message: '已删除' });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('Delete record error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
