// EngBee - admin.js
// Quản trị từ vựng: xem / thêm / sửa / xóa, có validation và lưu bằng LocalStorage.
(function () {
  "use strict";

  // ----- Khoá lưu trữ trên trình duyệt -----
  var STORAGE = {
    session: "engbee_admin_session",
    added: "engbee_admin_words",   // các từ do admin thêm mới
    edited: "engbee_admin_edits",  // các từ gốc đã bị sửa: { khoá: {...} }
    removed: "engbee_admin_removed" // các khoá từ gốc đã bị xóa
  };

  // Tài khoản demo (chỉ dùng cho front-end, không bảo mật thật)
  var ADMIN_ACCOUNT = {
    username: "admin",
    password: "admin123"
  };

  var PER_PAGE = 10;
  var NUMBER_FMT = new Intl.NumberFormat("vi-VN");

  // ----- Tham chiếu DOM -----
  var el = {
    loginView: document.getElementById("login-view"),
    adminView: document.getElementById("admin-view"),
    loginForm: document.getElementById("login-form"),
    loginError: document.getElementById("login-error"),
    logoutBtn: document.getElementById("logout-btn"),
    addBtn: document.getElementById("btn-add-word"),
    resetBtn: document.getElementById("btn-reset-data"),
    search: document.getElementById("admin-search"),
    topicFilter: document.getElementById("admin-topic-filter"),
    sort: document.getElementById("admin-sort"),
    rows: document.getElementById("admin-word-rows"),
    empty: document.getElementById("admin-empty"),
    resultCount: document.getElementById("admin-result-count"),
    statTotal: document.getElementById("stat-total"),
    statAdded: document.getElementById("stat-added"),
    statEdited: document.getElementById("stat-edited"),
    statRemoved: document.getElementById("stat-removed"),
    prevBtn: document.getElementById("page-prev"),
    nextBtn: document.getElementById("page-next"),
    pageInfo: document.getElementById("page-info"),
    wordModal: document.getElementById("word-modal"),
    wordModalTitle: document.getElementById("word-modal-title"),
    wordForm: document.getElementById("word-form"),
    formAlert: document.getElementById("form-alert"),
    confirmModal: document.getElementById("confirm-modal"),
    confirmTitle: document.getElementById("confirm-title"),
    confirmText: document.getElementById("confirm-text"),
    confirmOk: document.getElementById("confirm-ok"),
    toast: document.getElementById("admin-toast")
  };

  var FIELDS = {
    topic: document.getElementById("f-topic"),
    en: document.getElementById("f-en"),
    ipa: document.getElementById("f-ipa"),
    vi: document.getElementById("f-vi"),
    ex: document.getElementById("f-ex"),
    exvi: document.getElementById("f-exvi")
  };

  var TOPICS = (window.EngBeeData && Array.isArray(EngBeeData.topics)) ? EngBeeData.topics : [];

  // Trạng thái giao diện
  var state = {
    keyword: "",
    topic: "",
    sort: "topic",
    page: 1,
    editingId: ""
  };

  // ----- Tiện ích -----
  function esc(value) {
    return String(value == null ? "" : value).replace(/[<>&"']/g, function (c) {
      if (c === "<") return "&lt;";
      if (c === ">") return "&gt;";
      if (c === "&") return "&amp;";
      if (c === '"') return "&quot;";
      return "&#39;";
    });
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function topicById(id) {
    for (var i = 0; i < TOPICS.length; i += 1) {
      if (TOPICS[i].id === id) return TOPICS[i];
    }
    return null;
  }

  // Khoá nhận diện của một từ trong bộ dữ liệu gốc
  function baseKey(topicId, en) {
    return topicId + "::" + String(en).trim().toLowerCase();
  }

  function nowStamp() {
    return Date.now();
  }

  // ----- Lớp dữ liệu: gộp dữ liệu gốc với thay đổi trong LocalStorage -----
  var Store = {
    added: function () {
      return toArray(readJSON(STORAGE.added, [])).filter(function (item) {
        return item && typeof item.uid === "string" && typeof item.en === "string";
      });
    },

    edited: function () {
      var raw = readJSON(STORAGE.edited, {});
      return (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
    },

    removed: function () {
      return toArray(readJSON(STORAGE.removed, [])).filter(function (key) {
        return typeof key === "string";
      });
    },

    // Danh sách đầy đủ đang hiển thị
    all: function () {
      var removed = {};
      Store.removed().forEach(function (key) { removed[key] = true; });
      var edits = Store.edited();
      var list = [];

      TOPICS.forEach(function (topic) {
        (topic.words || []).forEach(function (word) {
          var key = baseKey(topic.id, word.en);
          if (removed[key]) return;

          var patch = edits[key];
          var patchTopic = patch && patch.topic ? topicById(patch.topic) : null;

          list.push({
            id: "base:" + key,
            base: true,
            edited: !!patch,
            topic: patch && patch.topic ? patch.topic : topic.id,
            topicName: patchTopic ? patchTopic.name : topic.name,
            en: patch && typeof patch.en === "string" ? patch.en : word.en,
            ipa: patch && typeof patch.ipa === "string" ? patch.ipa : (word.ipa || ""),
            vi: patch && typeof patch.vi === "string" ? patch.vi : word.vi,
            ex: patch && typeof patch.ex === "string" ? patch.ex : (word.ex || ""),
            exvi: patch && typeof patch.exvi === "string" ? patch.exvi : (word.exvi || ""),
            createdAt: 0,
            updatedAt: patch && patch.updatedAt ? patch.updatedAt : 0
          });
        });
      });

      Store.added().forEach(function (word) {
        var topic = topicById(word.topic);
        list.push({
          id: "new:" + word.uid,
          base: false,
          edited: false,
          topic: word.topic,
          topicName: topic ? topic.name : word.topic,
          en: word.en,
          ipa: word.ipa || "",
          vi: word.vi || "",
          ex: word.ex || "",
          exvi: word.exvi || "",
          createdAt: word.createdAt || 0,
          updatedAt: word.updatedAt || 0
        });
      });

      return list;
    },

    find: function (id) {
      var all = Store.all();
      for (var i = 0; i < all.length; i += 1) {
        if (all[i].id === id) return all[i];
      }
      return null;
    },

    stats: function () {
      return {
        total: Store.all().length,
        added: Store.added().length,
        edited: Object.keys(Store.edited()).length,
        removed: Store.removed().length
      };
    },

    add: function (values) {
      var added = Store.added();
      var stamp = nowStamp();
      added.push({
        uid: uid(),
        topic: values.topic,
        en: values.en,
        ipa: values.ipa,
        vi: values.vi,
        ex: values.ex,
        exvi: values.exvi,
        createdAt: stamp,
        updatedAt: stamp
      });
      return writeJSON(STORAGE.added, added);
    },

    update: function (id, values) {
      var stamp = nowStamp();

      if (id.indexOf("new:") === 0) {
        var target = id.slice(4);
        var added = Store.added();
        for (var i = 0; i < added.length; i += 1) {
          if (added[i].uid !== target) continue;
          added[i].topic = values.topic;
          added[i].en = values.en;
          added[i].ipa = values.ipa;
          added[i].vi = values.vi;
          added[i].ex = values.ex;
          added[i].exvi = values.exvi;
          added[i].updatedAt = stamp;
          return writeJSON(STORAGE.added, added);
        }
        return false;
      }

      var key = id.slice(5);
      var edits = Store.edited();
      edits[key] = {
        topic: values.topic,
        en: values.en,
        ipa: values.ipa,
        vi: values.vi,
        ex: values.ex,
        exvi: values.exvi,
        updatedAt: stamp
      };
      return writeJSON(STORAGE.edited, edits);
    },

    remove: function (id) {
      if (id.indexOf("new:") === 0) {
        var target = id.slice(4);
        var added = Store.added().filter(function (word) { return word.uid !== target; });
        return writeJSON(STORAGE.added, added);
      }

      var key = id.slice(5);
      var removed = Store.removed();
      if (removed.indexOf(key) === -1) removed.push(key);
      var edits = Store.edited();
      delete edits[key];
      writeJSON(STORAGE.edited, edits);
      return writeJSON(STORAGE.removed, removed);
    },

    reset: function () {
      [STORAGE.added, STORAGE.edited, STORAGE.removed].forEach(function (key) {
        try {
          localStorage.removeItem(key);
        } catch (e) { /* bỏ qua */ }
      });
    }
  };

  // ----- Lọc / sắp xếp / phân trang -----
  function visibleWords() {
    var keyword = state.keyword.trim().toLowerCase();

    var list = Store.all().filter(function (word) {
      if (state.topic && word.topic !== state.topic) return false;
      if (!keyword) return true;
      var haystack = [word.en, word.vi, word.ex, word.exvi].join(" ").toLowerCase();
      return haystack.indexOf(keyword) !== -1;
    });

    var mode = state.sort;
    list = list.map(function (word, index) {
      return { word: word, index: index };
    });

    list.sort(function (a, b) {
      var x = a.word;
      var y = b.word;
      if (mode === "en-asc") return x.en.localeCompare(y.en) || a.index - b.index;
      if (mode === "en-desc") return y.en.localeCompare(x.en) || a.index - b.index;
      if (mode === "new") {
        return (y.updatedAt || y.createdAt) - (x.updatedAt || x.createdAt) || a.index - b.index;
      }
      return x.topicName.localeCompare(y.topicName) || x.en.localeCompare(y.en) || a.index - b.index;
    });

    return list.map(function (item) { return item.word; });
  }

  // ----- Hiển thị -----
  function renderStats() {
    var stats = Store.stats();
    el.statTotal.textContent = NUMBER_FMT.format(stats.total);
    el.statAdded.textContent = NUMBER_FMT.format(stats.added);
    el.statEdited.textContent = NUMBER_FMT.format(stats.edited);
    el.statRemoved.textContent = NUMBER_FMT.format(stats.removed);
  }

  function renderRows(list) {
    if (!list.length) {
      el.rows.innerHTML = "";
      el.empty.hidden = false;
      return;
    }

    el.empty.hidden = true;
    el.rows.innerHTML = list.map(function (word, index) {
      var badge = word.edited
        ? '<span class="admin-badge admin-badge-edit">đã sửa</span>'
        : (word.base ? "" : '<span class="admin-badge admin-badge-new">mới</span>');

      var example = word.ex
        ? '<div class="admin-word-ex">' + esc(word.ex) +
          (word.exvi ? "<span>" + esc(word.exvi) + "</span>" : "") + "</div>"
        : '<div class="admin-word-ex">—</div>';

      return '<tr>' +
        '<td class="admin-cell-index">' + (index + 1) + "</td>" +
        '<td><span class="admin-word-en">' + esc(word.en) + "</span>" +
          (word.ipa ? '<span class="admin-word-ipa">' + esc(word.ipa) + "</span>" : "") + "</td>" +
        '<td class="admin-word-vi">' + esc(word.vi) + "</td>" +
        "<td>" + example + "</td>" +
        '<td><span class="admin-tag">' + esc(word.topicName) + "</span>" + badge + "</td>" +
        '<td><div class="admin-actions">' +
          '<button type="button" class="admin-btn admin-btn-ghost admin-btn-sm" data-action="edit" data-id="' +
            esc(word.id) + '">Sửa</button>' +
          '<button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-action="delete" data-id="' +
            esc(word.id) + '">Xóa</button>' +
        "</div></td>" +
      "</tr>";
    }).join("");
  }

  function renderPager(pages) {
    el.pageInfo.textContent = "Trang " + state.page + " / " + pages;
    el.prevBtn.disabled = state.page <= 1;
    el.nextBtn.disabled = state.page >= pages;
  }

  function renderList() {
    var list = visibleWords();
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;

    var start = (state.page - 1) * PER_PAGE;

    renderStats();
    renderRows(list.slice(start, start + PER_PAGE));
    renderPager(pages);
    el.resultCount.textContent = NUMBER_FMT.format(list.length) + " từ";
  }

  // ----- Thông báo -----
  var toastTimer = null;

  function toast(message, isError) {
    el.toast.textContent = message;
    el.toast.classList.toggle("is-error", !!isError);
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.hidden = true;
    }, 2800);
  }

  // ----- Modal -----
  var lastFocused = null;

  function openModal(modal) {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function bindModalClose(modal, onClose) {
    var triggers = modal.querySelectorAll("[data-modal-close]");
    Array.prototype.forEach.call(triggers, function (trigger) {
      trigger.addEventListener("click", onClose);
    });
    modal.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    });
  }

  // Hộp thoại xác nhận, trả về Promise<boolean>
  function askConfirm(title, messageHTML, okLabel) {
    el.confirmTitle.textContent = title;
    el.confirmText.innerHTML = messageHTML;
    el.confirmOk.textContent = okLabel || "Đồng ý";
    el.confirmOk.hidden = false;
    openModal(el.confirmModal);

    return new Promise(function (resolve) {
      function done(result) {
        el.confirmOk.removeEventListener("click", onOk);
        el.confirmModal.removeEventListener("click", onOverlay);
        document.removeEventListener("keydown", onKey, true);
        closeModal(el.confirmModal);
        resolve(result);
      }
      function onOk() { done(true); }
      function onOverlay(event) {
        if (event.target.hasAttribute("data-modal-close")) done(false);
      }
      function onKey(event) {
        if (event.key === "Escape" && !el.confirmModal.hidden) done(false);
      }

      el.confirmOk.addEventListener("click", onOk);
      el.confirmModal.addEventListener("click", onOverlay);
      document.addEventListener("keydown", onKey, true);
      el.confirmOk.focus();
    });
  }

  // ----- Form thêm / sửa -----
  function fillTopicSelects() {
    var options = TOPICS.map(function (topic) {
      return '<option value="' + esc(topic.id) + '">' + esc(topic.name) + " - " + esc(topic.vi) + "</option>";
    }).join("");

    el.topicFilter.insertAdjacentHTML("beforeend", options);
    FIELDS.topic.insertAdjacentHTML("beforeend", options);
  }

  function readForm() {
    return {
      topic: FIELDS.topic.value.trim(),
      en: FIELDS.en.value.trim(),
      ipa: FIELDS.ipa.value.trim(),
      vi: FIELDS.vi.value.trim(),
      ex: FIELDS.ex.value.trim(),
      exvi: FIELDS.exvi.value.trim()
    };
  }

  function fieldOf(name) {
    return FIELDS[name].closest(".field");
  }

  function showFieldError(name, message) {
    var box = fieldOf(name);
    var slot = el.wordForm.querySelector('[data-error="' + name + '"]');
    box.classList.add("has-error");
    FIELDS[name].setAttribute("aria-invalid", "true");
    slot.textContent = message;
    slot.hidden = false;
  }

  function clearFieldError(name) {
    var box = fieldOf(name);
    var slot = el.wordForm.querySelector('[data-error="' + name + '"]');
    box.classList.remove("has-error");
    FIELDS[name].removeAttribute("aria-invalid");
    slot.textContent = "";
    slot.hidden = true;
  }

  function clearErrors() {
    Object.keys(FIELDS).forEach(clearFieldError);
    el.formAlert.hidden = true;
    el.formAlert.textContent = "";
  }

  function showAlert(message) {
    el.formAlert.textContent = message;
    el.formAlert.hidden = false;
  }

  // Kiểm tra dữ liệu form, trả về object lỗi { tenTruong: "thong bao" }
  function validate(values) {
    var errors = {};

    if (!values.topic) {
      errors.topic = "Vui lòng chọn chủ đề cho từ.";
    } else if (!topicById(values.topic)) {
      errors.topic = "Chủ đề không tồn tại, hãy chọn lại.";
    }

    if (!values.en) {
      errors.en = "Vui lòng nhập từ tiếng Anh.";
    } else if (values.en.length < 2) {
      errors.en = "Từ tiếng Anh cần ít nhất 2 ký tự.";
    } else if (values.en.length > 60) {
      errors.en = "Từ tiếng Anh không được vượt quá 60 ký tự.";
    } else if (!/^[A-Za-z][A-Za-z\s'\-]*$/.test(values.en)) {
      errors.en = "Chỉ dùng chữ cái, khoảng trắng, dấu gạch nối (-) và dấu nháy (') cho từ tiếng Anh.";
    }

    if (!values.vi) {
      errors.vi = "Vui lòng nhập nghĩa tiếng Việt.";
    } else if (values.vi.length < 2) {
      errors.vi = "Nghĩa tiếng Việt cần ít nhất 2 ký tự.";
    } else if (values.vi.length > 80) {
      errors.vi = "Nghĩa tiếng Việt không được vượt quá 80 ký tự.";
    }

    if (values.ipa) {
      if (values.ipa.length > 80) {
        errors.ipa = "Phiên âm không được vượt quá 80 ký tự.";
      } else if (values.ipa.indexOf("/") !== 0 || values.ipa.lastIndexOf("/") !== values.ipa.length - 1 || values.ipa.length < 3) {
        errors.ipa = "Phiên âm phải viết trong dấu /, ví dụ /ˈdʒɜːrni/.";
      }
    }

    if (values.ex && values.ex.length > 200) {
      errors.ex = "Câu ví dụ không được vượt quá 200 ký tự.";
    }
    if (values.exvi && values.exvi.length > 200) {
      errors.exvi = "Bản dịch không được vượt quá 200 ký tự.";
    }

    // Không cho trùng từ trong cùng một chủ đề
    if (!errors.en && !errors.topic) {
      var target = values.en.toLowerCase();
      var duplicated = Store.all().some(function (word) {
        return word.id !== state.editingId &&
          word.topic === values.topic &&
          String(word.en).trim().toLowerCase() === target;
      });
      if (duplicated) {
        errors.en = "Từ “" + values.en + "” đã tồn tại trong chủ đề này.";
      }
    }

    return errors;
  }

  function paintErrors(errors) {
    Object.keys(FIELDS).forEach(function (name) {
      if (errors[name]) {
        showFieldError(name, errors[name]);
      } else {
        clearFieldError(name);
      }
    });
  }

  function focusFirstError(errors) {
    var names = ["topic", "en", "ipa", "vi", "ex", "exvi"];
    for (var i = 0; i < names.length; i += 1) {
      if (errors[names[i]]) {
        FIELDS[names[i]].focus();
        return;
      }
    }
  }

  function openForm(word) {
    clearErrors();
    state.editingId = word ? word.id : "";

    if (word) {
      el.wordModalTitle.textContent = "Sửa từ vựng";
      FIELDS.topic.value = word.topic;
      FIELDS.en.value = word.en;
      FIELDS.ipa.value = word.ipa;
      FIELDS.vi.value = word.vi;
      FIELDS.ex.value = word.ex;
      FIELDS.exvi.value = word.exvi;
    } else {
      el.wordModalTitle.textContent = "Thêm từ mới";
      el.wordForm.reset();
      FIELDS.topic.value = state.topic || (TOPICS[0] ? TOPICS[0].id : "");
    }

    openModal(el.wordModal);
    FIELDS.en.focus();
  }

  function closeForm() {
    closeModal(el.wordModal);
    clearErrors();
    state.editingId = "";
  }

  function submitForm(event) {
    event.preventDefault();

    var values = readForm();
    var errors = validate(values);
    paintErrors(errors);

    var names = Object.keys(errors);
    if (names.length) {
      showAlert("Vui lòng kiểm tra lại " + names.length + " trường được đánh dấu đỏ.");
      focusFirstError(errors);
      return;
    }

    var wasEditing = !!state.editingId;
    var ok;
    if (wasEditing) {
      ok = Store.update(state.editingId, values);
      toast(ok ? "Đã cập nhật từ “" + values.en + "”." : "Không lưu được thay đổi.", !ok);
    } else {
      ok = Store.add(values);
      toast(ok ? "Đã thêm từ “" + values.en + "”." : "Không lưu được từ mới.", !ok);
      // Bỏ lọc và sắp theo mới nhất để từ vừa thêm luôn nằm ở dòng đầu
      state.topic = values.topic;
      state.keyword = "";
      state.sort = "new";
      state.page = 1;
      el.search.value = "";
      el.topicFilter.value = state.topic;
      el.sort.value = state.sort;
    }

    if (!ok) return;

    state.page = wasEditing ? state.page : 1;
    closeForm();
    renderList();
  }

  // ----- Sự kiện -----
  el.rows.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-action]");
    if (!button) return;

    var id = button.getAttribute("data-id");
    if (button.getAttribute("data-action") === "edit") {
      var word = Store.find(id);
      if (word) openForm(word);
      return;
    }

    var target = Store.find(id);
    if (!target) return;

    askConfirm(
      "Xóa từ vựng",
      'Bạn có chắc muốn xóa từ <strong>' + esc(target.en) + "</strong> (" + esc(target.topicName) + ")?<br>" +
        '<span class="modal-text is-danger">Thao tác này sẽ xóa vĩnh viễn từ khỏi danh sách.</span>',
      "Xóa"
    ).then(function (confirmed) {
      if (!confirmed) return;
      var ok = Store.remove(id);
      toast(ok ? "Đã xóa từ “" + target.en + "”." : "Không xóa được từ này.", !ok);
      renderList();
    });
  });

  el.addBtn.addEventListener("click", function () {
    openForm(null);
  });

  el.resetBtn.addEventListener("click", function () {
    askConfirm(
      "Khôi phục dữ liệu gốc",
      "Toàn bộ từ đã thêm, từ đã sửa và từ đã xóa sẽ bị gỡ khỏi trình duyệt này.<br>" +
        '<span class="modal-text is-danger">Thao tác này không thể hoàn tác.</span>',
      "Khôi phục"
    ).then(function (confirmed) {
      if (!confirmed) return;
      Store.reset();
      state.page = 1;
      renderList();
      toast("Đã khôi phục dữ liệu gốc.");
    });
  });

  el.search.addEventListener("input", function () {
    state.keyword = el.search.value;
    state.page = 1;
    renderList();
  });

  el.topicFilter.addEventListener("change", function () {
    state.topic = el.topicFilter.value;
    state.page = 1;
    renderList();
  });

  el.sort.addEventListener("change", function () {
    state.sort = el.sort.value;
    state.page = 1;
    renderList();
  });

  el.prevBtn.addEventListener("click", function () {
    if (state.page > 1) {
      state.page -= 1;
      renderList();
    }
  });

  el.nextBtn.addEventListener("click", function () {
    state.page += 1;
    renderList();
  });

  el.wordForm.addEventListener("submit", submitForm);

  // Kiểm tra lại ngay khi người dùng sửa trường đang báo lỗi
  Object.keys(FIELDS).forEach(function (name) {
    var eventName = FIELDS[name].tagName === "SELECT" ? "change" : "input";
    FIELDS[name].addEventListener(eventName, function () {
      if (el.wordModal.hidden) return;
      paintErrors(validate(readForm()));
    });
  });

  bindModalClose(el.wordModal, closeForm);

  // ----- Đăng nhập / đăng xuất -----
  el.loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var username = document.getElementById("username").value.trim();
    var password = document.getElementById("password").value;

    if (username === ADMIN_ACCOUNT.username && password === ADMIN_ACCOUNT.password) {
      try {
        localStorage.setItem(STORAGE.session, "1");
      } catch (e) { /* bỏ qua */ }
      el.loginError.hidden = true;
      el.adminView.hidden = false;
      el.loginView.hidden = true;
      renderList();
    } else {
      el.loginError.hidden = false;
    }
  });

  el.logoutBtn.addEventListener("click", function () {
    try {
      localStorage.removeItem(STORAGE.session);
    } catch (e) { /* bỏ qua */ }
    el.loginForm.reset();
    el.loginError.hidden = true;
    el.adminView.hidden = true;
    el.loginView.hidden = false;
  });

  // ----- Khởi tạo -----
  fillTopicSelects();
  renderList();

  var hasSession = false;
  try {
    hasSession = localStorage.getItem(STORAGE.session) === "1";
  } catch (e) {
    hasSession = false;
  }
  el.adminView.hidden = !hasSession;
  el.loginView.hidden = hasSession;
})();
