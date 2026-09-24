// ==========================================================
// EngBee - quiz.js: chức năng trang Quiz (trắc nghiệm từ vựng)
// Câu hỏi được tạo tự động từ dữ liệu trong data.js (EngBeeData)
// ==========================================================
(function () {
  "use strict";

  var topics = EngBeeData.topics || [];

  // Gộp tất cả từ trong 8 chủ đề thành 1 danh sách { en, ipa, vi }
  var allWords = [];
  topics.forEach(function (t) {
    t.words.forEach(function (w) {
      allWords.push({ en: w.en, ipa: w.ipa, vi: w.vi });
    });
  });

  var TOTAL = 10;                   // số câu hỏi mỗi lượt chơi
  var SCORE_KEY = "engbee_quiz_best"; // khóa lưu điểm trong LocalStorage

  // ------- Biến trạng thái -------
  var questions = [];   // danh sách câu hỏi đã random
  var current = 0;      // vị trí câu hiện tại
  var score = 0;        // số câu trả lời đúng
  var answered = false; // đã chọn đáp án câu này chưa
  var correctEl = null; // phần tử DOM của đáp án đúng

  // ------- Lấy DOM -------
  var questionScreen = document.getElementById("qz-question");
  var resultScreen = document.getElementById("qz-result");
  var wordEl = document.getElementById("qz-word-text");
  var ipaEl = document.getElementById("qz-ipa");
  var answersEl = document.getElementById("qz-answers");
  var feedbackEl = document.getElementById("qz-feedback");
  var btnNext = document.getElementById("btn-next");
  var progressText = document.getElementById("qz-progress-text");
  var progressFill = document.getElementById("qz-progress-fill");
  var scoreLive = document.getElementById("qz-score-live");

  // ------- Hàm tiện ích -------

  // Chuyển qua màn hình khác: ẩn màn hình cũ, hiện màn hình mới
  function showScreen(screen) {
    var screens = document.querySelectorAll(".qz-screen");
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove("active");
    }
    screen.classList.add("active");
  }

  // Trộn mảng theo thuật toán Fisher-Yates (random thứ tự)
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Lấy các nghĩa "vi" khác nghĩa của từ hiện tại (không trùng lặp)
  function distractorPool(vi) {
    var map = {};
    allWords.forEach(function (w) {
      if (w.vi !== vi) map[w.vi] = true;
    });
    return Object.keys(map);
  }

  // Tạo TOTAL câu hỏi: mỗi câu = 1 từ tiếng Anh + 4 đáp án tiếng Việt
  // Câu hỏi và đáp án đều được trộn thứ tự ngẫu nhiên
  function buildQuestions() {
    var picked = shuffle(allWords).slice(0, TOTAL);
    var built = [];

    picked.forEach(function (w) {
      // Chọn 3 đáp án sai bất kỳ (khác đáp án đúng)
      var distractors = shuffle(distractorPool(w.vi)).slice(0, 3);
      distractors.push(w.vi); // thêm đáp án đúng

      var answers = shuffle(distractors); // trộn thứ tự 4 đáp án
      built.push({
        en: w.en,
        ipa: w.ipa,
        answers: answers,
        correct: answers.indexOf(w.vi) // chỉ ra đáp án nào đúng
      });
    });

    return built;
  }

  // ------- LocalStorage -------

  function getSavedScore() {
    return localStorage.getItem(SCORE_KEY);
  }

  // Lưu điểm nếu cao hơn điểm cũ, trả về true nếu có kỷ lục mới
  function saveScore(newScore) {
    var old = getSavedScore();
    if (old === null || newScore > Number(old)) {
      localStorage.setItem(SCORE_KEY, String(newScore));
      return true;
    }
    return false;
  }

  function showSavedScore() {
    var best = getSavedScore();
    document.getElementById("saved-score").textContent =
      best === null ? "Chưa có điểm nào" : best + " điểm";
  }

  // Phát âm từ vựng bằng công cụ đọc của trình duyệt
  function speak(text) {
    if (!("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) { /* bỏ qua lỗi */ }
  }

  // ------- Bắt đầu chơi -------
  function startQuiz() {
    questions = buildQuestions(); // mỗi lần bắt đầu là bộ câu hỏi mới
    current = 0;
    score = 0;
    updateScoreLive();
    showScreen(questionScreen);
    renderQuestion();
  }

  function updateScoreLive() {
    scoreLive.textContent = "Điểm: " + score;
  }

  // ------- Hiển thị câu hỏi -------
  function renderQuestion() {
    answered = false;
    btnNext.disabled = true;
    feedbackEl.textContent = "";
    feedbackEl.className = "qz-feedback";

    var q = questions[current];
    wordEl.textContent = q.en;
    ipaEl.textContent = q.ipa;

    // Cập nhật thanh tiến trình: đang ở câu số mấy
    progressText.textContent = "Câu " + (current + 1) + " / " + TOTAL;
    progressFill.style.width = Math.round(current / TOTAL * 100) + "%";

    // Tạo 4 đáp án, gắn chữ cái A B C D
    answersEl.innerHTML = "";
    var letters = ["A", "B", "C", "D"];
    correctEl = null;

    q.answers.forEach(function (text, index) {
      var div = document.createElement("div");
      div.className = "qz-option";
      div.tabIndex = 0;
      div.setAttribute("role", "button");
      div.setAttribute("aria-label", "Đáp án " + letters[index] + ": " + text);

      var letter = document.createElement("span");
      letter.className = "qz-letter";
      letter.textContent = letters[index];

      var label = document.createElement("span");
      label.textContent = text;

      div.appendChild(letter);
      div.appendChild(label);

      // Chọn đáp án bằng click (hoặc Enter/Space)
      div.addEventListener("click", function () {
        selectAnswer(index);
      });
      div.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectAnswer(index);
        }
      });

      if (index === q.correct) correctEl = div;
      answersEl.appendChild(div);
    });
  }

  // ------- Kiểm tra đáp án đúng / sai -------
  function selectAnswer(index) {
    if (answered) return; // mỗi câu chỉ được chọn 1 đáp án
    answered = true;

    var options = answersEl.querySelectorAll(".qz-option");
    var ok = index === questions[current].correct;

    // Khóa toàn bộ đáp án (không chọn lại được nữa)
    for (var i = 0; i < options.length; i++) {
      options[i].classList.add("locked");
    }

    if (ok) {
      options[index].classList.add("correct");
      feedbackEl.textContent = "Chính xác! Bạn được +1 điểm";
      feedbackEl.classList.add("correct");
      score++;
      updateScoreLive();
    } else {
      options[index].classList.add("wrong");
      feedbackEl.textContent = "Sai rồi! Đáp án đúng được tô màu xanh";
      feedbackEl.classList.add("wrong");
      if (correctEl) correctEl.classList.add("correct");
    }

    btnNext.disabled = false;
  }

  // Nút "Câu tiếp theo"
  btnNext.addEventListener("click", function () {
    current++;
    if (current >= TOTAL) {
      showResult(); // hết câu hỏi -> sang màn hình kết quả
    } else {
      renderQuestion();
    }
  });

  // ------- Màn hình kết quả -------
  function showResult() {
    var finalScore = Math.round(score / TOTAL * 10); // thang điểm 10

    document.getElementById("qz-correct-count").textContent = score;
    document.getElementById("qz-total-count").textContent = TOTAL;
    document.getElementById("qz-final-score").textContent = finalScore;

    // Thông báo theo thành tích
    var msg = document.getElementById("qz-message");
    if (finalScore >= 9) {
      msg.textContent = "Xuất sắc! Bạn nhớ từ rất tốt!";
    } else if (finalScore >= 7) {
      msg.textContent = "Tốt lắm! Tiếp tục phát huy nhé!";
    } else if (finalScore >= 5) {
      msg.textContent = "Khá tốt! Hãy ôn tập thêm một chút.";
    } else {
      msg.textContent = "Cố gắng lần sau nhé! Đừng bỏ cuộc!";
    }

    // Lưu điểm vào LocalStorage nếu cao hơn điểm cũ
    var isNewBest = saveScore(finalScore);
    var best = getSavedScore();
    document.getElementById("qz-best-result").textContent =
      "Điểm cao nhất của bạn: " + best + " điểm" +
      (isNewBest ? " (Kỷ lục mới!)" : "");

    showScreen(resultScreen);
  }

  // Phát âm khi bấm nút loa
  document.getElementById("btn-speak").addEventListener("click", function () {
    if (questions.length) speak(questions[current].en);
  });

  document.getElementById("btn-start").addEventListener("click", startQuiz);
  document.getElementById("btn-restart").addEventListener("click", startQuiz);

  // Khởi động: hiển thị số chủ đề và điểm đã lưu
  document.getElementById("qz-topic-count").textContent = topics.length;
  showSavedScore();
})();