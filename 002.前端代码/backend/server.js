// 每日记账 — 后端服务入口
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes    = require('./routes/auth');
const recordsRoutes    = require('./routes/records');
const statsRoutes      = require('./routes/stats');
const categoriesRoutes = require('./routes/categories');

const app  = express();
const PORT = process.env.PORT || 3456;

// ================================================================
//  全局中间件
// ================================================================
app.use(cors());
app.use(express.json());

// ================================================================
//  API 路由
// ================================================================
app.use('/api/auth', authRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/categories', categoriesRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '每日记账服务运行中 🌸', time: new Date().toISOString() });
});

// ================================================================
//  静态文件（前端页面）— 后端与前端在同一父目录下
// ================================================================
app.use(express.static(path.join(__dirname, '..')));

// SPA fallback — 所有非 API 请求返回 index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ================================================================
//  启动服务
// ================================================================
app.listen(PORT, () => {
  console.log('──────────────────────────────────────');
  console.log(`🌸  每日记账服务已启动`);
  console.log(`📍  前端页面: http://localhost:${PORT}`);
  console.log(`📡  API 地址:  http://localhost:${PORT}/api`);
  console.log(`🔑  登录接口:  POST http://localhost:${PORT}/api/auth/login`);
  console.log(`🔑  注册接口:  POST http://localhost:${PORT}/api/auth/register`);
  console.log('──────────────────────────────────────');
});
