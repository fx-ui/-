// 用户认证路由 — 登录 / 注册 / 个人信息 / 头像上传
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const pool   = require('../config/db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 头像上传配置
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `avatar_${req.user.id}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、GIF、WebP 格式的图片'));
    }
  },
});

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

    // ---- 自动创建默认账户 ----
    const defaultAccounts = [
      ['现金钱包', '💵', 'cash', 0],
      ['银行卡',   '🏦', 'bank', 0],
      ['支付宝',   '📱', 'ewallet', 0],
      ['微信钱包', '💬', 'ewallet', 0],
    ];
    for (const [name, icon, type, bal] of defaultAccounts) {
      await conn.query(
        `INSERT INTO accounts (user_id, name, icon, type, balance, initial_balance, is_default, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, icon, type, bal, bal, 0, 0]
      );
    }

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

// ================================================================
//  PUT /api/auth/me — 修改个人信息（昵称、头像等）
// ================================================================
router.put('/me', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { nickname, avatar_url } = req.body;

    const updates = [];
    const params = [];

    if (nickname !== undefined) {
      if (nickname && (nickname.length < 1 || nickname.length > 30)) {
        return res.status(400).json({ code: 400, message: '昵称长度 1-30 个字符' });
      }
      updates.push('nickname = ?');
      params.push(nickname || null);
    }

    if (avatar_url !== undefined) {
      if (avatar_url && avatar_url.length > 500) {
        return res.status(400).json({ code: 400, message: '头像 URL 过长' });
      }
      updates.push('avatar_url = ?');
      params.push(avatar_url || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有需要修改的字段' });
    }

    params.push(userId);
    await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // 返回更新后的用户信息
    const [rows] = await conn.query(
      'SELECT id, username, nickname, avatar_url, role, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    const user = rows[0];
    res.json({
      code: 200,
      message: '已更新 🌸',
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
    console.error('Update profile error:', err);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ================================================================
//  POST /api/auth/avatar — 上传头像
// ================================================================
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请选择图片文件' });
    }

    const userId = req.user.id;
    const avatarUrl = `/uploads/${req.file.filename}`;

    // 删除旧头像文件（如果是本地文件）
    const [old] = await conn.query('SELECT avatar_url FROM users WHERE id = ?', [userId]);
    if (old.length > 0 && old[0].avatar_url && old[0].avatar_url.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', old[0].avatar_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    // 更新数据库
    await conn.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);

    res.json({
      code: 200,
      message: '头像已更新 🌸',
      data: { avatar_url: avatarUrl },
    });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ code: 500, message: '上传失败: ' + err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
