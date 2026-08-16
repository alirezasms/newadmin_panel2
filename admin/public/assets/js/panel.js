/* ===========================================================
   panel.js - منطق پنل مدیریت دکتر عبادی تالش
   =========================================================== */

const RECEIPT_BASE = "https://drebadi.com/app/receipts/";
const MAX_SUBCATS = 15;

/* ---------------- عناصر اصلی ---------------- */
const contentEl = document.getElementById("content");
const modalRoot = document.getElementById("modalRoot");

/* ---------------- بررسی دسترسی ---------------- */
(async function init() {
  const token = getToken();
  if (!token) {
    window.location.href = "../admin/";
    return;
  }
  try {
    const resp = await apiPost({ ac: 2, token });
    if (resp && resp.success) {
      startApp();
    } else {
      deleteCookie("admin_token");
      window.location.href = "../admin/";
    }
  } catch (e) {
    console.log("[v0] خطا در بررسی توکن پنل:", e.message);
    deleteCookie("admin_token");
    window.location.href = "../admin/";
  }
})();

function startApp() {
  document.getElementById("checkingOverlay").style.display = "none";
  document.getElementById("app").style.display = "flex";
  bindShell();
  
  // Handle browser back button to prevent going to login page
  window.addEventListener("popstate", (e) => {
    if (document.getElementById("app").style.display !== "none") {
      // Prevent actual back navigation within the admin panel
      const token = getToken();
      if (token) {
        history.pushState(null, null, window.location.href);
      }
    }
  });
  
  // Prevent initial back navigation
  history.pushState(null, null, window.location.href);
}

/* ---------------- پوسته: منو، پروفایل، خروج ---------------- */
function bindShell() {
  // منوی موبایل
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("backdrop");
  document.getElementById("menuToggle").addEventListener("click", () => {
    sidebar.classList.toggle("open");
    backdrop.classList.toggle("show");
  });
  backdrop.addEventListener("click", () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
  });

  // پروفایل
  const profileBtn = document.getElementById("profileBtn");
  const profileMenu = document.getElementById("profileMenu");
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle("open");
  });
  document.addEventListener("click", () => profileMenu.classList.remove("open"));

  // خروج
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // ناوبری
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
      item.classList.add("active");
      sidebar.classList.remove("open");
      backdrop.classList.remove("show");
      routeTo(item.dataset.section);
    });
  });
}

async function logout() {
  try {
    await apiPostAuth({ ac: 3 });
  } catch (e) {
    console.log("[v0] خطا هنگام خروج:", e.message);
  }
  deleteCookie("admin_token");
  window.location.href = "../admin/";
}

/* ---------------- مسیریابی بخش‌ها ---------------- */
function routeTo(section) {
  switch (section) {
    case "users":
      Users.open();
      break;
    case "receipts":
      Receipts.open();
      break;
    case "topics":
      Topics.open();
      break;
    case "posts":
      Posts.open();
      break;
    case "notifications":
      Notifications.open();
      break;
    case "settings":
      Settings.open();
      break;
    case "stats":
      Stats.open();
      break;
  }
}

/* =========================================================
   ابزارهای رابط کاربری
   ========================================================= */
function setLoading() {
  contentEl.innerHTML = `<div class="loader"><span class="spinner"></span> در حال بارگذاری...</div>`;
}

function showError(msg) {
  contentEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" style="background:var(--danger-light);color:var(--danger)">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
      </div>
      <h3>خطا در دریافت اطلاعات</h3>
      <p>${esc(msg || "لطفاً اتصال اینترنت یا ارتباط با سرور را بررسی کنید.")}</p>
    </div>`;
}

function pageHead(icon, title, actionsHTML = "") {
  return `
    <div class="page-head">
      <h2><span class="ph-ic">${icon}</span>${esc(title)}</h2>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${actionsHTML}</div>
    </div>`;
}

const ICONS = {
  search:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  plus:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>',
  edit:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
  trash:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  layers:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>',
  check:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  x:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  block:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>',
  unlock:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
  image:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>',
  heart:
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
};

const SECTION_ICONS = {
  users: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  receipts: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8M8 11h8"/></svg>',
  topics: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
  posts: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  notifications: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  settings: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/></svg>',
  stats: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/></svg>',
};

/* ---------------- صفحه‌بندی ---------------- */
function paginationHTML(current, totalPages, totalLabel) {
  current = parseInt(current, 10) || 1;
  totalPages = parseInt(totalPages, 10) || 1;
  let btns = "";
  const add = (p, label, opts = {}) => {
    btns += `<button data-page="${p}" ${opts.disabled ? "disabled" : ""} class="${
      opts.active ? "active" : ""
    }">${label}</button>`;
  };
  add(current - 1, "‹", { disabled: current <= 1 });
  const range = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - current) <= 1) range.push(p);
    else if (range[range.length - 1] !== "...") range.push("...");
  }
  range.forEach((p) => {
    if (p === "...") btns += `<button disabled>…</button>`;
    else add(p, toFa(p), { active: p === current });
  });
  add(current + 1, "›", { disabled: current >= totalPages });

  return `<div class="pagination">
      <span class="page-info">${totalLabel || ""}</span>
      ${btns}
    </div>`;
}

function bindPagination(container, handler) {
  container.querySelectorAll(".pagination button[data-page]").forEach((b) => {
    b.addEventListener("click", () => {
      if (b.disabled) return;
      handler(parseInt(b.dataset.page, 10));
    });
  });
}

/* ---------------- دیالوگ / مودال ---------------- */
function openModal({ title, body, footer, size }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal ${size === "lg" ? "modal-lg" : ""}">
      <div class="modal-header">
        <h3><span class="dot"></span>${esc(title)}</h3>
        <button class="modal-close" type="button" data-close>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ""}
    </div>`;
  modalRoot.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) close();
  });
  overlay._close = close;
  return overlay;
}

function confirmDialog(message, onConfirm, opts = {}) {
  const overlay = openModal({
    title: opts.title || "تأیید عملیات",
    body: `<p class="modal-text">${esc(message)}</p>`,
    footer: `
      <button class="btn ${opts.danger ? "btn-danger" : "btn-primary"}" data-confirm>${esc(
      opts.confirmText || "بله، انجام بده"
    )}</button>
      <button class="btn btn-ghost" data-close>انصراف</button>`,
  });
  overlay.querySelector("[data-confirm]").addEventListener("click", async () => {
    const btn = overlay.querySelector("[data-confirm]");
    btn.disabled = true;
    btn.textContent = "در حال انجام...";
    await onConfirm();
    overlay._close();
  });
}

// راهنمای تگ‌های متنی
function helpTextDialog() {
  const body = `<div class="help-block"><span class="h-title">تگ‌های مجاز:</span>&lt;b&gt;&lt;/b&gt;
