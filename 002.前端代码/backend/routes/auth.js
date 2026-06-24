// 用户认证路由 — 登录 / 注册 / 个人信息
const express = require('express');
const bcrypt = require('bcryptjs');
const pool   = require('../config/db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ================================================================
//  POST /api/auth/register — 注册新用户
// ================================================================
router.post('/register', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { username, password } = req.body;

    // ---- 参数校验 ----
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ code: 400, message: '用户名长度 2-20 个字符' });
    }
    if (password.length < 3 || password.length > 50) {
      return res.status(400).json({ code: 400, message: '密码长度 3-50 个字符' });
    }
    if (!/^[a-zA-Z0-9_一-龥]+$/.test(username)) {
      return res.status(400).json({ code: 400, message: '用户名只能包含中英文、数字和下划线' });
    }

    // ---- 检查用户名是否已存在 ----
    const [existing] = await conn.query(
      'SELECT id FROM users WHERE username = ?', [username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ code: 409, message: '该用户名已被注册' });
    }

    // ---- 密码加密 ----
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // ---- 插入用户 ----
    const [result] = await conn.query(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );

    const userId = result.insertId;

    // ---- 生成 Token ----
    const token = generateToken({ id: userId, username });

    res.status(201).json({
      code: 201,
      message: '注册成功 🌸',
      data: {
        user: {
          id:         userId,
          username,
          nickname:   null,
          avatar_url: null,
          role:       'user',
          created_at: new Date().toISOString(),
        },
        token,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ code: 500, message: '服务器错误，请稍后重试' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  POST /api/auth/login — 用户登录
// ================================================================
router.post('/login', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { username, password } = req.body;

    // ---- 参数校验 ----
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '请输入用户名和密码' });
    }

    // ---- 查找用户 ----
    const [rows] = await conn.query(
      'SELECT id, username, password_hash, nickname, avatar_url, role, status, created_at FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ code: 401, message: '用户名或密码不正确' });
    }

    const user = rows[0];

    // ---- 检查账号状态 ----
    if (user.status !== 1) {
      return res.status(403).json({ code: 403, message: '该账号已被禁用，请联系管理员' });
    }

    // ---- 验证密码 ----
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ code: 401, message: '用户名或密码不正确' });
    }

    // ---- 生成 Token ----
    const token = generateToken(user);

    res.json({
      code: 200,
      message: '登录成功 🌸',
      data: {
        user: {
          id:         user.id,
          username:   user.username,
          nickname:   user.nickname,
          avatar_url: user.avatar_url,
          role:       user.role,
          created_at: user.created_at,
        },
        token,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ code: 500, message: '服务器错误，请稍后重试' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  GET /api/auth/me — 获取当前登录用户信息（需 JWT）
// ================================================================
router.get('/me', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, username, nickname, avatar_url, role, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const user = rows[0];
    if (user.status !== 1) {
      return res.status(403).json({ code: 403, message: '该账号已被禁用' });
    }

    res.json({
      code: 200,
      data: {
        user: {
          id:         user.id,
          username:   user.username,
          nickname:   user.nickname,
          avatar_url: user.avatar_url,
          role:       user.role,
          created_at: user.created_at,
        },
      },
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

module.exports = router;
