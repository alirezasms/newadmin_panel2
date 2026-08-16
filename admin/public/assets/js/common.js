/* ===========================================================
   common.js - توابع مشترک پنل مدیریت دکتر عبادی تالش
   =========================================================== */

// آدرس API
const API_URL = "https://drebadi.com/app/admin.php";

/* ---------------- کوکی ---------------- */
function setCookie(name, value, days = 30) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie =
    name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name) {
  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
}

function getToken() {
  return getCookie("admin_token") || "";
}

/* ---------------- ارسال درخواست (POST x-www-form-urlencoded) ---------------- */
async function apiPost(params) {
  const body = new URLSearchParams();
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null) body.append(k, params[k]);
  });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch (e) {
    console.log("[v0] پاسخ غیر JSON از سرور:", txt);
    throw new Error("پاسخ نامعتبر از سرور دریافت شد");
  }
}

// درخواستی که خودکار توکن کوکی را اضافه می‌کند
async function apiPostAuth(params) {
  return apiPost(Object.assign({ token: getToken() }, params));
}

/* ---------------- ارقام فارسی ---------------- */
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toFa(input) {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}

// قیمت با جداکننده هزارگان
function formatPrice(value) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return toFa(value || "0");
  return toFa(n.toLocaleString("en-US"));
}

/* ---------------- تبدیل میلادی به شمسی ---------------- */
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  let jm, jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

// ورودی: "2026-05-21 23:06:01"  خروجی: "۱۴۰۵/۰۳/۰۱ - ۲۳:۰۶"
function toJalaliDateTime(dt) {
  if (!dt || typeof dt !== "string") return "—";
  const parts = dt.trim().split(" ");
  const dpart = parts[0];
  const tpart = parts[1] || "";
  const [y, m, d] = dpart.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return toFa(dt);
  const [jy, jm, jd] = gregorianToJalali(y, m, d);
  const pad = (n) => String(n).padStart(2, "0");
  let out = `${jy}/${pad(jm)}/${pad(jd)}`;
  if (tpart) {
    const [hh, mm] = tpart.split(":");
    out += ` - ${hh}:${mm}`;
  }
  return toFa(out);
}

/* ---------------- escape برای جلوگیری از XSS ---------------- */
function esc(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escAttr(str) {
  return esc(str).replace(/`/g, "&#96;");
}

/* ---------------- آیکن تیک/ضربدر ---------------- */
function ynIcon(val) {
  const yes = String(val) === "1";
  return yes
    ? '<span class="icon-yn yes" title="بله">✓</span>'
    : '<span class="icon-yn no" title="خیر">✕</span>';
}

/* ---------------- توست ---------------- */
function ensureToastStack() {
  let s = document.querySelector(".toast-stack");
  if (!s) {
    s = document.createElement("div");
    s.className = "toast-stack";
    document.body.appendChild(s);
  }
  return s;
}

const TOAST_ICONS = {
  success:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  error:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
  info:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
};

function showToast(message, type = "success", duration = 3800) {
  const stack = ensureToastStack();
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.innerHTML = `<span class="toast-ic">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${esc(
    message
  )}</span>`;
  stack.appendChild(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 320);
  }, duration);
}

// نمایش پیام بر اساس پاسخ سرور (success/message)
function handleResult(resp, fallbackSuccess) {
  if (resp && resp.success) {
    showToast(resp.message || fallbackSuccess || "عملیات با موفقیت انجام شد", "success");
    return true;
  }
  showToast((resp && resp.message) || "عملیات انجام نشد", "error");
  return false;
}
