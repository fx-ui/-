require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes     = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const usersRoutes    = require('./routes/users');
const recordsRoutes  = require('./routes/records');
const statsRoutes    = require('./routes/stats');
const categoriesRoutes = require('./routes/categories');

const app  = express();
const PORT = process.env.PORT || 8086;

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  const start = Date.now();
  const origEnd = res.end;
  res.end = function (...args) {
    const ms = Date.now() - start;
    console.log(`  ${res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅'} ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
    origEnd.apply(this, args);
  };
  next();
});

// API 路由
app.use('/api/admin', authRoutes);
app.use('/api/admin', dashboardRoutes);
app.use('/api/admin', usersRoutes);
app.use('/api/admin', recordsRoutes);
app.use('/api/admin', statsRoutes);
app.use('/api/admin', categoriesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '后台管理服务运行中 🔧', time: new Date().toISOString() });
});

// 静态文件
app.use('/css',  express.static(path.join(__dirname, '..', 'frontend', 'css')));
app.use('/js',   express.static(path.join(__dirname, '..', 'frontend', 'js')));
app.use('/assets', express.static(path.join(__dirname, '..', 'frontend', 'assets')));

// CORS 预检放行
app.options('*', cors());

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log('──────────────────────────────────────');
  console.log(`🔧  后台管理系统已启动`);
  console.log(`📍  http://localhost:${PORT}`);
  console.log('──────────────────────────────────────');
});
