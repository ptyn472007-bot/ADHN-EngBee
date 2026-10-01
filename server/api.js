import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DB_DIR, 'engbee_db.json');

// Khởi tạo thư mục và file CSDL nếu chưa có
function getInitialData() {
  return {
    users: {},
    quizHistory: [],
    admin: {
      editedWords: {},
      addedWords: {},
      removedWords: [],
      hiddenTopics: [],
      customTopics: [],
      lastUpdate: Date.now()
    }
  };
}

function ensureDb() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(getInitialData(), null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[EngBee DB] Error creating database file:', err);
  }
}

export function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = {};
    if (!Array.isArray(parsed.quizHistory)) parsed.quizHistory = [];
    if (!parsed.admin) parsed.admin = getInitialData().admin;
    return parsed;
  } catch (e) {
    return getInitialData();
  }
}

export function writeDb(data) {
  ensureDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[EngBee DB] Error writing database file:', err);
    return false;
  }
}

// Tính toán số liệu thống kê tổng hợp toàn hệ thống
export function computeStats(db) {
  const usersList = Object.values(db.users || {}).map(u => {
    let learnedWordsCount = u.learnedWordsCount || 0;
    if (u.learnedByTopic && typeof u.learnedByTopic === 'object') {
      let sum = 0;
      Object.keys(u.learnedByTopic).forEach(t => {
        if (Array.isArray(u.learnedByTopic[t])) {
          sum += u.learnedByTopic[t].length;
        }
      });
      if (sum > 0) learnedWordsCount = Math.max(learnedWordsCount, sum);
    }
    const topicsCount = u.learnedByTopic ? Object.keys(u.learnedByTopic).length : (u.topicsCount || 0);

    return {
      name: u.name,
      learned: learnedWordsCount,
      topics: topicsCount,
      best: u.bestScore || 0,
      totalQuizzes: u.totalQuizzes || 0,
      lastSeen: u.lastActive || u.firstSeen || Date.now()
    };
  });

  const quizHistory = (db.quizHistory || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const totalAttempts = quizHistory.length;
  const avgScore = totalAttempts > 0
    ? Math.round(quizHistory.reduce((sum, q) => sum + (Number(q.pct) || 0), 0) / totalAttempts)
    : 0;

  // Sắp xếp người dùng gần đây nhất
  const sortedUsers = usersList.slice().sort((a, b) => b.lastSeen - a.lastSeen);

  return {
    totalUsers: sortedUsers.length,
    totalAttempts,
    avgScore,
    users: sortedUsers,
    recentUsers: sortedUsers.slice(0, 5),
    quizHistory: quizHistory.slice(0, 100),
    admin: db.admin || {}
  };
}

// Xử lý các API endpoint
export async function handleApiRequest(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (!pathname.startsWith('/api/')) {
    return false; // Không phải API request
  }

  // Đọc body dạng JSON cho POST
  let body = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const dataStr = Buffer.concat(buffers).toString();
      if (dataStr) {
        body = JSON.parse(dataStr);
      }
    } catch (err) {
      // Body rỗng hoặc không phải JSON
    }
  }

  const sendJson = (status, payload) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };

  const db = readDb();

  // 1. GET /api/stats - Lấy tổng quan toàn hệ thống
  if (req.method === 'GET' && (pathname === '/api/stats' || pathname === '/api/admin/overview')) {
    sendJson(200, computeStats(db));
    return true;
  }

  // 2. POST /api/track-user - Ghi nhận người dùng & tiến độ học
  if (req.method === 'POST' && pathname === '/api/track-user') {
    const rawName = (body.name || '').trim();
    if (!rawName) {
      sendJson(400, { error: 'Name is required' });
      return true;
    }

    const key = rawName.toLowerCase();
    const now = Date.now();

    if (!db.users[key]) {
      db.users[key] = {
        name: rawName,
        firstSeen: now,
        lastActive: now,
        learnedWordsCount: 0,
        topicsCount: 0,
        learnedByTopic: {},
        bestScore: 0,
        totalQuizzes: 0
      };
    }

    const user = db.users[key];
    user.name = rawName; // Giữ nguyên chữ hoa/thường mới nhất
    user.lastActive = now;

    if (body.topicId && Array.isArray(body.learnedIndices)) {
      if (!user.learnedByTopic) user.learnedByTopic = {};
      user.learnedByTopic[body.topicId] = body.learnedIndices;
      
      let sum = 0;
      Object.keys(user.learnedByTopic).forEach(t => {
        sum += user.learnedByTopic[t].length;
      });
      user.learnedWordsCount = sum;
      user.topicsCount = Object.keys(user.learnedByTopic).length;
    } else if (typeof body.learnedCount === 'number') {
      user.learnedWordsCount = Math.max(user.learnedWordsCount || 0, body.learnedCount);
    }

    if (typeof body.bestScore === 'number' && body.bestScore > (user.bestScore || 0)) {
      user.bestScore = body.bestScore;
    }

    writeDb(db);
    sendJson(200, { ok: true, stats: computeStats(db) });
    return true;
  }

  // 3. POST /api/quiz-result - Ghi nhận kết quả làm Quiz của bất kỳ người học nào
  if (req.method === 'POST' && pathname === '/api/quiz-result') {
    const rawName = (body.userName || body.name || 'Học viên').trim();
    const correct = Number(body.correct) || 0;
    const total = Number(body.total) || 10;
    const pct = typeof body.pct === 'number' ? body.pct : Math.round(100 * correct / (total || 10));
    const score10 = Math.round(10 * correct / (total || 10));
    const now = Number(body.ts) || Date.now();

    const record = {
      id: 'q_' + now + '_' + Math.floor(Math.random() * 10000),
      userName: rawName,
      topicId: body.topicId || 'all',
      modeName: body.modeName || body.topicId || 'Tổng hợp',
      correct: correct,
      total: total,
      pct: pct,
      score: score10,
      ts: now
    };

    if (!Array.isArray(db.quizHistory)) db.quizHistory = [];
    db.quizHistory.unshift(record);

    // Giới hạn lưu 500 bài gần nhất
    if (db.quizHistory.length > 500) {
      db.quizHistory = db.quizHistory.slice(0, 500);
    }

    // Cập nhật thông tin người dùng
    const key = rawName.toLowerCase();
    if (!db.users[key]) {
      db.users[key] = {
        name: rawName,
        firstSeen: now,
        lastActive: now,
        learnedWordsCount: 0,
        topicsCount: 0,
        learnedByTopic: {},
        bestScore: score10,
        totalQuizzes: 1
      };
    } else {
      const u = db.users[key];
      u.lastActive = now;
      u.totalQuizzes = (u.totalQuizzes || 0) + 1;
      if (score10 > (u.bestScore || 0)) {
        u.bestScore = score10;
      }
    }

    writeDb(db);
    sendJson(200, { ok: true, record, stats: computeStats(db) });
    return true;
  }

  // 4. GET /api/admin/data - Lấy dữ liệu quản trị từ vựng & chủ đề
  if (req.method === 'GET' && pathname === '/api/admin/data') {
    sendJson(200, db.admin || {});
    return true;
  }

  // 5. POST /api/admin/data - Lưu dữ liệu quản trị (từ đã sửa/thêm/xóa/chủ đề ẩn/chủ đề tự tạo)
  if (req.method === 'POST' && pathname === '/api/admin/data') {
    if (!db.admin) db.admin = {};
    if (body.editedWords !== undefined) db.admin.editedWords = body.editedWords;
    if (body.addedWords !== undefined) db.admin.addedWords = body.addedWords;
    if (body.removedWords !== undefined) db.admin.removedWords = body.removedWords;
    if (body.hiddenTopics !== undefined) db.admin.hiddenTopics = body.hiddenTopics;
    if (body.customTopics !== undefined) db.admin.customTopics = body.customTopics;
    db.admin.lastUpdate = Date.now();

    writeDb(db);
    sendJson(200, { ok: true, admin: db.admin });
    return true;
  }

  // 6. POST /api/admin/clear-user - Xóa tiến độ người dùng
  if (req.method === 'POST' && pathname === '/api/admin/clear-user') {
    const rawName = (body.name || '').trim().toLowerCase();
    if (rawName && db.users[rawName]) {
      delete db.users[rawName];
      writeDb(db);
    }
    sendJson(200, { ok: true, stats: computeStats(db) });
    return true;
  }

  // 7. POST /api/admin/clear-results - Xóa lịch sử quiz
  if (req.method === 'POST' && pathname === '/api/admin/clear-results') {
    db.quizHistory = [];
    writeDb(db);
    sendJson(200, { ok: true, stats: computeStats(db) });
    return true;
  }

  // 8. POST /api/admin/reset - Đặt lại toàn bộ dữ liệu
  if (req.method === 'POST' && pathname === '/api/admin/reset') {
    const fresh = getInitialData();
    writeDb(fresh);
    sendJson(200, { ok: true, stats: computeStats(fresh) });
    return true;
  }

  sendJson(404, { error: 'Not found' });
  return true;
}
