// EngBee - user-registry.js: lưu danh sách mọi người đã học/đã đăng nhập
(function () {
  "use strict";

  var KEY = "engbee_users";

  function read() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function write(a) {
    try {
      localStorage.setItem(KEY, JSON.stringify(a));
    } catch (e) {
      /* dung lượng */
    }
  }

  // Ghi nhận một người học (gọi khi đăng nhập hoặc có hoạt động học tập)
  function track() {
    try {
      var p = JSON.parse(localStorage.getItem("engbee_user") || "null");
      if (!(p && typeof p.name === "string" && p.name.trim())) return;
      var name = p.name.trim();
      var now = Date.now();
      var a = read();
      var found = false;
      for (var i = 0; i < a.length; i++) {
        if (a[i].name === name) {
          a[i].lastActive = now;
          found = true;
          break;
        }
      }
      if (!found) a.push({ name: name, firstSeen: now, lastActive: now });
      write(a);
    } catch (e) {
      /* bỏ qua */
    }
  }

  window.EngBeeTrackUser = track;
})();