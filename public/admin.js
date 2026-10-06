/* =========================================================
   EngBee - Trang quản trị (admin.js)
   Quản lý: Tổng quan, Từ vựng, Chủ đề, Người học, Kết quả Quiz, Cài đặt
   Toàn bộ thay đổi được lưu bằng LocalStorage.
   ========================================================= */

/* ================= PHẦN 1: CẤU HÌNH ================= */

const ADMIN_SESSION_KEY = "engbee_admin_session";     // phiên đăng nhập Admin
const KEY_EDITED = "engbee_admin_edited_words";       // từ đã sửa
const KEY_ADDED = "engbee_admin_added_words";         // từ đã thêm
const KEY_REMOVED = "engbee_admin_removed_words";     // từ đã xóa
const KEY_HIDDEN = "engbee_admin_hidden_topics";      // chủ đề đang tắt
const KEY_CUSTOM_TOPICS = "engbee_admin_custom_topics"; // chủ đề mới do admin tạo
const KEY_USER = "engbee_user";                      // người dùng hiện tại
const KEY_QUIZ_HISTORY = "eb_quiz_history";           // lịch sử quiz
const PREFIX_LEARNED = "engbee_learned_";             // tiến độ học
const PREFIX_BEST = "engbee_quiz_best_";              // điểm cao nhất
const USERS_REGISTRY_KEY = "engbee_users";            // danh sách mọi người đã học
const SESSION_TTL = 8 * 60 * 60 * 1000;              // 8 giờ

// Chỉ tài khoản này được vào trang quản trị
const ADMIN_ACCOUNT = { username: "admin", password: "admin123", name: "Quản trị viên" };

/* ================= PHẦN 2: TRẠNG THÁI ================= */

let currentAdmin = null;   // admin đang đăng nhập
let currentView = "dashboard";
let editingKey = "";       // khoá từ đang sửa (chuỗi rỗng = đang thêm mới)
let pendingAction = null;  // hành động đang chờ xác nhận trong modal
let serverStats = null;    // dữ liệu thống kê đồng bộ từ máy chủ (người học, quiz, điểm số)

/* ================= PHẦN 3: LẤY PHẦN TỬ DOM ================= */

const $ = function (id) { return document.getElementById(id); };

const el = {
  // đăng nhập
  loginScreen: $("loginScreen"), loginForm: $("loginForm"),
  loginError: $("loginError"), loginName: $("loginUsername"), loginPass: $("loginPassword"),
  errorLoginName: $("errorLoginUsername"), errorLoginPass: $("errorLoginPassword"),
  appShell: $("appShell"), btnLogout: $("btnLogout"),
  adminName: $("adminName"), adminAvatar: $("adminAvatar"),
  // điều hướng
  sidebar: $("sidebar"), sidebarOverlay: $("sidebarOverlay"), menuToggle: $("menuToggle"),
  viewTitle: $("viewTitle"), viewSubtitle: $("viewSubtitle"),
  // tổng quan
  statTopics: $("statTopics"), statWords: $("statWords"), statChanges: $("statChanges"),
  statUsers: $("statUsers"), statAttempts: $("statAttempts"), statAvg: $("statAvg"),
  adminChangeList: $("adminChangeList"), recentUserList: $("recentUserList"),
  // từ vựng
  btnAddWord: $("btnAddWord"), btnRestoreWords: $("btnRestoreWords"),
  wordTopicFilter: $("wordTopicFilter"), wordSearch: $("wordSearch"),
  wordCountInfo: $("wordCountInfo"), wordBody: $("wordBody"), wordEmpty: $("wordEmpty"), wordPagination: $("wordPagination"),
  // chủ đề
  btnAddTopic: $("btnAddTopic"), topicGrid: $("topicGrid"),
  // người học
  userBody: $("userBody"), userEmpty: $("userEmpty"),
  // kết quả
  resultBody: $("resultBody"), resultEmpty: $("resultEmpty"), btnClearResults: $("btnClearResults"),
  // cài đặt
  btnResetWords: $("btnResetWords"), btnExport: $("btnExport"), btnImport: $("btnImport"),
  importFile: $("importFile"), btnResetAll: $("btnResetAll"),
  infoSession: $("infoSession"),
  // modal từ
  wordModal: $("wordModal"), wordModalTitle: $("wordModalTitle"), wordForm: $("wordForm"),
  inputKey: $("inputKey"), inputEn: $("inputEn"), inputVi: $("inputVi"), inputIpa: $("inputIpa"),
  inputEx: $("inputEx"), inputExVi: $("inputExVi"), inputTopic: $("inputTopic"),
  inputPronHint: $("inputPronHint"),
  inputEx0En: $("inputEx0En"), inputEx0Vi: $("inputEx0Vi"),
  inputEx1En: $("inputEx1En"), inputEx1Vi: $("inputEx1Vi"),
  inputEx2En: $("inputEx2En"), inputEx2Vi: $("inputEx2Vi"),
  inputEx3En: $("inputEx3En"), inputEx3Vi: $("inputEx3Vi"),
  inputEx4En: $("inputEx4En"), inputEx4Vi: $("inputEx4Vi"),
  errorEn: $("errorEn"), errorVi: $("errorVi"), errorIpa: $("errorIpa"),
  errorEx: $("errorEx"), errorExVi: $("errorExVi"), errorTopicField: $("errorTopicField"),
  // modal chủ đề
  topicModal: $("topicModal"), topicModalTitle: $("topicModalTitle"), topicForm: $("topicForm"),
  inputTopicMode: $("inputTopicMode"), inputTopicOriginalId: $("inputTopicOriginalId"),
  inputTopicName: $("inputTopicName"), inputTopicVi: $("inputTopicVi"),
  inputTopicId: $("inputTopicId"), inputTopicEmoji: $("inputTopicEmoji"),
  inputTopicG1: $("inputTopicG1"), inputTopicG2: $("inputTopicG2"),
  inputTopicG1Picker: $("inputTopicG1Picker"), inputTopicG2Picker: $("inputTopicG2Picker"),
  inputTopicDesc: $("inputTopicDesc"),
  errorTopicName: $("errorTopicName"), errorTopicVi: $("errorTopicVi"),
  errorTopicId: $("errorTopicId"), errorTopicEmoji: $("errorTopicEmoji"), errorTopicDesc: $("errorTopicDesc"),
  // modal xác nhận
  confirmModal: $("confirmModal"), confirmTitle: $("confirmTitle"),
  confirmText: $("confirmText"), confirmNote: $("confirmNote"), btnConfirmOk: $("btnConfirmOk"),
  // toast
  toastWrap: $("toastWrap")
};

const VIEW_ORDER = ["dashboard", "words", "topics", "users", "results", "settings"];

const VIEW_INFO = {
  dashboard: ["Tổng quan", "Nhìn toàn cảnh hoạt động của website EngBee"],
  words: ["Quản lý từ vựng", "Thêm, sửa, xóa từ vựng của các chủ đề"],
  topics: ["Quản lý chủ đề", "Thêm, sửa chủ đề do Admin tạo mới"],
  users: ["Người học", "Xem và quản lý tiến độ của người học"],
  results: ["Kết quả Quiz", "Lịch sử làm bài của toàn bộ người học"],
  settings: ["Cài đặt & bảo trì", "Khôi phục dữ liệu hoặc xóa toàn bộ dữ liệu trên trình duyệt này"]
};

/* ================= PHẦN 4: HÀM TIỆN ÍCH ================= */

// Đọc một khóa trong LocalStorage, JSON hỏng thì trả giá trị mặc định
function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    return data === null || data === undefined ? fallback : data;
  } catch (e) {
    return fallback;
  }
}

// Ghi một khóa vào LocalStorage và đồng bộ lên server
function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem("engbee_admin_last_update", Date.now().toString());
    if (window.EngBeeAdminData && typeof window.EngBeeAdminData.notifyChange === "function") {
      window.EngBeeAdminData.notifyChange(key);
    } else {
      window.dispatchEvent(new CustomEvent("engbee_data_changed", { detail: { key: key } }));
    }
    pushAdminDataToServer();
  } catch (e) {
    showToast("Không lưu được: bộ nhớ trình duyệt đã đầy.", "error");
  }
}

// Xóa một khóa khỏi LocalStorage và đồng bộ lên server
function removeStore(key) {
  localStorage.removeItem(key);
  localStorage.setItem("engbee_admin_last_update", Date.now().toString());
  if (window.EngBeeAdminData && typeof window.EngBeeAdminData.notifyChange === "function") {
    window.EngBeeAdminData.notifyChange(key);
  } else {
    window.dispatchEvent(new CustomEvent("engbee_data_changed", { detail: { key: key } }));
  }
  pushAdminDataToServer();
}

// Đẩy dữ liệu chỉnh sửa từ vựng và chủ đề của Admin lên máy chủ
function pushAdminDataToServer() {
  if (!window.fetch) return;
  fetch("/api/admin/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      editedWords: getEdited(),
      addedWords: getAdded(),
      removedWords: getRemoved(),
      hiddenTopics: getHiddenTopics(),
      customTopics: getCustomTopics()
    })
  }).catch(function () {});
}

// Đồng bộ toàn bộ thống kê (người học, lượt làm quiz, điểm số) từ máy chủ về Admin
async function syncServerStats() {
  if (!window.fetch) return;
  try {
    const res = await fetch("/api/stats");
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;
    serverStats = data;

    // Lưu cache để dùng cả khi offline
    if (Array.isArray(data.users)) {
      try { localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(data.users)); } catch (e) {}
    }
    if (Array.isArray(data.quizHistory)) {
      try { localStorage.setItem(KEY_QUIZ_HISTORY, JSON.stringify(data.quizHistory)); } catch (e) {}
    }
    if (data.admin) {
      if (data.admin.editedWords) try { localStorage.setItem(KEY_EDITED, JSON.stringify(data.admin.editedWords)); } catch (e) {}
      if (data.admin.addedWords) try { localStorage.setItem(KEY_ADDED, JSON.stringify(data.admin.addedWords)); } catch (e) {}
      if (data.admin.removedWords) try { localStorage.setItem(KEY_REMOVED, JSON.stringify(data.admin.removedWords)); } catch (e) {}
      if (data.admin.hiddenTopics) try { localStorage.setItem(KEY_HIDDEN, JSON.stringify(data.admin.hiddenTopics)); } catch (e) {}
      if (data.admin.customTopics) try { localStorage.setItem(KEY_CUSTOM_TOPICS, JSON.stringify(data.admin.customTopics)); } catch (e) {}
    }

    if (currentAdmin) {
      renderDashboard();
      renderTopics();
      renderTopicSelects();
      renderUsers();
      renderResults();
    }
  } catch (e) {}
}

