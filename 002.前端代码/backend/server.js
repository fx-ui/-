// 每日记账 — 后端服务入口
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes       = require('./routes/auth');
const recordsRoutes    = require('./routes/records');
const statsRoutes      = require('./routes/stats');
const categoriesRoutes = require('./routes/categories');
const accountsRoutes   = require('./routes/accounts');
const budgetsRoutes    = require('./routes/budgets');
const templatesRoutes  = require('./routes/templates');

const app  = express();
const PORT = process.env.PORT || 3456;

// ================================================================
//  全局中间件
// ================================================================
app.use(cors());
app.use(express.json());

// 请求日志 + 禁用缓存
app.use((req, res, next) => {
  const start = Date.now();
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // 拦截响应结束，记录日志
  const origEnd = res.end;
  res.end = function (...args) {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const icon = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    console.log(`  ${icon} ${req.method} ${req.originalUrl} → ${status} (${ms}ms)`);
    origEnd.apply(this, args);
  };
  next();
});

// ================================================================
//  API 路由
// ================================================================
app.use('/api/auth', authRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/accounts',   accountsRoutes);
app.use('/api/budgets',    budgetsRoutes);
app.use('/api/templates',  templatesRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '每日记账服务运行中 🌸', time: new Date().toISOString() });
});

// ================================================================
//  全局错误处理
// ================================================================
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err.message);
  console.error(err.stack);
  res.status(500).json({ code: 500, message: '服务器内部错误: ' + err.message });
});

// ================================================================
//  静态文件（仅暴露前端资源，禁止访问 backend 目录）
// ================================================================
app.use('/css',  express.static(path.join(__dirname, '..', 'css')));
app.use('/js',   express.static(path.join(__dirname, '..', 'js')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// 禁止访问 backend 目录
app.use('/backend', (req, res) => {
  res.status(403).json({ code: 403, message: '禁止访问' });
});

// SPA fallback — index.html 处理所有其他非 API 请求
app.get('*', (req, res, next) => {
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
  console.log('──────────────────────────────────────');
});