&lt;i&gt;&lt;/i&gt;
&lt;s&gt;&lt;/s&gt;
&lt;u&gt;&lt;/u&gt;
<span class="h-title">colors:</span>&lt;red&gt;&lt;/red&gt;
&lt;blue&gt;&lt;/blue&gt;
&lt;green&gt;&lt;/green&gt;
&lt;yellow&gt;&lt;/yellow&gt;
<span class="h-title">backcolors (highlight):</span>&lt;h_red&gt;&lt;/h_red&gt;
&lt;h_blue&gt;&lt;/h_blue&gt;
&lt;h_green&gt;&lt;/h_green&gt;
<span class="h-title">images:</span>&lt;img&gt;link&lt;/img&gt;</div>`;
  openModal({ title: "راهنمای متن", body, footer: `<button class="btn btn-primary" data-close>متوجه شدم</button>` });
}

// مقدار فیلد از داخل overlay
function fval(overlay, id) {
  const el = overlay.querySelector("#" + id);
  if (!el) return "";
  if (el.type === "checkbox") return el.checked ? "1" : "0";
  return el.value;
}

/* =========================================================
   1) مدیریت کاربران
   ========================================================= */
const Users = {
  page: 1,
  search: "",

  open() {
    this.page = 1;
    this.search = "";
    this.load();
  },

  async load() {
    setLoading();
    try {
      const params = this.search
        ? { ac: 5, search: this.search, page: this.page }
        : { ac: 4, page: this.page };
      const resp = await apiPostAuth(params);
      this.render(resp);
    } catch (e) {
      showError(e.message);
    }
  },

  render(resp) {
    const users = (resp && resp.users) || [];
    const total = resp ? resp.total_users : 0;
    const head = pageHead(SECTION_ICONS.users, "مدیریت کاربران");
    const toolbar = `
      <div class="toolbar">
        <div class="search-box">
          ${ICONS.search}
          <input type="text" id="userSearch" value="${escAttr(this.search)}"
            placeholder="جستجو با شماره تلفن، بخشی از نام، استان و نام شهر" />
        </div>
        <button class="btn btn-primary" id="userSearchBtn" style="margin-right: 10px;">${ICONS.search} جستجو</button>
      </div>`;

    let rows = "";
    if (users.length === 0) {
      rows = `<tr><td colspan="8"><div class="empty-state" style="padding:30px"><p>کاربری یافت نشد.</p></div></td></tr>`;
    } else {
      users.forEach((u) => {
        const blocked = String(u.open) === "0";
        rows += `<tr>
          <td class="mono">${toFa(esc(u.phonenumber))}</td>
          <td>${esc(u.fullname) || '<span class="text-muted">—</span>'}</td>
          <td>${esc(u.degree) || '<span class="text-muted">—</span>'}</td>
          <td>${esc(u.province) || '<span class="text-muted">—</span>'}</td>
          <td>${esc(u.city) || '<span class="text-muted">—</span>'}</td>
          <td>${ynIcon(u.isstudent)}</td>
          <td class="mono">${toJalaliDateTime(u.datetime)}</td>
          <td>
            <div class="cell-actions">
              <button class="btn btn-sm btn-secondary" data-edit='${escAttr(JSON.stringify(u))}'>${ICONS.edit} ویرایش</button>
              ${
                blocked
                  ? `<button class="btn btn-sm btn-primary" data-toggle="${esc(u.id)}" data-open="1">${ICONS.unlock} رفع مسدودیت</button>`
                  : `<button class="btn btn-sm btn-danger" data-toggle="${esc(u.id)}" data-open="0">${ICONS.block} مسدود کردن</button>`
              }
            </div>
          </td>
        </tr>`;
      });
    }

    const table = `
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>شماره تلفن</th><th>نام و نام خانوادگی</th><th>مدرک تحصیلی</th>
            <th>استان</th><th>شهر</th><th>دانشجو</th><th>تاریخ ثبت‌نام</th><th>عملیات</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${paginationHTML(resp.current_page, resp.total_pages, "تعداد کل کاربران: " + toFa(total))}`;

    contentEl.innerHTML = head + toolbar + table;
    this.bind();
  },

  bind() {
    const input = contentEl.querySelector("#userSearch");
    const searchBtn = contentEl.querySelector("#userSearchBtn");
    let timer;
    
    const performSearch = () => {
      clearTimeout(timer);
      this.search = input.value.trim();
      this.page = 1;
      this.load();
    };
    
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        performSearch();
      }, 800);
    });
    
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        clearTimeout(timer);
        performSearch();
      }
    });
    
    searchBtn.addEventListener("click", performSearch);

    bindPagination(contentEl, (p) => {
      this.page = p;
      this.load();
    });

    contentEl.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => this.editDialog(JSON.parse(b.dataset.edit)))
    );
    contentEl.querySelectorAll("[data-toggle]").forEach((b) =>
      b.addEventListener("click", () => this.toggleBlock(b.dataset.toggle, b.dataset.open))
    );
  },

  editDialog(u) {
    const degreeOptions = [
      "مدرک تحصیلی",
      "دیپلم",
      "کاردانی",
      "کارشناسی",
      "کارشناسی ارشد",
      "دکتری عمومی",
      "تخصص",
      "فوق تخصص",
      "دکتری (PhD)",
      "فوق دکتری"
    ];
    const degreeSelect = degreeOptions.map((opt, idx) => {
      const selected = u.degree === opt ? ' selected' : '';
      return `<option value="${escAttr(opt)}"${selected}>${esc(opt)}</option>`;
    }).join('');
    const body = `
      <div class="field"><label>شماره تلفن</label><input class="input mono" id="u_phone" value="${escAttr(u.phonenumber)}" /></div>
      <div class="field"><label>نام و نام خانوادگی</label><input class="input" id="u_full" value="${escAttr(u.fullname)}" /></div>
      <div class="field"><label>مدرک تحصیلی</label><select class="select" id="u_degree">${degreeSelect}</select></div>
      <div class="field"><label>استان</label><input class="input" id="u_province" value="${escAttr(u.province)}" /></div>
      <div class="field"><label>شهر</label><input class="input" id="u_city" value="${escAttr(u.city)}" /></div>
      <div class="checkbox-row"><input type="checkbox" id="u_student" ${String(u.isstudent) === "1" ? "checked" : ""}/><label for="u_student">دانشجو است</label></div>`;
    const overlay = openModal({
      title: "ویرایش کاربر",
      body,
      footer: `<button class="btn btn-primary" data-save>${ICONS.edit} ویرایش کاربر</button><button class="btn btn-ghost" data-close>لغو</button>`,
    });
    overlay.querySelector("[data-save]").addEventListener("click", async () => {
      const btn = overlay.querySelector("[data-save]");
      btn.disabled = true;
      btn.textContent = "در حال ثبت...";
      try {
        const resp = await apiPostAuth({
          ac: 6,
          id: u.id,
          phonenumber: fval(overlay, "u_phone"),
          fullname: fval(overlay, "u_full"),
          degree: fval(overlay, "u_degree"),
          province: fval(overlay, "u_province"),
          city: fval(overlay, "u_city"),
          isstudent: fval(overlay, "u_student"),
        });
        if (handleResult(resp, "اطلاعات کاربر ویرایش شد")) {
          overlay._close();
          this.load();
        } else {
          btn.disabled = false;
          btn.innerHTML = `${ICONS.edit} ویرایش کاربر`;
        }
      } catch (e) {
        showToast("خطا در ارتباط با سرور", "error");
        btn.disabled = false;
        btn.innerHTML = `${ICONS.edit} ویرایش کاربر`;
      }
    });
  },

  toggleBlock(id, open) {
    const toBlock = open === "0";
    confirmDialog(
      toBlock ? "آیا مطمئن هستید که این کاربر مسدود شود؟" : "آیا مطمئن هستید که مسدودیت این کاربر رفع شود؟",
      async () => {
        try {
          const resp = await apiPostAuth({ ac: 7, id, open });
          if (resp && resp.success !== false) {
            showToast(toBlock ? "کاربر مسدود شد" : "مسدودیت کاربر رفع شد", "success");
            this.load();
          } else {
            showToast((resp && resp.message) || "عملیات انجام نشد", "error");
          }
        } catch (e) {
          showToast("خطا در ارتباط با سرور", "error");
        }
      },
      { danger: toBlock, confirmText: toBlock ? "بله، مسدود کن" : "بله، رفع کن" }
    );
  },
};

/* =========================================================
   2) رسیدهای پرداخت
   ========================================================= */
const Receipts = {
  page: 1,
  filter: "all",
  open() {
    this.page = 1;
    this.filter = "all";
    this.load();
  },
  async load() {
    setLoading();
    try {
      const params = { ac: 8, page: this.page };
      if (this.filter !== "all") {
        const verifyMap = { pending: "0", approved: "1", rejected: "-1" };
        params.verify = verifyMap[this.filter];
      }
      const resp = await apiPostAuth(params);
      this.render(resp);
    } catch (e) {
      showError(e.message);
    }
  },
  render(resp) {
    const rows = (resp && resp.data) || [];
    const head = pageHead(SECTION_ICONS.receipts, "رسیدهای پرداخت");
    const filterButtons = `
      <div class="toolbar">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn ${this.filter === "all" ? "btn-primary" : "btn-ghost"}" data-filter="all">همه</button>
          <button class="btn ${this.filter === "pending" ? "btn-primary" : "btn-ghost"}" data-filter="pending">منتظر تأیید</button>
          <button class="btn ${this.filter === "approved" ? "btn-primary" : "btn-ghost"}" data-filter="approved">تأیید شده</button>
          <button class="btn ${this.filter === "rejected" ? "btn-primary" : "btn-ghost"}" data-filter="rejected">رد شده</button>
        </div>
      </div>`;
    let body = "";
    if (rows.length === 0) {
      body = `<tr><td colspan="5"><div class="empty-state" style="padding:30px"><p>رسیدی ثبت نشده است.</p></div></td></tr>`;
    } else {
      rows.forEach((r) => {
        const url = RECEIPT_BASE + r.receipt;
        let statusCell = "";
        const v = String(r.verify);
        if (v === "0") {
          statusCell = `<span class="badge badge-warning">منتظر تأیید</span>
            <div class="cell-actions" style="margin-top:6px">
              <button class="btn btn-sm btn-primary" data-verify="${esc(r.id)}" data-v="1">${ICONS.check} تأیید</button>
              <button class="btn btn-sm btn-danger" data-verify="${esc(r.id)}" data-v="-1">${ICONS.x} رد</button>
            </div>`;
        } else if (v === "1") {
          statusCell = `<span class="badge badge-success">تأیید شده</span>
            <div class="cell-actions" style="margin-top:6px">
              <button class="btn btn-sm btn-danger" data-verify="${esc(r.id)}" data-v="-1">${ICONS.x} رد کردن</button>
            </div>`;
        } else {
          statusCell = `<span class="badge badge-danger">رد شده</span>`;
        }
        body += `<tr data-id="${esc(r.id)}">
          <td class="mono">${toFa(esc(r.phonenumber))}</td>
          <td class="mono nowrap">${formatPrice(r.now_price)} تومان</td>
          <td class="mono">${toJalaliDateTime(r.datetime)}</td>
          <td><a href="${escAttr(url)}" target="_blank" rel="noopener" title="مشاهده / دانلود رسید"><img class="thumb thumb-square" src="${escAttr(url)}" alt="رسید" loading="lazy" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span class=&quot;badge badge-muted&quot;>بدون تصویر</span>')" /></a></td>
          <td>${statusCell}</td>
        </tr>`;
      });
    }
    const table = `
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>شماره تلفن</th><th>هزینه محصول</th><th>زمان ارسال</th><th>تصویر رسید</th><th>وضعیت رسید</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${paginationHTML(resp.current_page, resp.total_pages, "تعداد کل رسیدها: " + toFa(resp.total_rows))}`;
    contentEl.innerHTML = head + filterButtons + table;
    
    contentEl.querySelectorAll("[data-filter]").forEach((b) => {
      b.addEventListener("click", () => {
        this.filter = b.dataset.filter;
        this.page = 1;
        this.load();
      });
    });
    
    bindPagination(contentEl, (p) => {
      this.page = p;
      this.load();
    });
    contentEl.querySelectorAll("[data-verify]").forEach((b) =>
      b.addEventListener("click", () => this.setVerify(b.dataset.verify, b.dataset.v))
    );
  },
  setVerify(id, verify) {
    const isApprove = verify === "1";
    confirmDialog(
      isApprove ? "آیا این رسید پرداخت تأیید شود؟" : "آیا این رسید پرداخت رد شود؟",
      async () => {
        try {
          const resp = await apiPostAuth({ ac: 9, id, verify });
          handleResult(resp, isApprove ? "پرداخت تأیید شد" : "پرداخت رد شد");
          this.load();
        } catch (e) {
          showToast("خطا در ارتباط با سرور", "error");
        }
      },
      { danger: !isApprove, confirmText: isApprove ? "بله، تأیید کن" : "بله، رد کن" }
    );
  },
};

/* =========================================================
   3) مدیریت موضوعات + زیر دسته‌ها
   ========================================================= */
const Topics = {
  open() {
    this.loadTopics();
  },

  async loadTopics() {
    setLoading();
    try {
      const resp = await apiPostAuth({ ac: 10 });
      this.renderTopics(Array.isArray(resp) ? resp : (resp && resp.data) || []);
    } catch (e) {
      showError(e.message);
    }
  },

  renderTopics(list) {
    const head = pageHead(
      SECTION_ICONS.topics,
      "مدیریت موضوعات",
      `<button class="btn btn-primary" id="addTopic">${ICONS.plus} افزودن موضوع</button>`
    );
    let rows = "";
    if (!list.length) {
      rows = `<tr><td colspan="6"><div class="empty-state" style="padding:30px"><p>موضوعی ثبت نشده است.</p></div></td></tr>`;
    } else {
      list.forEach((t) => {
        rows += `<tr>
          <td>${esc(t.title)}</td>
          <td><a href="${escAttr(t.image)}" target="_blank" rel="noopener" title="مشاهده تصویر"><img class="thumb" src="${escAttr(t.image)}" alt="${escAttr(t.title)}" loading="lazy" onerror="this.style.display='none'"/></a></td>
          <td>${ynIcon(t.image_is_light)}</td>
          <td class="mono">${toFa(t.views)}</td>
          <td class="mono">${toFa(t.priority)}</td>
          <td>
            <div class="cell-actions">
              <button class="btn btn-sm btn-secondary" data-edit='${escAttr(JSON.stringify(t))}'>${ICONS.edit} ویرایش</button>
              <button class="btn btn-sm btn-danger" data-del="${esc(t.id)}">${ICONS.trash} حذف</button>
              <button class="btn btn-sm btn-ghost" data-sub='${escAttr(JSON.stringify({ id: t.id, title: t.title }))}'>${ICONS.layers} زیر دسته‌ها</button>
            </div>
          </td>
        </tr>`;
      });
    }
    contentEl.innerHTML =
      head +
      `<div class="table-wrap"><table class="data">
        <thead><tr><th>عنوان</th><th>تصویر</th><th>متن سفید؟</th><th>تعداد بازدید</th><th>اولویت</th><th>عملیات</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;

    contentEl.querySelector("#addTopic").addEventListener("click", () => this.topicDialog(null));
    contentEl.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => this.topicDialog(JSON.parse(b.dataset.edit)))
    );
    contentEl.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => this.deleteTopic(b.dataset.del))
    );
    contentEl.querySelectorAll("[data-sub]").forEach((b) =>
      b.addEventListener("click", () => {
        const t = JSON.parse(b.dataset.sub);
        Subcats.enter(t.id, t.title);
      })
    );
  },

  topicDialog(t) {
    const isEdit = !!t;
    const body = `
      <div class="field"><label>عنوان</label><input class="input" id="t_title" value="${isEdit ? escAttr(t.title) : ""}" /></div>
      <div class="field"><label>لینک تصویر (سایز ۱۰۰۰ × ۳۱۱)</label><input class="input" id="t_image" dir="ltr" placeholder="https://example.com/image.png" value="${isEdit ? escAttr(t.image) : ""}" /></div>
      <div class="checkbox-row"><input type="checkbox" id="t_light" ${isEdit && String(t.image_is_light) === "1" ? "checked" : ""}/><label for="t_light">متن سفید باشد</label></div>
      <div class="field"><label>اولویت</label><input class="input mono" type="number" id="t_priority" value="${isEdit ? escAttr(t.priority) : "1"}" /></div>`;
    const overlay = openModal({
      title: isEdit ? "ویرایش موضوع" : "افزودن موضوع",
      body,
      footer: `<button class="btn btn-primary" data-save>${isEdit ? ICONS.edit + " ویرایش" : ICONS.plus + " افزودن"}</button><button class="btn btn-ghost" data-close>لغو</button>`,
    });
    overlay.querySelector("[data-save]").addEventListener("click", async () => {
      const btn = overlay.querySelector("[data-save]");
      btn.disabled = true;
      const payload = {
        title: fval(overlay, "t_title"),
        image: fval(overlay, "t_image"),
        image_is_light: fval(overlay, "t_light"),
        priority: fval(overlay, "t_priority"),
      };
      if (isEdit) {
        payload.ac = 12;
        payload.id = t.id;
      } else {
        payload.ac = 17;
      }
      try {
        const resp = await apiPostAuth(payload);
        if (handleResult(resp, isEdit ? "موضوع ویرایش شد" : "موضوع افزوده شد")) {
          overlay._close();
          this.loadTopics();
        } else btn.disabled = false;
      } catch (e) {
        showToast("خطا در ارتباط با سرور", "error");
        btn.disabled = false;
      }
    });
  },

  deleteTopic(id) {
    confirmDialog(
      "آیا مطمئنید این موضوع حذف شود؟ تمام اطلاعات مرتبط ممکن است حذف شود.",
      async () => {
        try {
          const resp = await apiPostAuth({ ac: 11, id });
          handleResult(resp, "موضوع حذف شد");
          this.loadTopics();
        } catch (e) {
          showToast("خطا در ارتباط با سرور", "error");
        }
      },
      { danger: true, confirmText: "بله، حذف کن" }
    );
  },
};

