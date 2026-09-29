// EngBee - dashboard.js: hiển thị tiến độ học tập và lịch sử Quiz
(function () {
  "use strict";

  var topics = EngBeeData.topics || [];
  var LEARN_PREFIX = "engbee_learned_";
  var USER_KEY = "engbee_user";
  var BEST_KEY = "engbee_quiz_best_" + (getUser() || "guest");
  var HISTORY_KEY = "engbee_quiz_history_" + (getUser() || "guest");

  // Tổng số từ của tất cả chủ đề (mỗi chủ đề 50 từ)
  var totalWords = 0;
  topics.forEach(function (t) {
    totalWords += (t.words && t.words.length) || 0;
  });

  // ------- Đọc dữ liệu từ LocalStorage -------

  function getUser() {
    try {
      var parsed = JSON.parse(localStorage.getItem(USER_KEY) || "null");
      if (parsed && typeof parsed.name === "string" && parsed.name.trim()) {
        return parsed.name.trim();
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function getLearned(id) {
    try {
      var scope = getUser() || "guest";
      var arr = JSON.parse(localStorage.getItem(LEARN_PREFIX + scope + "_" + id) || "null");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function getLearnedCount() {
    var count = 0;
    topics.forEach(function (t) {
      count += getLearned(t.id).length;
    });
    return count;
  }

  function getBestScore() {
    return localStorage.getItem(BEST_KEY);
  }

  function getHistory() {
    try {
      var arr = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  // ------- Hiển thị -------

  function renderName() {
    var name = getUser();
    document.getElementById("dash-name").textContent =
      name ? name : "Chưa đăng nhập";
  }

  function renderStats() {
    var learned = getLearnedCount();

    document.getElementById("dash-learned").textContent = learned + " / " + totalWords;

    var percent = totalWords > 0 ? Math.round((learned / totalWords) * 100) : 0;
    document.getElementById("dash-percent").textContent = percent + "%";

    var bar = document.getElementById("dash-progress-bar");
    bar.style.width = percent + "%";

    var note = document.getElementById("dash-progress-note");
    if (learned === 0) {
      note.textContent = "Chưa có từ nào được học. Mở trang Học từ vựng để bắt đầu!";
    } else if (percent === 100) {
      note.textContent = "Tuyệt vời! Bạn đã thuộc toàn bộ từ vựng.";
    } else {
      note.textContent =
        "Bạn đã thuộc " + learned + " trên tổng " + totalWords + " từ. Cố lên nhé!";
    }
  }

  function renderBest() {
    var best = getBestScore();
    document.getElementById("dash-best").textContent =
      best === null ? "Chưa có" : best + " / 10";
  }

  function renderHistory() {
    var history = getHistory();
    var wrap = document.getElementById("dash-history-wrap");
    var html = "";

    if (history.length === 0) {
      html = '<p class="dash-empty">Chưa có lượt chơi Quiz nào. Hãy thử sức ngay!</p>';
    } else {
      html = '<table class="dash-table"><thead><tr><th>#</th><th>Ngày</th><th>Điểm</th></tr></thead><tbody>';
      history
        .slice()
        .reverse()
        .forEach(function (item, index) {
          var score = typeof item.score === "number" ? item.score : 0;
          html +=
            "<tr><td>" + (index + 1) + "</td><td>" +
            (item.date || "—") + "</td><td><strong>" + score + " / 10</strong></td></tr>";
        });
      html += "</tbody></table>";
    }

    wrap.innerHTML = html;
  }

  function renderAll() {
    renderName();
    renderStats();
    renderBest();
    renderHistory();
  }

  // ------- Đặt lại dữ liệu -------

  function resetData() {
    var scope = getUser() || "guest";
    topics.forEach(function (t) {
      localStorage.removeItem(LEARN_PREFIX + scope + "_" + t.id);
      // Dọn các khóa cũ không gắn người dùng (từ trước nhiều tài khoản)
      localStorage.removeItem(LEARN_PREFIX + t.id);
      localStorage.removeItem("eb_learned_" + t.id);
    });
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(BEST_KEY);
    localStorage.removeItem("engbee_quiz_history");
    localStorage.removeItem("engbee_quiz_best");
    renderAll();
  }

  document.getElementById("dash-reset").addEventListener("click", function () {
    var ok = window.confirm(
      "Bạn có chắc muốn đặt lại toàn bộ dữ liệu học tập?\nTừ đã thuộc và lịch sử điểm Quiz sẽ bị xóa."
    );
    if (ok) resetData();
  });

  renderAll();
})();