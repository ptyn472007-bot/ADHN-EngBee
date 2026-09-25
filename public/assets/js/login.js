// EngBee - login.js (nhập tên hiển thị, không cần mật khẩu)
(function () {
  "use strict";

  var NAME_KEY = "engbee_user";

  var loginForm = document.getElementById("login-form");
  var loginError = document.getElementById("login-error");
  var nameInput = document.getElementById("display-name");

  // Điền sẵn tên đã lưu (nếu có) khi mở lại trang
  try {
    var saved = JSON.parse(localStorage.getItem(NAME_KEY) || "null");
    if (saved && typeof saved.name === "string") {
      nameInput.value = saved.name;
    }
  } catch (e) {
    /* bỏ qua dữ liệu lỗi */
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var name = nameInput.value.trim();

    if (!name) {
      loginError.hidden = false;
      nameInput.focus();
      return;
    }

    localStorage.setItem(NAME_KEY, JSON.stringify({ name: name }));
    loginError.hidden = true;
    window.location.href = "index.html";
  });

  nameInput.addEventListener("input", function () {
    loginError.hidden = true;
  });
})();