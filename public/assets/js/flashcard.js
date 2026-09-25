// EngBee - flashcard.js: trang Flashcard học từ vựng (từ, phiên âm, ví dụ)
(function () {
  "use strict";

  var topics = (typeof EngBeeData !== "undefined" && EngBeeData.topics) || [];
  if (!topics.length) return;

  var STORAGE_PREFIX = "engbee_learned_";

  // Gắn tên người dùng vào khóa để mỗi tài khoản có dữ liệu riêng
  function userScope() {
    try {
      var p = JSON.parse(localStorage.getItem("engbee_user") || "null");
      if (p && typeof p.name === "string" && p.name.trim()) return p.name.trim();
    } catch (e) { /* bỏ qua */ }
    return "guest";
  }

  function topicById(id) {
    for (var i = 0; i < topics.length; i++) {
      if (topics[i].id === id) return topics[i];
    }
    return topics[0];
  }

  function pageName(id) {
    return id === topics[0].id ? "learn.html" : "learn-" + id + ".html";
  }

  var currentTopic = topicById(topics[0].id);
  var total = currentTopic.words.length;
  var index = 0;
  var flipped = false;
  var mastered = [];

  // ---- DOM ----
  var hero = document.getElementById("learn-hero");
  var heroName = document.getElementById("hero-name");
  var heroCount = document.getElementById("hero-count");
  var pillsBox = document.getElementById("topic-pills");
  var progressFill = document.getElementById("progress-fill");
  var progressText = document.getElementById("progress-text");
  var feedback = document.getElementById("topic-feedback");
  var fbText = document.getElementById("fb-text");
  var flashcard = document.getElementById("flashcard");
  var cardIndex = document.getElementById("card-index");
  var wordEn = document.getElementById("word-en");
  var wordIpa = document.getElementById("word-ipa");
  var wordVi = document.getElementById("word-vi");
  var wordEx = document.getElementById("word-ex");
  var wordExvi = document.getElementById("word-exvi");
  var masteredBtn = document.getElementById("mastered-btn");
  var notMasteredBtn = document.getElementById("not-mastered-btn");

  function styleGrad(el, g) {
    el.style.setProperty("--g1", g[0]);
    el.style.setProperty("--g2", g[1]);
    el.style.background = "linear-gradient(135deg, " + g[0] + ", " + g[1] + ")";
  }

  function speak(text) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }

  // ---- persisted "đã thuộc" set ----
  function loadSet(id) {
    try {
      var arr = JSON.parse(localStorage.getItem(STORAGE_PREFIX + userScope() + "_" + id) || "null");
      if (!Array.isArray(arr)) return [];
      var t = topicById(id);
      return arr.filter(function (x) { return typeof x === "number" && x >= 0 && x < t.words.length; });
    } catch (e) {
      return [];
    }
  }

  function saveSet() {
    try {
      localStorage.setItem(STORAGE_PREFIX + userScope() + "_" + currentTopic.id, JSON.stringify(mastered));
    } catch (e) { /* localStorage không khả dụng */ }
  }

  function hasMastered(i) { return mastered.indexOf(i) !== -1; }

  function toggleMastered(i) {
    var p = mastered.indexOf(i);
    if (p === -1) mastered.push(i); else mastered.splice(p, 1);
    saveSet();
  }

  // ---- rendering ----
  function renderPills() {
    pillsBox.innerHTML = "";
    topics.forEach(function (t) {
      var active = t.id === currentTopic.id;
      var a = document.createElement("a");
      a.href = "#";
      a.className = "topic-pill" + (active ? " active" : "");
      a.setAttribute("aria-current", active ? "true" : "false");
      a.title = "Chủ đề " + t.name;

      var badge = document.createElement("span");
      badge.className = "pill-badge";
      badge.textContent = t.name.charAt(0).toUpperCase();
      badge.style.background = "linear-gradient(135deg, " + t.gradient[0] + ", " + t.gradient[1] + ")";

      var txt = document.createElement("span");
      txt.className = "pill-text";
      var strong = document.createElement("strong");
      strong.textContent = t.name;
      var small = document.createElement("small");
      small.textContent = t.vi + " - " + t.words.length + " từ";
      txt.appendChild(strong);
      txt.appendChild(small);

      a.appendChild(badge);
      a.appendChild(txt);
      a.addEventListener("click", function (e) {
        e.preventDefault();
        switchTopic(t.id);
      });
      pillsBox.appendChild(a);
    });
  }

  function renderProgress() {
    var pct = Math.round((mastered.length / total) * 100);
    progressFill.style.width = pct + "%";
    progressText.textContent = mastered.length + " / " + total;

    if (mastered.length === total) {
      fbText.textContent = "Chúc mừng! Bạn đã thuộc cả " + total + " từ của chủ đề " + currentTopic.name + ".";
      feedback.hidden = false;
      styleGrad(feedback, currentTopic.gradient);
    } else {
      feedback.hidden = true;
    }
  }

  function setFlip(on) {
    flipped = !!on;
    flashcard.classList.toggle("flipped", flipped);
  }

  function renderCard() {
    var w = currentTopic.words[index];
    if (!w) return;
    cardIndex.textContent = (index + 1) + " / " + total;
    wordEn.textContent = w.en;
    wordIpa.textContent = w.ipa;
    wordVi.textContent = w.vi;
    wordEx.textContent = w.ex;
    wordExvi.textContent = w.exvi;
    masteredBtn.classList.toggle("active", hasMastered(index));
    notMasteredBtn.classList.toggle("active", !hasMastered(index));
    renderProgress();
  }

  function setTopicStyle() {
    styleGrad(hero, currentTopic.gradient);
    heroName.textContent = currentTopic.name;
    heroCount.textContent = currentTopic.words.length;
    document.title = "EngBee - Flashcard " + currentTopic.name;
  }

  function switchTopic(id) {
    currentTopic = topicById(id);
    total = currentTopic.words.length;
    index = 0;
    mastered = loadSet(currentTopic.id);
    setTopicStyle();
    renderPills();
    setFlip(false);
    renderCard();
  }

  function go(step) {
    index = (index + step + total) % total;
    setFlip(false);
    renderCard();
  }

  function flipCard() {
    setFlip(!flipped);
  }

  // ---- events ----
  flashcard.addEventListener("click", flipCard);
  document.getElementById("flip-btn").addEventListener("click", function (e) { e.stopPropagation(); flipCard(); });
  document.getElementById("speak-front").addEventListener("click", function (e) { e.stopPropagation(); speak(currentTopic.words[index].en); });
  document.getElementById("speak-back").addEventListener("click", function (e) { e.stopPropagation(); speak(currentTopic.words[index].en); });

  document.getElementById("prev-btn").addEventListener("click", function () { go(-1); });
  document.getElementById("next-btn").addEventListener("click", function () { go(1); });

  masteredBtn.addEventListener("click", function () {
    if (!hasMastered(index)) toggleMastered(index);
    renderCard();
  });
  notMasteredBtn.addEventListener("click", function () {
    if (hasMastered(index)) toggleMastered(index);
    renderCard();
  });

  document.getElementById("reset-btn").addEventListener("click", function () {
    if (!mastered.length) return;
    if (confirm("Xóa toàn bộ tiến độ của chủ đề " + currentTopic.name + "?")) {
      mastered = [];
      saveSet();
      renderCard();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === " ") { e.preventDefault(); flipCard(); }
  });

  // ---- init ----
  mastered = loadSet(currentTopic.id);
  setTopicStyle();
  renderPills();
  renderCard();
})();
