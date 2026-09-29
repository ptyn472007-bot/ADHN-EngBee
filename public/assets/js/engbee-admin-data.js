/* =========================================================
   EngBee - Lớp dữ liệu chung cho Admin
   Nạp thêm vào các trang learn-*.html, quiz-*.html, flashcard.html
   để những từ Admin thêm / sửa / xóa trong trang quản trị
   cũng được dùng ở trang học và trang kiểm tra.

   Cách hoạt động:
   - Dữ liệu gốc của web nằm trong code (mảng WORDS / EngBeeData).
   - Admin không sửa trực tiếp code, mà lưu phần thay đổi vào LocalStorage.
   - File này đọc các phần thay đổi đó rồi áp dụng vào danh sách từ.
   ========================================================= */

(function () {
  "use strict";

  /* ----- 1. Tên các kho trong LocalStorage ----- */
  var KEY_EDITED = "engbee_admin_edited_words";   // { "từ tiếng anh": { ipa, vi, ex, exvi } }
  var KEY_ADDED = "engbee_admin_added_words";     // { "food": [ {id, en, ipa, vi, ex, exvi} ] }
  var KEY_REMOVED = "engbee_admin_removed_words"; // ["từ1", "từ2"]
  var KEY_HIDDEN = "engbee_admin_hidden_topics";  // ["movie", "music"]

  /* ----- 2. Hàm đọc kho, JSON hỏng thì trả giá trị mặc định ----- */
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
    } catch (e) {
      /* bộ nhớ đầy thì bỏ qua */
    }
  }

  /* ----- 3. Chuyển từ thành khoá duy nhất: chữ thường, bỏ khoảng trắng ----- */
  function wordKey(en) {
    return String(en || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  /* ----- 4. Áp dụng thay đổi của Admin vào danh sách từ ----- */
  function apply(topicId, words) {
    if (!Array.isArray(words)) return words;

    var edited = read(KEY_EDITED, {});
    var added = read(KEY_ADDED, {});
    var removed = read(KEY_REMOVED, []);

    // Danh sách từ bị Admin xóa (dạng khoá)
    var removedKeys = {};
    if (Array.isArray(removed)) {
      for (var i = 0; i < removed.length; i++) removedKeys[wordKey(removed[i])] = true;
    }

    var result = [];

    for (var j = 0; j < words.length; j++) {
      var w = words[j];
      var k = wordKey(w.en);

      // (1) Từ bị Admin xóa -> bỏ khỏi danh sách
      if (removedKeys[k]) continue;

      // (2) Từ bị Admin sửa -> ghi đè phần Admin sửa
      if (edited[k]) {
        w = {
          en: w.en,
          ipa: edited[k].ipa !== undefined ? edited[k].ipa : w.ipa,
          vi: edited[k].vi !== undefined ? edited[k].vi : w.vi,
          ex: edited[k].ex !== undefined ? edited[k].ex : w.ex,
          exvi: edited[k].exvi !== undefined ? edited[k].exvi : w.exvi
        };
      }

      result.push(w);
    }

    // (3) Từ Admin thêm mới -> nối vào cuối danh sách
    if (added && typeof added === "object") {
      // topicId = "all" là trang Quiz tổng hợp: lấy từ mọi chủ đề
      var topicIds = topicId === "all" ? Object.keys(added) : [topicId];

      for (var t = 0; t < topicIds.length; t++) {
        var list = added[topicIds[t]];
        if (!Array.isArray(list)) continue;
        for (var m = 0; m < list.length; m++) {
          if (!removedKeys[wordKey(list[m].en)]) result.push(list[m]);
        }
      }
    }

    return result;
  }

  /* ----- 5. Chủ đề nào đang bị Admin tắt ----- */
  function isTopicHidden(topicId) {
    var hidden = read(KEY_HIDDEN, []);
    return Array.isArray(hidden) && hidden.indexOf(topicId) !== -1;
  }

  /* ----- 6. Công khai ra window cho các trang dùng ----- */
  window.EngBeeAdminData = {
    KEY_EDITED: KEY_EDITED,
    KEY_ADDED: KEY_ADDED,
    KEY_REMOVED: KEY_REMOVED,
    KEY_HIDDEN: KEY_HIDDEN,
    wordKey: wordKey,
    apply: apply,
    isTopicHidden: isTopicHidden
  };
})();
