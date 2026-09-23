// EngBee - admin.js (demo đăng nhập, không có backend)
(function () {
  "use strict";

  var ADMIN_KEY = "engbee_admin_session";

  // Tài khoản demo (chỉ dùng cho front-end, không bảo mật thật)
  var ADMIN_ACCOUNT = {
    username: "admin",
    password: "admin123"
  };

  var loginView = document.getElementById("login-view");
  var adminView = document.getElementById("admin-view");
  var loginForm = document.getElementById("login-form");
  var loginError = document.getElementById("login-error");
  var logoutBtn = document.getElementById("logout-btn");

  function isLoggedIn() {
    return localStorage.getItem(ADMIN_KEY) === "1";
  }

  function showLogin() {
    loginView.hidden = false;
    adminView.hidden = true;
  }

  function showAdmin() {
    loginView.hidden = true;
    adminView.hidden = false;
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var username = document.getElementById("username").value.trim();
    var password = document.getElementById("password").value;

    if (
      username === ADMIN_ACCOUNT.username &&
      password === ADMIN_ACCOUNT.password
    ) {
      localStorage.setItem(ADMIN_KEY, "1");
      loginError.hidden = true;
      showAdmin();
    } else {
      loginError.hidden = false;
    }
  });

  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem(ADMIN_KEY);
    loginForm.reset();
    loginError.hidden = true;
    showLogin();
  });

  if (isLoggedIn()) {
    showAdmin();
  } else {
    showLogin();
  }
})();