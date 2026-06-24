-- ============================================================
--  每日记账 (Daily Ledger) V1.0 — 数据库初始化脚本
--  数据库: MySQL 8.0+
--  编码:   utf8mb4
--  创建日期: 2026-06-24
-- ============================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS daily_ledger
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE daily_ledger;

-- ============================================================
--  1. 用户表 (users)
--     存储注册用户信息，支持本地/云端两种模式
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE       COMMENT '用户名，登录用',
  password_hash VARCHAR(255) NOT NULL               COMMENT 'bcryptjs 加密后的密码',
  nickname      VARCHAR(50)  DEFAULT NULL            COMMENT '昵称，显示用',
  avatar_url    VARCHAR(500) DEFAULT NULL            COMMENT '头像 URL',
  role          ENUM('user','admin') NOT NULL DEFAULT 'user'
                  COMMENT '角色：user=普通用户, admin=管理员',
  status        TINYINT NOT NULL DEFAULT 1           COMMENT '状态：1=正常, 0=禁用',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_username (username),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='用户表';


-- ============================================================
--  2. 分类表 (categories)
--     支出/收入的预置分类 + 用户自定义分类
--     parent_id 支持二级分类（大类 → 子类）
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED DEFAULT NULL         COMMENT '所属用户；NULL=系统预置分类',
  parent_id     INT UNSIGNED DEFAULT NULL            COMMENT '父分类 ID，NULL=一级分类',
  name          VARCHAR(30) NOT NULL                 COMMENT '分类名称',
  icon          VARCHAR(50) DEFAULT '📌'             COMMENT '分类图标（emoji）',
  type          ENUM('expense','income') NOT NULL     COMMENT '类型：expense=支出, income=收入',
  sort_order    INT NOT NULL DEFAULT 0               COMMENT '排序权重，越小越靠前',
  is_system     TINYINT NOT NULL DEFAULT 0           COMMENT '是否系统预置：1=是, 0=用户自定义',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_cat_user   (user_id),
  INDEX idx_cat_type   (type),
  INDEX idx_cat_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='分类表（支出/收入的类别体系）';


-- ============================================================
--  3. 账户表 (accounts)
--     用户资产账户：现金、银行卡、支付宝、微信等
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL              COMMENT '所属用户',
  name          VARCHAR(30) NOT NULL                  COMMENT '账户名称',
  icon          VARCHAR(10) DEFAULT '🏦'              COMMENT '账户图标（emoji）',
  type          ENUM('cash','bank','ewallet','other') NOT NULL DEFAULT 'cash'
                  COMMENT '账户类型：cash=现金, bank=银行卡, ewallet=电子钱包, other=其他',
  balance       DECIMAL(12,2) NOT NULL DEFAULT 0.00   COMMENT '当前余额',
  initial_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '初始余额',
  is_default    TINYINT NOT NULL DEFAULT 0            COMMENT '是否默认账户',
  sort_order    INT NOT NULL DEFAULT 0                COMMENT '排序权重',
  remark        VARCHAR(200) DEFAULT NULL             COMMENT '备注',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_acc_user (user_id),
  INDEX idx_acc_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='账户表（用户资产账户）';


