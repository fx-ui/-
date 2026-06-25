// 后台管理仪表盘 — 概览统计数据
const express = require('express');
const pool   = require('../config/db');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// ================================================================
//  GET /api/admin/dashboard — 仪表盘总览数据
// ================================================================
router.get('/dashboard', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // 1. 总用户数
    const [[userCount]] = await conn.query(
      'SELECT COUNT(*) AS total FROM users'
    );

    // 2. 今日新增用户
    const [[todayUsers]] = await conn.query(
      'SELECT COUNT(*) AS total FROM users WHERE DATE(created_at) = CURDATE()'
    );

    // 3. 总记账条数
    const [[recordCount]] = await conn.query(
      'SELECT COUNT(*) AS total FROM records WHERE is_deleted = 0'
    );

    // 4. 本月收入 / 支出
    const [[monthSummary]] = await conn.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM records
      WHERE is_deleted = 0 AND DATE_FORMAT(record_date, '%Y-%m') = ?`,
      [currentMonth]
    );

    // 5. 近7天趋势（补零）
    const [recentRows] = await conn.query(
      `SELECT
        DATE_FORMAT(record_date, '%Y-%m-%d') AS date,
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM records
      WHERE is_deleted = 0 AND record_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE_FORMAT(record_date, '%Y-%m-%d')
      ORDER BY date`
    );

    const recent7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = recentRows.find(r => r.date === dateStr);
      recent7Days.push({
        date: dateStr,
        income:  found ? parseFloat(found.income)  : 0,
        expense: found ? parseFloat(found.expense) : 0,
      });
    }

    // 6. 本月支出分类饼图（按一级分类汇总）
    const [categoryRows] = await conn.query(
      `SELECT c.id, c.name, c.icon,
        COALESCE(SUM(r.amount), 0) AS total
      FROM categories c
      LEFT JOIN records r ON r.category_id = c.id AND r.is_deleted = 0 AND r.type = 'expense'
        AND DATE_FORMAT(r.record_date, '%Y-%m') = ?
      WHERE c.parent_id IS NULL AND c.type = 'expense'
      GROUP BY c.id, c.name, c.icon
      ORDER BY total DESC`,
      [currentMonth]
    );

    const categoryPie = categoryRows.map(c => ({
      name: c.name,
      icon: c.icon,
      total: parseFloat(c.total),
    }));

    res.json({
      code: 200,
      data: {
        totalUsers:    userCount.total,
        todayNewUsers: todayUsers.total,
        totalRecords:  recordCount.total,
        monthIncome:   parseFloat(monthSummary.income),
        monthExpense:  parseFloat(monthSummary.expense),
        recent7Days,
        categoryPie,
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
