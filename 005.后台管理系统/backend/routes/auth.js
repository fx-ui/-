// 管理员认证路由 — 登录 / 个人信息 / 子账号管理
const express = require('express');
const bcrypt = require('bcryptjs');
const pool   = require('../config/db');
const { generateToken, adminAuth, superAdminOnly } = require('../middleware/auth');

const router = express.Router();

// ================================================================
//  POST /api/admin/login — 管理员登录
// ================================================================
router.post('/login', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '请输入用户名和密码' });
    }

    const [rows] = await conn.query(
      'SELECT id, username, password_hash, nickname, role, status, last_login_at FROM admin_users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ code: 401, message: '用户名或密码不正确' });
    }

    const admin = rows[0];

    // 检查账号状态
    if (admin.status !== 1) {
      return res.status(403).json({ code: 403, message: '该管理员账号已被禁用' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ code: 401, message: '用户名或密码不正确' });
    }

    // 更新最后登录时间
    await conn.query(
      'UPDATE admin_users SET last_login_at = NOW() WHERE id = ?',
      [admin.id]
    );

    // 生成 Token
    const token = generateToken(admin);

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        admin: {
          id:       admin.id,
          username: admin.username,
          nickname: admin.nickname,
          role:     admin.role,
          last_login_at: admin.last_login_at,
        },
        token,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ code: 500, message: '服务器错误，请稍后重试' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/admin/me — 获取当前管理员信息
// ================================================================
router.get('/me', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, username, nickname, role, status, last_login_at, created_at FROM admin_users WHERE id = ?',
      [req.admin.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '管理员不存在' });
    }

    const admin = rows[0];
    res.json({
      code: 200,
      data: {
        admin: {
          id:            admin.id,
          username:      admin.username,
          nickname:      admin.nickname,
          role:          admin.role,
          status:        admin.status,
          last_login_at: admin.last_login_at,
          created_at:    admin.created_at,
        },
      },
    });
  } catch (err) {
    console.error('Get admin profile error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  PUT /api/admin/me — 修改个人信息（昵称、密码）
// ================================================================
router.put('/me', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const adminId = req.admin.id;
    const { nickname, oldPassword, newPassword } = req.body;

    // 修改密码
    if (oldPassword) {
      if (!newPassword) {
        return res.status(400).json({ code: 400, message: '请输入新密码' });
      }
      if (newPassword.length < 3 || newPassword.length > 50) {
        return res.status(400).json({ code: 400, message: '密码长度 3-50 个字符' });
      }

      const [rows] = await conn.query(
        'SELECT password_hash FROM admin_users WHERE id = ?',
        [adminId]
      );
      const isMatch = await bcrypt.compare(oldPassword, rows[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({ code: 400, message: '原密码不正确' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      await conn.query(
        'UPDATE admin_users SET password_hash = ? WHERE id = ?',
        [passwordHash, adminId]
      );
    }

    // 修改昵称
    if (nickname !== undefined) {
      if (nickname && (nickname.length < 1 || nickname.length > 30)) {
        return res.status(400).json({ code: 400, message: '昵称长度 1-30 个字符' });
      }
      await conn.query(
        'UPDATE admin_users SET nickname = ? WHERE id = ?',
        [nickname || null, adminId]
      );
    }

    // 返回更新后的信息
    const [updated] = await conn.query(
      'SELECT id, username, nickname, role, status, last_login_at, created_at FROM admin_users WHERE id = ?',
      [adminId]
    );

    res.json({
      code: 200,
      message: '已更新',
      data: { admin: updated[0] },
    });
  } catch (err) {
    console.error('Update admin profile error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  POST /api/admin/admins — 创建子管理员（超级管理员专有）
// ================================================================
router.post('/admins', superAdminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { username, password, nickname, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ code: 400, message: '用户名长度 2-20 个字符' });
    }
    if (password.length < 3 || password.length > 50) {
      return res.status(400).json({ code: 400, message: '密码长度 3-50 个字符' });
    }
    if (!['super_admin', 'admin'].includes(role)) {
      return res.status(400).json({ code: 400, message: '角色只能是 super_admin 或 admin' });
    }

    // 检查用户名是否已存在
    const [existing] = await conn.query(
      'SELECT id FROM admin_users WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ code: 409, message: '该用户名已存在' });
    }

    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [result] = await conn.query(
      'INSERT INTO admin_users (username, password_hash, nickname, role, status) VALUES (?, ?, ?, ?, 1)',
      [username, passwordHash, nickname || null, role]
    );

    res.status(201).json({
      code: 201,
      message: '管理员已创建',
      data: { id: result.insertId, username },
    });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/admin/admins — 管理员列表（超级管理员专有）
// ================================================================
router.get('/admins', superAdminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, username, nickname, role, status, last_login_at, created_at FROM admin_users ORDER BY created_at DESC'
    );

    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('List admins error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  PUT /api/admin/admins/:id/status — 启用/禁用管理员（超级管理员专有）
// ================================================================
router.put('/admins/:id/status', superAdminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id     = parseInt(req.params.id);
    const { status } = req.body;

    if (status !== 0 && status !== 1) {
      return res.status(400).json({ code: 400, message: 'status 必须是 0 或 1' });
    }

    // 不允许禁用自己
    if (id === req.admin.id) {
      return res.status(400).json({ code: 400, message: '不能禁用自己的账号' });
    }

    const [rows] = await conn.query(
      'SELECT id FROM admin_users WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '管理员不存在' });
    }

    await conn.query(
      'UPDATE admin_users SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({
      code: 200,
      message: status === 1 ? '已启用' : '已禁用',
    });
  } catch (err) {
    console.error('Update admin status error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

module.exports = router;