-- ============================================================
--  4. 账单记录表 (records)
--     核心数据：每一笔收入/支出记录
-- ============================================================
CREATE TABLE IF NOT EXISTS records (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL              COMMENT '所属用户',
  type          ENUM('expense','income') NOT NULL      COMMENT '类型：expense=支出, income=收入',
  amount        DECIMAL(12,2) NOT NULL                COMMENT '金额（正数）',
  category_id   INT UNSIGNED NOT NULL                 COMMENT '分类 ID',
  account_id    INT UNSIGNED DEFAULT NULL             COMMENT '关联账户 ID',
  record_date   DATE NOT NULL                         COMMENT '记账日期',
  note          VARCHAR(200) DEFAULT NULL             COMMENT '备注',
  is_deleted    TINYINT NOT NULL DEFAULT 0            COMMENT '软删除标记：0=正常, 1=已删除',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id)  REFERENCES accounts(id)   ON DELETE SET NULL,
  INDEX idx_rec_user       (user_id),
  INDEX idx_rec_date       (record_date),
  INDEX idx_rec_type       (type),
  INDEX idx_rec_category   (category_id),
  INDEX idx_rec_account    (account_id),
  INDEX idx_rec_user_date  (user_id, record_date),
  INDEX idx_rec_user_type  (user_id, type),
  INDEX idx_rec_deleted    (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='账单记录表（核心数据 — 每笔收支）';


-- ============================================================
--  5. 预算表 (budgets)
--     月度总预算 + 分类预算，支持预警
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL              COMMENT '所属用户',
  category_id   INT UNSIGNED DEFAULT NULL             COMMENT '分类预算时的分类 ID；NULL=月度总预算',
  amount        DECIMAL(12,2) NOT NULL                COMMENT '预算金额',
  period_type   ENUM('month','week') NOT NULL DEFAULT 'month'
                  COMMENT '预算周期：month=月度, week=每周',
  `year_month`  CHAR(7) DEFAULT NULL                  COMMENT '适用月份，格式 YYYY-MM；NULL=长期有效',
  is_active     TINYINT NOT NULL DEFAULT 1            COMMENT '是否启用',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_bud_user      (user_id),
  INDEX idx_bud_period    (`year_month`),
  INDEX idx_bud_user_cat  (user_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='预算表（月度总预算 + 分类预算）';


-- ============================================================
--  6. 记账模板表 (templates)
--     快速记账模板：重复性消费一键记录
-- ============================================================
CREATE TABLE IF NOT EXISTS templates (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL              COMMENT '所属用户',
  name          VARCHAR(50) NOT NULL                  COMMENT '模板名称（如"早晨咖啡"）',
  type          ENUM('expense','income') NOT NULL DEFAULT 'expense',
  amount        DECIMAL(12,2) NOT NULL                COMMENT '预填金额',
  category_id   INT UNSIGNED NOT NULL                 COMMENT '预填分类',
  account_id    INT UNSIGNED DEFAULT NULL             COMMENT '预填账户',
  note          VARCHAR(200) DEFAULT NULL             COMMENT '快捷备注',
  sort_order    INT NOT NULL DEFAULT 0                COMMENT '排序权重',
  use_count     INT UNSIGNED NOT NULL DEFAULT 0       COMMENT '使用次数（按热度排序）',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id)  REFERENCES accounts(id)   ON DELETE SET NULL,
  INDEX idx_tpl_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='记账模板表（快速记账）';


-- ============================================================
--  7. 转账记录表 (transfers)
--     账户间转账（V1.2+ 功能，预留）
-- ============================================================
CREATE TABLE IF NOT EXISTS transfers (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL              COMMENT '所属用户',
  from_account  INT UNSIGNED NOT NULL                 COMMENT '转出账户',
  to_account    INT UNSIGNED NOT NULL                 COMMENT '转入账户',
  amount        DECIMAL(12,2) NOT NULL                COMMENT '转账金额',
  fee           DECIMAL(12,2) NOT NULL DEFAULT 0.00   COMMENT '手续费',
  transfer_date DATE NOT NULL                         COMMENT '转账日期',
  note          VARCHAR(200) DEFAULT NULL             COMMENT '备注',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)      REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (from_account) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_account)   REFERENCES accounts(id) ON DELETE RESTRICT,
  INDEX idx_tr_user (user_id),
  INDEX idx_tr_date (transfer_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='转账记录表（V1.2+ 预留）';


-- ============================================================
--  8. 操作日志表 (audit_logs)
--     关键操作审计追踪
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED DEFAULT NULL          COMMENT '操作用户',
  action        VARCHAR(50) NOT NULL                  COMMENT '操作类型：create_record, delete_record, update_budget 等',
  target_type   VARCHAR(30) DEFAULT NULL              COMMENT '目标实体：record, budget, account 等',
  target_id     BIGINT UNSIGNED DEFAULT NULL          COMMENT '目标记录 ID',
  detail        JSON DEFAULT NULL                     COMMENT '操作详情（JSON）',
  ip_address    VARCHAR(45) DEFAULT NULL              COMMENT '客户端 IP',
  user_agent    VARCHAR(500) DEFAULT NULL             COMMENT '客户端 UA',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user   (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_time   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='操作审计日志';


-- ============================================================
--  初始化系统预置数据
-- ============================================================

-- 预置支出分类（一级 + 二级）
INSERT INTO categories (user_id, parent_id, name, icon, type, sort_order, is_system) VALUES
-- 一级分类
(NULL, NULL, '餐饮', '🍽️',  'expense', 1,  1),
(NULL, NULL, '交通', '🚗',  'expense', 2,  1),
(NULL, NULL, '购物', '🛒',  'expense', 3,  1),
(NULL, NULL, '居住', '🏠',  'expense', 4,  1),
(NULL, NULL, '娱乐', '🎮',  'expense', 5,  1),
(NULL, NULL, '医疗', '💊',  'expense', 6,  1),
(NULL, NULL, '学习', '📚',  'expense', 7,  1),
(NULL, NULL, '社交', '👫',  'expense', 8,  1),
(NULL, NULL, '其他', '🔸',  'expense', 99, 1);

-- 二级支出分类（parent_id 关联上面的一级）
INSERT INTO categories (user_id, parent_id, name, icon, type, sort_order, is_system) VALUES
-- 餐饮
(NULL, 1,  '三餐',     '🍚', 'expense', 1,  1),
(NULL, 1,  '零食',     '🍿', 'expense', 2,  1),
(NULL, 1,  '饮品',     '🧋', 'expense', 3,  1),
(NULL, 1,  '聚餐',     '🍲', 'expense', 4,  1),
-- 交通
(NULL, 2,  '公交地铁', '🚇', 'expense', 1,  1),
(NULL, 2,  '打车',     '🚕', 'expense', 2,  1),
(NULL, 2,  '加油',     '⛽',  'expense', 3,  1),
-- 购物
(NULL, 3,  '服饰',     '👗', 'expense', 1,  1),
(NULL, 3,  '日用品',   '🧴', 'expense', 2,  1),
(NULL, 3,  '数码',     '📱', 'expense', 3,  1),
-- 居住
(NULL, 4,  '房租',     '🏠', 'expense', 1,  1),
(NULL, 4,  '水电',     '💡', 'expense', 2,  1),
(NULL, 4,  '物业',     '🏢', 'expense', 3,  1),
-- 娱乐
(NULL, 5,  '电影',     '🎬', 'expense', 1,  1),
(NULL, 5,  '游戏',     '🎮', 'expense', 2,  1),
(NULL, 5,  '旅游',     '✈️', 'expense', 3,  1),
-- 医疗
(NULL, 6,  '看病',     '🏥', 'expense', 1,  1),
(NULL, 6,  '买药',     '💊', 'expense', 2,  1),
-- 学习
(NULL, 7,  '书籍',     '📚', 'expense', 1,  1),
(NULL, 7,  '课程',     '🎓', 'expense', 2,  1),
-- 社交
(NULL, 8,  '送礼',     '🎁', 'expense', 1,  1),
(NULL, 8,  '红包',     '🧧', 'expense', 2,  1);

-- 预置收入分类
INSERT INTO categories (user_id, parent_id, name, icon, type, sort_order, is_system) VALUES
-- 一级
(NULL, NULL, '薪资', '💰', 'income', 1, 1),
(NULL, NULL, '兼职', '💼', 'income', 2, 1),
(NULL, NULL, '投资', '📈', 'income', 3, 1),
(NULL, NULL, '其他', '🔹', 'income', 99,1),
-- 二级
(NULL, 33, '工资',     '💰', 'income', 1, 1),
(NULL, 33, '奖金',     '🏆', 'income', 2, 1),
(NULL, 34, '兼职收入', '💼', 'income', 1, 1),
(NULL, 34, '稿费',     '✍️', 'income', 2, 1),
(NULL, 35, '理财收益', '📈', 'income', 1, 1),
(NULL, 36, '退款',     '↩️', 'income', 1, 1);


-- ============================================================
--  ER 关系概览
-- ============================================================
--
--   users (1) ──────< records    (N)   用户 → 多条记账记录
--   users (1) ──────< accounts   (N)   用户 → 多个账户
--   users (1) ──────< budgets    (N)   用户 → 多项预算
--   users (1) ──────< templates  (N)   用户 → 多个模板
--   users (1) ──────< transfers  (N)   用户 → 多条转账
--   users (1) ──────< categories (N)   用户 → 自定义分类
--
--   categories (1) ──< categories (N)  一级分类 → 二级子分类
--   categories (1) ──< records    (N)  分类 → 多条记录
--   categories (1) ──< budgets    (N)  分类 → 分类预算
--   categories (1) ──< templates  (N)  分类 → 模板预设
--
--   accounts (1) ────< records    (N)  账户 → 多条记录
--   accounts (1) ────< templates  (N)  账户 → 模板预设
--   accounts (1) ────< transfers  (N)  账户 → 转出/转入
--
-- ============================================================