/* ----------- زیر دسته‌ها (subcats1 .. subcats15) ----------- */
const Subcats = {
  // هر سطح: { table, parentId, parentTitle, page, search }
  stack: [],

  enter(parentId, parentTitle) {
    this.stack = [{ table: "subcats1", parentId, parentTitle, page: 1, search: "" }];
    this.load();
  },

  // ورود به زیر دسته‌ی یک رکورد در سطح فعلی
  drill(record) {
    const cur = this.stack[this.stack.length - 1];
    const n = parseInt(cur.table.replace("subcats", ""), 10);
    if (n >= MAX_SUBCATS) {
      showToast("به آخرین سطح زیر دسته‌ها رسیده‌اید", "info");
      return;
    }
    this.stack.push({
      table: "subcats" + (n + 1),
      parentId: record.id,
      parentTitle: record.title,
      page: 1,
      search: "",
    });
    this.load();
  },

  gotoLevel(index) {
    if (index < 0) {
      Topics.loadTopics();
      return;
    }
    this.stack = this.stack.slice(0, index + 1);
    this.load();
  },

  cur() {
    return this.stack[this.stack.length - 1];
  },

  async load() {
    setLoading();
    const cur = this.cur();
    try {
      const params = { ac: 13, id: cur.parentId, page: cur.page, table: cur.table };
      if (cur.search) params.search = cur.search;
      const resp = await apiPostAuth(params);
      this.render(resp);
    } catch (e) {
      showError(e.message);
    }
  },

  render(resp) {
    const cur = this.cur();
    const rows = (resp && resp.data) || [];
    const levelNum = cur.table.replace("subcats", "");

    // مسیر راهنما
    let crumb = `<div class="breadcrumb"><button data-level="-1">مدیریت موضوعات</button>`;
    this.stack.forEach((lvl, i) => {
      const last = i === this.stack.length - 1;
      crumb += `<span class="sep">›</span>`;
      if (last) crumb += `<span class="current">${esc(lvl.parentTitle)}</span>`;
      else crumb += `<button data-level="${i}">${esc(lvl.parentTitle)}</button>`;
    });
    crumb += `<button class="btn btn-ghost" style="margin-right: auto;" id="backBtn">← برگشت</button></div>`;

    const head = pageHead(
      SECTION_ICONS.topics,
      `زیر دسته‌ها (سطح ${toFa(levelNum)})`,
      `<button class="btn btn-primary" id="addSub">${ICONS.plus} افزودن زیر دسته</button>`
    );
    const toolbar = `<div class="toolbar"><div class="search-box">${ICONS.search}
        <input type="text" id="subSearch" value="${escAttr(cur.search)}" placeholder="جستجوی عنوان زیر دسته..." /></div></div>`;

    let body = "";
    if (!rows.length) {
      body = `<tr><td colspan="4"><div class="empty-state" style="padding:30px"><p>زیر دسته‌ای یافت نشد.</p></div></td></tr>`;
    } else {
      const canDrill = parseInt(levelNum, 10) < MAX_SUBCATS;
      rows.forEach((r) => {
        body += `<tr>
          <td>${esc(r.title)}</td>
          <td class="mono nowrap">${formatPrice(r.pay)} تومان</td>
          <td class="mono">${toFa(r.views)}</td>
          <td>
            <div class="cell-actions">
              <button class="btn btn-sm btn-secondary" data-edit='${escAttr(JSON.stringify(r))}'>${ICONS.edit} ویرایش</button>
              <button class="btn btn-sm btn-danger" data-del="${esc(r.id)}">${ICONS.trash} حذف</button>
              ${canDrill ? `<button class="btn btn-sm btn-ghost" data-drill='${escAttr(JSON.stringify({ id: r.id, title: r.title }))}'>${ICONS.layers} زیر دسته‌ها</button>` : ""}
            </div>
          </td>
        </tr>`;
      });
    }

    contentEl.innerHTML =
      head +
      crumb +
      toolbar +
      `<div class="table-wrap"><table class="data">
        <thead><tr><th>عنوان</th><th>مبلغ (تومان)</th><th>تعداد بازدید</th><th>عملیات</th></tr></thead>
        <tbody>${body}</tbody></table></div>` +
      paginationHTML(resp.current_page, resp.total_pages, "تعداد: " + toFa(resp.total_rows));

    // اتصال‌ها
    contentEl.querySelectorAll("[data-level]").forEach((b) =>
      b.addEventListener("click", () => this.gotoLevel(parseInt(b.dataset.level, 10)))
    );
    const backBtn = contentEl.querySelector("#backBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        const curLevel = this.stack.length - 1;
        this.gotoLevel(curLevel - 1);
      });
    }
    const input = contentEl.querySelector("#subSearch");
    let timer;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        cur.search = input.value.trim();
        cur.page = 1;
        this.load();
      }, 450);
    });
    bindPagination(contentEl, (p) => {
      cur.page = p;
      this.load();
    });
    contentEl.querySelector("#addSub").addEventListener("click", () => this.dialog(null));
    contentEl.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => this.dialog(JSON.parse(b.dataset.edit)))
    );
    contentEl.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => this.del(b.dataset.del))
    );
    contentEl.querySelectorAll("[data-drill]").forEach((b) =>
      b.addEventListener("click", () => this.drill(JSON.parse(b.dataset.drill)))
    );
  },

  dialog(r) {
    const isEdit = !!r;
    const cur = this.cur();
    const body = `
      <div class="field"><label>عنوان</label><input class="input" id="s_title" value="${isEdit ? escAttr(r.title) : ""}" /></div>
      <div class="field"><label>مبلغ (تومان)</label><input class="input mono" type="number" id="s_pay" value="${isEdit ? escAttr(r.pay) : "0"}" /></div>`;
    const overlay = openModal({
      title: isEdit ? "ویرایش زیر دسته" : "ا��زودن زیر دسته",
      body,
      footer: `<button class="btn btn-primary" data-save>${isEdit ? ICONS.edit + " ویرایش" : ICONS.plus + " افزودن"}</button><button class="btn btn-ghost" data-close>لغو</button>`,
    });
    overlay.querySelector("[data-save]").addEventListener("click", async () => {
      const btn = overlay.querySelector("[data-save]");
      btn.disabled = true;
      const payload = { table: cur.table, title: fval(overlay, "s_title"), pay: fval(overlay, "s_pay"), category_id: cur.parentId };
      if (isEdit) {
        payload.ac = 14;
        payload.id = r.id;
      } else {
        payload.ac = 16;
      }
      try {
        const resp = await apiPostAuth(payload);
        if (handleResult(resp, isEdit ? "رکورد ویرایش شد" : "رکورد افزوده شد")) {
          overlay._close();
          this.load();
        } else btn.disabled = false;
      } catch (e) {
        showToast("خطا در ارتباط با سرور", "error");
        btn.disabled = false;
      }
    });
  },

  del(id) {
    const cur = this.cur();
    confirmDialog(
      "آیا مطمئنید این زیر دسته حذف شود؟",
      async () => {
        try {
          const resp = await apiPostAuth({ ac: 15, table: cur.table, id });
          handleResult(resp, "رکورد حذف شد");
          this.load();
        } catch (e) {
          showToast("خطا در ارتباط با سرور", "error");
        }
      },
      { danger: true, confirmText: "بله، حذف کن" }
    );
  },
};

