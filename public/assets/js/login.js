// EngBee - login.js (demo đăng nhập người dùng, không có backend)
(function () {
  "use strict";

  var USER_KEY = "engbee_user_session";

  // Tài khoản demo (chỉ dùng cho front-end, không bảo mật thật)
  var USER_ACCOUNT = {
    username: "user",
    password: "user123"
  };

  var loginForm = document.getElementById("login-form");
  var loginError = document.getElementById("login-error");

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var username = document.getElementById("username").value.trim();
    var password = document.getElementById("password").value;

    if (
      username === USER_ACCOUNT.username &&
      password === USER_ACCOUNT.password
    ) {
      localStorage.setItem(USER_KEY, "1");
      loginError.hidden = true;
      window.location.href = "dashboard.html";
    } else {
      loginError.hidden = false;
    }
  });
})();