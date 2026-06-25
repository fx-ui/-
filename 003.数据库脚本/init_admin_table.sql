-- ============================================================
--  每日记账 — 后台管理系统专用表
--  唯一新增：admin_users（管理员账号表）
--  创建日期：2026-06-25
-- ============================================================

USE daily_ledger;

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

-- 预置超级管理员（默认密码: admin123 / bcrypt 哈希）
-- 部署后务必修改密码！
INSERT INTO admin_users (username, password_hash, nickname, role) VALUES
('admin', '$2b$10$7jv4eiNILHcraiZbTYCM0O74hpHRro2AzAcOZZSz9aK9jWG/5iwOe', '超级管理员', 'super_admin');