/* =========================================================
   4) مدیریت پست‌ها
   ========================================================= */
const Posts = {
  page: 1,
  search: "",
  open() {
    this.page = 1;
    this.search = "";
    this.load();
  },
  async load() {
    setLoading();
    try {
      const params = { ac: 18, page: this.page };
      if (this.search) params.search = this.search;
      const resp = await apiPostAuth(params);
      this.render(resp);
    } catch (e) {
      showError(e.message);
    }
  },
  videosCount(v) {
    if (!v) return '<span class="text-muted">—</span>';
    try {
      const arr = JSON.parse(v);
      if (Array.isArray(arr) && arr.length) return `<span class="badge badge-muted">${toFa(arr.length)} ویدئو</span>`;
    } catch (e) {}
    return '<span class="text-muted">—</span>';
  },
  render(resp) {
    const rows = (resp && resp.data) || [];
    const head = pageHead(
      SECTION_ICONS.posts,
      "مدیریت پست‌ها",
      `<button class="btn btn-primary" id="addPost">${ICONS.plus} افزودن پست</button>`
    );
    const toolbar = `<div class="toolbar"><div class="search-box">${ICONS.search}
      <input type="text" id="postSearch" value="${escAttr(this.search)}" placeholder="جستجوی عنوان پست..." /></div></div>`;
    let body = "";
    if (!rows.length) {
      body = `<tr><td colspan="10"><div class="empty-state" style="padding:30px"><p>پستی یافت نشد.</p></div></td></tr>`;
    } else {
      rows.forEach((p) => {
        body += `<tr>
          <td class="ellipsis" title="${escAttr(p.title)}">${esc(p.title)}</td>
          <td>${esc(p.category_title) || '<span class="text-muted">—</span>'}</td>
          <td class="mono nowrap">${formatPrice(p.pay)} تومان</td>
          <td>${this.videosCount(p.videos)}</td>
          <td class="ellipsis" title="${escAttr(p.resources)}">${esc(p.resources) || '<span class="text-muted">—</span>'}</td>
          <td class="mono">${toJalaliDateTime(p.datetime)}</td>
          <td class="mono">${toFa(p.views)}</td>
          <td class="mono">${toFa(p.likes)}</td>
          <td>
            <div class="cell-actions">
              <button class="btn btn-sm btn-secondary" data-edit='${escAttr(JSON.stringify(p))}'>${ICONS.edit} ویرایش</button>
              <button class="btn btn-sm btn-danger" data-del="${esc(p.id)}">${ICONS.trash} حذف</button>
            </div>
          </td>
        </tr>`;
      });
    }
    contentEl.innerHTML =
      head +
      toolbar +
      `<div class="table-wrap"><table class="data">
        <thead><tr><th>عنوان</th><th>دسته‌بندی</th><th>مبلغ</th><th>ویدئوها</th><th>منابع</th><th>زمان</th><th>بازدید</th><th>لایک‌ها</th><th>عملیات</th></tr></thead>
        <tbody>${body}</tbody></table></div>` +
      paginationHTML(resp.current_page, resp.total_pages, "تعداد کل پست‌ها: " + toFa(resp.total_posts));

    const input = contentEl.querySelector("#postSearch");
    let timer;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        this.search = input.value.trim();
        this.page = 1;
        this.load();
      }, 450);
    });
    bindPagination(contentEl, (pg) => {
      this.page = pg;
      this.load();
    });
    contentEl.querySelector("#addPost").addEventListener("click", () => this.dialog(null));
    contentEl.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => this.dialog(JSON.parse(b.dataset.edit)))
    );
    contentEl.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => this.del(b.dataset.del))
    );
  },

  dialog(p) {
    const isEdit = !!p;
    // مقدار اولیه دسته‌بندی
    let chosen = isEdit
      ? { category_name: p.category_name, category_id: p.category_id, label: p.category_title || p.category_name }
      : null;

    const body = `
      <div class="field"><label>عنوان</label><input class="input" id="p_title" value="${isEdit ? escAttr(p.title) : ""}" /></div>
      <div class="field">
        <label style="display:flex;align-items:center;justify-content:space-between">متن
          <button type="button" class="btn btn-sm btn-ghost" id="p_help">راهنمای تگ‌ها</button>
        </label>
        <textarea class="textarea" id="p_text" style="min-height:150px">${isEdit ? esc(p.text) : ""}</textarea>
      </div>
      <div class="field"><label>قیمت (تومان)</label><input class="input mono" type="number" id="p_pay" value="${isEdit ? escAttr(p.pay) : "0"}" /></div>
      <div class="field"><label>ویدئوها (اختیاری)</label><input class="input" id="p_videos" dir="ltr" placeholder='["p.mp4","p2.mp4"]' value="${isEdit ? escAttr(p.videos) : ""}" /></div>
      <div class="field"><label>منابع (اختیاری)</label><input class="input" id="p_res" value="${isEdit ? escAttr(p.resources) : ""}" /></div>
      <div class="field">
        <label>دسته‌بندی</label>
        <button type="button" class="btn btn-block" id="p_cat" style="justify-content:space-between">
          <span id="p_cat_label">${chosen ? esc(chosen.label) : "انتخاب دسته‌بندی..."}</span>
          ${ICONS.layers}
        </button>
      </div>`;

    const overlay = openModal({
      title: isEdit ? "ویرایش پست" : "افزودن پست",
      body,
      size: "lg",
      footer: `<button class="btn btn-primary" data-save>${isEdit ? ICONS.edit + " ویرایش پست" : ICONS.plus + " افزودن پست"}</button><button class="btn btn-ghost" data-close>لغو</button>`,
    });

    overlay.querySelector("#p_help").addEventListener("click", helpTextDialog);
    overlay.querySelector("#p_cat").addEventListener("click", () => {
      CategoryPicker.open((sel) => {
        chosen = sel;
        overlay.querySelector("#p_cat_label").textContent = sel.label;
      });
    });

    overlay.querySelector("[data-save]").addEventListener("click", async () => {
      if (!chosen) {
        showToast("لطفاً یک دسته‌بندی انتخاب کنید", "error");
        return;
      }
      const btn = overlay.querySelector("[data-save]");
      btn.disabled = true;
      const payload = {
        title: fval(overlay, "p_title"),
        text: fval(overlay, "p_text"),
        category_name: chosen.category_name,
        category_id: chosen.category_id,
        pay: fval(overlay, "p_pay"),
        videos: fval(overlay, "p_videos"),
        resources: fval(overlay, "p_res"),
      };
      if (isEdit) {
        payload.ac = 20;
        payload.id = p.id;
      } else {
        payload.ac = 21;
      }
      try {
        const resp = await apiPostAuth(payload);
        if (handleResult(resp, isEdit ? "پست ویرایش شد" : "پست افزوده شد")) {
          overlay._close();
          this.load();
        } else btn.disabled = false;
      } catch (e) {
        showToast("خطا در ارتباط با سرور", "error");
        btn.disabled = false;
      }
    });
  },

  del(id) {
    confirmDialog(
      "آیا مطمئنید این پست را حذف می‌کنید؟",
      async () => {
        try {
          const resp = await apiPostAuth({ ac: 19, id });
          handleResult(resp, "پست حذف شد");
          this.load();
        } catch (e) {
          showToast("خطا در ارتباط با سرور", "error");
        }
      },
      { danger: true, confirmText: "بله، حذف کن" }
    );
  },
};

