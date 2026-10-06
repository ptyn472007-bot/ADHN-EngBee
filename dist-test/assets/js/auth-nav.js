// EngBee - auth-nav.js: đổi link Đăng nhập thành Đăng xuất khi đã đăng nhập
(function () {
  "use strict";

  var USER_KEY = "engbee_user";

  function isLogged() {
    try {
      var p = JSON.parse(localStorage.getItem(USER_KEY) || "null");
      return !!(p && typeof p.name === "string" && p.name.trim());
    } catch (e) {
      return false;
    }
  }

  function bind() {
    var link = document.querySelector('a[href="login.html"]');
    if (!link) return;
    if (isLogged()) {
      link.textContent = "Đăng xuất";
      link.href = "#";
      link.addEventListener("click", function (e) {
        e.preventDefault();
        localStorage.removeItem(USER_KEY);
        window.location.reload();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();