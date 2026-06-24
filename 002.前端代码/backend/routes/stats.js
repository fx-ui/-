// 统计与分析 API
const express = require('express');
const pool   = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ================================================================
//  GET /api/stats/monthly-summary?month=YYYY-MM
//  返回：本月收入总额、支出总额、结余
// ================================================================
router.get('/monthly-summary', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const month  = req.query.month || '';

    const [rows] = await conn.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_expense
      FROM records
      WHERE user_id = ? AND is_deleted = 0
        AND DATE_FORMAT(record_date, '%Y-%m') = ?
    `, [userId, month]);

    const income  = parseFloat(rows[0].total_income);
    const expense = parseFloat(rows[0].total_expense);

    res.json({
      code: 200,
      data: {
        month,
        income,
        expense,
        balance: income - expense,
      },
    });
  } catch (err) {
    console.error('Monthly summary error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/stats/category-ranking?month=YYYY-MM&limit=3
//  返回：本月支出金额排名前 N 的分类
// ================================================================
router.get('/category-ranking', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const month  = req.query.month || '';
    const limit  = parseInt(req.query.limit) || 3;

    const [rows] = await conn.query(`
      SELECT c.id, c.name, c.icon, SUM(r.amount) AS total
      FROM records r
      JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND r.is_deleted = 0 AND r.type = 'expense'
        AND DATE_FORMAT(r.record_date, '%Y-%m') = ?
      GROUP BY c.id, c.name, c.icon
      ORDER BY total DESC
      LIMIT ?
    `, [userId, month, limit]);

    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('Category ranking error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/stats/yearly-summary?year=YYYY
//  返回：全年收入、支出、结余
// ================================================================
router.get('/yearly-summary', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const year   = req.query.year || new Date().getFullYear();

    const [rows] = await conn.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_expense
      FROM records
      WHERE user_id = ? AND is_deleted = 0
        AND YEAR(record_date) = ?
    `, [userId, year]);

    const income  = parseFloat(rows[0].total_income);
    const expense = parseFloat(rows[0].total_expense);

    res.json({
      code: 200,
      data: {
        year: parseInt(year),
        income,
        expense,
        balance: income - expense,
      },
    });
  } catch (err) {
    console.error('Yearly summary error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/stats/category-breakdown?year=YYYY&type=expense|income
//  返回：按分类统计支出/收入，供饼图使用
// ================================================================
router.get('/category-breakdown', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const year   = req.query.year || new Date().getFullYear();
    const type   = req.query.type || 'expense';

    const [rows] = await conn.query(`
      SELECT c.id, c.name, c.icon, SUM(r.amount) AS total
      FROM records r
      JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND r.is_deleted = 0 AND r.type = ?
        AND YEAR(r.record_date) = ?
      GROUP BY c.id, c.name, c.icon
      ORDER BY total DESC
    `, [userId, type, year]);

    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('Category breakdown error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/stats/monthly-trend?year=YYYY
//  返回：1~12 月每月收入/支出，供折线图使用
// ================================================================
router.get('/monthly-trend', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const year   = req.query.year || new Date().getFullYear();

    const [rows] = await conn.query(`
      SELECT
        MONTH(record_date) AS m,
        COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense
      FROM records
      WHERE user_id = ? AND is_deleted = 0
        AND YEAR(record_date) = ?
      GROUP BY MONTH(record_date)
      ORDER BY m
    `, [userId, year]);

    // 填充 1~12 月，缺失月份补 0
    const months = [];
    for (let i = 1; i <= 12; i++) {
      const found = rows.find(r => r.m === i);
      months.push({
        month: i,
        income:  found ? parseFloat(found.income)  : 0,
        expense: found ? parseFloat(found.expense) : 0,
      });
    }

    res.json({ code: 200, data: { year: parseInt(year), months } });
  } catch (err) {
    console.error('Monthly trend error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/stats/export?year=YYYY
//  返回：CSV 格式数据供下载
// ================================================================
router.get('/export', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const year   = req.query.year || new Date().getFullYear();

    // 年度汇总
    const [summary] = await conn.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense
      FROM records WHERE user_id = ? AND is_deleted = 0 AND YEAR(record_date) = ?
    `, [userId, year]);

    // 分类统计
    const [cats] = await conn.query(`
      SELECT c.name AS category, r.type,
        SUM(r.amount) AS total, COUNT(*) AS count
      FROM records r JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND r.is_deleted = 0 AND YEAR(r.record_date) = ?
      GROUP BY c.name, r.type ORDER BY total DESC
    `, [userId, year]);

    // 月度趋势
    const [trend] = await conn.query(`
      SELECT MONTH(record_date) AS month,
        COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense
      FROM records WHERE user_id = ? AND is_deleted = 0 AND YEAR(record_date) = ?
      GROUP BY MONTH(record_date) ORDER BY month
    `, [userId, year]);

    // 构建 CSV
    let csv = '﻿'; // BOM for Excel UTF-8
    csv += `${year}年 每日记账统计报告\n\n`;
    csv += `年度总览\n`;
    csv += `全年收入,全年支出,全年结余\n`;
    csv += `${summary[0].income},${summary[0].expense},${(summary[0].income - summary[0].expense).toFixed(2)}\n\n`;
    csv += `分类统计\n`;
    csv += `分类,类型,金额,笔数\n`;
    cats.forEach(c => csv += `${c.category},${c.type === 'expense' ? '支出' : '收入'},${c.total},${c.count}\n`);
    csv += `\n月度趋势\n`;
    csv += `月份,收入,支出,结余\n`;
    for (let m = 1; m <= 12; m++) {
      const t = trend.find(r => r.month === m) || { income: 0, expense: 0 };
      csv += `${m}月,${t.income},${t.expense},${(t.income - t.expense).toFixed(2)}\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="daily-ledger-${year}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ code: 500, message: '导出失败' });
  } finally {
    conn.release();
  }
});

module.exports = router;