/* ----------- انتخاب‌گر دسته‌بندی برای پست (همانند مدیریت موضوعات) ----------- */
const CategoryPicker = {
  onSelect: null,
  stack: [], // مثل Subcats ولی داخل مودال
  overlay: null,

  open(onSelect) {
    this.onSelect = onSelect;
    this.stack = [];
    this.overlay = openModal({
      title: "انتخاب دسته‌بندی پست",
      body: `<div id="picker_body"><div class="loader"><span class="spinner"></span> در حال بارگذاری...</div></div>`,
      size: "lg",
      footer: `<button class="btn btn-ghost" data-close>بستن</button>`,
    });
    this.loadTopics();
  },

  bodyEl() {
    return this.overlay.querySelector("#picker_body");
  },

  async loadTopics() {
    this.stack = [];
    this.bodyEl().innerHTML = `<div class="loader"><span class="spinner"></span> در حال بارگذاری...</div>`;
    try {
      const resp = await apiPostAuth({ ac: 10 });
      const list = Array.isArray(resp) ? resp : (resp && resp.data) || [];
      let crumb = `<div class="breadcrumb"><span class="current">موضوعات</span></div>`;
      let rows = "";
      if (!list.length) rows = `<div class="empty-state" style="padding:24px"><p>موضوعی موجود نیست.</p></div>`;
      else {
        rows = `<div class="table-wrap"><table class="data"><thead><tr><th>عنوان</th><th>عملیات</th></tr></thead><tbody>`;
        list.forEach((t) => {
          rows += `<tr><td>${esc(t.title)}</td><td><div class="cell-actions">
            <button class="btn btn-sm btn-secondary" data-open='${escAttr(JSON.stringify({ id: t.id, title: t.title }))}'>${ICONS.layers} زیر دسته‌ها</button>
          </div></td></tr>`;
        });
        rows += `</tbody></table></div>`;
      }
      this.bodyEl().innerHTML = crumb + rows;
      this.bodyEl()
        .querySelectorAll("[data-open]")
        .forEach((b) =>
          b.addEventListener("click", () => {
            const t = JSON.parse(b.dataset.open);
            this.stack = [{ table: "subcats1", parentId: t.id, parentTitle: t.title, page: 1, search: "" }];
            this.loadLevel();
          })
        );
    } catch (e) {
      this.bodyEl().innerHTML = `<p class="modal-text">خطا در دریافت موضوعات.</p>`;
    }
  },

  cur() {
    return this.stack[this.stack.length - 1];
  },

  gotoLevel(index) {
    if (index < 0) {
      this.loadTopics();
      return;
    }
    this.stack = this.stack.slice(0, index + 1);
    this.loadLevel();
  },

  async loadLevel() {
    const cur = this.cur();
    this.bodyEl().innerHTML = `<div class="loader"><span class="spinner"></span> در حال بارگذاری...</div>`;
    try {
      const params = { ac: 13, id: cur.parentId, page: cur.page, table: cur.table };
      if (cur.search) params.search = cur.search;
      const resp = await apiPostAuth(params);
      this.renderLevel(resp);
    } catch (e) {
      this.bodyEl().innerHTML = `<p class="modal-text">خطا در دریافت زیر دسته‌ها.</p>`;
    }
  },

  renderLevel(resp) {
    const cur = this.cur();
    const rows = (resp && resp.data) || [];
    const levelNum = parseInt(cur.table.replace("subcats", ""), 10);
    const canDrill = levelNum < MAX_SUBCATS;

    let crumb = `<div class="breadcrumb"><button data-level="-1">موضوعات</button>`;
    this.stack.forEach((lvl, i) => {
      const last = i === this.stack.length - 1;
      crumb += `<span class="sep">›</span>`;
      if (last) crumb += `<span class="current">${esc(lvl.parentTitle)}</span>`;
      else crumb += `<button data-level="${i}">${esc(lvl.parentTitle)}</button>`;
    });
    crumb += `</div>`;

    const toolbar = `<div class="toolbar"><div class="search-box">${ICONS.search}
      <input type="text" id="pk_search" value="${escAttr(cur.search)}" placeholder="جستجو..." /></div></div>`;

    let tbody = "";
    if (!rows.length) tbody = `<tr><td colspan="2"><div class="empty-state" style="padding:24px"><p>موردی یافت نشد.</p></div></td></tr>`;
    else {
      rows.forEach((r) => {
        tbody += `<tr><td>${esc(r.title)}</td><td><div class="cell-actions">
          <button class="btn btn-sm btn-primary" data-pick='${escAttr(JSON.stringify({ category_name: cur.table, category_id: r.id, label: r.title }))}'>${ICONS.check} انتخاب این دسته</button>
          ${canDrill ? `<button class="btn btn-sm btn-ghost" data-drill='${escAttr(JSON.stringify({ id: r.id, title: r.title }))}'>${ICONS.layers} زیر دسته‌ها</button>` : ""}
        </div></td></tr>`;
      });
    }

    this.bodyEl().innerHTML =
      crumb +
      toolbar +
      `<div class="table-wrap"><table class="data"><thead><tr><th>عنوان</th><th>عملیات</th></tr></thead><tbody>${tbody}</tbody></table></div>` +
      paginationHTML(resp.current_page, resp.total_pages, "تعداد: " + toFa(resp.total_rows));

    const b = this.bodyEl();
    b.querySelectorAll("[data-level]").forEach((x) =>
      x.addEventListener("click", () => this.gotoLevel(parseInt(x.dataset.level, 10)))
    );
    const input = b.querySelector("#pk_search");
    let timer;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        cur.search = input.value.trim();
        cur.page = 1;
        this.loadLevel();
      }, 450);
    });
    bindPagination(b, (p) => {
      cur.page = p;
      this.loadLevel();
    });
    b.querySelectorAll("[data-drill]").forEach((x) =>
      x.addEventListener("click", () => {
        const rec = JSON.parse(x.dataset.drill);
        this.stack.push({ table: "subcats" + (levelNum + 1), parentId: rec.id, parentTitle: rec.title, page: 1, search: "" });
        this.loadLevel();
      })
    );
    b.querySelectorAll("[data-pick]").forEach((x) =>
      x.addEventListener("click", () => {
        const sel = JSON.parse(x.dataset.pick);
        if (this.onSelect) this.onSelect(sel);
        this.overlay._close();
      })
    );
  },
};

