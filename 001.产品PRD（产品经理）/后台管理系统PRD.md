# 每日记账 — 后台管理系统 PRD

> 版本：V1.1 | 日期：2026-06-25 | 约束：仅新增一张 `admin_users` 表，其余表不动

---

## 一、项目背景

「每日记账」已上线运行，拥有完整的前端用户端（记账、账单、统计、设置）和后端 API。现需构建一个**后台管理系统**，供超级管理员查看平台整体运营数据，包括注册用户、收支流水、分类使用等统计信息。

为保障安全性，超级管理员的账号体系与普通用户**物理隔离**——单独创建一张 `admin_users` 表，不依赖 `users` 表做权限区分。

---

## 二、新增数据表

### 2.1 `admin_users` — 管理员账号表（唯一新增）

```sql
CREATE TABLE IF NOT EXISTS admin_users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE       COMMENT '管理员用户名',
  password_hash VARCHAR(255) NOT NULL               COMMENT 'bcrypt 加密后的密码',
  nickname      VARCHAR(50)  DEFAULT NULL            COMMENT '显示名称',
  avatar_url    VARCHAR(500) DEFAULT NULL            COMMENT '头像 URL',
  role          ENUM('super_admin','admin') NOT NULL DEFAULT 'admin'
                  COMMENT '角色：super_admin=超级管理员, admin=普通管理员',
  status        TINYINT NOT NULL DEFAULT 1           COMMENT '状态：1=正常, 0=禁用',
  last_login_at DATETIME DEFAULT NULL                COMMENT '最后登录时间',
  last_login_ip VARCHAR(45) DEFAULT NULL             COMMENT '最后登录 IP',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admin_username (username),
  INDEX idx_admin_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='管理员账号表（与普通用户表物理隔离）';
```

### 2.2 预置超级管理员

```sql
-- 密码: admin123（bcrypt 加密，部署前必须更换）
INSERT INTO admin_users (username, password_hash, nickname, role) VALUES
('admin', '$2a$10$...预置bcrypt哈希...', '超级管理员', 'super_admin');
```

### 2.3 表隔离说明

| 表 | 使用者 | 说明 |
|----|--------|------|
| `users` | 普通用户 | 前端 C 端注册/登录，**不动** |
| `admin_users` | 超级管理员 | 后台管理端登录，**新增** |

> 两张表互不依赖，管理员账号无法登录前端，普通用户也无法登录后台。

---

## 三、已有数据资产（可复用）

| 表名 | 核心字段 | 用途 |
|------|---------|------|
| `users` | id, username, nickname, role, status, created_at | 用户管理 |
| `records` | id, user_id, type, amount, category_id, account_id, record_date | 全平台流水 |
| `categories` | id, name, icon, type, user_id (NULL=系统预置), parent_id | 分类统计 |
| `accounts` | id, user_id, name, type, balance | 账户总览 |
| `budgets` | id, user_id, category_id, amount, year_month | 预算分析 |
| `templates` | id, user_id, name, type, use_count | 模板热度 |

---

## 三、功能模块

### 模块 1：登录与权限

| 功能点 | 说明 | 数据来源 |
|--------|------|---------|
| **管理员登录** | 独立登录接口，仅查询 `admin_users` 表，与普通用户登录完全隔离 | `admin_users` |
| **JWT 鉴权** | 管理员 token 携带 `role: super_admin/admin`，后台所有接口校验此 role | `admin_users` |
| **登录守卫** | 普通用户 token 无法访问 `/api/admin/*`，管理员 token 无法访问前端记账功能 | 双向隔离 |
| **修改密码** | 管理员可修改自己的登录密码 | `admin_users.password_hash` |
| **退出登录** | 清除 token，返回后台登录页 | localStorage |

> ⚠️ 管理员登录走独立接口 `/api/admin/login`，与前端 `/api/auth/login` 完全隔离。两套 JWT 可使用相同密钥，但通过 `role` 字段区分权限。

---

### 模块 2：数据仪表盘（首页）

| 功能点 | 说明 | 数据来源 |
|--------|------|---------|
| **用户总数** | `SELECT COUNT(*) FROM users WHERE status=1` | `users` |
| **今日新增用户** | 当日注册用户数 | `users.created_at` |
| **平台总流水笔数** | `SELECT COUNT(*) FROM records WHERE is_deleted=0` | `records` |
| **本月支出总额** | 所有用户当月支出合计 | `records` (type=expense) |
| **本月收入总额** | 所有用户当月收入合计 | `records` (type=income) |
| **近7天收支趋势图** | 折线图：每日收入/支出金额 | `records` (GROUP BY record_date) |
| **分类支出占比饼图** | 全平台支出按分类汇总 | `records JOIN categories` |

---

### 模块 3：用户管理

| 功能点 | 说明 | 数据来源 |
|--------|------|---------|
| **用户列表** | 表格：用户名、昵称、角色、状态、注册时间、记录数 | `users` + `records` 子查询 |
| **搜索用户** | 按用户名搜索 | `users.username LIKE` |
| **用户详情** | 点击用户 → 该用户的记账总览 | `records WHERE user_id=?` |
| **启用/禁用** | 切换 `users.status` 1↔0 | `users.status` |
| **删除用户** | 删除用户及其关联数据 | 多表级联删除 |

---

### 模块 4：流水管理

