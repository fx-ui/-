const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET  = process.env.JWT_SECRET  || 'daily-ledger-admin-jwt-2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

/** 生成 JWT */
function generateToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/** 管理员鉴权中间件 — 校验 admin_users 表 */
async function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // 二次校验：确认管理员在数据库中仍然有效
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      'SELECT id, username, role, status FROM admin_users WHERE id = ? AND status = 1',
      [decoded.id]
    );
    conn.release();
    if (rows.length === 0) {
      return res.status(401).json({ code: 401, message: '账号已被禁用或不存在' });
    }
    req.admin = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

/** 超级管理员鉴权 */
async function superAdminOnly(req, res, next) {
  await adminAuth(req, res, () => {
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({ code: 403, message: '仅超级管理员可操作' });
    }
    next();
  });
}

module.exports = { generateToken, adminAuth, superAdminOnly, JWT_SECRET };
