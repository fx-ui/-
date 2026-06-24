# -*- coding: utf-8 -*-
"""
每日记账 -- 数据库初始化执行脚本
将 MySQL 语法的 init_database.sql 转换为 SQLite 并创建 daily_ledger.db
"""
import sqlite3
import re
import os
import sys

# 强制 UTF-8 输出
sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None

# 输出路径
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(OUT_DIR, "daily_ledger.db")
SQL_PATH = os.path.join(OUT_DIR, "init_database.sql")

# 删除旧数据库
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print(f"[CLEAN] Removed old database: {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA foreign_keys=ON")
cur = conn.cursor()

with open(SQL_PATH, "r", encoding="utf-8") as f:
    sql = f.read()

# ============================================================
#  MySQL -> SQLite 语法转换
# ============================================================

# 1. 去掉 MySQL 特有的表属性行
sql = re.sub(r'\)\s*ENGINE=InnoDB.*?;', ');', sql, flags=re.DOTALL)
sql = re.sub(r'\s*ENGINE=InnoDB.*?(?=;)', '', sql)
sql = re.sub(r'\s*DEFAULT CHARSET=utf8mb4\s*COLLATE=utf8mb4_unicode_ci', '', sql)

# 2. 数据类型转换
sql = re.sub(r'BIGINT UNSIGNED AUTO_INCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT', sql)
sql = re.sub(r'INT UNSIGNED AUTO_INCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT', sql)
sql = re.sub(r'BIGINT UNSIGNED', 'INTEGER', sql)
sql = re.sub(r'INT UNSIGNED', 'INTEGER', sql)
sql = re.sub(r'DECIMAL\((\d+),(\d+)\)', r'REAL', sql)
sql = re.sub(r'TINYINT(\(\d+\))?', 'INTEGER', sql)

# 3. ENUM -> TEXT (SQLite doesn't support ENUM)
def replace_enum(m):
    return 'TEXT NOT NULL' if 'NOT NULL' in m.group(0) else 'TEXT'

sql = re.sub(r"ENUM\(([^)]+)\)\s*(NOT\s*NULL)?", replace_enum, sql)

# 4. CHAR/VARCHAR -> TEXT
sql = re.sub(r'CHAR\((\d+)\)', r'TEXT', sql)
sql = re.sub(r'VARCHAR\((\d+)\)', r'TEXT', sql)

# 5. DATETIME/DATE -> TEXT
sql = re.sub(r'\bDATETIME\b', 'TEXT', sql)
sql = re.sub(r'\bDATE\b(?!\s*NOT)', 'TEXT', sql)

# 6. 去掉 COMMENT
sql = re.sub(r"\s*COMMENT\s+'[^']*'", '', sql)
sql = re.sub(r'\s*COMMENT\s+"[^"]*"', '', sql)

# 7. ON UPDATE CURRENT_TIMESTAMP -> remove
sql = re.sub(r'\s*ON UPDATE CURRENT_TIMESTAMP', '', sql)

# 8. 清理多余空白行
sql = re.sub(r'\n\s*\n\s*\n', '\n\n', sql)

# ============================================================
#  逐条执行 SQL 语句
# ============================================================
statements = []
current = []
for line in sql.split('\n'):
    stripped = line.strip()
    if not stripped or stripped.startswith('--') or stripped.startswith('-- ='):
        continue
    current.append(line)
    if stripped.endswith(';'):
        stmt = '\n'.join(current).strip()
        if stmt:
            statements.append(stmt)
        current = []

success = 0
errors = []

for i, stmt in enumerate(statements):
    try:
        if stmt.upper().startswith('CREATE DATABASE') or stmt.upper().startswith('USE '):
            print(f"  [SKIP] {stmt[:60]}...")
            continue
        cur.execute(stmt)
        success += 1
    except Exception as e:
        errors.append((i, stmt[:80], str(e)))
        print(f"  [ERR] Statement #{i+1} failed: {stmt[:70]}...")
        print(f"        {e}")

conn.commit()

# ============================================================
#  统计结果
# ============================================================
print(f"\n{'='*60}")
print(f"Result: {success} succeeded, {len(errors)} failed")

cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cur.fetchall()
print(f"\nTables created ({len(tables)}):")
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM [{t[0]}]")
    count = cur.fetchone()[0]
    print(f"   {t[0]:20s} -- {count} rows")

# 显示预置分类一览
print(f"\nPreset categories (first 10):")
cur.execute("SELECT name, icon, type FROM categories WHERE is_system=1 LIMIT 10")
for row in cur.fetchall():
    print(f"   {row[1]} {row[0]:10s} ({row[2]})")

conn.close()

print(f"\nDatabase: {DB_PATH}")
print(f"Size: {os.path.getsize(DB_PATH):,} bytes")
