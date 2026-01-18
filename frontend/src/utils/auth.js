// src/utils/auth.js
import { sendResetCodeEmail } from "./mailer.js";

/**
 * LocalStorage keys
 */
const USERS_KEY = "sas_users";
const SESSION_KEY = "sas_session";
const RESET_PREFIX = "sas_reset_"; // sas_reset_<emailLower>

function safeParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
function normalize(s) {
  return String(s || "").trim();
}
function lower(s) {
  return normalize(s).toLowerCase();
}
function readUsers() {
  return safeParse(localStorage.getItem(USERS_KEY) || "[]", []);
}
function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function genOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function toPublicUser(user) {
  return user ? { id: user.id, username: user.username, role: user.role } : null;
}

/**
 * =========================
 * REGISTER
 * =========================
 */
export function registerUser({ username, password, role }) {
  const u = normalize(username);
  const p = String(password || "");
  const r = role === "teacher" ? "teacher" : "student";

  if (!u) return { ok: false, message: "Vui lòng nhập email/tài khoản" };
  if (p.length < 4) return { ok: false, message: "Mật khẩu tối thiểu 4 ký tự" };

  const users = readUsers();
  const exists = users.some((x) => lower(x.username) === lower(u));
  if (exists) return { ok: false, message: "Tài khoản đã tồn tại" };

  const newUser = {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    username: u,
    password: p,
    role: r,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  return { ok: true, message: "Đăng ký thành công", user: toPublicUser(newUser) };
}

/**
 * =========================
 * LOGIN
 * =========================
 */
export function loginUser({ username, password }) {
  const u = normalize(username);
  const p = String(password || "");

  if (!u) return { ok: false, message: "Vui lòng nhập tài khoản" };
  if (!p) return { ok: false, message: "Vui lòng nhập mật khẩu" };

  const users = readUsers();
  const user = users.find((x) => lower(x.username) === lower(u) && x.password === p);

  if (!user) return { ok: false, message: "Sai tài khoản hoặc mật khẩu" };

  const sessionUser = toPublicUser(user);

  // ✅ session cho ProtectedRoute
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

  // ✅ keys cho attendanceApi + các guard khác (demo)
  localStorage.setItem("userId", user.id || user.username); // dùng id hoặc username
  localStorage.setItem("role", String(user.role || "student").toUpperCase()); // STUDENT|TEACHER
  localStorage.setItem("token", "demo-token"); // để các guard kiểu token không đá về /login

  return { ok: true, message: "Đăng nhập thành công", user: sessionUser };
}

export function getCurrentUser() {
  return safeParse(localStorage.getItem(SESSION_KEY) || "null", null);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
  return { ok: true };
}

/**
 * =========================
 * FORGOT PASSWORD (EmailJS OTP)
 * =========================
 */
export async function requestPasswordReset({ username }) {
  const u = normalize(username);
  if (!u) return { ok: false, message: "Vui lòng nhập email" };

  const users = readUsers();
  const user = users.find((x) => lower(x.username) === lower(u));
  if (!user) return { ok: false, message: "Không tìm thấy tài khoản" };

  const otp = genOtp6();
  const minutes = 15;
  const expiresAt = Date.now() + minutes * 60 * 1000;

  const resetKey = RESET_PREFIX + lower(u);
  localStorage.setItem(resetKey, JSON.stringify({ code: otp, expiresAt }));

  try {
    await sendResetCodeEmail({
      email: u,
      otp_code: otp,
      minutes,
      app_name: "Attendance System",
    });

    return { ok: true, message: "Đã gửi mã OTP về email. Vui lòng kiểm tra hộp thư!", email: u };
  } catch (err) {
    console.error("EmailJS FAILED:", err);
    localStorage.removeItem(resetKey);

    const detail = err?.text || err?.message || "unknown";
    return { ok: false, message: `Gửi email thất bại: ${detail}` };
  }
}

/**
 * =========================
 * RESET PASSWORD
 * =========================
 */
export function resetPassword({ username, code, newPassword }) {
  const u = normalize(username);
  const c = normalize(code);
  const np = String(newPassword || "");

  if (!u) return { ok: false, message: "Vui lòng nhập email" };
  if (!c) return { ok: false, message: "Vui lòng nhập mã OTP" };
  if (np.length < 4) return { ok: false, message: "Mật khẩu mới tối thiểu 4 ký tự" };

  const resetKey = RESET_PREFIX + lower(u);
  const record = safeParse(localStorage.getItem(resetKey) || "null", null);

  if (!record) return { ok: false, message: "Chưa yêu cầu quên mật khẩu hoặc mã đã bị xoá" };

  if (Date.now() > record.expiresAt) {
    localStorage.removeItem(resetKey);
    return { ok: false, message: "Mã đã hết hạn. Vui lòng yêu cầu lại." };
  }

  if (String(record.code) !== String(c)) {
    return { ok: false, message: "Mã OTP không đúng" };
  }

  const users = readUsers();
  const idx = users.findIndex((x) => lower(x.username) === lower(u));
  if (idx === -1) return { ok: false, message: "Không tìm thấy tài khoản" };

  users[idx].password = np;
  writeUsers(users);

  localStorage.removeItem(resetKey);
  return { ok: true, message: "Đổi mật khẩu thành công" };
}
