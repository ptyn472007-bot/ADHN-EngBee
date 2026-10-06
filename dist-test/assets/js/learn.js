// EngBee - learn.js: chức năng trang Học từ vựng (mỗi chủ đề một trang)
(function () {
  "use strict";

  var topics = EngBeeData.topics || [];
  var pageTopic = (typeof window.ENG_BEE_TOPIC !== "undefined" && window.ENG_BEE_TOPIC) || "";
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

  function getTopicId() {
    if (pageTopic && topicById(pageTopic).id === pageTopic) return pageTopic;
    return topics[0].id;
  }

  function pageName(id) {
    return id === topics[0].id ? "learn.html" : "learn-" + id + ".html";
  }

  var currentTopic = topicById(getTopicId());
  var total = currentTopic.words.length;
  var state = { view: "cards", index: 0, flipped: false };

  function loadSet(id) {
    try {
      var arr = JSON.parse(localStorage.getItem(STORAGE_PREFIX + userScope() + "_" + id) || "null");
      return Array.isArray(arr)
        ? arr.filter(function (x) { return typeof x === "number" && x >= 0 && x < total; })
        : [];
    } catch (e) {
      return [];
    }
  }

  var mastered = loadSet(currentTopic.id);

  function saveSet() {
    try {
      localStorage.setItem(STORAGE_PREFIX + userScope() + "_" + currentTopic.id, JSON.stringify(mastered));
    } catch (e) { /* lưu trữ không khả dụng */ }
  }

  function hasMastered(i) { return mastered.indexOf(i) !== -1; }

  function toggleMastered(i) {
    var idx = mastered.indexOf(i);
    if (idx === -1) mastered.push(i); else mastered.splice(idx, 1);
    saveSet();
  }

  // ---- DOM ----
  var pillsBox = document.getElementById("topic-pills");
  var hero = document.querySelector(".learn-hero");
  var progressFill = document.getElementById("progress-fill");
  var progressText = document.getElementById("progress-text");
  var feedback = document.getElementById("topic-feedback");
  var fbText = document.getElementById("fb-text");
  var viewCards = document.getElementById("view-cards");
  var viewList = document.getElementById("view-list");
  var searchBox = document.getElementById("search-box");
  var wordGrid = document.getElementById("word-grid");
  var flashcard = document.getElementById("flashcard");
  var cardIndex = document.getElementById("card-index");
  var wordEn = document.getElementById("word-en");
  var wordIpa = document.getElementById("word-ipa");
  var wordVi = document.getElementById("word-vi");
  var wordEx = document.getElementById("word-ex");
  var wordExvi = document.getElementById("word-exvi");
  var masteredBtn = document.getElementById("mastered-btn");
  var notMasteredBtn = document.getElementById("not-mastered-btn");

  function styleTopicEl(el, g) {
    el.style.background = "linear-gradient(135deg, " + g[0] + ", " + g[1] + ")";
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }

  // ---- Topic pills (link sang các trang chủ đề) ----
  function renderPills() {
    pillsBox.innerHTML = "";
    topics.forEach(function (t) {
      var active = t.id === currentTopic.id;
      var a = document.createElement("a");
      a.href = pageName(t.id);
      a.className = "topic-pill" + (active ? " active" : "");
      a.setAttribute("aria-current", active ? "true" : "false");
      a.title = "Học chủ đề " + t.name;

      var badge = document.createElement("span");
      badge.className = "pill-badge";
      badge.textContent = t.name.charAt(0).toUpperCase();
      styleTopicEl(badge, t.gradient);

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
      pillsBox.appendChild(a);
    });
  }

  // ---- rendering ----
  function renderProgress() {
    var pct = Math.round((mastered.length / total) * 100);
    progressFill.style.width = pct + "%";
    progressText.textContent = mastered.length + " / " + total;

    if (mastered.length === total) {
      fbText.textContent = "Chúc mừng! Bạn đã thuộc cả " + total + " từ của chủ đề " + currentTopic.name + ".";
      feedback.hidden = false;
      styleTopicEl(feedback, currentTopic.gradient);
    } else {
      feedback.hidden = true;
    }
  }

  function renderCard() {
    var w = currentTopic.words[state.index];
    cardIndex.textContent = (state.index + 1) + " / " + total;
    wordEn.textContent = w.en;
    wordIpa.textContent = w.ipa;
    wordVi.textContent = w.vi;
    wordEx.textContent = w.ex;
    wordExvi.textContent = w.exvi;
    setFlip(state.flipped);
    masteredBtn.classList.toggle("active", hasMastered(state.index));
    notMasteredBtn.classList.toggle("active", !hasMastered(state.index));
    renderProgress();
  }

  function setFlip(on) {
    state.flipped = !!on;
    flashcard.classList.toggle("flipped", state.flipped);
  }

  function flipCard() {
    setFlip(!state.flipped);
  }

  function renderGridAndReset() { /* placeholder giữ cấu trúc */ }

  function renderWordGrid() {
    var q = searchBox.value.trim().toLowerCase();
    var list = currentTopic.words;
    if (q) {
      list = list.filter(function (w) {
        return w.en.toLowerCase().indexOf(q) !== -1 || w.vi.toLowerCase().indexOf(q) !== -1;
      });
    }
    wordGrid.innerHTML = "";
    if (list.length === 0) {
      var empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = "Không tìm thấy từ nào khớp với \"" + searchBox.value.trim() + "\".";
      wordGrid.appendChild(empty);
      return;
    }
    list.forEach(function (w) {
      var pos = currentTopic.words.indexOf(w);
      var card = document.createElement("div");
      card.className = "word-card" + (hasMastered(pos) ? " learned" : "");
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", w.en + " - " + w.vi + ". Nhấn để đánh dấu đã thuộc.");

      var top = document.createElement("div");
      top.className = "wc-top";
      var left = document.createElement("span");
      var wEn = document.createElement("span");
      wEn.className = "wc-en";
      wEn.textContent = w.en;
      var wIpa = document.createElement("span");
      wIpa.className = "wc-ipa";
      wIpa.textContent = w.ipa;
      left.appendChild(wEn);
      left.appendChild(wIpa);

      var speakBtn = document.createElement("button");
      speakBtn.type = "button";
      speakBtn.className = "wc-speak";
      speakBtn.title = "Nghe phát âm";
      speakBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
      speakBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        speak(w.en);
      });

      top.appendChild(left);
      top.appendChild(speakBtn);

      var vi = document.createElement("p");
      vi.className = "wc-vi";
      vi.textContent = w.vi;
      var ex = document.createElement("p");
      ex.className = "wc-ex";
      ex.textContent = w.ex;
      var exvi = document.createElement("p");
      exvi.className = "wc-exvi";
      exvi.textContent = w.exvi;

      var mark = document.createElement("span");
      mark.className = "wc-mark";
      mark.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

      card.appendChild(top);
      card.appendChild(vi);
      card.appendChild(ex);
      card.appendChild(exvi);
      card.appendChild(mark);
      card.addEventListener("click", function () {
        toggleMastered(pos);
        render();
      });
      wordGrid.appendChild(card);
    });
  }

  function render() {
    renderCard();
    if (state.view === "list") renderWordGrid();
  }

  function setView(view) {
    state.view = view;
    var tabs = document.querySelectorAll(".view-tab");
    tabs.forEach(function (t) {
      var active = t.dataset.view === view;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    viewCards.hidden = view !== "cards";
    viewList.hidden = view !== "list";
    searchBox.hidden = view !== "list";
    if (view === "list") {
      searchBox.value = "";
      renderWordGrid();
      searchBox.focus();
    } else {
      renderCard();
    }
  }

  // ---- events ----
  var flipBtn = document.getElementById("flip-btn");
  var prevBtn = document.getElementById("prev-btn");
  var nextBtn = document.getElementById("next-btn");

  flashcard.addEventListener("click", flipCard);
  flipBtn.addEventListener("click", flipCard);

  function go(step) {
    state.index = (state.index + step + total) % total;
    setFlip(false);
    renderCard();
  }
  prevBtn.addEventListener("click", function () { go(-1); });
  nextBtn.addEventListener("click", function () { go(1); });

  masteredBtn.addEventListener("click", function () {
    if (!hasMastered(state.index)) toggleMastered(state.index);
    renderCard();
  });
  notMasteredBtn.addEventListener("click", function () {
    if (hasMastered(state.index)) toggleMastered(state.index);
    renderCard();
  });

  document.getElementById("reset-btn").addEventListener("click", function () {
    if (mastered.length === 0) return;
    if (confirm("Xóa toàn bộ tiến độ của chủ đề " + currentTopic.name + "?")) {
      mastered = [];
      saveSet();
      render();
    }
  });

  document.getElementById("speak-front").addEventListener("click", function (e) {
    e.stopPropagation();
    speak(currentTopic.words[state.index].en);
  });
  document.getElementById("speak-back").addEventListener("click", function (e) {
    e.stopPropagation();
    speak(currentTopic.words[state.index].en);
  });

  document.querySelectorAll(".view-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { setView(tab.dataset.view); });
  });

  searchBox.addEventListener("input", renderWordGrid);

  document.addEventListener("keydown", function (e) {
    if (e.target === searchBox) return;
    if (state.view !== "cards") return;
    if (e.key === "ArrowLeft") { go(-1); }
    else if (e.key === "ArrowRight") { go(1); }
    else if (e.key === " ") { e.preventDefault(); flipCard(); }
  });

  // ---- init ----
  (function init() {
    hero.style.setProperty("--g1", currentTopic.gradient[0]);
    hero.style.setProperty("--g2", currentTopic.gradient[1]);
    document.querySelector("#hero-name").textContent = currentTopic.name;
    document.querySelector("#hero-vi").textContent = currentTopic.vi;
    document.querySelector("#hero-count").textContent = currentTopic.words.length;
    document.title = "EngBee - " + currentTopic.name;
    renderPills();
    render();
  })();
})();