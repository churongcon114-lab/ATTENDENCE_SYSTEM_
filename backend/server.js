// server.js
import express from "express";
import cors from "cors";
import crypto from "crypto";
import attendanceLeaveRoutes from "./routes/attendanceLeaveRoutes.js";

const app = express();
app.use(express.json());

app.use("/api/attendance", attendanceLeaveRoutes);
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-role"],
  })
);

// ===== In-memory DB (demo) =====
const db = {
  classes: [], // { _id, subjectName, subjectCode, teacherName, dayOfWeek, period, createdBy }
  sessions: [], // { _id, classId, attendanceCode, startTime, endTime, status, createdBy, lesson }
  attendance: [], // { _id, sessionId, classId, studentId, checkedAt, status }
  leaves: [], // { _id, classId, sessionId, studentId, reason, status, createdAt }

  // NEW: profiles (demo)
  profiles: {
    // key = userId
    // value = { userId, role, fullName, email, phone, msv, updatedAt }
  },
};

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + "_" + Math.random().toString(16).slice(2);
}

function code5() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function normalizeCode(code) {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
}


function normalizeId(s) {
  return String(s || "").trim();
}

function getAuth(req) {
  // IMPORTANT: userId lấy từ header -> chính là MSV bạn set ở localStorage.userId
  const userId = normalizeId(req.headers["x-user-id"] || "");
  const role = String(req.headers["x-role"] || "STUDENT").toUpperCase(); // STUDENT | TEACHER
  return { userId, role };
}

function ensureRole(roleNeed) {
  return (req, res, next) => {
    const { role } = getAuth(req);
    if (role !== roleNeed) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

function ensureAuth(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ message: "Missing x-user-id" });
  next();
}

function autoCloseExpiredSessions() {
  const now = Date.now();
  for (const s of db.sessions) {
    if (s.status === "OPEN" && now >= s.endTime) {
      s.status = "CLOSED";
      s.closedAt = now;
    }
  }
}

// ===================== PROFILES (NEW - DEMO) =====================
// Get my profile
app.get("/api/profile/me", ensureAuth, (req, res) => {
  const { userId, role } = getAuth(req);

  const existing = db.profiles[userId] || null;
  // nếu chưa có thì trả "mặc định"
  if (!existing) {
    return res.json({
      userId,
      role,
      fullName: "",
      email: "",
      phone: "",
      msv: role === "STUDENT" ? userId : "",
      updatedAt: null,
    });
  }

  res.json(existing);
});

// Update my profile
app.put("/api/profile/me", ensureAuth, (req, res) => {
  const { userId, role } = getAuth(req);
  const { fullName = "", email = "", phone = "", msv = "" } = req.body || {};

  const payload = {
    userId,
    role,
    fullName: String(fullName || "").trim(),
    email: String(email || "").trim(),
    phone: String(phone || "").trim(),
    msv: role === "STUDENT" ? String(msv || userId).trim() : "", // student mới có msv
    updatedAt: Date.now(),
  };

  db.profiles[userId] = payload;
  res.json({ ok: true, profile: payload });
});

// ===================== CLASSES =====================

// Teacher creates class
app.post("/api/teacher/classes", ensureRole("TEACHER"), ensureAuth, (req, res) => {
  const { userId } = getAuth(req);

  const {
    // payload mới từ frontend
    classCode,
    className,
    courseName,
    teacherName,
    dayOfWeek,
    period,

    // payload cũ (nếu còn dùng)
    subjectCode,
    subjectName,
  } = req.body || {};

  const code = normalizeCode(classCode || subjectCode);
  const clsName = String(className || "").trim();
  const crsName = String(courseName || subjectName || "").trim();
  const dow = String(dayOfWeek || "").trim();
  const per = Number(period);

  if (!code) return res.status(400).json({ message: "Missing classCode/subjectCode" });
  if (!clsName) return res.status(400).json({ message: "Missing className" });
  if (!crsName) return res.status(400).json({ message: "Missing courseName/subjectName" });
  if (!dow || !per) return res.status(400).json({ message: "Missing dayOfWeek/period" });

  const c = {
    _id: uid(),

    // ✅ field mới để UI tách 2 cột
    classCode: code,
    className: clsName,
    courseName: crsName,

    // ✅ giữ field cũ cho tương thích
    subjectCode: code,
    subjectName: crsName,

    teacherName: teacherName || `GV_${userId}`,
    dayOfWeek: dow,
    period: per,
    createdBy: userId,
    createdAt: Date.now(),
  };

  db.classes.push(c);
  res.json(c);
});


