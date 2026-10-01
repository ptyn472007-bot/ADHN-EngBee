/* =========================================================
   EngBee - Lớp dữ liệu chung cho Admin và Người dùng (engbee-admin-data.js)
   Nạp vào các trang: learn-*.html, quiz-*.html, flashcard.html, dashboard.html, quiz.html
   để những từ & chủ đề do Admin thêm / sửa / xóa / bật / tắt trong trang quản trị
   được cập nhật tức thì trên tất cả trang người dùng.
   ========================================================= */

(function () {
  "use strict";

  /* ----- 1. Tên các kho trong LocalStorage ----- */
  var KEY_EDITED = "engbee_admin_edited_words";   // { "journey": { en, ipa, vi, ex, exvi } }
  var KEY_ADDED = "engbee_admin_added_words";     // { "food": [ {id, en, ipa, vi, ex, exvi} ] }
  var KEY_REMOVED = "engbee_admin_removed_words"; // ["từ1", "từ2"]
  var KEY_HIDDEN = "engbee_admin_hidden_topics";  // ["movie", "music"]
  var KEY_CUSTOM_TOPICS = "engbee_admin_custom_topics"; // [{ id, name, vi, emoji, ... }]
  var KEY_UPDATE = "engbee_admin_last_update";    // timestamp

  /* ----- 2. Danh sách 12 chủ đề chuẩn ----- */
  var DEFAULT_TOPICS = [
    { id: "travel", name: "Travel", vi: "Du lịch", emoji: "✈️", g1: "#4facfe", g2: "#00f2fe", desc: "Từ vựng về du lịch, phương tiện di chuyển và khám phá vùng đất mới." },
    { id: "food", name: "Food", vi: "Ẩm thực", emoji: "🍜", g1: "#f6d365", g2: "#fda085", desc: "Từ vựng về món ăn, đồ uống và nhà hàng hằng ngày." },
    { id: "work", name: "Work", vi: "Công việc", emoji: "💼", g1: "#5f72bd", g2: "#9b23ea", desc: "Từ vựng trong công việc, văn phòng và giao tiếp chuyên nghiệp." },
    { id: "school", name: "School", vi: "Trường học", emoji: "🎓", g1: "#7f7fd5", g2: "#86a8e7", desc: "Từ vựng về trường lớp, môn học và hoạt động học tập." },
    { id: "nature", name: "Nature", vi: "Thiên nhiên", emoji: "🌿", g1: "#56ab2f", g2: "#a8e063", desc: "Từ vựng về thiên nhiên, cây cối, động vật và môi trường." },
    { id: "sports", name: "Sports", vi: "Thể thao", emoji: "⚽", g1: "#f7971e", g2: "#ffd200", desc: "Từ vựng về thể thao và hoạt động rèn luyện sức khỏe." },
    { id: "health", name: "Health", vi: "Sức khỏe", emoji: "❤️", g1: "#f953c6", g2: "#b91d73", desc: "Từ vựng về sức khỏe, y tế, dinh dưỡng và cơ thể." },
    { id: "technology", name: "Technology", vi: "Công nghệ", emoji: "💻", g1: "#30cfd0", g2: "#330867", desc: "Từ vựng về công nghệ, máy tính, thiết bị điện tử." },
    { id: "music", name: "Music", vi: "Âm nhạc", emoji: "🎵", g1: "#ec4899", g2: "#8b5cf6", desc: "Từ vựng về âm nhạc, nhạc cụ và các thể loại nhạc." },
    { id: "movie", name: "Movie", vi: "Phim ảnh", emoji: "🎬", g1: "#f43f5e", g2: "#ef4444", desc: "Từ vựng về phim ảnh, rạp chiếu, diễn viên và điện ảnh." },
    { id: "weather", name: "Weather", vi: "Thời tiết", emoji: "⛅", g1: "#0ea5e9", g2: "#22d3ee", desc: "Từ vựng về thời tiết, hiện tượng tự nhiên và mùa trong năm." },
    { id: "shopping", name: "Shopping", vi: "Mua sắm", emoji: "🛍️", g1: "#f97316", g2: "#ef4444", desc: "Từ vựng về mua sắm, siêu thị, giá cả và thanh toán." }
  ];

  /* ----- 3. Hàm đọc / ghi kho dữ liệu an toàn ----- */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var data = JSON.parse(raw);
      return data === null || data === undefined ? fallback : data;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(KEY_UPDATE, Date.now().toString());
      notifyChange(key);
    } catch (e) {
      /* bộ nhớ đầy hoặc lỗi lưu */
    }
  }

  /* ----- 4. Chuẩn hoá từ tiếng Anh thành khoá duy nhất ----- */
  function wordKey(en) {
    return String(en || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  /* ----- 5. Thông báo thay đổi dữ liệu đến các tab & phần tử ----- */
  function notifyChange(changedKey) {
    try {
      var evt = new CustomEvent("engbee_data_changed", { detail: { key: changedKey } });
      window.dispatchEvent(evt);
    } catch (e) {
      // Bỏ qua nếu CustomEvent không hỗ trợ
    }
  }

  /* ----- 6. Kiểm tra chủ đề có đang bị Admin ẩn không ----- */
  function isTopicHidden(topicId) {
    var hidden = read(KEY_HIDDEN, []);
    return Array.isArray(hidden) && hidden.indexOf(topicId) !== -1;
  }

  function getHiddenTopics() {
    var hidden = read(KEY_HIDDEN, []);
    return Array.isArray(hidden) ? hidden : [];
  }

  /* ----- 7. Lấy danh sách từ gốc của chủ đề từ EngBeeData (nếu có) ----- */
  function getBaseWords(topicId) {
    if (typeof window !== "undefined" && window.EngBeeData && Array.isArray(window.EngBeeData.topics)) {
      for (var i = 0; i < window.EngBeeData.topics.length; i++) {
        if (window.EngBeeData.topics[i].id === topicId && Array.isArray(window.EngBeeData.topics[i].words)) {
          return window.EngBeeData.topics[i].words.slice();
        }
      }
    }
    return [];
  }

  /* ----- 8. Áp dụng thay đổi của Admin (Sửa, Xóa, Thêm) vào danh sách từ ----- */
  function apply(topicId, words) {
    var baseList = Array.isArray(words) ? words : getBaseWords(topicId);

    var edited = read(KEY_EDITED, {});
    var added = read(KEY_ADDED, {});
    var removed = read(KEY_REMOVED, []);
    var hidden = read(KEY_HIDDEN, []);

    // Danh sách từ bị Admin xóa (dạng key)
    var removedKeys = {};
    if (Array.isArray(removed)) {
      for (var r = 0; r < removed.length; r++) {
        removedKeys[wordKey(removed[r])] = true;
      }
    }

    // Danh sách chủ đề bị ẩn (dạng key)
    var hiddenMap = {};
    if (Array.isArray(hidden)) {
      for (var h = 0; h < hidden.length; h++) {
        hiddenMap[hidden[h]] = true;
      }
    }

    var result = [];

    // Trường hợp 1: Quiz tổng hợp (topicId = "all")
    if (topicId === "all") {
      // Nếu có EngBeeData: duyệt từng chủ đề chưa bị ẩn
      if (typeof window !== "undefined" && window.EngBeeData && Array.isArray(window.EngBeeData.topics)) {
        for (var ti = 0; ti < window.EngBeeData.topics.length; ti++) {
          var top = window.EngBeeData.topics[ti];
          if (hiddenMap[top.id]) continue; // Bỏ qua chủ đề bị ẩn
          var topWords = top.words || [];
          for (var wi = 0; wi < topWords.length; wi++) {
            var item = topWords[wi];
            var kAll = wordKey(item.en);
            if (removedKeys[kAll]) continue;
            if (edited[kAll]) {
              item = {
                en: edited[kAll].en || item.en,
                ipa: edited[kAll].ipa !== undefined ? edited[kAll].ipa : item.ipa,
                vi: edited[kAll].vi !== undefined ? edited[kAll].vi : item.vi,
                ex: edited[kAll].ex !== undefined ? edited[kAll].ex : item.ex,
                exvi: edited[kAll].exvi !== undefined ? edited[kAll].exvi : item.exvi
              };
            }
            result.push(item);
          }
        }
      } else if (Array.isArray(words)) {
        // Dự phòng nếu không có EngBeeData, duyệt qua mảng words truyền vào
        for (var j = 0; j < words.length; j++) {
          var bw = words[j];
          var kb = wordKey(bw.en);
          if (removedKeys[kb]) continue;
          if (edited[kb]) {
            bw = {
              en: edited[kb].en || bw.en,
              ipa: edited[kb].ipa !== undefined ? edited[kb].ipa : bw.ipa,
              vi: edited[kb].vi !== undefined ? edited[kb].vi : bw.vi,
              ex: edited[kb].ex !== undefined ? edited[kb].ex : bw.ex,
              exvi: edited[kb].exvi !== undefined ? edited[kb].exvi : bw.exvi
            };
          }
          result.push(bw);
        }
      }

      // Nối các từ do Admin thêm mới thuộc các chủ đề KHÔNG bị ẩn
      if (added && typeof added === "object") {
        var addedTopicIds = Object.keys(added);
        for (var at = 0; at < addedTopicIds.length; at++) {
          var tid = addedTopicIds[at];
          if (hiddenMap[tid]) continue;
          var aList = added[tid];
          if (!Array.isArray(aList)) continue;
          for (var am = 0; am < aList.length; am++) {
            if (!removedKeys[wordKey(aList[am].en)]) result.push(aList[am]);
          }
        }
      }

      return result;
    }

    // Trường hợp 2: Một chủ đề cụ thể (topicId = "travel", "food", ...)
    if (Array.isArray(baseList)) {
      for (var k = 0; k < baseList.length; k++) {
        var w = baseList[k];
        var key = wordKey(w.en);

        // (1) Từ bị Admin xóa -> bỏ khỏi danh sách
        if (removedKeys[key]) continue;

        // (2) Từ bị Admin sửa -> ghi đè đầy đủ thông tin Admin đã sửa
        if (edited[key]) {
          w = {
            en: edited[key].en || w.en,
            ipa: edited[key].ipa !== undefined ? edited[key].ipa : w.ipa,
            vi: edited[key].vi !== undefined ? edited[key].vi : w.vi,
            ex: edited[key].ex !== undefined ? edited[key].ex : w.ex,
            exvi: edited[key].exvi !== undefined ? edited[key].exvi : w.exvi
          };
        }

        result.push(w);
      }
    }

    // (3) Từ Admin thêm mới trong chủ đề này -> nối vào cuối
    if (added && Array.isArray(added[topicId])) {
      var customWords = added[topicId];
      for (var m = 0; m < customWords.length; m++) {
        var cw = customWords[m];
        if (!removedKeys[wordKey(cw.en)]) {
          result.push(cw);
        }
      }
    }

    return result;
  }

  /* ----- 9. Lấy số lượng từ thực tế của một chủ đề ----- */
  function getTopicWordCount(topicId, fallbackCount) {
    var words = apply(topicId);
    if (Array.isArray(words) && words.length > 0) return words.length;

    var base = typeof fallbackCount === "number" ? fallbackCount : 50;
    var added = read(KEY_ADDED, {});
    var addedCount = (added && Array.isArray(added[topicId])) ? added[topicId].length : 0;
    return Math.max(0, base + addedCount);
  }

  /* ----- 10. Lấy danh sách các chủ đề đang được kích hoạt (không bị ẩn) ----- */
  function getAllTopics() {
    var list = DEFAULT_TOPICS.slice();
    var custom = read(KEY_CUSTOM_TOPICS, []);
    if (Array.isArray(custom)) {
      var map = {};
      list.forEach(function (t) { map[t.id] = true; });
      custom.forEach(function (ct) {
        if (!map[ct.id]) {
          list.push(ct);
          map[ct.id] = true;
        }
      });
    }
    return list;
  }

  function getActiveTopics(baseTopics) {
    var list = Array.isArray(baseTopics) ? baseTopics : getAllTopics();
    var hidden = read(KEY_HIDDEN, []);
    var hiddenMap = {};
    for (var i = 0; i < hidden.length; i++) hiddenMap[hidden[i]] = true;

    return list.filter(function (t) { return !hiddenMap[t.id]; });
  }

  /* ----- 11. Tính tổng số từ trên toàn bộ chủ đề đang kích hoạt ----- */
  function getTotalActiveWordCount(baseTopics) {
    var activeTopics = getActiveTopics(baseTopics);
    var total = 0;
    for (var i = 0; i < activeTopics.length; i++) {
      total += getTopicWordCount(activeTopics[i].id, 50);
    }
    return total;
  }

  /* ----- 12. Lắng nghe thay đổi dữ liệu để các trang tự cập nhật ----- */
  function onChange(callback) {
    if (typeof callback !== "function") return;

    window.addEventListener("storage", function (e) {
      if (
        !e.key ||
        e.key.indexOf("engbee_admin_") === 0 ||
        e.key === KEY_UPDATE
      ) {
        callback(e);
      }
    });

    window.addEventListener("engbee_data_changed", function (e) {
      callback(e);
    });
  }

  /* ----- 13. Tự động đồng bộ trang Học (Learn) ----- */
  function initLearnPage(topicId, baseWords, updateFn) {
    function sync() {
      var words = apply(topicId, baseWords);

      // (1) Kiểm tra chủ đề có bị ẩn không
      var isHidden = isTopicHidden(topicId);
      var body = document.querySelector(".learn-body");
      var existingNotice = document.getElementById("topic-hidden-notice");

      if (isHidden) {
        if (!existingNotice) {
          var notice = document.createElement("div");
          notice.id = "topic-hidden-notice";
          notice.style.cssText = "background:#fff;border:2px dashed #f59e0b;border-radius:18px;padding:36px 24px;text-align:center;margin:32px auto;max-width:800px;box-shadow:0 8px 24px rgba(0,0,0,0.06);";
          notice.innerHTML = '<div style="font-size:2.8rem;margin-bottom:12px;">🔒</div>' +
            '<h2 style="font-size:1.5rem;font-weight:800;color:#1f2937;margin-bottom:8px;">Chủ đề này đang tạm tắt</h2>' +
            '<p style="color:#6b7280;margin-bottom:20px;font-size:1rem;">Quản trị viên đã tạm ẩn chủ đề này. Vui lòng chọn học chủ đề khác hoặc quay lại trang chủ.</p>' +
            '<div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">' +
              '<a href="index.html" class="ctl-btn" style="background:#f0a500;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;">← Về trang chủ</a>' +
              '<a href="learn.html" class="ctl-btn" style="background:#4facfe;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;">Học chủ đề khác</a>' +
            '</div>';
          if (body && body.parentNode) {
            body.style.display = "none";
            body.parentNode.insertBefore(notice, body);
          }
        }
      } else {
        if (existingNotice) existingNotice.remove();
        if (body) body.style.display = "";
      }

      // (2) Cập nhật tiêu đề & số từ
      var heroSub = document.querySelector(".learn-hero .eyebrow");
      var topicObj = DEFAULT_TOPICS.find(function(t) { return t.id === topicId; });
      var tName = topicObj ? topicObj.name : topicId;
      if (heroSub) {
        heroSub.textContent = "Chủ đề: " + tName + " (" + words.length + " từ)";
      }

      // (3) Cập nhật danh sách topic pills
      var pillsWrap = document.querySelector(".topic-pills");
      if (pillsWrap) {
        var activeTopics = getActiveTopics();
        pillsWrap.innerHTML = activeTopics.map(function(t) {
          var count = getTopicWordCount(t.id, 50);
          var isCurrent = t.id === topicId;
          var href = t.id === "travel" ? "learn-travel.html" : "learn-" + t.id + ".html";
          return '<a class="topic-pill' + (isCurrent ? ' active' : '') + '" href="' + href + '" aria-current="' + isCurrent + '">' +
            '<span class="pill-badge" style="background:linear-gradient(135deg,' + t.g1 + ',' + t.g2 + ')">' + t.name.slice(0, 1).toUpperCase() + '</span>' +
            '<span class="pill-text"><strong>' + t.name + '</strong><small>' + t.vi + ' - ' + count + ' từ</small></span>' +
            '</a>';
        }).join("");
      }

      if (typeof updateFn === "function") {
        updateFn(words);
      }
    }

    sync();
    onChange(sync);
  }

  /* ----- 14. Tự động đồng bộ trang Quiz ----- */
  function initQuizPage(topicId, baseWords, updateFn) {
    function sync() {
      var words = apply(topicId, baseWords);

      if (topicId !== "all" && isTopicHidden(topicId)) {
        var card = document.querySelector(".quiz-card");
        var existingNotice = document.getElementById("quiz-hidden-notice");
        if (!existingNotice) {
          var notice = document.createElement("div");
          notice.id = "quiz-hidden-notice";
          notice.style.cssText = "background:#fff;border:2px dashed #f59e0b;border-radius:18px;padding:36px 24px;text-align:center;margin:32px auto;max-width:800px;box-shadow:0 8px 24px rgba(0,0,0,0.06);";
          notice.innerHTML = '<div style="font-size:2.8rem;margin-bottom:12px;">🔒</div>' +
            '<h2 style="font-size:1.5rem;font-weight:800;color:#1f2937;margin-bottom:8px;">Quiz chủ đề này đang tạm tắt</h2>' +
            '<p style="color:#6b7280;margin-bottom:20px;font-size:1rem;">Quản trị viên đã tạm ẩn chủ đề này. Bạn có thể chọn làm Quiz các chủ đề khác.</p>' +
            '<div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">' +
              '<a href="quiz.html" class="btn btn-start" style="padding:12px 24px;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;">🎯 Danh sách Quiz</a>' +
              '<a href="index.html" class="btn btn-plain" style="padding:12px 24px;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;">Về trang chủ</a>' +
            '</div>';
          if (card && card.parentNode) {
            card.style.display = "none";
            card.parentNode.insertBefore(notice, card);
          }
        }
      } else {
        var existingNotice = document.getElementById("quiz-hidden-notice");
        if (existingNotice) existingNotice.remove();
        var card = document.querySelector(".quiz-card");
        if (card) card.style.display = "";
      }

      // Đồng bộ topic pills trong quiz
      var pillsWrap = document.querySelector(".topic-pills");
      if (pillsWrap) {
        var activeTopics = getActiveTopics();
        var totalActive = getTotalActiveWordCount();
        var isAll = topicId === "all";
        var html = '<a class="topic-pill' + (isAll ? ' active' : '') + '" href="quiz-all.html" aria-current="' + isAll + '">' +
          '<span class="pill-badge" style="background:linear-gradient(135deg,#f0a500,#ff7e00)">⚡</span>' +
          '<span class="pill-text"><strong>Quiz tổng hợp</strong><small>' + activeTopics.length + ' chủ đề - ' + totalActive + ' từ</small></span>' +
          '</a>';

        html += activeTopics.map(function(t) {
          var count = getTopicWordCount(t.id, 50);
          var isCurrent = t.id === topicId;
          return '<a class="topic-pill' + (isCurrent ? ' active' : '') + '" href="quiz-' + t.id + '.html" aria-current="' + isCurrent + '">' +
            '<span class="pill-badge" style="background:linear-gradient(135deg,' + t.g1 + ',' + t.g2 + ')">' + t.name.slice(0, 1).toUpperCase() + '</span>' +
            '<span class="pill-text"><strong>' + t.name + '</strong><small>' + t.vi + ' - ' + count + ' từ</small></span>' +
            '</a>';
        }).join("");

        pillsWrap.innerHTML = html;
      }

      if (typeof updateFn === "function") {
        updateFn(words);
      }
    }

    sync();
    onChange(sync);
  }

  /* ----- 15. Công khai module EngBeeAdminData ra window ----- */
  window.EngBeeAdminData = {
    KEY_EDITED: KEY_EDITED,
    KEY_ADDED: KEY_ADDED,
    KEY_REMOVED: KEY_REMOVED,
    KEY_HIDDEN: KEY_HIDDEN,
    KEY_UPDATE: KEY_UPDATE,
    DEFAULT_TOPICS: DEFAULT_TOPICS,
    read: read,
    write: write,
    wordKey: wordKey,
    isTopicHidden: isTopicHidden,
    getHiddenTopics: getHiddenTopics,
    getActiveTopics: getActiveTopics,
    apply: apply,
    getTopicWordCount: getTopicWordCount,
    getTotalActiveWordCount: getTotalActiveWordCount,
    notifyChange: notifyChange,
    onChange: onChange,
    initLearnPage: initLearnPage,
    initQuizPage: initQuizPage,
    syncFromServer: syncFromServer
  };

  /* ----- 16. Tự động lấy dữ liệu quản trị mới nhất từ máy chủ ----- */
  function syncFromServer() {
    if (typeof window === "undefined" || !window.fetch) return;
    fetch("/api/admin/data")
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return;
        var changed = false;
        if (data.editedWords && JSON.stringify(data.editedWords) !== localStorage.getItem(KEY_EDITED)) {
          localStorage.setItem(KEY_EDITED, JSON.stringify(data.editedWords));
          changed = true;
        }
        if (data.addedWords && JSON.stringify(data.addedWords) !== localStorage.getItem(KEY_ADDED)) {
          localStorage.setItem(KEY_ADDED, JSON.stringify(data.addedWords));
          changed = true;
        }
        if (data.removedWords && JSON.stringify(data.removedWords) !== localStorage.getItem(KEY_REMOVED)) {
          localStorage.setItem(KEY_REMOVED, JSON.stringify(data.removedWords));
          changed = true;
        }
        if (data.hiddenTopics && JSON.stringify(data.hiddenTopics) !== localStorage.getItem(KEY_HIDDEN)) {
          localStorage.setItem(KEY_HIDDEN, JSON.stringify(data.hiddenTopics));
          changed = true;
        }
        if (data.customTopics && JSON.stringify(data.customTopics) !== localStorage.getItem(KEY_CUSTOM_TOPICS)) {
          localStorage.setItem(KEY_CUSTOM_TOPICS, JSON.stringify(data.customTopics));
          changed = true;
        }
        if (changed) {
          notifyChange("sync_server");
        }
      })
      .catch(function () {});
  }

  syncFromServer();
  window.addEventListener("focus", syncFromServer);
})();
