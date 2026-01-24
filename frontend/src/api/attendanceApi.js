// src/api/attendanceApi.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

// Demo auth headers (localStorage)
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem("userId") || "SV001";
  const role = (localStorage.getItem("role") || "STUDENT").toUpperCase();
  config.headers["x-user-id"] = userId;
  config.headers["x-role"] = role;
  return config;
});

// ---- small helpers ----
function isRetryableHttpError(e) {
  const status = e?.response?.status;
  // 404/405: sai route => thử route khác
  if (status === 404 || status === 405) return true;
  // nếu không có response (network) cũng có thể retry
  if (!e?.response) return true;
  return false;
}

async function tryMany(fns) {
  let lastErr = null;
  for (const fn of fns) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isRetryableHttpError(e)) break; // lỗi “thật” (401/403/500...) thì dừng
    }
  }
  throw lastErr;
}

export const attendanceApi = {
  // =========================
  // CLASSES
  // =========================
  createClass: (payload) => api.post("/api/teacher/classes", payload),
  getTeacherClasses: () => api.get("/api/teacher/classes"),
  deleteTeacherClass: (classId) => api.delete(`/api/teacher/classes/${classId}`),
  getMyClasses: () => api.get("/api/student/classes"),

  // =========================
  // SESSIONS
  // =========================
  getSessionsByClass: (classId) => api.get("/api/attendance/sessions", { params: { classId } }),
  getActiveSessionByClass: (classId) => api.get("/api/attendance/active-session", { params: { classId } }),
  createSession: (payload) => api.post("/api/attendance/create-session", payload),
  closeSession: (sessionId) => api.post(`/api/attendance/close-session/${sessionId}`),
  getSessionAttendees: (sessionId) => api.get("/api/attendance/session-attendees", { params: { sessionId } }),

  // =========================
  // CHECK-IN
  // =========================
  checkIn: (sessionId, attendanceCode) => api.post("/api/attendance/check-in", { sessionId, attendanceCode }),
  getMyAttendanceByClass: (classId) => api.get("/api/attendance/my-attendance", { params: { classId } }),

  // =========================
  // LEAVE (SV xin nghỉ / GV duyệt)
  // =========================

  /**
   * ✅ Tương thích 2 kiểu:
   * 1) Cũ: requestLeave(sessionId, reason)
   * 2) Mới: requestLeave({ classId, startDate, endDate, reason, ... })
   */
  requestLeave: (arg1, arg2) => {
    if (typeof arg1 === "string") {
      return api.post("/api/attendance/leave-request", { sessionId: arg1, reason: arg2 });
    }
    return api.post("/api/attendance/leave-request", arg1);
  },

  requestLeaveRange: (classId, payload) => api.post("/api/attendance/leave-request", { classId, ...payload }),

  /**
   * ✅ GV lấy đơn theo lớp
   * - status: "PENDING" | "APPROVED" | "REJECTED" | "ALL"
   */
  getLeaveRequestsByClass: (classId, status = "PENDING") => {
    const params = { classId };
    if (status && String(status).toUpperCase() !== "ALL") params.status = status;
    return api.get("/api/attendance/leave-requests", { params });
  },

  // ✅ SV xem đơn của mình theo lớp
  getMyLeaveRequestsByClass: (classId) => api.get("/api/attendance/my-leave-requests", { params: { classId } }),

  /**
   * ✅ GV phê duyệt / từ chối (FLEXIBLE)
   * Vì backend mỗi người hay đặt route khác nhau, nên ta thử nhiều route.
   * TeacherLeavePage của bạn gọi approveLeave/rejectLeave -> đây là chỗ fix 404.
   */
  approveLeave: (leaveId, teacherNote = "") =>
    tryMany([
      // dạng bạn đang gọi
      () => api.put(`/api/attendance/leave-approve/${leaveId}`, { teacherNote }),
      () => api.put(`/api/attendance/leave-approve/${leaveId}`),

      // dạng phổ biến khác
      () => api.put(`/api/attendance/leaves/${leaveId}/approve`, { teacherNote }),
      () => api.put(`/api/attendance/leaves/${leaveId}/approve`),

      () => api.put(`/api/attendance/leave-requests/${leaveId}/approve`, { teacherNote }),
      () => api.put(`/api/attendance/leave-requests/${leaveId}/approve`),

      // dạng nhận leaveId trong body
      () => api.put(`/api/attendance/leave-approve`, { leaveId, teacherNote }),
      () => api.put(`/api/attendance/leave/approve`, { leaveId, teacherNote }),
    ]),

  rejectLeave: (leaveId, teacherNote = "") =>
    tryMany([
      // dạng bạn đang gọi
      () => api.put(`/api/attendance/leave-reject/${leaveId}`, { teacherNote }),
      () => api.put(`/api/attendance/leave-reject/${leaveId}`),

      // dạng phổ biến khác
      () => api.put(`/api/attendance/leaves/${leaveId}/reject`, { teacherNote }),
      () => api.put(`/api/attendance/leaves/${leaveId}/reject`),

      () => api.put(`/api/attendance/leave-requests/${leaveId}/reject`, { teacherNote }),
      () => api.put(`/api/attendance/leave-requests/${leaveId}/reject`),

      // dạng nhận leaveId trong body
      () => api.put(`/api/attendance/leave-reject`, { leaveId, teacherNote }),
      () => api.put(`/api/attendance/leave/reject`, { leaveId, teacherNote }),
    ]),

  /**
   * ✅ Optional: hàm chung update status (để TeacherLeavePage có thể gọi nếu cần)
   */
  updateLeaveStatus: (leaveId, status, teacherNote = "") => {
    const s = String(status || "").toUpperCase();
    return tryMany([
      () => api.put(`/api/attendance/leave-status/${leaveId}`, { status: s, teacherNote }),
      () => api.put(`/api/attendance/leaves/${leaveId}/status`, { status: s, teacherNote }),
      () => api.put(`/api/attendance/leave-requests/${leaveId}/status`, { status: s, teacherNote }),
      () => api.put(`/api/attendance/leave-status`, { leaveId, status: s, teacherNote }),
    ]);
  },
};
