// 分类管理 — 后台查看 / 新增 / 编辑 / 删除
const express = require('express');
const pool   = require('../config/db');
const { adminAuth, superAdminOnly } = require('../middleware/auth');

const router = express.Router();

// ================================================================
//  GET /api/admin/categories — 分类树（仅系统分类）
//     ?type=expense|income (默认 expense)
// ================================================================
router.get('/categories', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const type = req.query.type || 'expense';

    // 一级分类（含引用计数）
    const [parents] = await conn.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM records r WHERE r.category_id = c.id AND r.is_deleted = 0) AS record_count
      FROM categories c
      WHERE c.user_id IS NULL AND c.parent_id IS NULL AND c.type = ?
      ORDER BY c.sort_order`,
      [type]
    );

    // 子分类（含引用计数）
    const [children] = await conn.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM records r WHERE r.category_id = c.id AND r.is_deleted = 0) AS record_count
      FROM categories c
      WHERE c.user_id IS NULL AND c.parent_id IS NOT NULL AND c.type = ?
      ORDER BY c.sort_order`,
      [type]
    );

    // 构建树形结构
    const list = parents.map(p => ({
      ...p,
      children: children.filter(c => c.parent_id === p.id),
    }));

    res.json({ code: 200, data: list });
  } catch (err) {
    console.error('Categories GET error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  POST /api/admin/categories — 新增系统分类
// ================================================================
router.post('/categories', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
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
      'INSERT INTO categories (user_id, parent_id, name, icon, type, sort_order, is_system) VALUES (NULL, ?, ?, ?, ?, 99, 1)',
      [parentId || null, name, icon || '📌', type]
    );

    res.status(201).json({
      code: 201,
      message: '分类已添加',
      data: { id: result.insertId, name, icon: icon || '📌', type },
    });
  } catch (err) {
    console.error('Categories POST error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  PUT /api/admin/categories/:id — 编辑分类
// ================================================================
router.put('/categories/:id', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id = parseInt(req.params.id);
    const { name, icon } = req.body;

    const [rows] = await conn.query(
      'SELECT id FROM categories WHERE id = ? AND user_id IS NULL',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '分类不存在或不可编辑' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      if (!name || name.length > 30) {
        return res.status(400).json({ code: 400, message: '分类名不能为空且不超过30字符' });
      }
      updates.push('name = ?');
      params.push(name);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      params.push(icon);
    }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有需要修改的字段' });
    }

    params.push(id);
    await conn.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);

    // 返回更新后的分类
    const [updated] = await conn.query(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    res.json({ code: 200, message: '已更新', data: updated[0] });
  } catch (err) {
    console.error('Categories PUT error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

// ================================================================
//  DELETE /api/admin/categories/:id — 删除系统分类（超级管理员专有）
// ================================================================
router.delete('/categories/:id', superAdminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id = parseInt(req.params.id);

    // 仅允许删除系统分类
    const [rows] = await conn.query(
      'SELECT id FROM categories WHERE id = ? AND user_id IS NULL',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '分类不存在或不可删除' });
    }

    // 检查是否有记录引用
    const [[{ count }]] = await conn.query(
      'SELECT COUNT(*) AS count FROM records WHERE category_id = ? AND is_deleted = 0',
      [id]
    );
    if (count > 0) {
      return res.status(400).json({
        code: 400,
        message: `该分类下有 ${count} 条记账记录，无法删除`,
      });
    }

    await conn.query('DELETE FROM categories WHERE id = ?', [id]);

    res.json({ code: 200, message: '已删除' });
  } catch (err) {
    console.error('Categories DELETE error:', err);
    res.status(500).json({ code: 500, message: '服务器错误: ' + err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
