// 简单的 JSON 文件数据库 — 用户存储
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data');
const USERS_FILE = path.join(DB_PATH, 'users.json');

// 确保数据目录存在
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH, { recursive: true });
}

// 读取用户数据
function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 写入用户数据
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

module.exports = {
  /** 通过用户名查找用户 */
  findUserByUsername(username) {
    const users = readUsers();
    return users.find(u => u.username === username) || null;
  },

  /** 通过 ID 查找用户 */
  findUserById(id) {
    const users = readUsers();
    return users.find(u => u.id === id) || null;
  },

  /** 创建新用户 */
  createUser({ username, passwordHash }) {
    const users = readUsers();
    // 检查重复
    if (users.find(u => u.username === username)) {
      return null; // 用户名已存在
    }
    const newUser = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
      role: 'personal',       // 默认个人模式
      largeFontMode: false,
    };
    users.push(newUser);
    writeUsers(users);
    return { id: newUser.id, username: newUser.username, createdAt: newUser.createdAt };
  },

  /** 更新用户信息 */
  updateUser(id, data) {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...data };
    writeUsers(users);
    return users[idx];
  },
};