app.get("/api/teacher/classes", ensureRole("TEACHER"), ensureAuth, (req, res) => {
  const { userId } = getAuth(req);

  const list = db.classes
    .filter((c) => c.createdBy === userId)
    .map((c) => {
      const code = c.classCode || c.subjectCode || "";
      const crs = c.courseName || c.subjectName || "";
      const cls = c.className || (code ? `Lớp ${code}` : "");

      return {
        ...c,
        classCode: code,
        courseName: crs,
        className: cls,
        subjectCode: c.subjectCode || code,
        subjectName: c.subjectName || crs,
      };
    });

  res.json(list);
});

app.get("/api/student/classes", ensureRole("STUDENT"), ensureAuth, (req, res) => {
  const list = db.classes.map((c) => {
    const code = c.classCode || c.subjectCode || "";
    const crs = c.courseName || c.subjectName || "";
    const cls = c.className || (code ? `Lớp ${code}` : "");
    return { ...c, classCode: code, courseName: crs, className: cls };
  });
  res.json(list);
});

// optional delete
app.delete("/api/teacher/classes/:classId", ensureRole("TEACHER"), ensureAuth, (req, res) => {
  const { userId } = getAuth(req);
  const { classId } = req.params;

  const idx = db.classes.findIndex((c) => c._id === classId && c.createdBy === userId);
  if (idx === -1) return res.status(404).json({ message: "Class not found" });

  db.classes.splice(idx, 1);
  // also cleanup sessions/attendance/leaves
  db.sessions = db.sessions.filter((s) => s.classId !== classId);
  db.attendance = db.attendance.filter((a) => a.classId !== classId);
  db.leaves = db.leaves.filter((l) => l.classId !== classId);

  res.json({ ok: true });
});

// ===================== SESSIONS =====================

// Teacher create session (OPEN)
app.post("/api/attendance/create-session", ensureRole("TEACHER"), ensureAuth, (req, res) => {
  autoCloseExpiredSessions();

  const { userId } = getAuth(req);
  const { classId, durationMin, attendanceCode, period, lesson } = req.body || {};

  if (!classId) return res.status(400).json({ message: "Missing classId" });

  // close existing open session for this class
  for (const s of db.sessions) {
    if (s.classId === String(classId) && s.status === "OPEN") s.status = "CLOSED";
  }

  const dur = Math.max(1, Number(durationMin || 10));
  const startTime = Date.now();
  const endTime = startTime + dur * 60 * 1000;

  // ✅ ưu tiên mã GV nhập, rỗng mới random
  let code = normalizeCode(attendanceCode);
  if (!code) code = code5();

  // validate giống frontend
  if (!/^[A-Z0-9]{3,20}$/.test(code)) {
    return res.status(400).json({ message: "Mã điểm danh chỉ gồm chữ/số (3–20 ký tự)." });
  }

  const p = Number(period || 1);

  const session = {
    _id: uid(),
    classId: String(classId),
    createdBy: userId,
    attendanceCode: code,                 // ✅ dùng code đã nhận
    startTime,
    endTime,
    status: "OPEN",
    period: p,                            // ✅ lưu ca học (nếu cần)
    lesson: String(lesson || `Ca ${p}`),  // ✅ ưu tiên lesson frontend gửi
    createdAt: Date.now(),
  };

  db.sessions.push(session);
  res.json(session);
});


// close session
app.post("/api/attendance/close-session/:sessionId", ensureRole("TEACHER"), ensureAuth, (req, res) => {
  autoCloseExpiredSessions();

  const { userId } = getAuth(req);
  const { sessionId } = req.params;

  const s = db.sessions.find((x) => x._id === sessionId);
  if (!s) return res.status(404).json({ message: "Session not found" });
  if (s.createdBy !== userId) return res.status(403).json({ message: "Not your session" });

  s.status = "CLOSED";
  s.closedAt = Date.now();
  res.json({ ok: true, session: s });
});

// sessions by class
app.get("/api/attendance/sessions", ensureAuth, (req, res) => {
  autoCloseExpiredSessions();

  const { role, userId } = getAuth(req);
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ message: "Missing classId" });

  let list = db.sessions.filter((s) => s.classId === String(classId));
  if (role === "TEACHER") list = list.filter((s) => s.createdBy === userId);

  list.sort((a, b) => b.startTime - a.startTime);
  res.json(list);
});

// active session by class
app.get("/api/attendance/active-session", ensureAuth, (req, res) => {
  autoCloseExpiredSessions();

  const { classId } = req.query;
  if (!classId) return res.status(400).json({ message: "Missing classId" });

  const active = db.sessions.find((s) => s.classId === String(classId) && s.status === "OPEN") || null;
  res.json(active);
});

