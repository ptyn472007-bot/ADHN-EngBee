(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`<svg class="logo-icon" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#fff3cc"/><ellipse cx="32" cy="40" rx="22" ry="18" fill="#f0a500"/><rect x="17" y="30" width="9" height="6" fill="#8a5a00" opacity=".5"/><rect x="17" y="42" width="9" height="6" fill="#8a5a00" opacity=".5"/><circle cx="15" cy="38" r="11" fill="#f5b200"/><circle cx="12" cy="34" r="2" fill="#3a2a00"/><circle cx="18" cy="32" r="2" fill="#3a2a00"/><path d="M13,41 Q15,45 18,41" fill="none" stroke="#3a2a00" stroke-width="2" stroke-linecap="round"/><ellipse cx="44" cy="22" rx="7" ry="13" fill="#ffffff" transform="rotate(-20 44 22)"/><ellipse cx="52" cy="30" rx="6" ry="11" fill="#ffffff" transform="rotate(12 52 30)"/></svg>`,t=[{id:`travel`,en:`Travel`,vi:`Du lịch`,emoji:`✈️`,g1:`#f59e0b`,g2:`#f97316`,desc:`Từ vựng về du lịch, phương tiện di chuyển và khám phá những vùng đất mới.`},{id:`food`,en:`Food`,vi:`Ẩm thực`,emoji:`🍜`,g1:`#ef4444`,g2:`#f97316`,desc:`Từ vựng về ẩm thực, món ăn, đồ uống và nhà hàng trong đời sống hằng ngày.`},{id:`work`,en:`Work`,vi:`Công việc`,emoji:`💼`,g1:`#6366f1`,g2:`#8b5cf6`,desc:`Từ vựng tiếng Anh trong công việc, văn phòng và giao tiếp chuyên nghiệp.`},{id:`school`,en:`School`,vi:`Trường học`,emoji:`🎓`,g1:`#0ea5e9`,g2:`#6366f1`,desc:`Từ vựng về trường học, môn học và các hoạt động của học sinh, sinh viên.`},{id:`nature`,en:`Nature`,vi:`Thiên nhiên`,emoji:`🌿`,g1:`#22c55e`,g2:`#14b8a6`,desc:`Từ vựng về thiên nhiên, cây cối, động vật và môi trường xung quanh.`},{id:`sports`,en:`Sports`,vi:`Thể thao`,emoji:`⚽`,g1:`#10b981`,g2:`#0ea5e9`,desc:`Từ vựng về thể thao, các môn vận động và hoạt động rèn luyện sức khỏe.`},{id:`health`,en:`Health`,vi:`Sức khỏe`,emoji:`❤️`,g1:`#f43f5e`,g2:`#ec4899`,desc:`Từ vựng về sức khỏe, bệnh tật, dinh dưỡng và cách chăm sóc cơ thể.`},{id:`technology`,en:`Technology`,vi:`Công nghệ`,emoji:`💻`,g1:`#3b82f6`,g2:`#8b5cf6`,desc:`Từ vựng về công nghệ, máy tính, internet và các thiết bị điện tử thông minh.`},{id:`music`,en:`Music`,vi:`Âm nhạc`,emoji:`🎵`,g1:`#ec4899`,g2:`#8b5cf6`,desc:`Từ vựng về âm nhạc, nhạc cụ, ca sĩ và các thể loại nhạc phổ biến.`},{id:`movie`,en:`Movie`,vi:`Phim ảnh`,emoji:`🎬`,g1:`#f43f5e`,g2:`#ef4444`,desc:`Từ vựng về phim ảnh, diễn viên, đạo diễn và các thể loại phim.`},{id:`weather`,en:`Weather`,vi:`Thời tiết`,emoji:`⛅`,g1:`#0ea5e9`,g2:`#22d3ee`,desc:`Từ vựng về thời tiết, các hiện tượng tự nhiên và mùa trong năm.`},{id:`shopping`,en:`Shopping`,vi:`Mua sắm`,emoji:`🛍️`,g1:`#f97316`,g2:`#ef4444`,desc:`Từ vựng về mua sắm, cửa hàng, giá cả và các hình thức thanh toán.`}],n=[{href:`index.html`,label:`Trang chủ`,active:!0},{href:`learn.html`,label:`Học từ vựng`},{href:`quiz.html`,label:`Quiz`},{href:`dashboard.html`,label:`Dashboard`},{href:`login.html`,label:`Đăng nhập`}];function r(e,t){try{let n=localStorage.getItem(e);return n?JSON.parse(n)??t:t}catch{return t}}function i(){let e=r(`engbee_admin_custom_topics`,[]),n=[...t];return Array.isArray(e)&&e.forEach(e=>{n.some(t=>t.id===e.id)||n.push({id:e.id,en:e.name||e.en,vi:e.vi,emoji:e.emoji||`📚`,g1:e.g1||e.gradient&&e.gradient[0]||`#f59e0b`,g2:e.g2||e.gradient&&e.gradient[1]||`#f97316`,desc:e.desc||`Từ vựng về ${e.vi||e.name}`})}),n}function a(){let e=r(`engbee_admin_hidden_topics`,[]);return Array.isArray(e)?e:[]}function o(){let e=a();return i().filter(t=>!e.includes(t.id))}function s(e){let n=r(`engbee_admin_added_words`,{}),i=Array.isArray(n[e])?n[e].length:0,a=t.some(t=>t.id===e);return Math.max(0,(a?50:0)+i)}function c(){return o().reduce((e,t)=>e+s(t.id),0)}function l(){try{let e=JSON.parse(localStorage.getItem(`engbee_user`)||`null`);if(e&&typeof e.name==`string`&&e.name.trim())return e.name.trim()}catch{}return`guest`}function u(){return l()!==`guest`}function d(){localStorage.removeItem(`engbee_user`),h()}function f(e){return`engbee_learned_`+l()+`_`+e}function p(e,t){try{let n=JSON.parse(localStorage.getItem(f(e))||`[]`);return Array.isArray(n)?Math.min(n.length,t):0}catch{return 0}}function m(e){let n=s(e.id),r=p(e.id,n),i=n>0?Math.round(r/n*100):0,a=t.some(t=>t.id===e.id)?`learn-${e.id}.html`:`flashcard.html?topic=${e.id}`;return`
  <article class="topic-card" style="--g1:${e.g1};--g2:${e.g2}">
    <div class="topic-icon">${e.emoji}</div>
    <div class="topic-body">
      <h3>${e.en} <span class="topic-vi">${e.vi}</span></h3>
      <p>${e.desc}</p>
      <div class="topic-progress${r?``:` empty`}">
        <div class="topic-progress-bar"><i style="width:${i}%"></i></div>
        <span>${r>0?`${r}/${n} từ đã thuộc`:`0/${n} từ (Chưa bắt đầu)`}</span>
      </div>
      <a class="btn-learn" href="${a}">Học ngay <span aria-hidden="true">→</span></a>
    </div>
  </article>`}function h(){let t=document.querySelector(`#app`);if(!t)return;let r=o(),i=c();t.innerHTML=`
<header class="navbar">
  <div class="container navbar-inner">
    <a href="index.html" class="logo" title="EngBee - Khóa học Tiếng Anh">${e}<span>EngBee</span></a>
    <nav class="nav-links" id="nav-links">
      ${n.map(e=>e.href===`login.html`?u()?`<a href="#" id="nav-logout">Đăng xuất</a>`:`<a href="login.html">${e.label}</a>`:`<a href="${e.href}" class="${e.active?`active`:``}">${e.label}</a>`).join(``)}
    </nav>
    <button class="nav-toggle" id="nav-toggle" aria-label="Mở menu"><span></span><span></span><span></span></button>
  </div>
</header>

<main>
  <section class="hero">
    <div class="hero-blob hero-blob-a"></div>
    <div class="hero-blob hero-blob-b"></div>
    <div class="container hero-inner">
      <div class="hero-bee">${e}</div>
      <h1>Học từ vựng tiếng Anh <span>thông minh</span> cùng EngBee</h1>
      <p>${i} từ vựng chia theo ${r.length} chủ đề quen thuộc, học bằng flashcard lật thẻ, kèm phiên âm, ví dụ và quiz kiểm tra. Mỗi ngày một ít, giỏi dần mỗi ngày!</p>
      <div class="hero-actions">
        <a href="learn.html" class="btn-primary">Bắt đầu học <span>→</span></a>
        <a href="#topics" class="btn-ghost">Khám phá chủ đề</a>
      </div>
      <div class="hero-stats">
        <div><strong>${r.length}</strong><span>chủ đề</span></div>
        <div><strong>${i}</strong><span>từ vựng</span></div>
        <div><strong>Đa dạng</strong><span>chủ đề</span></div>
        <div><strong>100%</strong><span>miễn phí</span></div>
      </div>
    </div>
  </section>

  <section class="topics" id="topics">
    <div class="container">
      <div class="section-head">
        <h2>Chọn chủ đề để bắt đầu</h2>
        <p>Kho từ vựng tiếng Anh cập nhật liên tục với phiên âm, nghĩa tiếng Việt và ví dụ minh họa.</p>
      </div>
      <div class="topic-grid">
        ${r.length?r.map(m).join(``):`<p style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">Hiện chưa có chủ đề nào được bật.</p>`}
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
      <a href="index.html" class="logo">${e}<span>EngBee</span></a>
      <p class="footer-tag">Website học từ vựng tiếng Anh miễn phí cho người Việt.</p>
    </div>
    <div class="footer-links">
      <a href="index.html">Trang chủ</a>
      <a href="learn.html">Học từ vựng</a>
      <a href="quiz.html">Quiz</a>
      <a href="dashboard.html">Dashboard</a>
      ${u()?`<a href="#" id="footer-logout">Đăng xuất</a>`:`<a href="login.html">Đăng nhập</a>`}
    </div>
    <div class="footer-contact">
      <a href="mailto:engbee@gmail.com">Gmail: engbee@gmail.com</a>
      <a href="tel:0901234567">SĐT: 0901 234 567</a>
      <a href="https://facebook.com/engbee" target="_blank" rel="noopener">Facebook</a>
      <a href="https://zalo.me/0901234567" target="_blank" rel="noopener">Zalo</a>
    </div>
  </div>
  <div class="container footer-copy">&copy; 2026 EngBee. Học vui, nhớ lâu.</div>
</footer>`;let a=document.getElementById(`nav-toggle`),s=document.getElementById(`nav-links`);a&&s&&a.addEventListener(`click`,()=>{let e=s.classList.toggle(`open`);a.classList.toggle(`open`,e),a.setAttribute(`aria-label`,e?`Đóng menu`:`Mở menu`)});let l=document.getElementById(`nav-logout`);l&&l.addEventListener(`click`,e=>{e.preventDefault(),d()});let f=document.getElementById(`footer-logout`);f&&f.addEventListener(`click`,e=>{e.preventDefault(),d()})}h(),window.addEventListener(`storage`,e=>{(!e.key||e.key.startsWith(`engbee_admin_`)||e.key===`engbee_user`||e.key.startsWith(`engbee_learned_`))&&h()}),window.addEventListener(`engbee_data_changed`,h),window.addEventListener(`focus`,h);