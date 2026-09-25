(function () {
  "use strict";

  var TOPICS = window.EngBeeData && Array.isArray(EngBeeData.topics) ? EngBeeData.topics : [];
  if (!TOPICS.length) return;

  var QUESTIONS = 10;
  var HISTORY_KEY = "eb_quiz_history";

  var state = { mode: null, topicId: null, modeName: "", items: [], index: 0, score: 0, answered: false };

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  function findTopic(id) {
    for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i].id === id) return TOPICS[i];
    return null;
  }

  function allWords() {
    var out = [];
    TOPICS.forEach(function (t) { out = out.concat(t.words); });
    return out;
  }

  function getHistory() {
    try { var h = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); return Array.isArray(h) ? h : []; }
    catch (e) { return []; }
  }

  function saveHistory(rec) {
    try {
      var h = getHistory();
      h.unshift(rec);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 60)));
    } catch (e) {}
  }

  function bestFor(mode, topicId) {
    var best = 0;
    getHistory().forEach(function (r) { if (r.mode === mode && r.topicId === topicId && r.pct > best) best = r.pct; });
    return best;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function screen(name) {
    qsa(".qz-screen").forEach(function (el) { el.classList.remove("active"); });
    qs("#qz-" + name).classList.add("active");
  }

  function buildStart() {
    var grid = qs("#qz-topic-grid");
    if (!grid) return;
    grid.innerHTML = TOPICS.map(function (t) {
      var best = bestFor("topic", t.id);
      return '<button type="button" class="qz-topic" data-topic="' + t.id + '" style="--g1:' + t.gradient[0] + ';--g2:' + t.gradient[1] + '">' +
        '<span class="qz-topic-badge">' + t.name.charAt(0) + '</span>' +
        '<span class="qz-topic-info"><strong>' + t.name + '</strong><small>' + t.vi + '</small>' +
        (best > 0 ? '<em>Tốt nhất ' + best + '%</em>' : '<em>Chưa làm</em>') +
        '</span></button>';
    }).join("");
    qsa("#qz-topic-grid .qz-topic").forEach(function (btn) {
      btn.addEventListener("click", function () { startQuiz("topic", btn.getAttribute("data-topic")); });
    });
    qs("#saved-score").textContent = bestFor("all", "all") > 0 ? bestFor("all", "all") + "%" : "Chưa có điểm nào";
    if (!buildStart._allBound) {
      qs("#btn-all").addEventListener("click", function () { startQuiz("all", "all"); });
      buildStart._allBound = true;
    }
  }

  function buildItems(mode, topicId) {
    var pool = mode === "all" ? allWords() : (findTopic(topicId) || {}).words || [];
    if (pool.length < 2) return [];
    var n = Math.min(QUESTIONS, pool.length);
    var idx = shuffle(pool.map(function (_, i) { return i; })).slice(0, n);
    var viPool = [];
    for (var i = 0; i < pool.length; i++) {
      if (viPool.indexOf(pool[i].vi) === -1) viPool.push(pool[i].vi);
    }
    return idx.map(function (i) {
      var word = pool[i];
      var distractors = [];
      var candidates = shuffle(viPool.slice());
      for (var k = 0; k < candidates.length && distractors.length < 3; k++) {
        if (candidates[k] !== word.vi && distractors.indexOf(candidates[k]) === -1) distractors.push(candidates[k]);
      }
      var options = shuffle([word.vi].concat(distractors.slice(0, 3)));
      return { word: word, options: options };
    });
  }

  function startQuiz(mode, topicId) {
    var items = buildItems(mode, topicId);
    if (!items.length) { alert("Không đủ dữ liệu cho chủ đề này."); return; }
    state.mode = mode;
    state.topicId = topicId;
    state.modeName = mode === "all" ? "Tổng hợp (12 chủ đề)" : (findTopic(topicId) || {}).name;
    state.items = items;
    state.index = 0;
    state.score = 0;
    state.answered = false;
    renderQuestion();
    screen("question");
  }

  function renderQuestion() {
    var it = state.items[state.index];
    qs("#qz-progress-text").textContent = "Cau " + (state.index + 1) + " / " + state.items.length;
    qs("#qz-score-live").textContent = "Diem: " + state.score;
    qs("#qz-progress-fill").style.width = ((state.index / state.items.length) * 100) + "%";
    qs("#qz-mode-label").textContent = state.modeName;
    qs("#qz-word-text").textContent = it.word.en;
    qs("#qz-ipa").textContent = it.word.ipa;

    var box = qs("#qz-answers");
    box.innerHTML = "";
    it.options.forEach(function (opt) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "qz-answer";
      b.textContent = opt;
      b.addEventListener("click", function () { choose(b, opt); });
      box.appendChild(b);
    });

    var fb = qs("#qz-feedback");
    fb.textContent = "";
    fb.className = "qz-feedback";
    qs("#btn-next").disabled = true;
    state.answered = false;
  }

  function choose(btn, opt) {
    if (state.answered) return;
    state.answered = true;
    var it = state.items[state.index];
    var correct = it.word.vi;

    qsa("#qz-answers .qz-answer").forEach(function (b) {
      b.disabled = true;
      b.classList.remove("picked");
      if (b.textContent === correct) b.classList.add("correct");
    });
    if (opt !== correct) btn.classList.add("wrong");
    else btn.classList.add("picked");

    if (opt === correct) state.score++;
    qs("#qz-score-live").textContent = "Diem: " + state.score;

    var fb = qs("#qz-feedback");
    if (opt === correct) {
      fb.textContent = "Dung! \u201C" + it.word.en + "\u201D nghia la \u201C" + correct + "\u201D.";
      fb.className = "qz-feedback ok";
    } else {
      fb.textContent = "Sai roi. \u201C" + it.word.en + "\u201D nghia la \u201C" + correct + "\u201D.";
      fb.className = "qz-feedback bad";
    }
    qs("#btn-next").disabled = false;
  }

  function next() {
    state.index++;
    if (state.index >= state.items.length) showResult();
    else renderQuestion();
  }

  function msgFor(pct) {
    if (pct === 100) return "\u{1F947} Tuyet voi! Ban da dung toan bo cau hoi.";
    if (pct >= 80) return "\u{1F389} Rat tot! Ban nam vung van de nay.";
    if (pct >= 60) return "\u{1F600} Kha on day! Con thieu mot chut nua la hoan hao.";
    if (pct >= 40) return "\u{1F642} O duoc, tiep tuc on luyen se tot hon.";
    return "\u{1F4AA} Dung nay long. Xem lai tu vung trong muc Hoc tu vung roi lam lai nhe!";
  }

  function showResult() {
    var pct = Math.round((state.score / state.items.length) * 100);
    var oldBest = bestFor(state.mode, state.topicId);
    qs("#qz-correct-count").textContent = state.score;
    qs("#qz-total-count").textContent = state.items.length;
    qs("#qz-final-score").textContent = pct + "%";
    qs("#qz-result-mode").textContent = "Hinh thuc: " + state.modeName + " (lat " + state.items.length + " cau)";

    saveHistory({ ts: Date.now(), mode: state.mode, topicId: state.topicId, modeName: state.modeName, correct: state.score, total: state.items.length, pct: pct });

    var newBest = bestFor(state.mode, state.topicId);
    qs("#qz-message").textContent = msgFor(pct);
    qs("#qz-best-result").textContent =
      newBest === pct && pct > oldBest
        ? "\u{1F6A9} Ky luc moi cua hinh thuc nay: " + pct + "%"
        : "Diem cao nhat hinh thuc nay: " + newBest + "%";

    renderHistory();
    screen("result");
  }

  function fmtTime(ts) {
    try { return new Date(ts).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  }

  function renderHistory() {
    var list = qs("#qz-history-list");
    if (!list) return;
    var h = getHistory().slice(0, 8);
    if (!h.length) {
      list.innerHTML = '<p class="qz-history-empty">Chua co lan lam bai nao. Lam mot luot de luu diem nhe!</p>';
      return;
    }
    list.innerHTML = h.map(function (r) {
      var rec = r.pct > 0 && r.pct >= bestFor(r.mode, r.topicId);
      return '<div class="qz-history-row' + (rec ? ' record' : '') + '">' +
        '<span class="h-mode">' + (r.modeName || "Quiz") + '</span>' +
        '<span class="h-when">' + fmtTime(r.ts) + '</span>' +
        '<span class="h-score">' + r.correct + '/' + r.total + ' \u00B7 ' + r.pct + '%</span>' +
        '</div>';
    }).join("");
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function init() {
    buildStart();

    var speakBtn = qs("#btn-speak");
    if (speakBtn) speakBtn.addEventListener("click", function () {
      if (state.items[state.index]) speak(state.items[state.index].word.en);
    });
    var nextBtn = qs("#btn-next");
    if (nextBtn) nextBtn.addEventListener("click", next);
    var restart = qs("#btn-restart");
    if (restart) restart.addEventListener("click", function () {
      if (state.mode) startQuiz(state.mode, state.topicId);
    });
    var back = qs("#btn-back");
    if (back) back.addEventListener("click", function () { buildStart(); screen("start"); });

    renderHistory();
    screen("start");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();