// Chuyển từ thành khóa duy nhất: chữ thường, bỏ khoảng trắng thừa
function wordKey(en) { return String(en || "").trim().toLowerCase().replace(/\s+/g, " "); }

// Tạo id duy nhất
function makeId() { return "w_" + Date.now() + "_" + Math.floor(Math.random() * 1000); }

// Thoát ký tự HTML
function esc(text) {
  return String(text === null || text === undefined ? "" : text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Định dạng số có dấu phân cách nghìn
function fmt(n) { return new Intl.NumberFormat("vi-VN").format(n); }

// Định dạng thời gian
function fmtTime(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("vi-VN");
}

// Thông báo nổi
function showToast(message, type) {
  const t = document.createElement("div");
  t.className = "toast" + (type === "error" ? " is-error" : type === "info" ? " is-info" : "");
  const icon = type === "error" ? "⚠️" : type === "info" ? "ℹ️" : "✅";
  t.innerHTML = "<span>" + icon + "</span><span>" + esc(message) + "</span>";
  el.toastWrap.appendChild(t);
  setTimeout(function () {
    t.classList.add("is-hide");
    setTimeout(function () { t.remove(); }, 250);
  }, 2800);
}

/* ================= PHẦN 5: BẢO VỆ TRANG ADMIN ================= */

function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || "null");
    if (!s || s.username !== ADMIN_ACCOUNT.username) return null;
    if (Date.now() - s.loginAt > SESSION_TTL) { removeStore(ADMIN_SESSION_KEY); return null; }
    return s;
  } catch (e) { return null; }
}

function saveSession() {
  const s = { username: ADMIN_ACCOUNT.username, name: ADMIN_ACCOUNT.name, loginAt: Date.now() };
  writeStore(ADMIN_SESSION_KEY, s);
  return s;
}

function showLogin() {
  currentAdmin = null;
  el.appShell.hidden = true;
  el.loginScreen.hidden = false;
  el.loginPass.value = "";
  el.loginError.hidden = true;
  document.body.style.overflow = "";
  setTimeout(function () { el.loginName.focus(); }, 50);
}

function showAdminArea(session) {
  currentAdmin = session;
  el.loginScreen.hidden = true;
  el.appShell.hidden = false;
  el.adminName.textContent = session.name;
  el.adminAvatar.textContent = session.name.slice(0, 1).toUpperCase();
}

function enterAdmin(session) {
  showAdminArea(session);
  renderTopicSelects();
  renderAll();
  updateActiveNav("dashboard");
  window.scrollTo(0, 0);

  // Tự động đồng bộ số liệu từ Server ngay khi vào Admin
  syncServerStats();
  if (!window._adminSyncTimer) {
    window._adminSyncTimer = setInterval(syncServerStats, 3000);
    window.addEventListener("focus", syncServerStats);
  }
}

// Chặn mọi thao tác nếu phiên không còn hợp lệ
function requireAdmin() {
  if (getSession() === null) { showLogin(); showToast("Vui lòng đăng nhập lại.", "error"); return false; }
  return true;
}

function handleLogin(event) {
  event.preventDefault();
  const name = el.loginName.value.trim();
  const pass = el.loginPass.value;

  el.loginError.hidden = true;
  clearFieldError(el.loginName, el.errorLoginName);
  clearFieldError(el.loginPass, el.errorLoginPass);

  if (name === "") { showFieldError(el.loginName, el.errorLoginName, "Vui lòng nhập tên đăng nhập."); return; }
  if (pass === "") { showFieldError(el.loginPass, el.errorLoginPass, "Vui lòng nhập mật khẩu."); return; }

  if (name !== ADMIN_ACCOUNT.username || pass !== ADMIN_ACCOUNT.password) {
    el.loginError.textContent = "Sai tên đăng nhập hoặc mật khẩu.";
    el.loginError.hidden = false;
    el.loginPass.classList.add("is-error");
    el.loginPass.select();
    return;
  }

  const session = saveSession();
  enterAdmin(session);
  showToast("Chào mừng " + session.name + "!", "info");
}

function handleLogout() {
  if (!confirm("Bạn có chắc muốn đăng xuất khỏi trang quản trị?")) return;
  removeStore(ADMIN_SESSION_KEY);
  closeAllModals();
  showLogin();
  showToast("Đã đăng xuất.", "info");
}

/* ================= PHẦN 6: DỮ LIỆU TỪ VỰNG ================= */

// Lấy danh sách chủ đề do Admin tự thêm
function getCustomTopics() {
  const t = readStore(KEY_CUSTOM_TOPICS, []);
  return Array.isArray(t) ? t : [];
}

// Lấy toàn bộ chủ đề (gốc data.js + do Admin tạo thêm)
function allTopics() {
  const base = (window.EngBeeData && Array.isArray(EngBeeData.topics)) ? EngBeeData.topics.slice() : [];
  const custom = getCustomTopics();
  const map = {};
  base.forEach(function (t) { map[t.id] = t; });
  custom.forEach(function (t) {
    if (!map[t.id]) {
      base.push(t);
      map[t.id] = t;
    }
  });
  return base;
}

// Lấy danh sách từ gốc của một chủ đề
function baseWords(topicId) {
  const topic = allTopics().find(function (t) { return t.id === topicId; });
  return topic && Array.isArray(topic.words) ? topic.words.slice() : [];
}

// Lấy các bản ghi Admin đã lưu
function getEdited() { return readStore(KEY_EDITED, {}); }
function getAdded() { return readStore(KEY_ADDED, {}); }
function getRemoved() { return readStore(KEY_REMOVED, []); }
function getHiddenTopics() { return readStore(KEY_HIDDEN, []); }

// Ghép từ gốc + từ sửa + từ thêm, bỏ từ đã xóa -> danh sách từ "đang dùng"
function effectiveWords(topicId) {
  const edited = getEdited();
  const removed = getRemoved().map(wordKey);
  const list = [];

  baseWords(topicId).forEach(function (w) {
    if (removed.indexOf(wordKey(w.en)) !== -1) return;
    const e = edited[wordKey(w.en)];
    if (e) {
      list.push({
        en: w.en, vi: e.vi !== undefined ? e.vi : w.vi, ipa: e.ipa !== undefined ? e.ipa : w.ipa,
        ex: e.ex !== undefined ? e.ex : w.ex, exvi: e.exvi !== undefined ? e.exvi : w.exvi,
        status: "edited"
      });
    } else {
      list.push({ en: w.en, vi: w.vi, ipa: w.ipa, ex: w.ex, exvi: w.exvi, status: "base" });
    }
  });

  const added = getAdded()[topicId];
  if (Array.isArray(added)) {
    added.forEach(function (w) {
      if (removed.indexOf(wordKey(w.en)) !== -1) return;
      list.push({ en: w.en, vi: w.vi, ipa: w.ipa, ex: w.ex, exvi: w.exvi, status: "added" });
    });
  }

  return list;
}

// Tổng số từ đang dùng trên toàn site
function totalWords() {
  return allTopics().reduce(function (sum, t) { return sum + effectiveWords(t.id).length; }, 0);
}

// Từ chỉ tồn tại trong dữ liệu Admin (không có ở gốc)
function isCustomWord(en) {
  const key = wordKey(en);
  const base = allTopics().some(function (t) {
    return baseWords(t.id).some(function (w) { return wordKey(w.en) === key; });
  });
  if (base) return false;
  const added = getAdded();
  return Object.keys(added).some(function (tid) {
    return added[tid].some(function (w) { return wordKey(w.en) === key; });
  });
}

/* ================= PHẦN 7: CHUYỂN TRANG & CUỘN TỰ ĐỘNG (SCROLLSPY) ================= */

let isScrollingFromClick = false;
let scrollTimeout = null;

function updateActiveNav(view) {
  if (!view) return;
  currentView = view;

  // Cập nhật trạng thái active trên sidebar
  document.querySelectorAll(".nav__item").forEach(function (b) {
    b.classList.toggle("is-active", b.getAttribute("data-view") === view);
  });

  // Cập nhật class is-active cho khu vực view
  document.querySelectorAll(".view").forEach(function (v) {
    v.classList.toggle("is-active", v.id === "view-" + view);
  });

  // Cập nhật tiêu đề trên topbar
  const info = VIEW_INFO[view] || ["", ""];
  if (el.viewTitle) el.viewTitle.textContent = info[0];
  if (el.viewSubtitle) el.viewSubtitle.textContent = info[1];
}

function switchView(view, smooth) {
  const target = $("view-" + view);
  if (!target) return;

  updateActiveNav(view);

  // Đóng menu trên điện thoại
  if (el.sidebar) el.sidebar.classList.remove("is-open");
  if (el.sidebarOverlay) el.sidebarOverlay.classList.remove("is-open");

  const topbar = document.querySelector(".topbar");
  const topbarHeight = topbar ? topbar.offsetHeight : 70;
  const targetTop = target.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - topbarHeight - 16;

  if (smooth !== false) {
    isScrollingFromClick = true;
    clearTimeout(scrollTimeout);
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth"
    });
    scrollTimeout = setTimeout(function () {
      isScrollingFromClick = false;
    }, 850);
  } else {
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "auto"
    });
  }
}

function getActiveViewFromScroll() {
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  // Nếu đã cuộn gần đến cuối trang -> kích hoạt view cuối (Cài đặt)
  if (scrollY + windowHeight >= documentHeight - 60) {
    return VIEW_ORDER[VIEW_ORDER.length - 1];
  }

  const topbar = document.querySelector(".topbar");
  const topbarHeight = topbar ? topbar.offsetHeight : 70;
  // Điểm mốc để nhận diện section đang đọc (ngay dưới header)
  const threshold = topbarHeight + 60;

  let active = VIEW_ORDER[0];
  for (let i = 0; i < VIEW_ORDER.length; i++) {
    const v = VIEW_ORDER[i];
    const section = $("view-" + v);
    if (!section) continue;
    const rect = section.getBoundingClientRect();
    if (rect.top <= threshold) {
      active = v;
    } else {
      break;
    }
  }
  return active;
}

function handleScroll() {
  if (isScrollingFromClick) return;
  if (!getSession()) return;
  if (el.appShell && el.appShell.hidden) return;

  const activeView = getActiveViewFromScroll();
  if (activeView && activeView !== currentView) {
    updateActiveNav(activeView);
  }
}

