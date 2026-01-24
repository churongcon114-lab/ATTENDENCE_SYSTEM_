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

export const attendanceApi = {
  // CLASSES
  createClass: (payload) => api.post("/api/teacher/classes", payload),
  getTeacherClasses: () => api.get("/api/teacher/classes"),
  deleteTeacherClass: (classId) => api.delete(`/api/teacher/classes/${classId}`),
  getMyClasses: () => api.get("/api/student/classes"),

  // SESSIONS
  getSessionsByClass: (classId) => api.get("/api/attendance/sessions", { params: { classId } }),
  getActiveSessionByClass: (classId) => api.get("/api/attendance/active-session", { params: { classId } }),
  createSession: (payload) => api.post("/api/attendance/create-session", payload),
  closeSession: (sessionId) => api.post(`/api/attendance/close-session/${sessionId}`),
  getSessionAttendees: (sessionId) => api.get("/api/attendance/session-attendees", { params: { sessionId } }),

  // CHECK-IN
  checkIn: (sessionId, attendanceCode) => api.post("/api/attendance/check-in", { sessionId, attendanceCode }),
  getMyAttendanceByClass: (classId) => api.get("/api/attendance/my-attendance", { params: { classId } }),

  // =========================
  // LEAVE (SV xin nghỉ / GV duyệt)
  // =========================

  /**
   * ✅ Tương thích 2 kiểu:
   * 1) Cũ: requestLeave(sessionId, reason)
   * 2) Mới: requestLeave({ classId, startDate, endDate, reason, studentName, studentCode, ... })
   *
   * => Backend nên cập nhật để chấp nhận kiểu mới.
   */
  requestLeave: (arg1, arg2) => {
    // kiểu cũ
    if (typeof arg1 === "string") {
      return api.post("/api/attendance/leave-request", { sessionId: arg1, reason: arg2 });
    }
    // kiểu mới (object payload)
    return api.post("/api/attendance/leave-request", arg1);
  },

  // ✅ Alias rõ nghĩa cho xin nghỉ theo khoảng ngày (khuyên dùng trong StudentLeavePage)
  requestLeaveRange: (classId, payload) =>
    api.post("/api/attendance/leave-request", { classId, ...payload }),

  /**
   * ✅ GV lấy đơn theo lớp
   * - status: "PENDING" | "APPROVED" | "REJECTED" | "ALL"
   * - Nếu "ALL" => bỏ param status để backend trả tất cả
   */
  getLeaveRequestsByClass: (classId, status = "PENDING") => {
    const params = { classId };
    if (status && String(status).toUpperCase() !== "ALL") params.status = status;
    return api.get("/api/attendance/leave-requests", { params });
  },

  // ✅ SV xem đơn của mình theo lớp
  getMyLeaveRequestsByClass: (classId) =>
    api.get("/api/attendance/my-leave-requests", { params: { classId } }),

  /**
   * ✅ GV phê duyệt / từ chối (có thể gửi teacherNote)
   * (Nếu backend bạn chưa nhận body, vẫn OK — nhưng nên cập nhật backend để lưu note)
   */
  approveLeave: (leaveId, teacherNote = "") =>
    api.put(`/api/attendance/leave-approve/${leaveId}`, { teacherNote }),

  rejectLeave: (leaveId, teacherNote = "") =>
    api.put(`/api/attendance/leave-reject/${leaveId}`, { teacherNote }),
};
