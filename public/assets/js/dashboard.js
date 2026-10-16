// EngBee - dashboard.js: hiển thị tiến độ học tập và lịch sử Quiz
(function () {
  "use strict";

  var LEARN_PREFIX = "engbee_learned_";
  var QUIZ_HIST_PREFIX = "engbee_quiz_history_";
  var QUIZ_BEST_PREFIX = "engbee_quiz_best_";
  var PRON_PREFIX = "engbee_pron_history_";
  var USER_KEY = "engbee_user";

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

  function lightTopics() {
    return Object.keys(window.EngBeeAllWords || {});
  }

  function topicMeta() {
    var EBD = window.EngBeeAdminData;
    if (EBD && typeof EBD.getAllTopics === "function") return EBD.getAllTopics();
    return [];
  }

  function getActiveTopics() {
    var LIGHT = window.EngBeeAllWords || {};
    var EBD = window.EngBeeAdminData;
    return topicMeta().filter(function (t) {
      return Object.prototype.hasOwnProperty.call(LIGHT, t.id);
    }).filter(function (t) {
      return !(EBD && EBD.isTopicHidden && EBD.isTopicHidden(t.id));
    }).map(function (t) {
      var base = LIGHT[t.id] || [];
      var words = (EBD && EBD.apply) ? EBD.apply(t.id, base) : base;
      return { id: t.id, name: t.name, vi: t.vi, words: words };
    });
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
    var stored = localStorage.getItem(QUIZ_BEST_PREFIX + scope);
    if (stored !== null && stored !== undefined && stored !== "") {
      var n = Number(stored);
      if (!isNaN(n)) return n;
    }

    // Suy ra điểm cao nhất từ chính lịch sử quiz của người dùng này
    var top = 0;
    getHistory().forEach(function (h) {
      var s = typeof h.score === "number" ? h.score : Math.round((Number(h.pct) || 0) / 10);
      if (s > top) top = s;
    });
    return top > 0 ? top : null;
  }

  function getHistory() {
    var scope = getUser() || "guest";
    try {
      var arr = JSON.parse(localStorage.getItem(QUIZ_HIST_PREFIX + scope) || "null");
      if (Array.isArray(arr)) return arr;
    } catch (e) {}
    return [];
  }

  function getPronHistory() {
    var scope = getUser() || "guest";
    try {
      var arr = JSON.parse(localStorage.getItem(PRON_PREFIX + scope) || "null");
      if (Array.isArray(arr)) return arr;
    } catch (e) {}
    return [];
  }

  function topicNameById(id) {
    var topics = topicMeta();
    for (var i = 0; i < topics.length; i++) {
      if (topics[i].id === id) return topics[i].name;
    }
    return id;
  }

  // ------- Từ đã học chi tiết (chia nhóm theo mức độ) -------

  function escapeHtml(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function getIdxSet(key) {
    var set = {};
    try {
      var arr = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(arr)) {
        arr.forEach(function (x) { if (typeof x === "number" && x >= 0) set[x] = 1; });
      }
    } catch (e) {}
    return set;
  }

  // Trả về 3 nhóm từ đã được ghi nhận:
  //   full    = thuộc nghĩa + phát âm (100%)
  //   meaning = làm đúng Quiz / ghi nhớ đúng nghĩa, chưa kiểm tra phát âm (50%)
  //   pron    = đã phát âm chuẩn, chưa ôn lại nghĩa (50%)
  function getLearnedWords() {
    var scope = getUser() || "guest";
    var active = getActiveTopics();
    var result = { full: [], meaning: [], pron: [] };
    active.forEach(function (t) {
      var words = (t.words && t.words.slice()) || [];
      var baseKey = LEARN_PREFIX + scope + "_" + t.id;
      var answered = getIdxSet(baseKey + "_CORR");
      var pron = getIdxSet(baseKey + "_PRON");
      for (var i = 0; i < words.length; i++) {
        var w = words[i] || {};
        var hasAnswer = !!answered[i];
        var hasPron = !!pron[i];
        if (!hasAnswer && !hasPron) continue;
        var rec = { en: w.en || "", vi: w.vi || "", topic: t.name || t.id };
        if (hasAnswer && hasPron) result.full.push(rec);
        else if (hasAnswer) result.meaning.push(rec);
        else result.pron.push(rec);
      }
    });
    return result;
  }

  function lwTable(arr, cls, label) {
    if (!arr.length) return "";
    var max = 80;
    var rows = "";
    arr.slice(0, max).forEach(function (r) {
      rows += '<tr><td class="lw-en">' + escapeHtml(r.en) +
        "</td><td class=\"lw-vi\">" + escapeHtml(r.vi) +
        "</td><td class=\"lw-topic\">" + escapeHtml(r.topic) + "</td></tr>";
    });
    if (arr.length > max) rows += '<tr class="lw-more-row"><td colspan="3">+ ' + (arr.length - max) + " từ nữa</td></tr>";
    return '<div class="lw-group ' + cls + '"><h3 class="lw-title">' + label +
      ' <span class="lw-count">' + arr.length + "</span></h3>" +
      '<div class="lw-tbl"><table><tbody>' + rows + "</tbody></table></div></div>";
  }

  function renderLearnedWords() {
    var wrap = document.getElementById("dash-learned-words");
    if (!wrap) return;
    var data = getLearnedWords();
    if (!data.full.length && !data.meaning.length && !data.pron.length) {
      wrap.innerHTML = '<p class="dash-empty">Chưa có từ nào được ghi nhận. Hãy vào Học từ vựng hoặc làm Quiz để bắt đầu!</p>';
      return;
    }
    wrap.innerHTML =
      lwTable(data.full, "full", "✅ Đã thuộc (100%) — đủ nghĩa + phát âm") +
      lwTable(data.meaning, "meaning", "🟡 Thuộc nghĩa (50%) — đúng Quiz / ghi nhớ, chưa kiểm tra phát âm") +
      lwTable(data.pron, "pron", "🎙 Phát âm được (50%) — đọc chuẩn, cần ôn lại nghĩa");
  }

  // ------- Hiển thị -------

  function renderName() {
    var name = getUser();
    document.getElementById("dash-name").textContent = name ? name : "Chưa đăng nhập";
  }

  function renderStats() {
    var activeTopics = getActiveTopics();
    var totalWords = getTotalWords(activeTopics);
    var learned = getLearnedWords().full.length;

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
        note.textContent = "Bạn đã thuộc " + learned + " trên tổng " + totalWords + " từ (đủ cả nghĩa và phát âm). Cố lên nhé!";
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
    renderLearnedWords();
  }

  // ------- Đặt lại dữ liệu -------

  function resetData() {
    var scope = getUser() || "guest";
    lightTopics().forEach(function (id) {
      localStorage.removeItem(LEARN_PREFIX + scope + "_" + id);
      localStorage.removeItem(LEARN_PREFIX + scope + "_" + id + "_PRON");
      localStorage.removeItem(LEARN_PREFIX + scope + "_" + id + "_CORR");
    });
    localStorage.removeItem(QUIZ_HIST_PREFIX + scope);
    localStorage.removeItem(QUIZ_BEST_PREFIX + scope);
    localStorage.removeItem(PRON_PREFIX + scope);
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