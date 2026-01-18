// src/api/attendanceApi.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

/**
 * Auth header strategy:
 * - Nếu có token: gửi Authorization: Bearer <token>
 * - Nếu chưa có token (demo): gửi x-user-id và x-role như bạn đang dùng
 */
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  // DEMO fallback (đang dùng)
  const userId = localStorage.getItem("userId") || "SV001";
  const role = localStorage.getItem("role") || "STUDENT"; // STUDENT | TEACHER
  config.headers["x-user-id"] = userId;
  config.headers["x-role"] = role;

  return config;
});

export const attendanceApi = {
  // ===================== STUDENT: CLASSES (TKB) =====================
  /**
   * SV lấy danh sách lớp của mình để hiện lên TKB
   * Backend cần implement: GET /api/student/classes
   * Response đề xuất:
   * [{ id|_id, subjectName, subjectCode, teacherName, dayOfWeek: "MON", period: 1..4 }]
   */
  getMyClasses: () => api.get(`/api/student/classes`),

  // ===================== SESSIONS =====================
  // (bạn đã có) - danh sách session theo class
  getSessionsByClass: (classId) =>
    api.get(`/api/attendance/sessions`, { params: { classId } }),

  /**
   * Lấy session đang mở theo class (để SV điểm danh nhanh)
   * Backend cần implement: GET /api/attendance/active-session?classId=...
   * Response: 1 session hoặc null
   */
  getActiveSessionByClass: (classId) =>
    api.get(`/api/attendance/active-session`, { params: { classId } }),

  /**
   * Lịch sử điểm danh của SV theo lớp
   * Backend cần implement: GET /api/attendance/my-attendance?classId=...
   * Response: [{ _id, sessionId, lesson, checkedAt, status, ... }]
   */
  getMyAttendanceByClass: (classId) =>
    api.get(`/api/attendance/my-attendance`, { params: { classId } }),

  // ===================== CHECK-IN =====================
  // (bạn đã có) - điểm danh theo sessionId + attendanceCode
  checkIn: (sessionId, attendanceCode) =>
    api.post(`/api/attendance/check-in`, { sessionId, attendanceCode }),

  /**
   * Wrapper cho UI kiểu: studentCheckIn({ classId, code, sessionId })
   * - Nếu có sessionId: gọi checkIn(sessionId, code)
   * - Nếu chưa có sessionId nhưng có classId: tự gọi active-session rồi checkIn
   */
  studentCheckIn: async ({ classId, code, sessionId }) => {
    const attendanceCode = String(code || "").trim().toUpperCase();
    if (!attendanceCode) throw new Error("Missing attendance code");

    if (sessionId) return attendanceApi.checkIn(sessionId, attendanceCode);

    if (!classId) throw new Error("Missing classId or sessionId");

    // tự lấy session đang mở
    const r = await attendanceApi.getActiveSessionByClass(classId);
    const active = r?.data;
    if (!active?._id) throw new Error("No active session for this class");

    return attendanceApi.checkIn(active._id, attendanceCode);
  },

  // ===================== LEAVE REQUEST =====================
  // (bạn đã có) - xin vắng theo sessionId
  requestLeave: (sessionId, reason) =>
    api.post(`/api/attendance/leave-request`, { sessionId, reason }),

  /**
   * Wrapper cho UI kiểu: createLeaveRequest({ classId, sessionId, reason })
   * - Nếu có sessionId: requestLeave(sessionId, reason)
   * - Nếu chưa có sessionId nhưng có classId: tự gọi active-session rồi requestLeave
   *
   * Nếu bạn muốn xin vắng cho 1 session cụ thể (không phải active) => truyền sessionId.
   */
  createLeaveRequest: async ({ classId, sessionId, reason }) => {
    const r = String(reason || "").trim();
    if (!r) throw new Error("Missing reason");

    if (sessionId) return attendanceApi.requestLeave(sessionId, r);

    if (!classId) throw new Error("Missing classId or sessionId");

    const a = await attendanceApi.getActiveSessionByClass(classId);
    const active = a?.data;
    if (!active?._id) throw new Error("No active session for this class");

    return attendanceApi.requestLeave(active._id, r);
  },

  /**
   * Danh sách đơn xin vắng của SV theo class
   * Backend cần implement: GET /api/attendance/my-leave-requests?classId=...
   */
  getMyLeaveRequestsByClass: (classId) =>
    api.get(`/api/attendance/my-leave-requests`, { params: { classId } }),

  // ===================== TEACHER: LEAVE APPROVAL =====================
  // (bạn đã có) - teacher lấy danh sách đơn theo lớp + status
  getLeaveRequestsByClass: (classId, status = "PENDING") =>
    api.get(`/api/attendance/leave-requests`, { params: { classId, status } }),

  // ===================== TEACHER: SESSIONS MANAGEMENT =====================
  // (bạn đã có)
  createSession: (payload) => api.post(`/api/attendance/create-session`, payload),
  closeSession: (sessionId) =>
    api.post(`/api/attendance/close-session/${sessionId}`),
  approveLeave: (leaveId) => api.put(`/api/attendance/leave-approve/${leaveId}`),
};
