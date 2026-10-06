// EngBee - engbee-sync.js: Quản lý đồng bộ dữ liệu học tập và kết quả qua máy chủ API
(function () {
  "use strict";

  var USER_KEY = "engbee_user";
  var CLIENT_ID_KEY = "engbee_client_id";
  var USERS_KEY = "engbee_users";
  var QUIZ_KEY = "eb_quiz_history";

  // Lấy hoặc tạo mã học viên duy nhất cho trình duyệt này nếu chưa đặt tên
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

  // Lấy tên người dùng hiện tại (nếu chưa nhập tên thì lấy Client ID)
  function getCurrentUserName() {
    try {
      var p = JSON.parse(localStorage.getItem(USER_KEY) || "null");
      if (p && typeof p.name === "string" && p.name.trim()) {
        return p.name.trim();
      }
    } catch (e) {}
    return getClientId();
  }

  // Đọc danh sách người học từ LocalStorage
  function readUsersLocal() {
    try {
      var a = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  // Ghi danh sách người học vào LocalStorage
  function writeUsersLocal(arr) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(arr));
    } catch (e) {}
  }

  // Gửi tiến độ người học lên máy chủ và lưu local
  function trackUser(extra) {
    var name = (extra && extra.name) ? extra.name.trim() : getCurrentUserName();
    var now = Date.now();

    // 1. Lưu vào LocalStorage
    var users = readUsersLocal();
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
    writeUsersLocal(users);

    // 2. Gửi API lên máy chủ để đồng bộ mọi máy
    var payload = {
      name: name,
      topicId: extra && extra.topicId,
      learnedIndices: extra && extra.learnedIndices,
      learnedCount: extra && extra.learnedCount,
      bestScore: extra && extra.bestScore
    };

    if (window.fetch) {
      fetch("/api/track-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.ok ? res.json() : null;
      }).then(function (data) {
        if (data && data.stats && Array.isArray(data.stats.users)) {
          writeUsersLocal(data.stats.users);
        }
      }).catch(function () {
        // Nếu offline hoặc không có server, local storage vẫn hoạt động
      });
    }
  }

  // Ghi nhận lượt làm Quiz lên máy chủ và lưu local
  function recordQuiz(data) {
    var userName = (data && data.userName) ? data.userName.trim() : getCurrentUserName();
    var now = (data && data.ts) || Date.now();
    var correct = Number(data && data.correct) || 0;
    var total = Number(data && data.total) || 10;
    var pct = typeof (data && data.pct) === "number" ? data.pct : Math.round(100 * correct / total);
    var topicId = (data && (data.topicId || data.mode)) || "all";
    var modeName = (data && (data.modeName || data.topicName)) || topicId;

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

    // Cập nhật điểm người học
    trackUser({
      name: userName,
      bestScore: Math.round(10 * correct / total)
    });

    // 2. Gửi API lên máy chủ để đồng bộ mọi máy
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
            writeUsersLocal(resData.stats.users);
          }
        }
      }).catch(function () {});
    }

    return record;
  }

  // Lấy dữ liệu thống kê tổng quan toàn hệ thống từ máy chủ
  function fetchStats(callback) {
    if (!window.fetch) return;
    fetch("/api/stats")
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (!data) return;
        if (Array.isArray(data.users)) {
          writeUsersLocal(data.users);
        }
        if (Array.isArray(data.quizHistory)) {
          try {
            localStorage.setItem(QUIZ_KEY, JSON.stringify(data.quizHistory));
          } catch (e) {}
        }
        if (typeof callback === "function") {
          callback(data);
        }
      })
      .catch(function () {});
  }

  // Tự động gửi tín hiệu người học khi mở trang
  function initAutoTrack() {
    // Chỉ track một lần khi load trang
    setTimeout(function () {
      trackUser();
    }, 500);
  }

  window.EngBeeSync = {
    getCurrentUserName: getCurrentUserName,
    getClientId: getClientId,
    trackUser: trackUser,
    recordQuiz: recordQuiz,
    fetchStats: fetchStats
  };

  // Cung cấp alias tương thích với EngBeeTrackUser cũ
  window.EngBeeTrackUser = function (extra) {
    trackUser(extra);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutoTrack);
  } else {
    initAutoTrack();
  }
})();
