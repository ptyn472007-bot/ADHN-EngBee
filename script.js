// ==========================================================
// DỮ LIỆU CÂU HỎI (10 câu, mỗi câu 4 đáp án - chỉ 1 đáp án đúng)
// index của đáp án đúng nằm trong trường `correct`
// ==========================================================
const questions = [
  {
    question: "Phương thức nào dùng để in ra console trong JavaScript?",
    answers: ["print()", "console.log()", "write()", "echo()"],
    correct: 1
  },
  {
    question: "Kiểu dữ liệu nào sau đây KHÔNG phải kiểu cơ bản trong JavaScript?",
    answers: ["String", "Number", "Object", "Boolean"],
    correct: 2
  },
  {
    question: "Từ khóa nào được khai báo biến có thể gán lại giá trị?",
    answers: ["const", "let", "static", "final"],
    correct: 1
  },
  {
    question: "Kết quả của phép toán 5 + '3' là gì?",
    answers: ["8", "53", "NaN", "Lỗi"],
    correct: 1
  },
  {
    question: "Hàm nào lấy dữ liệu người dùng nhập từ ô input?",
    answers: ["document.read()", "element.value", "input.get()", "node.text"],
    correct: 1
  },
  {
    question: "Sự kiện nào xảy ra khi người dùng bấm vào một phần tử?",
    answers: ["change", "submit", "click", "load"],
    correct: 2
  },
  {
    question: "Mảng trong JavaScript bắt đầu đánh chỉ số từ số nào?",
    answers: ["0", "1", "-1", "Bất kỳ"],
    correct: 0
  },
  {
    question: "Cách nào đúng để so sánh bằng giá trị VÀ kiểu dữ liệu?",
    answers: ["==", "===", "=", "!="],
    correct: 1
  },
  {
    question: "LocalStorage dùng để làm gì?",
    answers: ["Giao diện trang web", "Lưu dữ liệu trên máy người dùng", "Tạo server", "Viết hàm"],
    correct: 1
  },
  {
    question: "Lệnh nào dừng một vòng lặp trong JavaScript?",
    answers: ["stop", "break", "exit", "return"],
    correct: 1
  }
];

// ==========================================================
// BIẾN TRẠNG THÁI - theo dõi trạng thái Quiz
// ==========================================================
let shuffledQuestions = [];   // danh sách câu hỏi đã random
let currentIndex = 0;         // vị trí câu hỏi hiện tại
let score = 0;                // số câu trả lời đúng
let answered = false;         // đã chọn đáp án câu này chưa
let currentCorrectEl = null;  // phần tử DOM của đáp án đúng (câu hiện tại)

// Lấy các phần tử DOM cần dùng
const startScreen = document.getElementById("start-screen");
const questionScreen = document.getElementById("question-screen");
const resultScreen = document.getElementById("result-screen");
const questionText = document.getElementById("question-text");
const answersList = document.getElementById("answers-list");
const feedback = document.getElementById("feedback");
const btnNext = document.getElementById("btn-next");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const scoreLive = document.getElementById("score-live");
const savedScore = document.getElementById("saved-score");
const scoreDial = document.getElementById("score-dial");
const scoreDialNum = document.getElementById("score-dial-num");
const confettiBox = document.getElementById("confetti-box");

// ==========================================================
// HÀM TIỆN ÍCH
// ==========================================================