/* =========================================================
   5) مدیریت اطلاعیه‌ها
   ========================================================= */
const Notifications = {
  open() {
    this.load();
  },
  async load() {
    setLoading();
    try {
      const resp = await apiPostAuth({ ac: 22 });
      this.render((resp && resp.data) || []);
    } catch (e) {
      showError(e.message);
    }
  },
  render(list) {
    const head = pageHead(
      SECTION_ICONS.notifications,
      "مدیریت اطلاعیه‌ها",
      `<button class="btn btn-primary" id="addNotif">${ICONS.plus} افزودن اطلاعیه</button>`
    );
    let rows = "";
    if (!list.length) {
      rows = `<tr><td colspan="7"><div class="empty-state" style="padding:30px"><p>اطلاعیه‌ای ثبت نشده است.</p></div></td></tr>`;
    } else {
      list.forEach((n) => {
        rows += `<tr>
          <td class="ellipsis" title="${escAttr(n.title)}">${esc(n.title)}</td>
          <td class="mono">${toFa(esc((n.datetime || "").split(" ")[0]))}</td>
          <td>${n.openlink ? `<a href="${escAttr(n.openlink)}" target="_blank" rel="noopener" class="badge badge-muted" dir="ltr">لینک</a>` : '<span class="text-muted">—</span>'}</td>
          <td>${esc(n.openlink_text) || '<span class="text-muted">—</span>'}</td>
          <td>${ynIcon(n.showin_home)}</td>
          <td>${ynIcon(n.showin_notifications)}</td>
          <td><div class="cell-actions">
            <button class="btn btn-sm btn-secondary" data-edit='${escAttr(JSON.stringify(n))}'>${ICONS.edit} ویرایش</button>
            <button class="btn btn-sm btn-danger" data-del="${esc(n.id)}">${ICONS.trash} حذف</button>
          </div></td>
        </tr>`;
      });
    }
    contentEl.innerHTML =
      head +
      `<div class="table-wrap"><table class="data">
        <thead><tr><th>عنوان</th><th>زمان ثبت</th><th>لینک</th><th>متن لینک</th><th>نمایش در خانه</th><th>نمایش در زنگوله</th><th>عملیات</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;

    contentEl.querySelector("#addNotif").addEventListener("click", () => this.dialog(null));
    contentEl.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => this.dialog(JSON.parse(b.dataset.edit)))
    );
    contentEl.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => this.del(b.dataset.del))
    );
  },
  dialog(n) {
    const isEdit = !!n;
    const body = `
      <div class="field"><label>عنوان</label><input class="input" id="n_title" value="${isEdit ? escAttr(n.title) : ""}" /></div>
      <div class="field"><label>متن</label><textarea class="textarea" id="n_text">${isEdit ? esc(n.text) : ""}</textarea></div>
      <div class="field"><label>لینک (اختیاری)</label><input class="input" id="n_link" dir="ltr" placeholder="https://example.com" value="${isEdit ? escAttr(n.openlink) : ""}" /></div>
      <div class="field"><label>متن لینک (اختیاری)</label><input class="input" id="n_linktext" value="${isEdit ? escAttr(n.openlink_text) : ""}" /></div>
      <div class="checkbox-row"><input type="checkbox" id="n_home" ${isEdit && String(n.showin_home) === "1" ? "checked" : ""}/><label for="n_home">نمایش در خانه</label></div>
      <div class="checkbox-row"><input type="checkbox" id="n_bell" ${isEdit && String(n.showin_notifications) === "1" ? "checked" : ""}/><label for="n_bell">نمایش در زنگوله</label></div>`;
    const overlay = openModal({
      title: isEdit ? "ویرایش اطلاعیه" : "افزودن ا��لاعیه",
      body,
      footer: `<button class="btn btn-primary" data-save>${isEdit ? ICONS.edit + " ویرایش" : ICONS.plus + " افزودن"}</button><button class="btn btn-ghost" data-close>لغو</button>`,
    });
    overlay.querySelector("[data-save]").addEventListener("click", async () => {
      const btn = overlay.querySelector("[data-save]");
      btn.disabled = true;
      const payload = {
        title: fval(overlay, "n_title"),
        text: fval(overlay, "n_text"),
        openlink: fval(overlay, "n_link"),
        openlink_text: fval(overlay, "n_linktext"),
        showin_home: fval(overlay, "n_home"),
        showin_notifications: fval(overlay, "n_bell"),
      };
      if (isEdit) {
        payload.ac = 24;
        payload.id = n.id;
      } else {
        payload.ac = 23;
      }
      try {
        const resp = await apiPostAuth(payload);
        if (handleResult(resp, isEdit ? "اطلاعیه ویرایش شد" : "اطلاعیه افزوده شد")) {
          overlay._close();
          this.load();
        } else btn.disabled = false;
      } catch (e) {
        showToast("خطا در ارتباط با سرور", "error");
        btn.disabled = false;
      }
    });
  },
  del(id) {
    confirmDialog(
      "آیا مطمئنید این اطلاعیه حذف شود؟",
      async () => {
        try {
          const resp = await apiPostAuth({ ac: 25, id });
          handleResult(resp, "اطلاعیه حذف شد");
          this.load();
        } catch (e) {
          showToast("خطا در ارتباط با سرور", "error");
        }
      },
      { danger: true, confirmText: "بله، حذف کن" }
    );
  },
};

/* =========================================================
   6) تنظیمات اپلیکیشن
   ========================================================= */
const Settings = {
  open() {
    this.load();
  },
  async load() {
    setLoading();
    try {
      const resp = await apiPostAuth({ ac: 26 });
      this.render((resp && resp.data) || {});
    } catch (e) {
      showError(e.message);
    }
  },
  render(d) {
    const head = pageHead(
      SECTION_ICONS.settings,
      "تنظیمات اپلیکیشن",
      `<button class="btn btn-ghost" id="setHelp">راهنمای متن</button>`
    );
    const card = `
      <div class="card" style="padding:24px;max-width:760px">
        <div class="checkbox-row"><input type="checkbox" id="st_status" ${String(d.status) === "1" ? "checked" : ""}/><label for="st_status">اپلیکیشن فعال است (وضعیت)</label></div>
        <div class="field"><label>متن وضعیت</label><input class="input" id="st_status_text" value="${escAttr(d.status_text)}" /></div>
        <div class="field"><label>متن درباره ما</label><textarea class="textarea" id="st_about" style="min-height:120px">${esc(d.about)}</textarea></div>
        <div class="field"><label>شماره حساب‌ها</label><textarea class="textarea" id="st_cards" dir="ltr">${esc(d.cards)}</textarea></div>
        <div class="field"><label>قوانین و شرایط استفاده</label><textarea class="textarea" id="st_terms" style="min-height:140px">${esc(d.terms_of_use)}</textarea></div>
        <button class="btn btn-primary" id="st_save" style="margin-top:6px">${ICONS.edit} ثبت تغییرات</button>
      </div>`;
    contentEl.innerHTML = head + card;
    contentEl.querySelector("#setHelp").addEventListener("click", helpTextDialog);
    contentEl.querySelector("#st_save").addEventListener("click", async () => {
      const btn = contentEl.querySelector("#st_save");
      btn.disabled = true;
      const overlayLike = contentEl; // فیلدها در محتوا هستند
      try {
        const resp = await apiPostAuth({
          ac: 27,
          status: contentEl.querySelector("#st_status").checked ? "1" : "0",
          status_text: contentEl.querySelector("#st_status_text").value,
          about: contentEl.querySelector("#st_about").value,
          cards: contentEl.querySelector("#st_cards").value,
          terms_of_use: contentEl.querySelector("#st_terms").value,
        });
        handleResult(resp, "تنظیمات با موفقیت ذخیره شد");
      } catch (e) {
        showToast("خطا در ارتباط با سرور", "error");
      }
      btn.disabled = false;
    });
  },
};

/* =========================================================
   7) آمار
   ========================================================= */
const Stats = {
  open() {
    this.load();
  },
  async load() {
    setLoading();
    try {
      const resp = await apiPostAuth({ ac: 28 });
      this.render((resp && resp.data) || {});
    } catch (e) {
      showError(e.message);
    }
  },
  rankCard(title, items, key, icon) {
    let lis = "";
    if (!items || !items.length) lis = `<li><span class="text-muted">موردی موجود نیست</span></li>`;
    else
      items.slice(0, 10).forEach((it, i) => {
        lis += `<li>
          <span class="rank-num">${toFa(i + 1)}</span>
          <span class="rank-title" title="${escAttr(it.title)}">${esc(it.title)}</span>
          <span class="rank-count">${toFa(it[key])} ${key === "likes" ? "لایک" : "بازدید"}</span>
        </li>`;
      });
    return `<div class="rank-card"><h4>${icon}${esc(title)}</h4><ul class="rank-list">${lis}</ul></div>`;
  },
  statCard(cls, icon, val, label) {
    return `<div class="stat-card ${cls}"><div class="stat-ic">${icon}</div><div><div class="stat-val mono">${val}</div><div class="stat-label">${esc(label)}</div></div></div>`;
  },
  render(d) {
    const head = pageHead(SECTION_ICONS.stats, "آمار اپلیکیشن");
    const I = ICONS;
    const cards = `
      <div class="stat-grid">
        ${this.statCard("", SECTION_ICONS.topics, toFa(d.categories_count || 0), "تعداد کل دسته‌بندی‌ها")}
        ${this.statCard("s2", I.layers, toFa(d.subcategories_count || 0), "تعداد کل زیر‌دسته‌ها")}
        ${this.statCard("s3", SECTION_ICONS.posts, toFa(d.posts_count || 0), "تعداد کل پست‌ها")}
        ${this.statCard("s4", SECTION_ICONS.receipts, toFa(d.payment_receipts_count || 0), "تعداد رسیدهای پرداخت")}
        ${this.statCard("s3", I.check, toFa(d.payments_pending || 0), "پرداخت‌های در انتظار")}
        ${this.statCard("s4", I.check, toFa(d.payments_approved || 0), "پرداخت‌های تأییدشده")}
        ${this.statCard("s5", I.x, toFa(d.payments_rejected || 0), "پرداخت‌های ردشده")}
        ${this.statCard("s2", SECTION_ICONS.receipts, formatPrice(d.total_income || 0) + " تومان", "مجموع درآمد (تأییدشده)")}
      </div>`;
    const lists = `
      <div class="stat-lists">
        ${this.rankCard("۱۰ دسته‌بندی پربازدید", d.top_categories, "views", SECTION_ICONS.topics)}
        ${this.rankCard("۱۰ زیر‌دسته پربازدید", d.top_subcategories, "views", I.layers)}
        ${this.rankCard("۱۰ پست پربازدید", d.top_posts_by_views, "views", SECTION_ICONS.posts)}
        ${this.rankCard("۱۰ پست پرلایک", d.top_posts_by_likes, "likes", I.heart)}
      </div>`;
    contentEl.innerHTML = head + cards + lists;
  },
};