/* ================= PHẦN 8: RENDER TỔNG QUAN ================= */

function renderDashboard() {
  const topics = allTopics();
  const hidden = getHiddenTopics();
  const addedCount = Object.keys(getAdded()).reduce(function (n, k) { return n + getAdded()[k].length; }, 0);
  const editedCount = Object.keys(getEdited()).length;
  const removedCount = getRemoved().length;

  el.statTopics.textContent = topics.length - hidden.length + " / " + topics.length;
  el.statWords.textContent = fmt(totalWords());
  el.statChanges.textContent = fmt(addedCount + editedCount + removedCount);

  const users = listUsers();
  const history = getQuizHistory();

  const totalUsersCount = (serverStats && typeof serverStats.totalUsers === "number") ? serverStats.totalUsers : users.length;
  const totalAttemptsCount = (serverStats && typeof serverStats.totalAttempts === "number") ? serverStats.totalAttempts : history.length;
  const avgScoreVal = (serverStats && typeof serverStats.avgScore === "number")
    ? serverStats.avgScore + "%"
    : (history.length ? Math.round(history.reduce(function (s, h) { return s + (h.pct || 0); }, 0) / history.length) + "%" : "0%");

  el.statUsers.textContent = fmt(totalUsersCount);
  el.statAttempts.textContent = fmt(totalAttemptsCount);
  el.statAvg.textContent = avgScoreVal;

  // Danh sách thay đổi
  const changes = [];
  if (addedCount) changes.push(["Từ đã thêm", addedCount]);
  if (editedCount) changes.push(["Từ đã sửa", editedCount]);
  if (removedCount) changes.push(["Từ đã xóa", removedCount]);
  if (hidden.length) changes.push(["Chủ đề đang tắt", hidden.length]);

  if (changes.length === 0) {
    el.adminChangeList.innerHTML = '<li class="summary-empty">Chưa có thay đổi nào.</li>';
  } else {
    el.adminChangeList.innerHTML = changes.map(function (c) {
      return "<li><span>" + c[0] + "</span><b>" + c[1] + "</b></li>";
    }).join("");
  }

  // Người học gần đây (đồng bộ từ server)
  const recentUsers = (serverStats && Array.isArray(serverStats.recentUsers) && serverStats.recentUsers.length)
    ? serverStats.recentUsers
    : users.sort(function (a, b) { return b.lastSeen - a.lastSeen; }).slice(0, 5);

  if (recentUsers.length === 0) {
    el.recentUserList.innerHTML = '<li class="summary-empty">Chưa có dữ liệu người học.</li>';
  } else {
    el.recentUserList.innerHTML = recentUsers.map(function (u) {
      return "<li><span>" + esc(u.name) + "</span><b>" + (u.learned || 0) + " từ</b></li>";
    }).join("");
  }
}

/* ================= PHẦN 9: RENDER TỪ VỰNG ================= */

const WORD_PAGE_SIZE = 10;   // số từ mỗi trang
let wordPage = 1;            // trang hiện tại của danh sách từ

function renderWordSelect() {
  const current = el.wordTopicFilter.value || "all";
  el.wordTopicFilter.innerHTML = '<option value="all">Tất cả chủ đề</option>';
  allTopics().forEach(function (t) {
    const o = document.createElement("option");
    o.value = t.id;
    o.textContent = t.name + " (" + t.vi + ")";
    el.wordTopicFilter.appendChild(o);
  });
  el.wordTopicFilter.value = current;
}

function renderWords() {
  const topicFilter = el.wordTopicFilter.value || "all";
  const keyword = wordKey(el.wordSearch.value);

  // Gom từ theo chủ đề đang chọn
  let rows = [];
  allTopics().forEach(function (t) {
    if (topicFilter !== "all" && t.id !== topicFilter) return;
    effectiveWords(t.id).forEach(function (w) {
      if (keyword && wordKey(w.en).indexOf(keyword) === -1 && wordKey(w.vi).indexOf(keyword) === -1) return;
      rows.push({ word: w, topic: t });
    });
  });

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / WORD_PAGE_SIZE));
  if (wordPage > totalPages) wordPage = totalPages;
  if (wordPage < 1) wordPage = 1;
  const start = (wordPage - 1) * WORD_PAGE_SIZE;
  const pageRows = rows.slice(start, start + WORD_PAGE_SIZE);

  el.wordCountInfo.textContent = total === 0
    ? "Không có từ nào"
    : "Đang hiển thị " + fmt(start + 1) + "–" + fmt(start + pageRows.length) + " / " + fmt(total) + " từ";
  el.wordBody.innerHTML = "";
  el.wordEmpty.hidden = total > 0;

  pageRows.forEach(function (row, index) {
    const tr = document.createElement("tr");
    const w = row.word;
    const statusTag = w.status === "added" ? '<span class="tag tag--added">Đã thêm</span>'
      : w.status === "edited" ? '<span class="tag tag--edited">Đã sửa</span>'
      : '<span class="tag tag--base">Gốc</span>';

    tr.innerHTML =
      '<td class="td-stt">' + (start + index + 1) + "</td>" +
      "<td><b class=\"td-en\">" + esc(w.en) + '</b><br><small style="color:#999">' + esc(row.topic.name) + "</small></td>" +
      '<td class="td-ipa">' + esc(w.ipa) + "</td>" +
      "<td>" + esc(w.vi) + "</td>" +
      "<td>" + statusTag + "</td>" +
      '<td class="td-action"><div class="row-actions">' +
        '<button class="btn-edit" data-act="edit" data-key="' + esc(wordKey(w.en)) + '">Sửa</button>' +
        '<button class="btn-delete" data-act="del" data-key="' + esc(wordKey(w.en)) + '">Xóa</button>' +
      "</div></td>";

    el.wordBody.appendChild(tr);
  });

  renderWordPagination(totalPages);
}

// Danh sách số trang rút gọn (1 … 4 5 6 … 24)
function pageList(total, current) {
  if (total <= 7) {
    const out = [];
    for (let i = 1; i <= total; i++) out.push(i);
    return out;
  }
  const out = [1];
  if (current > 3) out.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) out.push(i);
  if (current < total - 2) out.push("...");
  out.push(total);
  return out;
}

function renderWordPagination(totalPages) {
  const wrap = el.wordPagination;
  if (totalPages <= 1) { wrap.innerHTML = ""; return; }
  let html = '<button type="button" data-pg="prev"' + (wordPage <= 1 ? " disabled" : "") + '>‹ Trước</button>';
  pageList(totalPages, wordPage).forEach(function (p) {
    if (p === "...") html += '<span class="pagination__ellipsis">…</span>';
    else html += '<button type="button"' + (p === wordPage ? ' class="is-active"' : "") + ' data-pg="' + p + '">' + p + "</button>";
  });
  html += '<button type="button" data-pg="next"' + (wordPage >= totalPages ? " disabled" : "") + '>Sau ›</button>';
  wrap.innerHTML = html;
}

/* ================= PHẦN 10: RENDER CHỦ ĐỀ ================= */

function renderTopics() {
  const hidden = getHiddenTopics();
  el.topicGrid.innerHTML = "";

  allTopics().forEach(function (t) {
    const isOff = hidden.indexOf(t.id) !== -1;
    const count = effectiveWords(t.id).length;
    const g1 = (t.gradient && t.gradient[0]) || t.g1 || "#f0a500";
    const g2 = (t.gradient && t.gradient[1]) || t.g2 || "#ffb52e";
    const badge = t.emoji ? t.emoji : esc(t.name.slice(0, 1).toUpperCase());
    const isCustom = !!t.isCustom;

    const learnLink = (["travel","food","work","school","nature","sports","health","technology","music","movie","weather","shopping"].indexOf(t.id) !== -1 ? "learn-" + t.id + ".html" : "flashcard.html?topic=" + t.id);
    const quizLink = (["travel","food","work","school","nature","sports","health","technology","music","movie","weather","shopping"].indexOf(t.id) !== -1 ? "quiz-" + t.id + ".html" : "quiz.html?topic=" + t.id);

    const card = document.createElement("div");
    card.className = "topic-admin-card" + (isOff ? " is-off" : "");
    card.innerHTML =
      '<div class="topic-admin-card__top" style="background:linear-gradient(135deg,' + g1 + "," + g2 + ')">' +
        '<div class="topic-admin-card__letter">' + badge + "</div>" +
        '<div style="flex:1;min-width:0;">' +
          '<div class="topic-admin-card__name" style="display:flex;align-items:center;justify-content:space-between;gap:6px;">' +
            '<span>' + esc(t.name) + '</span>' +
            (isCustom ? '<span style="font-size:11px;background:rgba(255,255,255,0.3);padding:2px 8px;border-radius:999px;font-weight:700;">Tự tạo</span>' : '') +
          '</div>' +
          '<div class="topic-admin-card__vi">' + esc(t.vi) + '</div>' +
        '</div>' +
      "</div>" +
      '<div class="topic-admin-card__body">' +
        '<div class="topic-admin-card__row"><span>Số từ</span><b>' + count + "</b></div>" +
        '<div class="topic-admin-card__row"><span>Trang học</span><b><a href="' + learnLink + '" target="_blank">Mở</a></b></div>' +
        '<div class="topic-admin-card__row"><span>Trang quiz</span><b><a href="' + quizLink + '" target="_blank">Mở</a></b></div>' +
        (isCustom ? (
          '<div class="topic-admin-card__row" style="padding-top:8px;border-top:1px dashed var(--border);">' +
            '<span>Tùy chỉnh:</span>' +
            '<div style="display:flex;gap:6px;">' +
              '<button type="button" class="btn-edit" style="padding:3px 8px;font-size:12px;" data-act="edit-topic" data-topic="' + esc(t.id) + '">Sửa</button>' +
              '<button type="button" class="btn-delete" style="padding:3px 8px;font-size:12px;" data-act="del-topic" data-topic="' + esc(t.id) + '">Xóa</button>' +
            '</div>' +
          '</div>'
        ) : '') +
        '<div class="topic-admin-card__toggle"></div>' +
      "</div>";

    el.topicGrid.appendChild(card);
  });
}

/* ================= PHẦN 11: DỮ LIỆU NGƯỜI HỌC ================= */

function getCurrentUserName() {
  const u = readStore(KEY_USER, null);
  return u && typeof u.name === "string" && u.name.trim() ? u.name.trim() : "";
}