// list attendees of a session (teacher) - UPDATED
app.get("/api/attendance/session-attendees", ensureRole("TEACHER"), ensureAuth, (req, res) => {
  autoCloseExpiredSessions();

  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ message: "Missing sessionId" });

  const list = db.attendance
    .filter((a) => a.sessionId === String(sessionId))
    .map((a) => ({
      ...a,
      // NEW: trường rõ nghĩa để UI hiển thị MSV
      studentMsv: a.studentId,
    }));

  res.json(list);
});

// ===================== CHECK-IN =====================
app.post("/api/attendance/check-in", ensureRole("STUDENT"), ensureAuth, (req, res) => {
  autoCloseExpiredSessions();

  // IMPORTANT: userId bây giờ chính là MSV bạn set ở localStorage.userId
  const { userId } = getAuth(req);
  const { sessionId, attendanceCode } = req.body || {};

  if (!sessionId || !attendanceCode) {
    return res.status(400).json({ message: "Missing sessionId/attendanceCode" });
  }

  const s = db.sessions.find((x) => x._id === sessionId);
  if (!s) return res.status(404).json({ message: "Session not found" });
  if (s.status !== "OPEN") return res.status(400).json({ message: "Session is closed" });

  const code = String(attendanceCode).trim().toUpperCase();
  if (code !== s.attendanceCode) return res.status(400).json({ message: "Sai mã điểm danh" });

  // IMPORTANT: check theo MSV (userId)
  const exists = db.attendance.find((a) => a.sessionId === sessionId && a.studentId === userId);
  if (exists) return res.json({ message: "Bạn đã điểm danh rồi", record: exists });

  const record = {
    _id: uid(),
    sessionId,
    classId: s.classId,
    // IMPORTANT: studentId = MSV
    studentId: String(userId).trim(),
    checkedAt: Date.now(),
    status: "PRESENT",
  };
  db.attendance.push(record);

  res.json({ message: "Điểm danh thành công", record });
});

// student attendance history by class
app.get("/api/attendance/my-attendance", ensureRole("STUDENT"), ensureAuth, (req, res) => {
  autoCloseExpiredSessions();

  const { userId } = getAuth(req);
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ message: "Missing classId" });

  const list = db.attendance.filter((a) => a.classId === String(classId) && a.studentId === userId);
  list.sort((a, b) => b.checkedAt - a.checkedAt);
  res.json(list);
});

// ===================== LEAVES =====================
app.post("/api/attendance/leave-request", ensureRole("STUDENT"), ensureAuth, (req, res) => {
  autoCloseExpiredSessions();

  // studentId cũng dùng MSV từ header
  const { userId } = getAuth(req);
  const { sessionId, reason } = req.body || {};
  if (!sessionId || !reason) return res.status(400).json({ message: "Missing sessionId/reason" });

  const s = db.sessions.find((x) => x._id === sessionId);
  if (!s) return res.status(404).json({ message: "Session not found" });

  const leave = {
    _id: uid(),
    classId: s.classId,
    sessionId: s._id,
    studentId: String(userId).trim(), // IMPORTANT
    reason: String(reason),
    status: "PENDING",
    createdAt: Date.now(),
  };
  db.leaves.push(leave);
  res.json({ message: "Gửi đơn xin vắng thành công", leave });
});

app.get("/api/attendance/leave-requests", ensureRole("TEACHER"), ensureAuth, (req, res) => {
  autoCloseExpiredSessions();

  const { classId, status = "PENDING" } = req.query;
  if (!classId) return res.status(400).json({ message: "Missing classId" });

  let list = db.leaves.filter((l) => l.classId === String(classId));
  if (status) list = list.filter((l) => l.status === String(status).toUpperCase());
  list.sort((a, b) => b.createdAt - a.createdAt);

  // NEW: trả thêm studentMsv cho UI
  list = list.map((l) => ({ ...l, studentMsv: l.studentId }));

  res.json(list);
});

app.put("/api/attendance/leave-approve/:leaveId", ensureRole("TEACHER"), ensureAuth, (req, res) => {
  const { leaveId } = req.params;
  const lv = db.leaves.find((l) => l._id === leaveId);
  if (!lv) return res.status(404).json({ message: "Leave not found" });

  lv.status = "APPROVED";
  lv.approvedAt = Date.now();
  res.json({ ok: true, leave: lv });
});

app.get("/api/attendance/my-leave-requests", ensureRole("STUDENT"), ensureAuth, (req, res) => {
  const { userId } = getAuth(req);
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ message: "Missing classId" });

  const list = db.leaves.filter((l) => l.classId === String(classId) && l.studentId === userId);
  list.sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

// ===================== START =====================
const PORT = process.env.PORT || 5000; 
app.listen(PORT, () => console.log("Server running on", PORT));
