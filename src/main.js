import './style.css'

const BEE_LOGO = `<svg class="logo-icon" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#fff3cc"/><ellipse cx="32" cy="40" rx="22" ry="18" fill="#f0a500"/><rect x="17" y="30" width="9" height="6" fill="#8a5a00" opacity=".5"/><rect x="17" y="42" width="9" height="6" fill="#8a5a00" opacity=".5"/><circle cx="15" cy="38" r="11" fill="#f5b200"/><circle cx="12" cy="34" r="2" fill="#3a2a00"/><circle cx="18" cy="32" r="2" fill="#3a2a00"/><path d="M13,41 Q15,45 18,41" fill="none" stroke="#3a2a00" stroke-width="2" stroke-linecap="round"/><ellipse cx="44" cy="22" rx="7" ry="13" fill="#ffffff" transform="rotate(-20 44 22)"/><ellipse cx="52" cy="30" rx="6" ry="11" fill="#ffffff" transform="rotate(12 52 30)"/></svg>`

const TOPICS = [
  { id: 'travel', en: 'Travel', vi: 'Du lịch', emoji: '✈️', g1: '#f59e0b', g2: '#f97316', desc: 'Từ vựng về du lịch, phương tiện di chuyển và khám phá những vùng đất mới.' },
  { id: 'food', en: 'Food', vi: 'Ẩm thực', emoji: '🍜', g1: '#ef4444', g2: '#f97316', desc: 'Từ vựng về ẩm thực, món ăn, đồ uống và nhà hàng trong đời sống hằng ngày.' },
  { id: 'work', en: 'Work', vi: 'Công việc', emoji: '💼', g1: '#6366f1', g2: '#8b5cf6', desc: 'Từ vựng tiếng Anh trong công việc, văn phòng và giao tiếp chuyên nghiệp.' },
  { id: 'school', en: 'School', vi: 'Trường học', emoji: '🎓', g1: '#0ea5e9', g2: '#6366f1', desc: 'Từ vựng về trường học, môn học và các hoạt động của học sinh, sinh viên.' },
  { id: 'nature', en: 'Nature', vi: 'Thiên nhiên', emoji: '🌿', g1: '#22c55e', g2: '#14b8a6', desc: 'Từ vựng về thiên nhiên, cây cối, động vật và môi trường xung quanh.' },
  { id: 'sports', en: 'Sports', vi: 'Thể thao', emoji: '⚽', g1: '#10b981', g2: '#0ea5e9', desc: 'Từ vựng về thể thao, các môn vận động và hoạt động rèn luyện sức khỏe.' },
  { id: 'health', en: 'Health', vi: 'Sức khỏe', emoji: '❤️', g1: '#f43f5e', g2: '#ec4899', desc: 'Từ vựng về sức khỏe, bệnh tật, dinh dưỡng và cách chăm sóc cơ thể.' },
  { id: 'technology', en: 'Technology', vi: 'Công nghệ', emoji: '💻', g1: '#3b82f6', g2: '#8b5cf6', desc: 'Từ vựng về công nghệ, máy tính, internet và các thiết bị điện tử thông minh.' }
]

const NAV_LINKS = [
  { href: 'index.html', label: 'Trang chủ', active: true },
  { href: 'learn.html', label: 'Học từ vựng' },
  { href: 'quiz.html', label: 'Quiz' },
  { href: 'dashboard.html', label: 'Dashboard' },
  { href: 'login.html', label: 'Đăng nhập' },
  { href: 'admin.html', label: 'Admin' }
]

const WORD_COUNT = 50

function learnedOf(id) {
  try {
    const arr = JSON.parse(localStorage.getItem('eb_learned_' + id) || '[]')
    return Array.isArray(arr) ? Math.min(arr.length, WORD_COUNT) : 0
  } catch {
    return 0
  }
}

function topicCard(t) {
  const learned = learnedOf(t.id)
  const pct = Math.round((learned / WORD_COUNT) * 100)
  return `
  <article class="topic-card" style="--g1:${t.g1};--g2:${t.g2}">
    <div class="topic-icon">${t.emoji}</div>
    <div class="topic-body">
      <h3>${t.en} <span class="topic-vi">${t.vi}</span></h3>
      <p>${t.desc}</p>
      <div class="topic-progress${learned ? '' : ' empty'}">
        <div class="topic-progress-bar"><i style="width:${pct}%"></i></div>
        <span>${learned > 0 ? `${learned}/${WORD_COUNT} từ đã thuộc` : 'Chưa bắt đầu'}</span>
      </div>
      <a class="btn-learn" href="learn-${t.id}.html">Học ngay <span aria-hidden="true">→</span></a>
    </div>
  </article>`
}