// Gom danh sách người học từ server và LocalStorage
function listUsers() {
  const map = {};

  // 1. Nạp từ serverStats (đồng bộ thời gian thực từ mọi thiết bị / máy tính khác)
  if (serverStats && Array.isArray(serverStats.users)) {
    serverStats.users.forEach(function (u) {
      if (u && typeof u.name === "string" && u.name.trim() && u.name.trim() !== "guest") {
        const name = u.name.trim();
        map[name] = {
          name: name,
          learned: u.learned || 0,
          topics: u.topics || 0,
          best: u.best || 0,
          lastSeen: u.lastSeen || 0
        };
      }
    });
  }

  // 2. Nạp danh sách người học từ registry cục bộ
  const reg = readStore(USERS_REGISTRY_KEY, []);
  if (Array.isArray(reg)) {
    reg.forEach(function (u) {
      if (u && typeof u.name === "string" && u.name.trim() && u.name.trim() !== "guest") {
        const name = u.name.trim();
        if (!map[name]) {
          map[name] = { name: name, learned: 0, topics: 0, best: 0, lastSeen: u.lastActive || 0 };
        } else {
          map[name].lastSeen = Math.max(map[name].lastSeen, u.lastActive || 0);
        }
      }
    });
  }

  // 3. Người đang đăng nhập trên trang chính máy này
  const cur = getCurrentUserName();
  if (cur && cur !== "guest") {
    if (!map[cur]) map[cur] = { name: cur, learned: 0, topics: 0, best: 0, lastSeen: Date.now() };
    else map[cur].lastSeen = Math.max(map[cur].lastSeen, Date.now());
  }

  // 4. Quét các khóa tiến độ học cục bộ: engbee_learned_<tên>_<chủ đề>
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || key.indexOf(PREFIX_LEARNED) !== 0) continue;
    const rest = key.slice(PREFIX_LEARNED.length);
    const cut = rest.lastIndexOf("_");
    if (cut < 0) continue;
    const name = rest.slice(0, cut);
    if (name === "guest") continue;
    if (!map[name]) map[name] = { name: name, learned: 0, topics: 0, best: 0, lastSeen: 0 };
  }

  // 5. Quét điểm cao nhất cục bộ: engbee_quiz_best_<tên>
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || key.indexOf(PREFIX_BEST) !== 0) continue;
    const name = key.slice(PREFIX_BEST.length);
    if (name === "guest") continue;
    if (!map[name]) map[name] = { name: name, learned: 0, topics: 0, best: 0, lastSeen: 0 };
  }

  // Tổng hợp số từ đã học, số chủ đề và điểm cao nhất
  const result = [];
  Object.keys(map).forEach(function (name) {
    if (name === "guest") return;
    let localLearned = 0;
    const topicSet = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || key.indexOf(PREFIX_LEARNED + name + "_") !== 0) continue;
      const arr = readStore(key, []);
      if (Array.isArray(arr)) localLearned += arr.length;
      topicSet[key.slice((PREFIX_LEARNED + name + "_").length)] = true;
    }
    const localBest = Number(localStorage.getItem(PREFIX_BEST + name) || 0);
    const localTopics = Object.keys(topicSet).length;

    const item = map[name];
    const learned = Math.max(item.learned || 0, localLearned);
    const topics = Math.max(item.topics || 0, localTopics);
    const best = Math.max(item.best || 0, localBest);

    result.push({
      name: name,
      learned: learned,
      topics: topics,
      best: best,
      lastSeen: item.lastSeen || 0
    });
  });

  return result.sort(function (a, b) { return (b.lastSeen || 0) - (a.lastSeen || 0); });
}

function renderUsers() {
  const users = listUsers();
  el.userBody.innerHTML = "";
  el.userEmpty.hidden = users.length > 0;

  users.forEach(function (u, index) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td class="td-stt">' + (index + 1) + "</td>" +
      "<td><b>" + esc(u.name) + "</b></td>" +
      "<td>" + fmt(u.learned) + "</td>" +
      "<td>" + (u.best ? u.best + "/10" : "-") + "</td>" +
      "<td>" + u.topics + "</td>";
    el.userBody.appendChild(tr);
  });
}

function renderResults() {
  const history = getQuizHistory().slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
  el.resultBody.innerHTML = "";
  el.resultEmpty.hidden = history.length > 0;

  history.forEach(function (h, index) {
    const pct = h.pct || 0;
    const tag = pct >= 8 ? '<span class="tag tag--good">Tốt</span>'
      : pct >= 5 ? '<span class="tag tag--mid">Khá</span>'
      : '<span class="tag tag--bad">Cần luyện thêm</span>';

    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td class="td-stt">' + (index + 1) + "</td>" +
      "<td>" + esc(fmtTime(h.ts)) + "</td>" +
      "<td>" + esc(h.userName ? h.userName + " — " + (h.modeName || h.topicId || "-") : (h.modeName || h.topicId || "-")) + "</td>" +
      "<td>" + (h.correct || 0) + " / " + (h.total || 0) + "</td>" +
      "<td><b>" + pct + "/10</b></td>" +
      "<td>" + tag + "</td>";
    el.resultBody.appendChild(tr);
  });
}

function getQuizHistory() {
  if (serverStats && Array.isArray(serverStats.quizHistory) && serverStats.quizHistory.length > 0) {
    return serverStats.quizHistory;
  }
  const h = readStore(KEY_QUIZ_HISTORY, []);
  return Array.isArray(h) ? h : [];
}

/* ================= PHẦN 12: MODAL & XÁC NHẬN ================= */

function clearFieldError(input, box) {
  input.classList.remove("is-error");
  box.textContent = "";
  box.classList.remove("is-show");
}

function showFieldError(input, box, message) {
  input.classList.add("is-error");
  box.textContent = message;
  box.classList.add("is-show");
}

function clearFormErrors() {
  [el.errorEn, el.errorVi, el.errorIpa, el.errorEx, el.errorExVi, el.errorTopicField].forEach(function (b) {
    if (b) { b.textContent = ""; b.classList.remove("is-show"); }
  });
  [el.inputEn, el.inputVi, el.inputIpa, el.inputEx, el.inputExVi, el.inputTopic].forEach(function (i) {
    if (i) i.classList.remove("is-error");
  });
}

function closeAllModals() {
  if (el.wordModal) el.wordModal.hidden = true;
  if (el.topicModal) el.topicModal.hidden = true;
  if (el.confirmModal) el.confirmModal.hidden = true;
  document.body.style.overflow = "";
  clearFormErrors();
  clearTopicFormErrors();
  pendingAction = null;
  editingKey = "";
}

function askConfirm(title, text, note, action) {
  el.confirmTitle.textContent = title;
  el.confirmText.textContent = text;
  el.confirmNote.textContent = note || "Hành động này không thể hoàn tác.";
  pendingAction = action;
  el.confirmModal.hidden = false;
  document.body.style.overflow = "hidden";
}

/* ================= PHẦN 13: THÊM / SỬA TỪ ================= */

function openWordModal(mode, key) {
  if (!requireAdmin()) return;
  clearFormErrors();
  el.wordForm.reset();
  el.inputKey.value = "";
  editingKey = mode === "edit" ? key : "";   // nhớ đang sửa từ nào

  if (mode === "edit") {
    el.wordModalTitle.textContent = "Sửa từ vựng";
    el.inputKey.value = key;
    const word = findWordAnywhere(key);
    if (!word) { showToast("Không tìm thấy từ này.", "error"); return; }
    el.inputEn.value = word.en;
    el.inputVi.value = word.vi;
    el.inputIpa.value = word.ipa || "";
    el.inputPronHint.value = word.pronHint || "";
    el.inputTopic.value = word.topicId;
// exs
    if (el.inputEx0En) el.inputEx0En.value = (word.exs && word.exs[0] && word.exs[0].en) ? word.exs[0].en : "";
    if (el.inputEx0Vi) el.inputEx0Vi.value = (word.exs && word.exs[0] && word.exs[0].vi) ? word.exs[0].vi : "";
    if (el.inputEx1En) el.inputEx1En.value = (word.exs && word.exs[1] && word.exs[1].en) ? word.exs[1].en : "";
    if (el.inputEx1Vi) el.inputEx1Vi.value = (word.exs && word.exs[1] && word.exs[1].vi) ? word.exs[1].vi : "";
    if (el.inputEx2En) el.inputEx2En.value = (word.exs && word.exs[2] && word.exs[2].en) ? word.exs[2].en : "";
    if (el.inputEx2Vi) el.inputEx2Vi.value = (word.exs && word.exs[2] && word.exs[2].vi) ? word.exs[2].vi : "";
    if (el.inputEx3En) el.inputEx3En.value = (word.exs && word.exs[3] && word.exs[3].en) ? word.exs[3].en : "";
    if (el.inputEx3Vi) el.inputEx3Vi.value = (word.exs && word.exs[3] && word.exs[3].vi) ? word.exs[3].vi : "";
    if (el.inputEx4En) el.inputEx4En.value = (word.exs && word.exs[4] && word.exs[4].en) ? word.exs[4].en : "";
    if (el.inputEx4Vi) el.inputEx4Vi.value = (word.exs && word.exs[4] && word.exs[4].vi) ? word.exs[4].vi : "";
    el.inputEn.disabled = true;  // không cho đổi khoá từ khi sửa
  } else {
    el.wordModalTitle.textContent = "Thêm từ mới";
    el.inputEn.disabled = false;
    el.inputTopic.value = el.wordTopicFilter.value !== "all" ? el.wordTopicFilter.value : "food";
  }

  el.wordModal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(function () { if (!el.inputEn.disabled) el.inputEn.focus(); }, 50);
}

// Tìm một từ trong mọi chủ đề
function findWordAnywhere(key) {
  let found = null;
  allTopics().forEach(function (t) {
    if (found) return;
    effectiveWords(t.id).forEach(function (w) {
      if (!found && wordKey(w.en) === key) found = { en: w.en, vi: w.vi, ipa: w.ipa, ex: w.ex, exvi: w.exvi, topicId: t.id, topicName: t.name };
    });
  });
  return found;
}

