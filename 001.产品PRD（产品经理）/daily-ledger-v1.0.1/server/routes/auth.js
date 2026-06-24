// 用户认证路由
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

/** POST /api/auth/register — 用户注册 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度 2-20 个字符' });
    }
    if (password.length < 6 || password.length > 50) {
      return res.status(400).json({ error: '密码长度 6-50 个字符' });
    }
    // 只允许字母数字和下划线
    if (!/^[a-zA-Z0-9_一-龥]+$/.test(username)) {
      return res.status(400).json({ error: '用户名只能包含中英文、数字和下划线' });
    }

    // 检查用户是否已存在
    const existing = db.findUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: '该用户名已被注册' });
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 创建用户
    const user = db.createUser({ username, passwordHash });
    if (!user) {
      return res.status(500).json({ error: '注册失败，请稍后重试' });
    }

    // 生成 token
    const token = generateToken(user);

    res.status(201).json({
      message: '注册成功 🌸',
      user: { id: user.id, username: user.username },
      token,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
});

/** POST /api/auth/login — 用户登录 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    // 查找用户
    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码不正确' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: '用户名或密码不正确' });
    }

    // 生成 token
    const token = generateToken(user);

    res.json({
      message: '登录成功 🌸',
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'personal',
        largeFontMode: user.largeFontMode || false,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
});

/** GET /api/auth/me — 获取当前用户信息 */
router.get('/me', authMiddleware, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role || 'personal',
      largeFontMode: user.largeFontMode || false,
      createdAt: user.createdAt,
    },
  });
});

/** PUT /api/auth/profile — 更新用户偏好 */
router.put('/profile', authMiddleware, (req, res) => {
  const { role, largeFontMode } = req.body;
  const updates = {};
  if (role !== undefined) updates.role = role;
  if (largeFontMode !== undefined) updates.largeFontMode = largeFontMode;

  const user = db.updateUser(req.user.id, updates);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role || 'personal',
      largeFontMode: user.largeFontMode || false,
    },
  });
});

module.exports = router;
