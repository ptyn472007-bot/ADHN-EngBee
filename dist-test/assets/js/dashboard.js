// EngBee - dashboard.js: hiển thị tiến độ học tập và lịch sử Quiz
(function () {
  "use strict";

  var LEARN_PREFIX = "engbee_learned_";
  var USER_KEY = "engbee_user";
  var PRON_KEY = "eb_pron_history";

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

  function getActiveTopics() {
    var rawTopics = (typeof EngBeeData !== "undefined" && Array.isArray(EngBeeData.topics)) ? EngBeeData.topics : [];
    if (window.EngBeeAdminData) {
      return rawTopics.filter(function (t) {
        return !window.EngBeeAdminData.isTopicHidden(t.id);
      }).map(function (t) {
        var words = window.EngBeeAdminData.apply(t.id, t.words);
        return { id: t.id, name: t.name, vi: t.vi, words: words };
      });
    }
    return rawTopics;
  }

  function getTotalWords(activeTopics) {
    var total = 0;
    activeTopics.forEach(function (t) {
      total += (t.words && t.words.length) || 0;
    });
    return total;
  }

  function getLearned(id, maxWords) {
    try {
      var scope = getUser() || "guest";
      var arr = JSON.parse(localStorage.getItem(LEARN_PREFIX + scope + "_" + id) || "null");
      if (Array.isArray(arr)) {
        return arr.filter(function (x) { return typeof x === "number" && x >= 0 && x < maxWords; });
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  function getLearnedCount(activeTopics) {
    var count = 0;
    activeTopics.forEach(function (t) {
      var maxW = (t.words && t.words.length) || 50;
      count += getLearned(t.id, maxW).length;
    });
    return count;
  }

  function getBestScore() {
    var scope = getUser() || "guest";
    var userBest = localStorage.getItem("engbee_quiz_best_" + scope);
    if (userBest !== null && userBest !== undefined) return userBest;

    // Tra cứu từ lịch sử quiz chung
    try {
      var hist = JSON.parse(localStorage.getItem("eb_quiz_history") || "[]");
      if (Array.isArray(hist) && hist.length > 0) {
        var top = 0;
        hist.forEach(function (h) {
          var p = typeof h.pct === "number" ? h.pct : 0;
          if (p > top) top = p;
        });
        return top > 0 ? Math.round(top / 10) : null;
      }
    } catch (e) {}

    return null;
  }

  function getHistory() {
    var scope = getUser() || "guest";
    try {
      var arr = JSON.parse(localStorage.getItem("engbee_quiz_history_" + scope) || "null");
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch (e) {}

    // Lịch sử quiz chung
    try {
      var h = JSON.parse(localStorage.getItem("eb_quiz_history") || "[]");
      if (Array.isArray(h)) return h;
    } catch (e) {}

    return [];
  }

  function getPronHistory() {
    try {
      var h = JSON.parse(localStorage.getItem(PRON_KEY) || "[]");
      if (Array.isArray(h)) return h;
    } catch (e) {}
    return [];
  }

  function topicNameById(id) {
    var topics = (typeof EngBeeData !== "undefined" && Array.isArray(EngBeeData.topics)) ? EngBeeData.topics : [];
    for (var i = 0; i < topics.length; i++) {
      if (topics[i].id === id) return topics[i].name;
    }
    return id;
  }

  // ------- Hiển thị -------

  function renderName() {
    var name = getUser();
    document.getElementById("dash-name").textContent = name ? name : "Chưa đăng nhập";
  }

  function renderStats() {
    var activeTopics = getActiveTopics();
    var totalWords = getTotalWords(activeTopics);
    var learned = getLearnedCount(activeTopics);

    document.getElementById("dash-learned").textContent = learned + " / " + totalWords;

    var percent = totalWords > 0 ? Math.round((learned / totalWords) * 100) : 0;
    document.getElementById("dash-percent").textContent = percent + "%";

    var bar = document.getElementById("dash-progress-bar");
    if (bar) bar.style.width = percent + "%";

    var note = document.getElementById("dash-progress-note");
    if (note) {
      if (learned === 0) {
        note.textContent = "Chưa có từ nào được học. Mở trang Học từ vựng để bắt đầu!";
      } else if (percent === 100) {
        note.textContent = "Tuyệt vời! Bạn đã thuộc toàn bộ từ vựng.";
      } else {
        note.textContent = "Bạn đã thuộc " + learned + " trên tổng " + totalWords + " từ. Cố lên nhé!";
      }
    }
  }

  function renderBest() {
    var best = getBestScore();
    document.getElementById("dash-best").textContent = best === null ? "Chưa có" : best + " / 10";
  }

  function renderPronBest() {
    var h = getPronHistory();
    var b = 0;
    h.forEach(function (x) {
      var p = typeof x.avg === "number" ? x.avg : 0;
      if (p > b) b = p;
    });
    document.getElementById("dash-pron-best").textContent = b > 0 ? b + "%" : "Chưa có";
  }

  function renderPronHistory() {
    var history = getPronHistory();
    var wrap = document.getElementById("dash-pron-wrap");
    if (!wrap) return;
    var html = "";

    if (history.length === 0) {
      html = '<p class="dash-empty">Chưa có lượt kiểm tra phát âm nào. Thử sức ngay!</p>';
    } else {
      html = '<table class="dash-table"><thead><tr><th>#</th><th>Ngày</th><th>Chủ đề</th><th>Điểm trung bình</th><th>Phát âm tốt</th></tr></thead><tbody>';
      history
        .slice(0, 15)
        .forEach(function (item, index) {
          var avg = typeof item.avg === "number" ? item.avg : "—";
          var good = typeof item.good === "number" ? item.good : "—";
          var dateStr = item.date || (item.ts ? new Date(item.ts).toLocaleString("vi-VN") : "—");
          var modeStr = item.topicId ? topicNameById(item.topicId) : "Tổng hợp";
          html +=
            "<tr><td>" + (index + 1) + "</td><td>" +
            dateStr + "</td><td>" + modeStr + "</td><td><strong>" + avg + "%</strong></td><td>" + good + "</td></tr>";
        });
      html += "</tbody></table>";
    }

    wrap.innerHTML = html;
  }

  function renderHistory() {
    var history = getHistory();
    var wrap = document.getElementById("dash-history-wrap");
    if (!wrap) return;
    var html = "";

    if (history.length === 0) {
      html = '<p class="dash-empty">Chưa có lượt chơi Quiz nào. Hãy thử sức ngay!</p>';
    } else {
      html = '<table class="dash-table"><thead><tr><th>#</th><th>Ngày</th><th>Chủ đề</th><th>Điểm</th></tr></thead><tbody>';
      history
        .slice(0, 15)
        .forEach(function (item, index) {
          var score = typeof item.score === "number" ? item.score : (item.correct !== undefined ? item.correct : 0);
          var total = typeof item.total === "number" ? item.total : 10;
          var dateStr = item.date || (item.ts ? new Date(item.ts).toLocaleString("vi-VN") : "—");
          var modeStr = item.modeName || item.mode || "Tổng hợp";
          html +=
            "<tr><td>" + (index + 1) + "</td><td>" +
            dateStr + "</td><td>" + modeStr + "</td><td><strong>" + score + " / " + total + "</strong></td></tr>";
        });
      html += "</tbody></table>";
    }

    wrap.innerHTML = html;
  }

  function renderAll() {
    renderName();
    renderStats();
    renderBest();
    renderPronBest();
    renderHistory();
    renderPronHistory();
  }

  // ------- Đặt lại dữ liệu -------

  function resetData() {
    var scope = getUser() || "guest";
    var rawTopics = (typeof EngBeeData !== "undefined" && Array.isArray(EngBeeData.topics)) ? EngBeeData.topics : [];
    rawTopics.forEach(function (t) {
      localStorage.removeItem(LEARN_PREFIX + scope + "_" + t.id);
      localStorage.removeItem(LEARN_PREFIX + t.id);
      localStorage.removeItem("eb_learned_" + t.id);
    });
    localStorage.removeItem("engbee_quiz_history_" + scope);
    localStorage.removeItem("engbee_quiz_best_" + scope);
    localStorage.removeItem("engbee_quiz_history");
    localStorage.removeItem("engbee_quiz_best");
    localStorage.removeItem("eb_quiz_history");
    localStorage.removeItem(PRON_KEY);
    renderAll();
  }

  var resetBtn = document.getElementById("dash-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      var ok = window.confirm(
        "Bạn có chắc muốn đặt lại toàn bộ dữ liệu học tập?\nTừ đã thuộc và lịch sử điểm Quiz sẽ bị xóa."
      );
      if (ok) resetData();
    });
  }

  renderAll();

  // Lắng nghe thay đổi khi Admin cập nhật dữ liệu
  if (window.EngBeeAdminData && typeof window.EngBeeAdminData.onChange === "function") {
    window.EngBeeAdminData.onChange(renderAll);
  } else {
    window.addEventListener("storage", renderAll);
    window.addEventListener("engbee_data_changed", renderAll);
  }
})();