// Kiểm tra dữ liệu trước khi lưu
function getTopicKey(tid) {
  if (!tid) return "general";
  var t = String(tid).toLowerCase();
  if (t === "all") return "general";
  if (t.indexOf("food") !== -1 || t.indexOf("fruit") !== -1 || t.indexOf("veget") !== -1 || t.indexOf("drink") !== -1 || t.indexOf("meal") !== -1) return "food";
  if (t.indexOf("animal") !== -1 || t.indexOf("pet") !== -1 || t.indexOf("wild") !== -1 || t.indexOf("insect") !== -1) return "animals";
  if (t.indexOf("travel") !== -1 || t.indexOf("tour") !== -1 || t.indexOf("place") !== -1 || t.indexOf("city") !== -1 || t.indexOf("country") !== -1) return "travel";
  if (t.indexOf("transp") !== -1 || t.indexOf("vehicle") !== -1 || t.indexOf("car") !== -1 || t.indexOf("bus") !== -1 || t.indexOf("train") !== -1 || t.indexOf("plane") !== -1) return "transport";
  if (t.indexOf("job") !== -1 || t.indexOf("work") !== -1 || t.indexOf("prof") !== -1 || t.indexOf("career") !== -1) return "jobs";
  if (t.indexOf("school") !== -1 || t.indexOf("study") !== -1 || t.indexOf("class") !== -1 || t.indexOf("lesson") !== -1 || t.indexOf("educ") !== -1) return "school";
  if (t.indexOf("home") !== -1 || t.indexOf("house") !== -1 || t.indexOf("room") !== -1 || t.indexOf("furn") !== -1) return "home";
  if (t.indexOf("cloth") !== -1 || t.indexOf("wear") !== -1 || t.indexOf("dress") !== -1 || t.indexOf("shirt") !== -1) return "clothes";
  if (t.indexOf("body") !== -1 || t.indexOf("health") !== -1 || t.indexOf("part") !== -1) return "body";
  if (t.indexOf("nature") !== -1 || t.indexOf("weather") !== -1 || t.indexOf("plant") !== -1 || t.indexOf("tree") !== -1 || t.indexOf("sea") !== -1) return "nature";
  if (t.indexOf("color") !== -1) return "colors";
  if (t.indexOf("number") !== -1) return "numbers";
  if (t.indexOf("time") !== -1 || t.indexOf("day") !== -1 || t.indexOf("month") !== -1) return "time";
  if (t.indexOf("sport") !== -1 || t.indexOf("game") !== -1 || t.indexOf("play") !== -1) return "sports";
  return "general";
}

