// 每日记账 — 后端服务
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3456;

// 中间件
app.use(cors());
app.use(express.json());

// API 路由
app.use('/api/auth', authRoutes);

// 静态文件（前端页面）
app.use(express.static(path.join(__dirname, '..')));

// SPA fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌸 每日记账服务已启动 → http://localhost:${PORT}`);
  console.log(`📡 API 地址: http://localhost:${PORT}/api`);
});