| 功能点 | 说明 | 数据来源 |
|--------|------|---------|
| **全部流水列表** | 表格：用户、类型、金额、分类、日期、备注 | `records JOIN users JOIN categories` |
| **按用户筛选** | 下拉选择用户 | `records.user_id` |
| **按类型筛选** | 支出 / 收入 | `records.type` |
| **按日期筛选** | 日期范围选择器 | `records.record_date` |
| **分页加载** | 每页 20 条，加载更多 | `LIMIT/OFFSET` |
| **删除流水** | 删除异常记录（回滚账户余额） | `records` |

---

### 模块 5：统计分析

| 功能点 | 说明 | 数据来源 |
|--------|------|---------|
| **日收支趋势** | 折线图，可选日期范围 | `records` GROUP BY record_date |
| **月收支趋势** | 柱状图，全年 1-12 月 | `records` GROUP BY MONTH() |
| **分类排行** | 支出 TOP10 / 收入 TOP10 | `records JOIN categories` |
| **用户排行** | 支出最多 TOP10 / 记账最勤 TOP10 | `records GROUP BY user_id` |
| **分类对比** | 一级分类饼图（全平台） | `categories.parent_id IS NULL` |
| **导出 Excel** | 按筛选条件导出流水为 .xlsx | 复用现有导出逻辑 |

---

### 模块 6：分类管理

| 功能点 | 说明 | 数据来源 |
|--------|------|---------|
| **系统分类列表** | 树形展示支出/收入分类 | `categories WHERE user_id IS NULL` |
| **新增系统分类** | 添加一级/二级分类，`user_id=NULL` | `categories` |
| **编辑分类** | 修改名称、图标 | `categories` |
| **删除分类** | 删除未被使用的系统分类 | `categories` (检查 records 外键) |
| **用户自定义分类** | 查看各用户自建分类 | `categories WHERE user_id IS NOT NULL` |

---

## 四、API 接口清单（需新增）

> 以下接口均为**新增**，不影响现有用户端 API。

### 4.1 管理端认证（基于 `admin_users` 表）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/admin/login` | 管理员登录，查询 `admin_users` 表，bcrypt 校验 |
| `GET` | `/api/admin/me` | 获取当前管理员信息 |
| `PUT` | `/api/admin/me` | 修改自己的昵称/密码 |
| `POST` | `/api/admin/admins` | (仅 super_admin) 创建子管理员 |
| `GET` | `/api/admin/admins` | (仅 super_admin) 管理员列表 |
| `PUT` | `/api/admin/admins/:id/status` | (仅 super_admin) 启用/禁用管理员 |

### 4.2 仪表盘

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/dashboard` | 总览数据（用户数/流水数/收支/趋势） |

### 4.3 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/users` | 用户列表（分页+搜索） |
| `GET` | `/api/admin/users/:id` | 用户详情 + 记账统计 |
| `PUT` | `/api/admin/users/:id/status` | 启用/禁用用户 |
| `DELETE` | `/api/admin/users/:id` | 删除用户及关联数据 |

### 4.4 流水管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/records` | 全平台流水（分页+筛选） |
| `DELETE` | `/api/admin/records/:id` | 删除流水 |

### 4.5 统计分析

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/stats/daily` | 日收支趋势 |
| `GET` | `/api/admin/stats/monthly` | 月收支趋势 |
| `GET` | `/api/admin/stats/category-ranking` | 分类排行 |
| `GET` | `/api/admin/stats/user-ranking` | 用户排行 |
| `GET` | `/api/admin/stats/export` | 导出 Excel |

### 4.6 分类管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/categories` | 系统分类 + 用户自定义 |
| `POST` | `/api/admin/categories` | 新增系统分类 |
| `PUT` | `/api/admin/categories/:id` | 编辑分类 |
| `DELETE` | `/api/admin/categories/:id` | 删除分类 |

---

## 五、页面结构

```
/admin/login          → 管理员登录页
/admin/dashboard      → 数据仪表盘（首页）
/admin/users          → 用户列表
/admin/users/:id      → 用户详情
/admin/records        → 流水列表
/admin/stats          → 统计分析
/admin/categories     → 分类管理
```

---

## 六、技术方案建议

| 维度 | 建议 |
|------|------|
| **后端** | 在现有 Node.js/Java 后端新增 `/api/admin/*` 路由，复用数据库连接 |
| **前端** | 新建独立 SPA 页面（或与现有前端同目录 `frontend/admin/`） |
| **鉴权** | 复用 JWT 机制，在 `authMiddleware` 中校验 `role === 'admin'` |
| **数据库** | 零改动，复用现有 8 张表 |

---

## 七、开发优先级

| 优先级 | 模块 | 原因 |
|--------|------|------|
| P0 | 管理员登录 + 仪表盘 | 核心入口 |
| P0 | 用户管理（列表+详情+禁用） | 基础管理能力 |
| P1 | 流水管理（列表+筛选+删除） | 数据审计 |
| P1 | 统计分析（趋势+排行+导出） | 运营分析 |
| P2 | 分类管理（CRUD） | 内容运营 |
| P2 | 用户排行 | 激励运营 |

---

## 八、约束确认

- ✅ **仅新增** `admin_users` 一张表，其余 8 张表不动
- ✅ 不修改现有前端用户端代码
- ✅ 不修改现有 `/api/*` 路由（仅新增 `/api/admin/*`）
- ✅ 复用现有 JWT + bcrypt 鉴权体系
- ✅ 管理员账号与普通用户账号物理隔离

### SQL 脚本存放位置

新增表的 DDL 保存至 `D:\实训副本\003.数据库脚本\init_admin_table.sql`，与现有 `init_database.sql` 并列。
