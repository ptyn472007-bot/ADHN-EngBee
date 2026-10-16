// EngBee - user-registry.js: Quản lý danh sách người học & đồng bộ tiến độ, lượt làm quiz qua server
(function () {
  "use strict";

  var USER_KEY = "engbee_user";
  var CLIENT_ID_KEY = "engbee_client_id";
  var USERS_KEY = "engbee_users";
  var QUIZ_KEY = "eb_quiz_history";
  var LEARN_PREFIX = "engbee_learned_";
  var BEST_PREFIX = "engbee_quiz_best_";
  var QUIZ_USER_PREFIX = "engbee_quiz_history_";

  // Lấy hoặc tạo mã học viên duy nhất cho máy này (chỉ dùng khi làm quiz mà chưa đăng nhập)
  function getClientId() {
    try {
      var id = localStorage.getItem(CLIENT_ID_KEY);
      if (!id) {
        id = "Học viên #" + Math.floor(1000 + Math.random() * 9000);
        localStorage.setItem(CLIENT_ID_KEY, id);
      }
      return id;
    } catch (e) {
      return "Học viên #" + Math.floor(1000 + Math.random() * 9000);
    }
  }

  // Lấy tên người học đã đăng nhập (null nếu là khách)
  function getRegisteredUserName() {
    try {
      var p = JSON.parse(localStorage.getItem(USER_KEY) || "null");
      if (p && typeof p.name === "string" && p.name.trim() && p.name.trim().toLowerCase() !== "guest") {
        return p.name.trim();
      }
    } catch (e) {}
    return null;
  }

  // Tên hiện tại: có thể là tên đăng nhập hoặc guest
  function getCurrentUserName() {
    var reg = getRegisteredUserName();
    return reg || "guest";
  }

  // Đọc danh sách người học từ LocalStorage (đã lọc sạch rác)
  function readUsers() {
    try {
      var a = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      if (!Array.isArray(a)) return [];
      return a.filter(function (u) {
        if (!u || typeof u.name !== "string" || !u.name.trim()) return false;
        var lower = u.name.trim().toLowerCase();
        if (lower === "guest") return false;
        // Bỏ qua học viên ảo không có dữ liệu
        if ((lower.indexOf("học viên #") === 0 || lower.indexOf("hoc vien #") === 0) &&
            (!u.learned || u.learned === 0) && (!u.best || u.best === 0)) {
          return false;
        }
        return true;
      });
    } catch (e) {
      return [];
    }
  }

  function writeUsers(arr) {
    try {
      if (Array.isArray(arr)) {
        var clean = arr.filter(function (u) {
          if (!u || typeof u.name !== "string" || !u.name.trim()) return false;
          var lower = u.name.trim().toLowerCase();
          if (lower === "guest") return false;
          if ((lower.indexOf("học viên #") === 0 || lower.indexOf("hoc vien #") === 0) &&
              (!u.learned || u.learned === 0) && (!u.best || u.best === 0)) {
            return false;
          }
          return true;
        });
        localStorage.setItem(USERS_KEY, JSON.stringify(clean));
      }
    } catch (e) {}
  }

  // Tự động quét và tổng hợp toàn bộ tiến độ của một người học từ LocalStorage
  function collectUserProgress(name) {
    var learnedByTopic = {};
    var totalLearned = 0;
    var topicSet = {};

    if (!name) name = getCurrentUserName();

    try {
      var prefix = LEARN_PREFIX + name + "_";
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf(prefix) !== 0) continue;
        // Bỏ qua các key phụ âm/phát âm
        if (key.indexOf("_PRON") !== -1 || key.indexOf("_CORR") !== -1) continue;
        
        var topicId = key.substring(prefix.length);
        if (!topicId) continue;

        try {
          var arr = JSON.parse(localStorage.getItem(key) || "[]");
          if (Array.isArray(arr)) {
            learnedByTopic[topicId] = arr;
            totalLearned += arr.length;
            if (arr.length > 0) {
              topicSet[topicId] = true;
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    // Quét điểm cao nhất
    var bestScore = 0;
    try {
      var b = localStorage.getItem(BEST_PREFIX + name);
      if (b !== null && b !== undefined) {
        bestScore = Number(b) || 0;
      }
    } catch (e) {}

    // Đếm số bài quiz
    var totalQuizzes = 0;
    try {
      var qh = JSON.parse(localStorage.getItem(QUIZ_USER_PREFIX + name) || "[]");
      if (Array.isArray(qh)) totalQuizzes = qh.length;
    } catch (e) {}

    return {
      name: name,
      learnedCount: totalLearned,
      topicsCount: Object.keys(topicSet).length,
      learnedByTopic: learnedByTopic,
      bestScore: bestScore,
      totalQuizzes: totalQuizzes
    };
  }

  // Ghi nhận một người học và đồng bộ tiến độ học qua Server
  function track(extra) {
    var registered = getRegisteredUserName();
    var name = (extra && extra.name) ? extra.name.trim() : registered;

    // Nếu không có tên đăng nhập và không truyền tên cụ thể:
    // Chỉ track nếu có tiến độ học thật sự
    if (!name || name.toLowerCase() === "guest") {
      var guestProg = collectUserProgress("guest");
      var hasGuestProgress = guestProg.learnedCount > 0 || guestProg.bestScore > 0 || (extra && (extra.learnedCount || extra.bestScore));
      if (!hasGuestProgress) {
        // Khách chưa học gì -> Không làm rác database server
        return;
      }
      name = getClientId(); // Dùng client id để gán tiến độ cho khách có học bài
    }

    var now = Date.now();
    var prog = collectUserProgress(name);

    // Tính toán số từ đã học chính xác
    var learnedCount = prog.learnedCount;
    if (extra && typeof extra.learnedCount === "number") {
      learnedCount = Math.max(learnedCount, extra.learnedCount);
    }

    var topicsCount = prog.topicsCount;
    if (extra && typeof extra.topicsCount === "number") {
      topicsCount = Math.max(topicsCount, extra.topicsCount);
    }

    var bestScore = prog.bestScore;
    if (extra && typeof extra.bestScore === "number") {
      bestScore = Math.max(bestScore, extra.bestScore);
    }

    var learnedByTopic = prog.learnedByTopic;
    if (extra && extra.topicId && Array.isArray(extra.learnedIndices)) {
      learnedByTopic[extra.topicId] = extra.learnedIndices;
    }

    // 1. Lưu LocalStorage danh sách người học
    var users = readUsers();
    var found = false;
    for (var i = 0; i < users.length; i++) {
      if (users[i].name === name) {
        users[i].lastActive = now;
        users[i].learned = Math.max(users[i].learned || 0, learnedCount);
        users[i].topics = Math.max(users[i].topics || 0, topicsCount);
        users[i].best = Math.max(users[i].best || 0, bestScore);
        found = true;
        break;
      }
    }
    if (!found) {
      users.push({
        name: name,
        firstSeen: now,
        lastActive: now,
        learned: learnedCount,
        topics: topicsCount,
        best: bestScore
      });
    }
    writeUsers(users);

    // 2. Gửi API lên Server để đồng bộ thời gian thực cho mọi thiết bị
    if (window.fetch) {
      var payload = {
        name: name,
        topicId: extra && extra.topicId,
        learnedIndices: extra && extra.learnedIndices,
        learnedCount: learnedCount,
        topicsCount: topicsCount,
        learnedByTopic: learnedByTopic,
        bestScore: bestScore,
        totalQuizzes: prog.totalQuizzes
      };

      fetch("/api/track-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.ok ? res.json() : null;
      }).then(function (data) {
        if (data && data.stats && Array.isArray(data.stats.users)) {
          writeUsers(data.stats.users);
        }
      }).catch(function () {});
    }
  }

  // Ghi nhận kết quả làm Quiz và đồng bộ mọi máy
  function recordQuiz(data) {
    if (!data) return;
    var registered = getRegisteredUserName();
    var userName = (data.userName || data.name) ? (data.userName || data.name).trim() : (registered || getClientId());
    var now = Number(data.ts) || Date.now();
    var correct = Number(data.correct) || 0;
    var total = Number(data.total) || 10;
    var pct = typeof data.pct === "number" ? data.pct : Math.round(100 * correct / (total || 10));
    var score10 = Math.round(10 * correct / (total || 10));
    var topicId = data.topicId || data.mode || "all";
    var modeName = data.modeName || data.topicName || topicId;

    var record = {
      id: "q_" + now + "_" + Math.floor(Math.random() * 10000),
      userName: userName,
      topicId: topicId,
      mode: topicId,
      modeName: modeName,
      correct: correct,
      total: total,
      pct: pct,
      score: score10,
      ts: now
    };

    // 1. Lưu LocalStorage chung
    try {
      var h = JSON.parse(localStorage.getItem(QUIZ_KEY) || "[]");
      if (!Array.isArray(h)) h = [];
      h.unshift(record);
      localStorage.setItem(QUIZ_KEY, JSON.stringify(h.slice(0, 200)));
    } catch (e) {}

    // Lưu riêng theo user
    try {
      var uh = JSON.parse(localStorage.getItem(QUIZ_USER_PREFIX + userName) || "[]");
      if (!Array.isArray(uh)) uh = [];
      uh.unshift(record);
      localStorage.setItem(QUIZ_USER_PREFIX + userName, JSON.stringify(uh.slice(0, 100)));

      var curBest = Number(localStorage.getItem(BEST_PREFIX + userName) || 0);
      if (score10 > curBest) {
        localStorage.setItem(BEST_PREFIX + userName, String(score10));
      }
    } catch (e) {}

    // Cập nhật người học & điểm cao
    track({
      name: userName,
      bestScore: score10
    });

    // 2. Gửi API lên Server để đồng bộ mọi máy
    if (window.fetch) {
      fetch("/api/quiz-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      }).then(function (res) {
        return res.ok ? res.json() : null;
      }).then(function (resData) {
        if (resData && resData.stats) {
          if (Array.isArray(resData.stats.quizHistory)) {
            try {
              localStorage.setItem(QUIZ_KEY, JSON.stringify(resData.stats.quizHistory));
            } catch (e) {}
          }
          if (Array.isArray(resData.stats.users)) {
            writeUsers(resData.stats.users);
          }
        }
      }).catch(function () {});
    }

    return record;
  }

  // Khởi chạy ghi nhận tự động khi người dùng vào trang (chỉ chạy nếu đã đăng nhập)
  function init() {
    var reg = getRegisteredUserName();
    if (reg) {
      setTimeout(function () {
        track({ name: reg });
      }, 500);
    }
  }

  window.EngBeeTrackUser = track;
  window.EngBeeRecordQuiz = recordQuiz;
  window.EngBeeCollectProgress = collectUserProgress;
  window.EngBeeGetUserName = getCurrentUserName;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();