// Trộn mảng theo thuật toán Fisher-Yates (random thứ tự)
function shuffle(array) {
  const arr = array.slice(); // không làm thay đổi mảng gốc
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Chuyển sang màn hình khác (ẩn hết, hiện màn hình cần)
function showScreen(screen) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

// ==========================================================
// QUẢN LÝ LOCALSTORAGE (lưu và đọc điểm cao nhất)
// ==========================================================
const SCORE_KEY = "quizBestScore"; // tên key lưu trong LocalStorage

// Đọc điểm đã lưu
function getSavedScore() {
  return localStorage.getItem(SCORE_KEY);
}

// Lưu điểm mới nếu cao hơn điểm cũ
function saveScore(newScore) {
  const oldScore = getSavedScore();
  if (oldScore === null || newScore > Number(oldScore)) {
    localStorage.setItem(SCORE_KEY, String(newScore));
    return true; // có điểm mới
  }
  return false;
}

// Hiển thị điểm đã lưu ở màn hình bắt đầu
function showSavedScore() {
  const best = getSavedScore();
  if (best === null) {
    savedScore.textContent = "Chưa có điểm nào";
  } else {
    savedScore.textContent = best + " điểm";
  }
}

// ==========================================================
// BẮT ĐẦU QUIZ
// ==========================================================
function startQuiz() {
  // Random thứ tự câu hỏi mỗi lần bắt đầu
  shuffledQuestions = shuffle(questions);
  currentIndex = 0;
  score = 0;
  scoreLive.textContent = "⭐ Điểm: 0";
  confettiBox.innerHTML = ""; // dọn pháo giấy của lần trước
  showScreen(questionScreen);
  renderQuestion();
}

// ==========================================================
// HIỂN THỊ CÂU HỎI HIỆN TẠI
// ==========================================================
function renderQuestion() {
  answered = false;
  btnNext.disabled = true;
  feedback.textContent = "";
  feedback.className = "feedback";

  const current = shuffledQuestions[currentIndex];
  questionText.textContent = current.question;

  // Cập nhật tiến trình: đang ở câu số mấy (kèm % thanh màu)
  progressText.textContent = "Câu " + (currentIndex + 1) + " / " + shuffledQuestions.length;
  const percent = ((currentIndex + 1) / shuffledQuestions.length) * 100;
  progressFill.style.width = percent + "%";

  // Tạo danh sách 4 đáp án (đã random thứ tự)
  answersList.innerHTML = "";
  const letters = ["A", "B", "C", "D"];
  const shuffledAnswers = shuffle(
    current.answers.map((text, index) => ({
      text: text,
      isCorrect: index === current.correct
    }))
  );

  currentCorrectEl = null;
  shuffledAnswers.forEach((answer, index) => {
    const div = document.createElement("div");
    div.className = "answer-option";
    // Delay để đáp án trượt vào lần lượt
    div.style.animationDelay = index * 45 + "ms";
    div.innerHTML =
      '<span class="answer-letter">' + letters[index] + "</span>" +
      '<span class="answer-text">' + answer.text + "</span>" +
      '<span class="answer-icon">✓</span>';

    if (answer.isCorrect) {
      currentCorrectEl = div;
    }

    // Click 1 lần để chọn đáp án
    div.addEventListener("click", function () {
      selectAnswer(div, answer.isCorrect);
    });

    answersList.appendChild(div);
  });
}

// ==========================================================
// KIỂM TRA ĐÁP ÁN ĐÚNG / SAI
// ==========================================================
function selectAnswer(selectedEl, isCorrect) {
  // Nếu đã chọn rồi thì không cho chọn thêm
  if (answered) return;
  answered = true;

  // Đánh dấu khóa toàn bộ đáp án
  const allOptions = answersList.querySelectorAll(".answer-option");
  allOptions.forEach(opt => opt.classList.add("locked"));

  if (isCorrect) {
    selectedEl.classList.add("correct");
    selectedEl.querySelector(".answer-icon").textContent = "✓";
    feedback.textContent = "🎉 Chính xác! Bạn được +1 điểm";
    feedback.classList.add("correct");
    score++;
    scoreLive.textContent = "⭐ Điểm: " + score;
  } else {
    selectedEl.classList.add("wrong");
    selectedEl.querySelector(".answer-icon").textContent = "✕";
    feedback.textContent = "😅 Sai rồi! Đáp án đúng được tô màu xanh";
    feedback.classList.add("wrong");

    // Tô màu xanh + dấu ✓ đáp án đúng để người dùng biết
    if (currentCorrectEl) {
      currentCorrectEl.classList.add("correct");
      currentCorrectEl.querySelector(".answer-icon").textContent = "✓";
    }
  }

  btnNext.disabled = false;
}

// ==========================================================
// CHUYỂN CÂU / KẾT THÚC QUIZ
// ==========================================================
btnNext.addEventListener("click", function () {
  currentIndex++;

  // Nếu đã hết câu hỏi -> sang màn hình kết quả
  if (currentIndex >= shuffledQuestions.length) {
    showResult();
  } else {
    renderQuestion();
  }
});

// ==========================================================
// MÀN HÌNH KẾT QUẢ
// ==========================================================
function showResult() {
  const total = shuffledQuestions.length;
  // Công thức điểm: số câu đúng / tổng số câu * 10
  const finalScore = Math.round((score / total) * 10);

  // 3 số liệu trên màn hình kết quả
  document.getElementById("correct-count").textContent = score;
  document.getElementById("total-count").textContent = total;
  document.getElementById("final-score").textContent = finalScore;

  // Bảng điểm vòng tròn (độ đầy theo điểm / 10 * 100%)
  scoreDialNum.textContent = finalScore;
  scoreDial.style.setProperty("--score", finalScore * 10);

  // Thông báo theo thành tích
  const messageEl = document.getElementById("result-message");
  let messageText;
  if (finalScore >= 9) {
    messageText = "🚀 Xuất sắc! Bạn là cao thủ JavaScript!";
  } else if (finalScore >= 7) {
    messageText = "🔥 Tốt lắm! Tiếp tục phát huy nhé!";
  } else if (finalScore >= 5) {
    messageText = "👍 Khá tốt! Hãy ôn tập thêm một chút.";
  } else {
    messageText = "💪 Cố gắng lần sau nhé! Đừng bỏ cuộc!";
  }
  messageEl.textContent = messageText;

  // Lưu điểm vào LocalStorage
  const isNewBest = saveScore(finalScore);
  const best = getSavedScore();
  const bestEl = document.getElementById("best-score-result");
  bestEl.textContent = "🏆 Điểm cao nhất của bạn: " + best + " điểm"
    + (isNewBest ? " (Kỷ lục mới!)" : "");

  // Bắn pháo giấy khi đạt từ 7 điểm trở lên
  if (finalScore >= 7) {
    spawnConfetti(26);
  }

  showScreen(resultScreen);
}

// Tạo hiệu ứng pháo giấy emoji (chỉ làm đẹp)
function spawnConfetti(count) {
  const emojis = ["🎉", "✨", "🎊", "⭐", "💫"];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    piece.style.left = Math.random() * 100 + "%";
    piece.style.fontSize = 14 + Math.random() * 12 + "px";
    piece.style.animationDelay = Math.random() * 0.6 + "s";
    piece.style.setProperty("--dx", Math.random() * 80 - 40 + "px");
    confettiBox.appendChild(piece);
    setTimeout(() => piece.remove(), 2200);
  }
}

// ==========================================================
// SỰ KIỆN NÚT BẤM
// ==========================================================
document.getElementById("btn-start").addEventListener("click", startQuiz);

document.getElementById("btn-restart").addEventListener("click", function () {
  showSavedScore();
  startQuiz();
});

// Hiển thị điểm đã lưu khi tải trang
showSavedScore();