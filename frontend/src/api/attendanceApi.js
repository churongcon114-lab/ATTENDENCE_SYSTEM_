import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

// Demo auth headers (dùng localStorage)
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

  // LEAVE
  requestLeave: (sessionId, reason) => api.post("/api/attendance/leave-request", { sessionId, reason }),
  getLeaveRequestsByClass: (classId, status = "PENDING") =>
    api.get("/api/attendance/leave-requests", { params: { classId, status } }),
  approveLeave: (leaveId) => api.put(`/api/attendance/leave-approve/${leaveId}`),
  getMyLeaveRequestsByClass: (classId) => api.get("/api/attendance/my-leave-requests", { params: { classId } }),
};
