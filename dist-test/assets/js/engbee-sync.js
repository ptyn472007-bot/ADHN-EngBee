// EngBee - engbee-sync.js: Quản lý đồng bộ dữ liệu học tập và kết quả qua máy chủ API
(function () {
  "use strict";

  var USER_KEY = "engbee_user";
  var CLIENT_ID_KEY = "engbee_client_id";
  var USERS_KEY = "engbee_users";
  var QUIZ_KEY = "eb_quiz_history";

  function getClientId() {
    try {
      var id = localStorage.getItem(CLIENT_ID_KEY);
      if (!id) {
        id = "Học viên #" + Math.floor(1000 + Math.random() * 9000);
        localStorage.setItem(CLIENT_ID_KEY, id);
      }
      return id;
    } catch (e) {
      return "Học viên #" + Math.floor(1000 + Math.random() * 9000);
    }
  }

  function getRegisteredUserName() {
    try {
      var p = JSON.parse(localStorage.getItem(USER_KEY) || "null");
      if (p && typeof p.name === "string" && p.name.trim() && p.name.trim().toLowerCase() !== "guest") {
        return p.name.trim();
      }
    } catch (e) {}
    return null;
  }

  function getCurrentUserName() {
    var reg = getRegisteredUserName();
    return reg || "guest";
  }

  function trackUser(extra) {
    if (window.EngBeeTrackUser) {
      window.EngBeeTrackUser(extra);
    }
  }

  function recordQuiz(data) {
    if (window.EngBeeRecordQuiz) {
      return window.EngBeeRecordQuiz(data);
    }
    return null;
  }

  function fetchStats(callback) {
    if (!window.fetch) return;
    fetch("/api/stats")
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return;
        if (typeof callback === "function") {
          callback(data);
        }
      })
      .catch(function () {});
  }

  window.EngBeeSync = {
    getCurrentUserName: getCurrentUserName,
    getClientId: getClientId,
    trackUser: trackUser,
    recordQuiz: recordQuiz,
    fetchStats: fetchStats
  };
})();