function generateExamples(en, vi, topicId) {
  var base = (en || '').replace(/[^a-zA-Z0-9 \-']+/g, '').trim().toLowerCase();
  var vb = (vi || '').trim();
  if (!base || !vb) {
    var a = [];
    for (var i = 0; i < 5; i++) a.push({ en: '', vi: '' });
    return a;
  }
  var tk = getTopicKey(topicId);
  var enTpl, viTpl;
  if (tk === "food") {
    enTpl = [
      'I like to eat ' + base + ' every day.',
      'She is cooking ' + base + ' for dinner.',
      'We bought some fresh ' + base + ' at the market.',
      'This ' + base + ' tastes really delicious.',
      'Do you want to try this ' + base + '?'
    ];
    viTpl = [
      'Tôi thích ăn ' + vb + ' mỗi ngày.',
      'Cô ấy đang nấu ' + vb + ' cho bữa tối.',
      'Chúng tôi đã mua ' + vb + ' tươi ở chợ.',
      vb + ' này có vị rất ngon.',
      'Bạn có muốn thử ' + vb + ' này không?'
    ];
  } else if (tk === "animals") {
    enTpl = [
      'I saw a ' + base + ' in the park today.',
      'That ' + base + ' looks very friendly.',
      'A baby ' + base + ' is playing with its mother.',
      'This ' + base + ' lives in the forest.',
      'We learned about a ' + base + ' in class today.'
    ];
    viTpl = [
      'Hôm nay tôi thấy một con ' + vb + ' ở công viên.',
      'Con ' + vb + ' đó trông rất thân thiện.',
      'Một con ' + vb + ' con đang chơi với mẹ nó.',
      'Con ' + vb + ' này sống trong rừng.',
      'Hôm nay chúng tôi học về ' + vb + ' trong lớp.'
    ];
  } else if (tk === "travel") {
    enTpl = [
      'I want to visit a place famous for ' + base + '.',
      'We took a lot of photos of ' + base + ' on our trip.',
      'Many tourists come to see ' + base + ' every year.',
      'I read about ' + base + ' in a travel guide.',
      'It would be amazing to explore ' + base + '.'
    ];
    viTpl = [
      'Tôi muốn đến thăm một nơi nổi tiếng với ' + vb + '.',
      'Chúng tôi đã chụp rất nhiều ảnh về ' + vb + ' trong chuyến đi.',
      'Nhiều du khách đến xem ' + vb + ' mỗi năm.',
      'Tôi đã đọc về ' + vb + ' trong một cuốn sách du lịch.',
      'Sẽ thật tuyệt vời nếu được khám phá ' + vb + '.'
    ];
  } else if (tk === "transport") {
    enTpl = [
      'I take a ' + base + ' to get to school every day.',
      'This ' + base + ' is very fast and comfortable.',
      'We waited for the ' + base + ' at the station.',
      'A new ' + base + ' just arrived at the stop.',
      'Is there a ' + base + ' going to the city center?'
    ];
    viTpl = [
      'Tôi đi ' + vb + ' đến trường mỗi ngày.',
      vb + ' này rất nhanh và thoải mái.',
      'Chúng tôi đã đợi ' + vb + ' ở bến xe/ga.',
      'Một chiếc ' + vb + ' mới vừa đến trạm.',
      'Có ' + vb + ' nào đi đến trung tâm thành phố không?'
    ];
  } else if (tk === "jobs") {
    enTpl = [
      'My dream is to become a ' + base + '.',
      'A good ' + base + ' must be very patient.',
      'She works as a ' + base + ' in a big company.',
      'I want to learn more about being a ' + base + '.',
      'That ' + base + ' helps many people every day.'
    ];
    viTpl = [
      'Ước mơ của tôi là trở thành một ' + vb + '.',
      'Một ' + vb + ' giỏi phải rất kiên nhẫn.',
      'Cô ấy làm ' + vb + ' tại một công ty lớn.',
      'Tôi muốn học thêm về công việc của một ' + vb + '.',
      vb + ' đó giúp đỡ rất nhiều người mỗi ngày.'
    ];
  } else if (tk === "school") {
    enTpl = [
      'We use a ' + base + ' in our English class.',
      'I need to bring my ' + base + ' to school tomorrow.',
      'The teacher explained the ' + base + ' very clearly.',
      'We practiced this ' + base + ' in our lesson today.',
      'Can I borrow your ' + base + ' for a minute?'
    ];
    viTpl = [
      'Chúng tôi sử dụng ' + vb + ' trong giờ học tiếng Anh.',
      'Ngày mai tôi cần mang ' + vb + ' đến trường.',
      'Giáo viên đã giải thích ' + vb + ' rất rõ ràng.',
      'Hôm nay chúng tôi đã luyện tập về ' + vb + '.',
      'Tôi có thể mượn ' + vb + ' của bạn một chút không?'
    ];
  } else if (tk === "home") {
    enTpl = [
      'We have a nice ' + base + ' in our living room.',
      'I put my keys on the ' + base + '.',
      'This ' + base + ' makes our house look beautiful.',
      'My family bought a new ' + base + ' last week.',
      'I cleaned the ' + base + ' this morning.'
    ];
    viTpl = [
      'Gia đình chúng tôi có một ' + vb + ' đẹp trong phòng khách.',
      'Tôi để chìa khóa lên ' + vb + '.',
      vb + ' này làm cho ngôi nhà của chúng tôi trông đẹp hơn.',
      'Gia đình tôi đã mua một ' + vb + ' mới tuần trước.',
      'Sáng nay tôi đã dọn dẹp ' + vb + '.'
    ];
  } else if (tk === "clothes") {
    enTpl = [
      'I bought a new ' + base + ' yesterday.',
      'This ' + base + ' fits me very well.',
      'She is wearing a blue ' + base + ' today.',
      'I need to wash my ' + base + ' this weekend.',
      'That ' + base + ' looks great on you.'
    ];
    viTpl = [
      'Hôm qua tôi đã mua một chiếc ' + vb + ' mới.',
      'Chiếc ' + vb + ' này vừa vặn với tôi rất tốt.',
      'Hôm nay cô ấy đang mặc một chiếc ' + vb + ' màu xanh.',
      'Cuối tuần này tôi cần giặt ' + vb + ' của mình.',
      'Chiếc ' + vb + ' đó trông rất đẹp trên bạn.'
    ];
  } else if (tk === "body") {
    enTpl = [
      'I hurt my ' + base + ' while playing sports.',
      'We use our ' + base + ' to see things around us.',
      'My ' + base + ' feels tired after a long day.',
      'It is important to take care of your ' + base + '.',
      'He moved his ' + base + ' very quickly.'
    ];
    viTpl = [
      'Tôi đã bị đau ' + vb + ' khi chơi thể thao.',
      'Chúng ta dùng ' + vb + ' để nhìn thấy mọi thứ xung quanh.',
      vb + ' của tôi cảm thấy mệt mỏi sau một ngày dài.',
      'Việc chăm sóc ' + vb + ' của mình rất quan trọng.',
      'Anh ấy đã di chuyển ' + vb + ' rất nhanh.'
    ];
  } else if (tk === "nature") {
    enTpl = [
      'We saw a beautiful ' + base + ' on our hike.',
      'This ' + base + ' grows very well in the forest.',
      'The ' + base + ' looks amazing in the morning light.',
      'Many animals live near this ' + base + '.',
      'I love to take pictures of a ' + base + '.'
    ];
    viTpl = [
      'Chúng tôi đã thấy một ' + vb + ' rất đẹp trong chuyến đi bộ đường dài.',
      vb + ' này phát triển rất tốt trong rừng.',
      vb + ' trông thật tuyệt vời dưới ánh sáng ban mai.',
      'Nhiều loài động vật sống gần ' + vb + ' này.',
      'Tôi rất thích chụp ảnh về ' + vb + '.'
    ];
  } else if (tk === "colors") {
    enTpl = [
      'I really like the color ' + base + '.',
      'She painted her room ' + base + '.',
      'This ' + base + ' shirt looks very nice on him.',
      'The sky turned a beautiful ' + base + ' this evening.',
      'My favorite color is ' + base + '.'
    ];
    viTpl = [
      'Tôi rất thích màu ' + vb + '.',
      'Cô ấy đã sơn phòng của mình màu ' + vb + '.',
      'Chiếc áo màu ' + vb + ' này trông rất đẹp trên anh ấy.',
      'Buổi tối hôm nay bầu trời chuyển sang một màu ' + vb + ' rất đẹp.',
      'Màu sắc yêu thích của tôi là màu ' + vb + '.'
    ];
  } else if (tk === "numbers") {
    enTpl = [
      'I have ' + base + ' apples in my bag.',
      'There are ' + base + ' students in our class.',
      'It costs ' + base + ' dollars.',
      'We need to count to ' + base + '.',
      'He can run ' + base + ' laps around the field.'
    ];
    viTpl = [
      'Tôi có ' + vb + ' quả táo trong túi.',
      'Có ' + vb + ' học sinh trong lớp chúng tôi.',
      'Nó có giá ' + vb + ' đô la.',
      'Chúng ta cần đếm đến ' + vb + '.',
      'Anh ấy có thể chạy ' + vb + ' vòng quanh sân.'
    ];
  } else if (tk === "time") {
    enTpl = [
      'We meet at ' + base + ' every morning.',
      'I usually wake up at ' + base + '.',
      'This event happens on ' + base + '.',
      'It takes about ' + base + ' to finish this work.',
      'Let’s plan to meet around ' + base + '.'
    ];
    viTpl = [
      'Chúng tôi gặp nhau lúc ' + vb + ' mỗi sáng.',
      'Tôi thường thức dậy vào lúc ' + vb + '.',
      'Sự kiện này diễn ra vào ' + vb + '.',
      'Mất khoảng ' + vb + ' để hoàn thành công việc này.',
      'Hãy cùng lên kế hoạch gặp nhau khoảng ' + vb + '.'
    ];
  } else if (tk === "sports") {
    enTpl = [
      'I like to play ' + base + ' with my friends.',
      'We watch ' + base + ' on TV every weekend.',
      'He is really good at ' + base + '.',
      'Learning ' + base + ' helps me stay healthy.',
      'Our school has a ' + base + ' team this year.'
    ];
    viTpl = [
      'Tôi thích chơi ' + vb + ' với bạn bè.',
      'Chúng tôi xem ' + vb + ' trên TV mỗi cuối tuần.',
      'Anh ấy rất giỏi chơi ' + vb + '.',
      'Chơi ' + vb + ' giúp tôi giữ gìn sức khỏe.',
      'Năm nay trường chúng tôi có đội ' + vb + '.'
    ];
  } else {
    enTpl = [
      'I saw a ' + base + ' today.',
      'She bought a new ' + base + '.',
      'We need a ' + base + ' for our class.',
      'This ' + base + ' is very useful.',
      'Can you find a good ' + base + '?'
    ];
    viTpl = [
      'Hôm nay tôi thấy một ' + vb + '.',
      'Cô ấy đã mua một ' + vb + ' mới.',
      'Chúng tôi cần một ' + vb + ' cho lớp học.',
      vb + ' này rất hữu ích.',
      'Bạn có thể tìm một ' + vb + ' tốt không?'
    ];
  }
  var out = [];
  for (var j = 0; j < 5; j++) out.push({ en: enTpl[j], vi: viTpl[j] });
  return out;
}

function fillExamplesIfEmpty(en, vi, topicId) {
  for (var i = 0; i < 5; i++) {
    var enEl = el['inputEx' + i + 'En'];
    var viEl = el['inputEx' + i + 'Vi'];
    if (enEl && viEl && !enEl.value.trim() && !viEl.value.trim()) {
      var g = generateExamples(en, vi, topicId);
      if (g && g[i]) {
        enEl.value = g[i].en;
        viEl.value = g[i].vi;
      }
    }
  }
}
  const en = el.inputEn.value.trim();
  const vi = el.inputVi.value.trim();
  const ipa = el.inputIpa.value.trim();
  const ex = el.inputEx.value.trim();
  const exVi = el.inputExVi.value.trim();
  const topic = el.inputTopic.value;
  const key = wordKey(en);
  const errors = [];
  
  function validateWord() {
  const en = el.inputEn.value.trim();
  const vi = el.inputVi.value.trim();
  const ipa = el.inputIpa.value.trim();
  const ex = el.inputEx.value.trim();
  const exVi = el.inputExVi.value.trim();
  const topic = el.inputTopic.value;
  const key = wordKey(en);
  const errors = [];

  if (en === "") errors.push({ input: el.inputEn, box: el.errorEn, msg: "Vui lòng nhập từ tiếng Anh." });
  else if (en.length > 40) errors.push({ input: el.inputEn, box: el.errorEn, msg: "Từ tiếng Anh không quá 40 ký tự." });
  else if (!/^[A-Za-z]+([ '\-][A-Za-z]+)*$/.test(en)) {
    errors.push({ input: el.inputEn, box: el.errorEn, msg: "Chỉ dùng chữ cái, dấu cách hoặc gạch nối." });
  } else if (editingKey === "" && findWordAnywhere(key)) {
    errors.push({ input: el.inputEn, box: el.errorEn, msg: "Từ \"" + en + "\" đã tồn tại trong hệ thống." });
  } else if (editingKey === "" && isCustomWord(key)) {
    errors.push({ input: el.inputEn, box: el.errorEn, msg: "Từ \"" + en + "\" đã tồn tại trong hệ thống." });
  }

  if (vi === "") errors.push({ input: el.inputVi, box: el.errorVi, msg: "Vui lòng nhập nghĩa tiếng Việt." });
  else if (vi.length > 60) errors.push({ input: el.inputVi, box: el.errorVi, msg: "Nghĩa không quá 60 ký tự." });
  else if (!/[\u00C0-\u1FFF]/.test(vi)) errors.push({ input: el.inputVi, box: el.errorVi, msg: "Nghĩa phải có chữ tiếng Việt có dấu." });

  if (ipa !== "" && ipa.length > 60) errors.push({ input: el.inputIpa, box: el.errorIpa, msg: "Phiên âm không quá 60 ký tự." });
  if (ex !== "" && ex.length > 160) errors.push({ input: el.inputEx, box: el.errorEx, msg: "Ví dụ không quá 160 ký tự." });
  if (exVi !== "" && exVi.length > 160) errors.push({ input: el.inputExVi, box: el.errorExVi, msg: "Dịch ví dụ không quá 160 ký tự." });

  if (topic === "") errors.push({ input: el.inputTopic, box: el.errorTopicField, msg: "Vui lòng chọn chủ đề." });

  return errors;
}

function handleWordSubmit(event) {
  event.preventDefault();
  if (!requireAdmin()) return;

clearFormErrors();
  fillExamplesIfEmpty(en, vi, topic);

  const en = el.inputEn.value.trim();
  const vi = el.inputVi.value.trim();
  const ipa = el.inputIpa.value.trim();
  const pronHint = (el.inputPronHint && el.inputPronHint.value.trim()) || "";
  const topic = el.inputTopic.value;
  const key = wordKey(en);

  // build exs for save
  function getExSave(i){
    const en2 = (el['inputEx'+i+'En'] && el['inputEx'+i+'En'].value || '').trim();
    const vi2 = (el['inputEx'+i+'Vi'] && el['inputEx'+i+'Vi'].value || '').trim();
    if(!en2 && !vi2) return null;
    return {en:en2, vi:vi2};
  }
  const exsArrSave = [];
  for(let i=0;i<5;i++){ const e=getExSave(i); if(e) exsArrSave.push(e); }
  // if any empty among saved, try to fill with generated samples? no, keep user input; but requirement says "AI tự thêm ví dụ vào admin" — maybe auto-fill when fields empty
  while(exsArrSave.length<5) exsArrSave.push({en:'', vi:''});
  exsArrSave.length=5;

  if (editingKey === "") {
    // Thêm mới: lưu vào danh sách từ riêng của chủ đề
    const added = getAdded();
    if (!Array.isArray(added[topic])) added[topic] = [];
      added[topic].push({ id: makeId(), en: en, vi: vi, ipa: ipa, pronHint: pronHint, ex: '', exvi: '', exs: exsArrSave.slice() });
    writeStore(KEY_ADDED, added);

    // Nếu từ này từng bị xóa trước đó thì gỡ khỏi danh sách đã xóa
    const removed = getRemoved();
    const rIdx = removed.indexOf(key);
    if (rIdx !== -1) {
      removed.splice(rIdx, 1);
      writeStore(KEY_REMOVED, removed);
    }
    showToast('Đã thêm từ "' + en + '".');
  } else {
    // Sửa: Kiểm tra từ có phải từ gốc trong bất kỳ chủ đề nào
    const isBaseWord = allTopics().some(function (t) {
      return baseWords(t.id).some(function (w) { return wordKey(w.en) === editingKey; });
    });

    if (isBaseWord) {
      const edited = getEdited();
      edited[editingKey] = {
        en: en,
        vi: vi,
        ipa: ipa,
        pronHint: pronHint,
        ex: '',
        exvi: '',
        exs: exsArrSave.slice()
      };
      writeStore(KEY_EDITED, edited);
    } else {
      // Từ tự thêm: Cập nhật thông tin và chuyển chủ đề nếu có thay đổi
      const added = getAdded();
      let foundWord = null;
      let oldTopicId = null;

      Object.keys(added).forEach(function (tid) {
        if (Array.isArray(added[tid])) {
          added[tid] = added[tid].filter(function (w) {
            if (wordKey(w.en) === editingKey) {
              foundWord = w;
              oldTopicId = tid;
              return false;
            }
            return true;
          });
        }
      });

      if (foundWord) {
        foundWord.en = en;
        foundWord.vi = vi;
        foundWord.ipa = ipa;
foundWord.ex = '';
foundWord.exvi = '';
foundWord.pronHint = pronHint;
foundWord.exs = exsArrSave.slice();
        const targetTopic = topic || oldTopicId || "food";
        if (!Array.isArray(added[targetTopic])) added[targetTopic] = [];
        added[targetTopic].push(foundWord);
      } else {
        if (!Array.isArray(added[topic])) added[topic] = [];
added[topic].push({ id: makeId(), en: en, vi: vi, ipa: ipa, pronHint: pronHint, ex: '', exvi: '', exs: exsArrSave.slice() });
      }
      writeStore(KEY_ADDED, added);
    }
    showToast('Đã cập nhật từ "' + en + '".');
  }

  closeAllModals();
  renderAll();
}

/* ================= PHẦN 13B: THÊM / SỬA CHỦ ĐỀ ================= */

function clearTopicFormErrors() {
  if (!el.errorTopicName) return;
  [el.errorTopicName, el.errorTopicVi, el.errorTopicId, el.errorTopicEmoji, el.errorTopicDesc].forEach(function (b) {
    if (b) { b.textContent = ""; b.classList.remove("is-show"); }
  });
  [el.inputTopicName, el.inputTopicVi, el.inputTopicId, el.inputTopicEmoji, el.inputTopicDesc].forEach(function (i) {
    if (i) i.classList.remove("is-error");
  });
}

function openTopicModal(mode, topicId) {
  if (!requireAdmin()) return;
  clearTopicFormErrors();
  el.topicForm.reset();
  el.inputTopicMode.value = mode;

  if (mode === "edit") {
    const topic = allTopics().find(function (t) { return t.id === topicId; });
    if (!topic) { showToast("Không tìm thấy chủ đề.", "error"); return; }
    el.topicModalTitle.textContent = "Sửa chủ đề: " + topic.name;
    el.inputTopicOriginalId.value = topicId;
    el.inputTopicName.value = topic.name || topic.en || "";
    el.inputTopicVi.value = topic.vi || "";
    el.inputTopicId.value = topic.id || "";
    el.inputTopicId.readOnly = true;
    el.inputTopicEmoji.value = topic.emoji || "";
    const g1 = (topic.gradient && topic.gradient[0]) || topic.g1 || "#f59e0b";
    const g2 = (topic.gradient && topic.gradient[1]) || topic.g2 || "#f97316";
    el.inputTopicG1.value = g1;
    el.inputTopicG1Picker.value = g1;
    el.inputTopicG2.value = g2;
    el.inputTopicG2Picker.value = g2;
    el.inputTopicDesc.value = topic.desc || "";
  } else {
    el.topicModalTitle.textContent = "Thêm chủ đề mới";
    el.inputTopicOriginalId.value = "";
    el.inputTopicId.readOnly = false;
    delete el.inputTopicId.dataset.userEdited;
    el.inputTopicG1.value = "#f59e0b";
    el.inputTopicG1Picker.value = "#f59e0b";
    el.inputTopicG2.value = "#f97316";
    el.inputTopicG2Picker.value = "#f97316";
    el.inputTopicEmoji.value = "📚";
  }

  el.topicModal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(function () { el.inputTopicName.focus(); }, 60);
}

function handleTopicSubmit(event) {
  event.preventDefault();
  if (!requireAdmin()) return;
  clearTopicFormErrors();

  const mode = el.inputTopicMode.value;
  const originalId = el.inputTopicOriginalId.value;
  const name = el.inputTopicName.value.trim();
  const vi = el.inputTopicVi.value.trim();
  let id = el.inputTopicId.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const emoji = el.inputTopicEmoji.value.trim() || "📚";
  const g1 = el.inputTopicG1.value.trim() || "#f59e0b";
  const g2 = el.inputTopicG2.value.trim() || "#f97316";
  const desc = el.inputTopicDesc.value.trim();

  let hasError = false;
  if (!name) { showFieldError(el.inputTopicName, el.errorTopicName, "Vui lòng nhập tên tiếng Anh của chủ đề."); hasError = true; }
  if (!vi) { showFieldError(el.inputTopicVi, el.errorTopicVi, "Vui lòng nhập tên tiếng Việt của chủ đề."); hasError = true; }
  if (!id) {
    id = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
    el.inputTopicId.value = id;
  }
  if (!id) {
    showFieldError(el.inputTopicId, el.errorTopicId, "Vui lòng nhập mã ID cho chủ đề (chữ thường, không dấu).");
    hasError = true;
  }

  if (mode === "add") {
    const existing = allTopics().some(function (t) { return t.id === id; });
    if (existing) {
      showFieldError(el.inputTopicId, el.errorTopicId, 'Mã chủ đề "' + id + '" đã tồn tại.');
      hasError = true;
    }
  }

  if (hasError) return;

  const customTopics = getCustomTopics();
  const topicData = {
    id: id,
    name: name,
    en: name,
    vi: vi,
    emoji: emoji,
    g1: g1,
    g2: g2,
    gradient: [g1, g2],
    desc: desc || ("Từ vựng tiếng Anh chủ đề " + vi),
    isCustom: true,
    words: []
  };

  if (mode === "edit") {
    const idx = customTopics.findIndex(function (t) { return t.id === originalId; });
    if (idx !== -1) {
      customTopics[idx] = Object.assign({}, customTopics[idx], topicData);
    } else {
      customTopics.push(topicData);
    }
  } else {
    customTopics.push(topicData);
  }

  writeStore(KEY_CUSTOM_TOPICS, customTopics);
  closeAllModals();
  renderAll();
  renderTopicSelects();
  showToast('Đã lưu chủ đề "' + name + '" thành công!');
}

function deleteTopic(topicId) {
  if (!requireAdmin()) return;
  const topic = allTopics().find(function (t) { return t.id === topicId; });
  const name = topic ? topic.name : topicId;

  askConfirm(
    "Xóa chủ đề",
    'Bạn có chắc chắn muốn xóa chủ đề "' + name + '" không?',
    "Toàn bộ từ vựng thuộc chủ đề này do Admin thêm vào cũng sẽ bị xóa.",
    function () {
      let customTopics = getCustomTopics().filter(function (t) { return t.id !== topicId; });
      writeStore(KEY_CUSTOM_TOPICS, customTopics);

      // Xóa từ vựng thuộc chủ đề này trong addedWords
      const added = getAdded();
      if (added[topicId]) {
        delete added[topicId];
        writeStore(KEY_ADDED, added);
      }

      renderAll();
      renderTopicSelects();
      showToast('Đã xóa chủ đề "' + name + '".');
    }
  );
}

/* ================= PHẦN 14: XÓA / KHÔI PHỤC ================= */

// Các chủ đề đang chứa từ này (từ trùng tên có thể nằm ở nhiều chủ đề)
function topicsWithWord(key) {
  return allTopics().filter(function (t) {
    return effectiveWords(t.id).some(function (w) { return wordKey(w.en) === key; });
  }).map(function (t) { return t.name; });
}

function deleteWord(key) {
  const word = findWordAnywhere(key);
  if (!word) { showToast("Không tìm thấy từ này.", "error"); return; }
  const names = topicsWithWord(key);
  const where = names.length > 1
    ? "khỏi " + names.length + " chủ đề: " + names.join(", ")
    : "khỏi chủ đề " + (names[0] || word.topicName || "");

  askConfirm(
    "Xóa từ vựng",
    'Bạn có chắc muốn xóa từ "' + word.en + '" ' + where + '?',
    "Từ này sẽ không còn xuất hiện trên trang học và quiz.",
    function () {
      const removed = getRemoved();
      if (removed.indexOf(key) === -1) removed.push(key);
      writeStore(KEY_REMOVED, removed);

      // Gỡ khỏi danh sách từ tự thêm (nếu có)
      const added = getAdded();
      let changedAdded = false;
      Object.keys(added).forEach(function (tid) {
        const before = added[tid].length;
        added[tid] = added[tid].filter(function (w) { return wordKey(w.en) !== key; });
        if (added[tid].length !== before) changedAdded = true;
      });
      if (changedAdded) writeStore(KEY_ADDED, added);

      // Gỡ khỏi danh sách từ đã sửa (nếu có)
      const edited = getEdited();
      if (edited[key]) {
        delete edited[key];
        writeStore(KEY_EDITED, edited);
      }

      renderAll();
      showToast('Đã xóa từ "' + word.en + '".');
    }
  );
}

function resetWords() {
  askConfirm(
    "Khôi phục từ vựng gốc",
    "Xóa toàn bộ từ đã thêm, sửa, xóa và đưa hệ thống về dữ liệu gốc?",
    "Từ vựng sẽ trở về đúng dữ liệu ban đầu của website.",
    function () {
      [KEY_EDITED, KEY_ADDED, KEY_REMOVED, KEY_HIDDEN].forEach(removeStore);
      renderAll();
      showToast("Đã khôi phục từ vựng gốc.", "info");
    }
  );
}

function toggleTopic(topicId) {
  const hidden = getHiddenTopics();
  const index = hidden.indexOf(topicId);

  if (index === -1) {
    hidden.push(topicId);
    showToast("Đã tắt chủ đề " + topicId + ".");
  } else {
    hidden.splice(index, 1);
    showToast("Đã bật chủ đề " + topicId + ".");
  }
  writeStore(KEY_HIDDEN, hidden);
  renderAll();
}

/* ================= PHẦN 15: NGƯỜI HỌC & KẾT QUẢ ================= */

function clearUserProgress(name) {
  askConfirm(
    "Xóa tiến độ người học",
    "Xóa toàn bộ tiến độ học của \"" + name + "\"?",
    "Tiến độ và kết quả của người học này trên hệ thống sẽ được xóa.",
    function () {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.indexOf(PREFIX_LEARNED + name + "_") === 0) keys.push(key);
        if (key === PREFIX_BEST + name) keys.push(key);
      }
      keys.forEach(removeStore);

      // gỡ người học khỏi danh sách đã đăng ký
      const reg = readStore(USERS_REGISTRY_KEY, []);
      writeStore(USERS_REGISTRY_KEY, reg.filter(function (u) { return u.name !== name; }));

      // gỡ luôn hồ sơ nếu đang là người dùng hiện tại trên máy này
      if (getCurrentUserName() === name) removeStore(KEY_USER);

      // Gửi yêu cầu xóa lên Server để đồng bộ mọi máy
      if (window.fetch) {
        fetch("/api/admin/clear-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name })
        }).then(function (res) { return res.ok ? res.json() : null; })
          .then(function (data) {
            if (data && data.stats) {
              serverStats = data.stats;
              renderAll();
            }
          }).catch(function () {});
      }

      renderAll();
      showToast('Đã xóa tiến độ của "' + name + '".');
    }
  );
}

function clearAllResults() {
  askConfirm(
    "Xóa toàn bộ kết quả Quiz",
    "Xóa lịch sử làm bài của tất cả người học trên toàn hệ thống?",
    "Tiến độ học từ vựng vẫn được giữ nguyên.",
    function () {
      removeStore(KEY_QUIZ_HISTORY);

      // Gửi yêu cầu xóa lịch sử quiz lên Server để đồng bộ mọi máy
      if (window.fetch) {
        fetch("/api/admin/clear-results", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        }).then(function (res) { return res.ok ? res.json() : null; })
          .then(function (data) {
            if (data && data.stats) {
              serverStats = data.stats;
              renderAll();
            }
          }).catch(function () {});
      }

      renderAll();
      showToast("Đã xóa toàn bộ kết quả Quiz.", "info");
    }
  );
}

