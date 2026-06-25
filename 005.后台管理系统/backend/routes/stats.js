// 后台统计分析 — 趋势图 / 排行 / 导出
const express = require('express');
const pool   = require('../config/db');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// ================================================================
//  GET /api/admin/stats/daily — 每日收支趋势
//     ?days=30 (默认30天)
// ================================================================
router.get('/stats/daily', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const days = parseInt(req.query.days) || 30;

    const [rows] = await conn.query(
      `SELECT
        record_date,
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM records
      WHERE is_deleted = 0 AND record_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY record_date
      ORDER BY record_date`,
      [days]
    );

    // 填充缺失日期
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = rows.find(r => {
        const rd = r.record_date instanceof Date
          ? r.record_date.toISOString().slice(0, 10)
          : String(r.record_date).slice(0, 10);
        return rd === dateStr;
      });
      result.push({
        date: dateStr,
        income:  found ? parseFloat(found.income)  : 0,
        expense: found ? parseFloat(found.expense) : 0,
      });
    }

    res.json({ code: 200, data: result });
  } catch (err) {
    console.error('Daily stats error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/admin/stats/monthly — 全年月度收支趋势
//     ?year=2026
// ================================================================
router.get('/stats/monthly', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [rows] = await conn.query(
      `SELECT
        MONTH(record_date) AS m,
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM records
      WHERE is_deleted = 0 AND YEAR(record_date) = ?
      GROUP BY MONTH(record_date)
      ORDER BY m`,
      [year]
    );

    // 填充 1~12 月
    const months = [];
    for (let i = 1; i <= 12; i++) {
      const found = rows.find(r => r.m === i);
      months.push({
        month: i,
        income:  found ? parseFloat(found.income)  : 0,
        expense: found ? parseFloat(found.expense) : 0,
      });
    }

    res.json({ code: 200, data: { year, months } });
  } catch (err) {
    console.error('Monthly stats error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/admin/stats/category-ranking — 分类排名
//     ?type=expense&limit=10
// ================================================================
router.get('/stats/category-ranking', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const type  = req.query.type || 'expense';
    const limit = parseInt(req.query.limit) || 10;

    const [rows] = await conn.query(
      `SELECT c.id, c.name, c.icon, COALESCE(SUM(r.amount), 0) AS total
      FROM records r
      JOIN categories c ON r.category_id = c.id
      WHERE r.is_deleted = 0 AND r.type = ?
      GROUP BY c.id, c.name, c.icon
      ORDER BY total DESC
      LIMIT ?`,
      [type, limit]
    );

    res.json({ code: 200, data: rows.map(r => ({ ...r, total: parseFloat(r.total) })) });
  } catch (err) {
    console.error('Category ranking error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/admin/stats/user-ranking — 用户支出排行
//     ?limit=10
// ================================================================
router.get('/stats/user-ranking', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const limit = parseInt(req.query.limit) || 10;

    const [rows] = await conn.query(
      `SELECT
        u.id, u.username, u.nickname,
        COUNT(r.id) AS count,
        COALESCE(SUM(CASE WHEN r.type = 'expense' THEN r.amount ELSE 0 END), 0) AS total_expense
      FROM users u
      LEFT JOIN records r ON u.id = r.user_id AND r.is_deleted = 0
      GROUP BY u.id
      ORDER BY total_expense DESC
      LIMIT ?`,
      [limit]
    );

    res.json({
      code: 200,
      data: rows.map(r => ({
        ...r,
        count:         Number(r.count),
        total_expense: parseFloat(r.total_expense),
      })),
    });
  } catch (err) {
    console.error('User ranking error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/admin/stats/export — 导出 CSV
//     ?startDate=&endDate=&type=
// ================================================================
router.get('/stats/export', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const startDate = req.query.startDate || '';
    const endDate   = req.query.endDate   || '';
    const type      = req.query.type      || '';

    let where = 'WHERE r.is_deleted = 0';
    const params = [];

    if (startDate) {
      where += ' AND r.record_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND r.record_date <= ?';
      params.push(endDate);
    }
    if (type && ['expense', 'income'].includes(type)) {
      where += ' AND r.type = ?';
      params.push(type);
    }

    const [rows] = await conn.query(
      `SELECT u.username, r.type, r.amount, c.name AS category_name, r.record_date, r.note
      FROM records r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN categories c ON r.category_id = c.id
      ${where}
      ORDER BY r.record_date DESC`,
      params
    );

    // 构建 CSV（含 BOM 头）
    const typeLabel = (t) => t === 'expense' ? '支出' : '收入';
    let csv = '﻿'; // BOM for Excel
    csv += '用户名,类型,金额,分类,日期,备注\n';
    rows.forEach(r => {
      const username = String(r.username || '').replace(/"/g, '""');
      const catName  = String(r.category_name || '').replace(/"/g, '""');
      const note     = String(r.note || '').replace(/"/g, '""');
      const dateStr  = r.record_date instanceof Date
        ? r.record_date.toISOString().slice(0, 10)
        : String(r.record_date || '').slice(0, 10);
      csv += `"${username}","${typeLabel(r.type)}","${r.amount}","${catName}","${dateStr}","${note}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="records-export-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ code: 500, message: '导出失败: ' + err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
