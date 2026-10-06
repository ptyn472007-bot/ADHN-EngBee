// EngBee - user-registry.js: Quản lý danh sách người học & đồng bộ tiến độ, lượt làm quiz qua server
(function () {
  "use strict";

  var USER_KEY = "engbee_user";
  var CLIENT_ID_KEY = "engbee_client_id";
  var USERS_KEY = "engbee_users";
  var QUIZ_KEY = "eb_quiz_history";

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

  function getCurrentUserName() {
    try {
      var p = JSON.parse(localStorage.getItem(USER_KEY) || "null");
      if (p && typeof p.name === "string" && p.name.trim()) {
        return p.name.trim();
      }
    } catch (e) {}
    return getClientId();
  }

  function readUsers() {
    try {
      var a = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function writeUsers(arr) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(arr));
    } catch (e) {}
  }

  // Ghi nhận một người học (gọi khi đăng nhập, học từ vựng, lật flashcard,...)
  function track(extra) {
    var name = (extra && extra.name) ? extra.name.trim() : getCurrentUserName();
    var now = Date.now();

    // 1. Lưu LocalStorage
    var users = readUsers();
    var found = false;
    for (var i = 0; i < users.length; i++) {
      if (users[i].name === name) {
        users[i].lastActive = now;
        if (extra && typeof extra.learnedCount === "number") {
          users[i].learned = Math.max(users[i].learned || 0, extra.learnedCount);
        }
        found = true;
        break;
      }
    }
    if (!found) {
      users.push({
        name: name,
        firstSeen: now,
        lastActive: now,
        learned: (extra && extra.learnedCount) || 0
      });
    }
    writeUsers(users);

    // 2. Gửi API lên Server để đồng bộ mọi máy
    if (window.fetch) {
      fetch("/api/track-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          topicId: extra && extra.topicId,
          learnedIndices: extra && extra.learnedIndices,
          learnedCount: extra && extra.learnedCount,
          bestScore: extra && extra.bestScore
        })
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
    var userName = (data.userName || data.name) ? (data.userName || data.name).trim() : getCurrentUserName();
    var now = data.ts || Date.now();
    var correct = Number(data.correct) || 0;
    var total = Number(data.total) || 10;
    var pct = typeof data.pct === "number" ? data.pct : Math.round(100 * correct / total);
    var topicId = data.topicId || data.mode || "all";
    var modeName = data.modeName || data.topicName || topicId;

    var record = {
      id: "q_" + now + "_" + Math.floor(Math.random() * 1000),
      userName: userName,
      topicId: topicId,
      mode: topicId,
      modeName: modeName,
      correct: correct,
      total: total,
      pct: pct,
      ts: now
    };

    // 1. Lưu LocalStorage
    try {
      var h = JSON.parse(localStorage.getItem(QUIZ_KEY) || "[]");
      if (!Array.isArray(h)) h = [];
      h.unshift(record);
      localStorage.setItem(QUIZ_KEY, JSON.stringify(h.slice(0, 100)));
    } catch (e) {}

    // Ghi nhận người học & điểm cao
    track({
      name: userName,
      bestScore: Math.round(10 * correct / total)
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
  }

  // Khởi chạy ghi nhận tự động khi người dùng vào trang
  function init() {
    setTimeout(function () {
      track();
    }, 400);
  }

  window.EngBeeTrackUser = track;
  window.EngBeeRecordQuiz = recordQuiz;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();