function clearAllUserData() {
  askConfirm(
    "Xóa dữ liệu người học",
    "Xóa toàn bộ tiến độ học và kết quả quiz của mọi người dùng?",
    "Từ vựng do Admin quản lý sẽ không bị ảnh hưởng.",
    function () {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.indexOf(PREFIX_LEARNED) === 0 || key.indexOf(PREFIX_BEST) === 0 || key === KEY_QUIZ_HISTORY || key === USERS_REGISTRY_KEY) {
          keys.push(key);
        }
      }
      keys.forEach(removeStore);

      // Xóa trên Server
      if (window.fetch) {
        fetch("/api/admin/clear-results", { method: "POST" }).catch(function () {});
      }

      renderAll();
      showToast("Đã xóa dữ liệu người học.", "info");
    }
  );
}

/* ================= PHẦN 16: SAO LƯU & ĐẶT LẠI ================= */

function exportData() {
  const data = {};
  data[KEY_EDITED] = getEdited();
  data[KEY_ADDED] = getAdded();
  data[KEY_REMOVED] = getRemoved();
  data[KEY_HIDDEN] = getHiddenTopics();
  data[KEY_CUSTOM_TOPICS] = getCustomTopics();
  data[USERS_REGISTRY_KEY] = readStore(USERS_REGISTRY_KEY, []);

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "engbee-admin-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Đã tải file sao lưu.");
}

