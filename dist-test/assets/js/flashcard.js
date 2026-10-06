// EngBee - flashcard.js: trang Flashcard học từ vựng (từ, phiên âm, ví dụ)
(function () {
  "use strict";

  var STORAGE_PREFIX = "engbee_learned_";

  function userScope() {
    try {
      var p = JSON.parse(localStorage.getItem("engbee_user") || "null");
      if (p && typeof p.name === "string" && p.name.trim()) return p.name.trim();
    } catch (e) { /* bỏ qua */ }
    return "guest";
  }

  function getLoadedTopics() {
    var raw = (typeof EngBeeData !== "undefined" && EngBeeData.topics) ? EngBeeData.topics : [];
    if (window.EngBeeAdminData) {
      return raw.filter(function (t) {
        return !window.EngBeeAdminData.isTopicHidden(t.id);
      }).map(function (t) {
        var baseCopy = Array.isArray(t.words) ? t.words.slice() : [];
        var words = window.EngBeeAdminData.apply(t.id, baseCopy);
        return {
          id: t.id,
          name: t.name,
          vi: t.vi,
          gradient: t.gradient || ["#4facfe", "#00f2fe"],
          words: words
        };
      });
    }
    return raw;
  }

  var topics = getLoadedTopics();
  if (!topics.length) return;

  function topicById(id) {
    for (var i = 0; i < topics.length; i++) {
      if (topics[i].id === id) return topics[i];
    }
    return topics[0];
  }

  function pageName(id) {
    return id === "travel" ? "learn.html" : "learn-" + id + ".html";
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
    if (!el || !g) return;
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

  function loadSet(id) {
    try {
      var arr = JSON.parse(localStorage.getItem(STORAGE_PREFIX + userScope() + "_" + id) || "null");
      if (!Array.isArray(arr)) return [];
      var t = topicById(id);
      var maxW = (t && t.words) ? t.words.length : 50;
      return arr.filter(function (x) { return typeof x === "number" && x >= 0 && x < maxW; });
    } catch (e) {
      return [];
    }
  }

  function saveSet() {
    try {
      localStorage.setItem(STORAGE_PREFIX + userScope() + "_" + currentTopic.id, JSON.stringify(mastered));
    } catch (e) { /* bỏ qua */ }
  }

  function hasMastered(i) { return mastered.indexOf(i) !== -1; }

  function toggleMastered(i) {
    var p = mastered.indexOf(i);
    if (p === -1) mastered.push(i); else mastered.splice(p, 1);
    saveSet();
    if (window.EngBeeTrackUser) window.EngBeeTrackUser();
  }

  function renderProgress() {
    var pct = total > 0 ? Math.round((mastered.length / total) * 100) : 0;
    if (progressFill) progressFill.style.width = pct + "%";
    if (progressText) progressText.textContent = mastered.length + " / " + total;
    if (feedback) {
      if (total > 0 && mastered.length === total) {
        if (fbText) fbText.textContent = "Chúc mừng! Bạn đã thuộc toàn bộ " + total + " từ của chủ đề " + currentTopic.name + ".";
        feedback.hidden = false;
      } else {
        feedback.hidden = true;
      }
    }
  }

  function renderPills() {
    if (!pillsBox) return;
    pillsBox.innerHTML = "";
    topics.forEach(function (t) {
      var a = document.createElement("a");
      a.className = "topic-pill" + (t.id === currentTopic.id ? " active" : "");
      a.href = pageName(t.id);
      a.setAttribute("aria-current", t.id === currentTopic.id ? "true" : "false");

      var badge = document.createElement("span");
      badge.className = "pill-badge";
      styleGrad(badge, t.gradient);
      badge.textContent = t.name.slice(0, 1).toUpperCase();

      var textWrap = document.createElement("span");
      textWrap.className = "pill-text";

      var strong = document.createElement("strong");
      strong.textContent = t.name;

      var small = document.createElement("small");
      small.textContent = (t.vi || "") + " - " + t.words.length + " từ";

      textWrap.appendChild(strong);
      textWrap.appendChild(small);

      a.appendChild(badge);
      a.appendChild(textWrap);

      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        switchTopic(t.id);
      });

      pillsBox.appendChild(a);
    });
  }

  function setFlip(on) {
    flipped = !!on;
    if (flashcard) flashcard.classList.toggle("flipped", flipped);
  }

  // ---- Ví dụ ngẫu nhiên: mỗi lần lật thẻ chọn 1 câu khác câu đang hiển thị ----
  var exPool = [];
  var exPos = 0;

  function buildExPool(w) {
    var pool = [];
    var seen = {};
    function add(en, vi) {
      if (!en) return;
      var k = String(en).trim().toLowerCase();
      if (seen[k]) return;
      seen[k] = true;
      pool.push({ en: en, vi: vi || "" });
    }
    if (w) {
      add(w.ex, w.exvi);
      if (Array.isArray(w.exs)) {
        w.exs.forEach(function (s) { if (s && typeof s === "object") add(s.en, s.vi); });
      }
    }
    return pool;
  }

  function showExample(p) {
    var e = exPool[p];
    if (wordEx) wordEx.textContent = e ? e.en : "";
    if (wordExvi) wordExvi.textContent = e ? e.vi : "";
  }

  function randomExample() {
    if (exPool.length < 2) { exPos = 0; showExample(0); return; }
    var p;
    do { p = Math.floor(Math.random() * exPool.length); } while (p === exPos);
    exPos = p;
    showExample(p);
  }

  function renderCard() {
    var w = currentTopic.words[index];
    if (!w) return;
    if (cardIndex) cardIndex.textContent = (index + 1) + " / " + total;
    if (wordEn) wordEn.textContent = w.en;
    if (wordIpa) wordIpa.textContent = w.ipa || "";
    if (wordVi) wordVi.textContent = w.vi;
    exPool = buildExPool(w);
    exPos = 0;
    showExample(0);
    if (masteredBtn) masteredBtn.classList.toggle("active", hasMastered(index));
    if (notMasteredBtn) notMasteredBtn.classList.toggle("active", !hasMastered(index));
    renderProgress();
  }

  function setTopicStyle() {
    styleGrad(hero, currentTopic.gradient);
    if (heroName) heroName.textContent = currentTopic.name;
    if (heroCount) heroCount.textContent = currentTopic.words.length;
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

  function reloadData() {
    topics = getLoadedTopics();
    if (!topics.length) return;
    currentTopic = topicById(currentTopic ? currentTopic.id : topics[0].id);
    total = currentTopic.words.length;
    if (index >= total) index = Math.max(0, total - 1);
    mastered = loadSet(currentTopic.id);
    setTopicStyle();
    renderPills();
    renderCard();
  }

  function go(step) {
    if (total <= 0) return;
    index = (index + step + total) % total;
    setFlip(false);
    renderCard();
  }

  function flipCard() {
    if (!flipped) randomExample();
    setFlip(!flipped);
  }

  // ---- events ----
  if (flashcard) flashcard.addEventListener("click", flipCard);
  var flipBtn = document.getElementById("flip-btn");
  if (flipBtn) flipBtn.addEventListener("click", function (e) { e.stopPropagation(); flipCard(); });

  var spkFront = document.getElementById("speak-front");
  if (spkFront) spkFront.addEventListener("click", function (e) {
    e.stopPropagation();
    if (currentTopic.words[index]) speak(currentTopic.words[index].en);
  });

  var spkBack = document.getElementById("speak-back");
  if (spkBack) spkBack.addEventListener("click", function (e) {
    e.stopPropagation();
    if (currentTopic.words[index]) speak(currentTopic.words[index].en);
  });

  var prevBtn = document.getElementById("prev-btn");
  if (prevBtn) prevBtn.addEventListener("click", function () { go(-1); });

  var nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.addEventListener("click", function () { go(1); });

  if (masteredBtn) {
    masteredBtn.addEventListener("click", function () {
      if (!hasMastered(index)) toggleMastered(index);
      renderCard();
    });
  }
  if (notMasteredBtn) {
    notMasteredBtn.addEventListener("click", function () {
      if (hasMastered(index)) toggleMastered(index);
      renderCard();
    });
  }

  var resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (!mastered.length) return;
      if (confirm("Xóa toàn bộ tiến độ của chủ đề " + currentTopic.name + "?")) {
        mastered = [];
        saveSet();
        renderCard();
      }
    });
  }

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

  if (window.EngBeeAdminData && typeof window.EngBeeAdminData.onChange === "function") {
    window.EngBeeAdminData.onChange(reloadData);
  } else {
    window.addEventListener("storage", reloadData);
    window.addEventListener("engbee_data_changed", reloadData);
  }
})();