document.querySelector('#app').innerHTML = `
<header class="navbar">
  <div class="container navbar-inner">
    <a href="index.html" class="logo" title="EngBee - Khóa học Tiếng Anh">${BEE_LOGO}<span>EngBee</span></a>
    <nav class="nav-links" id="nav-links">
      ${NAV_LINKS.map((l) => `<a href="${l.href}" class="${l.active ? 'active' : ''}">${l.label}</a>`).join('')}
    </nav>
    <button class="nav-toggle" id="nav-toggle" aria-label="Mở menu"><span></span><span></span><span></span></button>
  </div>
</header>

<main>
  <section class="hero">
    <div class="hero-blob hero-blob-a"></div>
    <div class="hero-blob hero-blob-b"></div>
    <div class="container hero-inner">
      <div class="hero-bee">${BEE_LOGO}</div>
      <h1>Học từ vựng tiếng Anh <span>thông minh</span> cùng EngBee</h1>
      <p>400 từ vựng chia theo 8 chủ đề quen thuộc, học bằng flashcard lật thẻ, kèm phiên âm, ví dụ và quiz kiểm tra. Mỗi ngày một ít, giỏi dần mỗi ngày!</p>
      <div class="hero-actions">
        <a href="learn.html" class="btn-primary">Bắt đầu học <span>→</span></a>
        <a href="#topics" class="btn-ghost">Khám phá chủ đề</a>
      </div>
      <div class="hero-stats">
        <div><strong>8</strong><span>chủ đề</span></div>
        <div><strong>400</strong><span>từ vựng</span></div>
        <div><strong>50</strong><span>từ / chủ đề</span></div>
        <div><strong>100%</strong><span>miễn phí</span></div>
      </div>
    </div>
  </section>

  <section class="topics" id="topics">
    <div class="container">
      <div class="section-head">
        <h2>Chọn chủ đề để bắt đầu</h2>
        <p>Mỗi chủ đề gồm 50 từ vựng kèm phiên âm, nghĩa tiếng Việt và ví dụ minh họa.</p>
      </div>
      <div class="topic-grid">
        ${TOPICS.map(topicCard).join('')}
      </div>
    </div>
  </section>

  <section class="features">
    <div class="container">
      <div class="section-head">
        <h2>Vì sao nên học cùng EngBee?</h2>
        <p>Công cụ đơn giản, phương pháp hiệu quả cho người mới bắt đầu.</p>
      </div>
      <div class="feature-grid">
        <article class="feature-card">
          <div class="feature-icon">🃏</div>
          <h3>Flashcard lật thẻ</h3>
          <p>Ghi nhớ bằng cách lật thẻ: nhìn từ, nhớ nghĩa, tự kiểm tra bản thân mỗi ngày.</p>
        </article>
        <article class="feature-card">
          <div class="feature-icon">🔊</div>
          <h3>Phát âm chuẩn</h3>
          <p>Mỗi từ có phiên âm IPA và phát âm bằng giọng đọc chuẩn, nghe và lặp lại theo nhịp.</p>
        </article>
        <article class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>Theo dõi tiến độ</h3>
          <p>Đánh dấu từ đã thuộc, xem tiến độ từng chủ đề để biết mình đang ở đâu.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="cta">
    <div class="container cta-inner">
      <h2>Bắt đầu hành trình tiếng Anh ngay hôm nay</h2>
      <p>Không cần đăng ký, mở trang và học ngay. Càng chăm chỉ, vốn từ của bạn càng giàu.</p>
      <a href="learn.html" class="btn-primary">Học miễn phí ngay <span>→</span></a>
    </div>
  </section>
</main>

<footer class="footer">
  <div class="container footer-inner">
    <div>
      <a href="index.html" class="logo">${BEE_LOGO}<span>EngBee</span></a>
      <p class="footer-tag">Website học từ vựng tiếng Anh miễn phí cho người Việt.</p>
    </div>
    <div class="footer-links">
      <a href="index.html">Trang chủ</a>
      <a href="learn.html">Học từ vựng</a>
      <a href="quiz.html">Quiz</a>
      <a href="dashboard.html">Dashboard</a>
    </div>
    <div class="footer-contact">
      <a href="mailto:engbee@gmail.com">Gmail: engbee@gmail.com</a>
      <a href="tel:0901234567">SĐT: 0901 234 567</a>
      <a href="https://facebook.com/engbee" target="_blank" rel="noopener">Facebook</a>
      <a href="https://zalo.me/0901234567" target="_blank" rel="noopener">Zalo</a>
    </div>
  </div>
  <div class="container footer-copy">&copy; 2026 EngBee. Học vui, nhớ lâu.</div>
</footer>`

const toggle = document.getElementById('nav-toggle')
const navLinks = document.getElementById('nav-links')
if (toggle && navLinks) {
  toggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open')
    toggle.classList.toggle('open', open)
    toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu')
  })
}