function importData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    try {
      const data = JSON.parse(reader.result);
      if (data[KEY_EDITED]) writeStore(KEY_EDITED, data[KEY_EDITED]);
      if (data[KEY_ADDED]) writeStore(KEY_ADDED, data[KEY_ADDED]);
      if (data[KEY_REMOVED]) writeStore(KEY_REMOVED, data[KEY_REMOVED]);
      if (data[KEY_HIDDEN]) writeStore(KEY_HIDDEN, data[KEY_HIDDEN]);
      if (data[KEY_CUSTOM_TOPICS]) writeStore(KEY_CUSTOM_TOPICS, data[KEY_CUSTOM_TOPICS]);
      if (data[USERS_REGISTRY_KEY]) writeStore(USERS_REGISTRY_KEY, data[USERS_REGISTRY_KEY]);
      pushAdminDataToServer();
      renderAll();
      showToast("Đã nạp dữ liệu từ file.", "info");
    } catch (e) {
      showToast("File không đúng định dạng JSON.", "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function resetEverything() {
  askConfirm(
    "Xóa toàn bộ dữ liệu",
    "Xóa sạch mọi dữ liệu EngBee trên hệ thống và trình duyệt này?",
    "Bao gồm cả từ vựng, tiến độ học, kết quả quiz và thông tin đăng nhập.",
    function () {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // xóa cả dữ liệu quản trị, tiến độ học và lịch sử quiz (eb_quiz_history)
        if (key && (key.indexOf("engbee_") === 0 || key.indexOf("eb_") === 0)) keys.push(key);
      }
      keys.forEach(removeStore);

      // Reset server DB
      if (window.fetch) {
        fetch("/api/admin/reset", { method: "POST" }).catch(function () {});
      }

      closeAllModals();
      showLogin();
      showToast("Đã xóa toàn bộ dữ liệu.", "info");
    }
  );
}

/* ================= PHẦN 17: RENDER TỔNG HỢP ================= */

function renderAll() {
  if (!getSession()) return;
  renderDashboard();
  renderWords();
  renderTopics();
  renderUsers();
  renderResults();

  if (el.infoSession) {
    const s = getSession();
    el.infoSession.textContent = s
      ? "Đăng nhập lúc " + fmtTime(s.loginAt)
      : "-";
  }
}

function renderTopicSelects() {
  // Select chủ đề trong modal thêm/sửa
  el.inputTopic.innerHTML = "";
  allTopics().forEach(function (t) {
    const o = document.createElement("option");
    o.value = t.id;
    o.textContent = t.name + " (" + t.vi + ")";
    el.inputTopic.appendChild(o);
  });
  renderWordSelect();
}

/* ================= PHẦN 18: GẮN SỰ KIỆN ================= */

// Nút menu
el.menuToggle.addEventListener("click", function () {
  el.sidebar.classList.toggle("is-open");
  el.sidebarOverlay.classList.toggle("is-open");
});
el.sidebarOverlay.addEventListener("click", function () {
  el.sidebar.classList.remove("is-open");
  el.sidebarOverlay.classList.remove("is-open");
});

// Chuyển khu vực
document.querySelectorAll(".nav__item").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const view = btn.getAttribute("data-view");
    if (view) {
      switchView(view, true);
    }
  });
});

// Tự động nhận diện phần đang xem khi cuộn trang (Scrollspy)
let scrollTicking = false;
window.addEventListener("scroll", function () {
  if (!scrollTicking) {
    window.requestAnimationFrame(function () {
      handleScroll();
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

window.addEventListener("resize", function () {
  if (!scrollTicking) {
    window.requestAnimationFrame(function () {
      handleScroll();
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

// Đăng nhập / đăng xuất
el.loginForm.addEventListener("submit", handleLogin);
el.btnLogout.addEventListener("click", handleLogout);

// Bảng từ vựng: Sửa / Xóa
el.wordBody.addEventListener("click", function (event) {
  const btn = event.target.closest("button");
  if (!btn) return;
  const key = btn.getAttribute("data-key");
  if (btn.getAttribute("data-act") === "edit") openWordModal("edit", key);
  if (btn.getAttribute("data-act") === "del") deleteWord(key);
});

// Bộ lọc và tìm kiếm từ vựng
el.wordTopicFilter.addEventListener("change", function () { wordPage = 1; renderWords(); });
  el.wordSearch.addEventListener("input", function () { wordPage = 1; renderWords(); });

  // Phân trang danh sách từ vựng
  el.wordPagination.addEventListener("click", function (event) {
    const btn = event.target.closest("button[data-pg]");
    if (!btn || btn.disabled) return;
    const pg = btn.getAttribute("data-pg");
    let next = wordPage;
    if (pg === "prev") next -= 1;
    else if (pg === "next") next += 1;
    else next = Number(pg);
    if (next >= 1) {
      wordPage = next;
      renderWords();
    }
  });
el.btnAddWord.addEventListener("click", function () { openWordModal("add", ""); });
el.btnRestoreWords.addEventListener("click", resetWords);

// Chủ đề: Nút thêm chủ đề
if (el.btnAddTopic) {
  el.btnAddTopic.addEventListener("click", function () { openTopicModal("add", ""); });
}

// Chủ đề: Sửa / Xóa chủ đề tự tạo
el.topicGrid.addEventListener("click", function (event) {
  const btn = event.target.closest("button");
  if (!btn) return;
  const act = btn.getAttribute("data-act");
  const topicId = btn.getAttribute("data-topic");
  if (act === "edit-topic") openTopicModal("edit", topicId);
  if (act === "del-topic") deleteTopic(topicId);
});

// Chủ đề: công tắc bật/tắt
el.topicGrid.addEventListener("change", function (event) {
  const input = event.target;
  if (input.getAttribute("data-act") === "toggle") toggleTopic(input.getAttribute("data-topic"));
});

// Đồng bộ bộ chọn màu chủ đề
if (el.inputTopicG1Picker && el.inputTopicG1) {
  el.inputTopicG1Picker.addEventListener("input", function () { el.inputTopicG1.value = el.inputTopicG1Picker.value; });
  el.inputTopicG1.addEventListener("input", function () {
    if (/^#[0-9A-Fa-f]{6}$/.test(el.inputTopicG1.value)) el.inputTopicG1Picker.value = el.inputTopicG1.value;
  });
}
if (el.inputTopicG2Picker && el.inputTopicG2) {
  el.inputTopicG2Picker.addEventListener("input", function () { el.inputTopicG2.value = el.inputTopicG2Picker.value; });
  el.inputTopicG2.addEventListener("input", function () {
    if (/^#[0-9A-Fa-f]{6}$/.test(el.inputTopicG2.value)) el.inputTopicG2Picker.value = el.inputTopicG2.value;
  });
}

// Tự động tạo mã chủ đề khi nhập tên tiếng Anh
if (el.inputTopicName && el.inputTopicId) {
  el.inputTopicName.addEventListener("input", function () {
    if (el.inputTopicMode.value === "add" && !el.inputTopicId.dataset.userEdited) {
      el.inputTopicId.value = el.inputTopicName.value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
    }
  });
  el.inputTopicId.addEventListener("input", function () {
    el.inputTopicId.dataset.userEdited = "true";
  });
}

// Người học: xóa tiến độ
// (đã loại bỏ chức năng xóa tiến độ người học theo yêu cầu)

// Kết quả quiz
// (đã loại bỏ chức năng xóa toàn bộ kết quả theo yêu cầu)

// Cài đặt
el.btnResetWords.addEventListener("click", resetWords);
el.btnExport.addEventListener("click", exportData);
el.btnImport.addEventListener("click", function () { el.importFile.click(); });
el.importFile.addEventListener("change", importData);
el.btnResetAll.addEventListener("click", resetEverything);

// Modal: đóng
document.querySelectorAll("[data-close='true']").forEach(function (node) {
  node.addEventListener("click", closeAllModals);
});
el.btnConfirmOk.addEventListener("click", function () {
  const action = pendingAction;
  closeAllModals();
  if (action) action();
});
el.wordForm.addEventListener("submit", handleWordSubmit);
if (el.topicForm) el.topicForm.addEventListener("submit", handleTopicSubmit);

// Gỡ lỗi khi người dùng đang gõ
[el.loginName, el.loginPass, el.inputEn, el.inputVi, el.inputIpa, el.inputEx, el.inputExVi, el.inputTopicName, el.inputTopicVi, el.inputTopicId].forEach(function (input) {
  if (input) input.addEventListener("input", function () { input.classList.remove("is-error"); });
});

// Phím Esc đóng modal
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") closeAllModals();
});

// Nút "Về trang chủ": chạy qua server thì về "/", mở file trực tiếp (file://) thì về "../index.html"
document.addEventListener("click", function (event) {
  const target = event.target;
  const link = target && target.closest ? target.closest(".go-home") : null;
  if (!link) return;
  event.preventDefault();
  location.href = location.protocol === "file:" ? "../index.html" : "/";
});

// Đăng xuất ở tab khác thì đóng tab này
window.addEventListener("storage", function (event) {
  if (event.key === ADMIN_SESSION_KEY && getSession() === null) showLogin();
});

/* ================= PHẦN 19: KHỞI TẠO ================= */

(function init() {
  const session = getSession();
  if (session === null) { showLogin(); return; }
  enterAdmin(session);
})();
