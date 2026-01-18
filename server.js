import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(express.json());

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
};

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random().toString(16).slice(2);
}

function code5() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function getAuth(req) {
  const userId = String(req.headers["x-user-id"] || "SV001");
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

function autoCloseExpiredSessions() {
  const now = Date.now();
  for (const s of db.sessions) {
    if (s.status === "OPEN" && now >= s.endTime) {
      s.status = "CLOSED";
      s.closedAt = now;
    }
  }
}

// ===================== CLASSES =====================

// Teacher creates class
app.post("/api/teacher/classes", ensureRole("TEACHER"), (req, res) => {
  const { userId } = getAuth(req);
  const { subjectName, subjectCode, teacherName, dayOfWeek, period } = req.body || {};

  if (!subjectName || !subjectCode || !dayOfWeek || !period) {
    return res.status(400).json({ message: "Missing subjectName/subjectCode/dayOfWeek/period" });
  }

  const c = {
    _id: uid(),
    subjectName,
    subjectCode,
    teacherName: teacherName || `GV_${userId}`,
    dayOfWeek,
    period: Number(period),
    createdBy: userId,
    createdAt: Date.now(),
  };

  db.classes.push(c);
  res.json(c);
});

app.get("/api/teacher/classes", ensureRole("TEACHER"), (req, res) => {
  const { userId } = getAuth(req);
  res.json(db.classes.filter((c) => c.createdBy === userId));
});

// Student classes (demo: trả toàn bộ lớp)
app.get("/api/student/classes", ensureRole("STUDENT"), (req, res) => {
  res.json(db.classes);
});

// optional delete
app.delete("/api/teacher/classes/:classId", ensureRole("TEACHER"), (req, res) => {
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
app.post("/api/attendance/create-session", ensureRole("TEACHER"), (req, res) => {
  autoCloseExpiredSessions();

  const { userId } = getAuth(req);
  const { classId, durationMin } = req.body || {};
  if (!classId) return res.status(400).json({ message: "Missing classId" });

  // close existing open session for this class (optional)
  for (const s of db.sessions) {
    if (s.classId === classId && s.status === "OPEN") s.status = "CLOSED";
  }

  const dur = Math.max(1, Number(durationMin || 10));
  const startTime = Date.now();
  const endTime = startTime + dur * 60 * 1000;

  const session = {
    _id: uid(),
    classId,
    createdBy: userId,
    attendanceCode: code5(),
    startTime,
    endTime,
    status: "OPEN",
    lesson: `Buổi ${new Date(startTime).toLocaleString()}`,
  };

  db.sessions.push(session);
  res.json(session);
});

// close session
app.post("/api/attendance/close-session/:sessionId", ensureRole("TEACHER"), (req, res) => {
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

// sessions by class (STUDENT được xem theo classId, TEACHER xem lớp của mình)
app.get("/api/attendance/sessions", (req, res) => {
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
app.get("/api/attendance/active-session", (req, res) => {
  autoCloseExpiredSessions();

  const { classId } = req.query;
  if (!classId) return res.status(400).json({ message: "Missing classId" });

  const active = db.sessions.find((s) => s.classId === String(classId) && s.status === "OPEN") || null;
  res.json(active);
});

// list attendees of a session (teacher)
app.get("/api/attendance/session-attendees", ensureRole("TEACHER"), (req, res) => {
  autoCloseExpiredSessions();

  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ message: "Missing sessionId" });

  const list = db.attendance.filter((a) => a.sessionId === String(sessionId));
  res.json(list);
});

// ===================== CHECK-IN =====================
app.post("/api/attendance/check-in", ensureRole("STUDENT"), (req, res) => {
  autoCloseExpiredSessions();

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

  const exists = db.attendance.find((a) => a.sessionId === sessionId && a.studentId === userId);
  if (exists) return res.json({ message: "Bạn đã điểm danh rồi", record: exists });

  const record = {
    _id: uid(),
    sessionId,
    classId: s.classId,
    studentId: userId,
    checkedAt: Date.now(),
    status: "PRESENT",
  };
  db.attendance.push(record);

  res.json({ message: "Điểm danh thành công", record });
});

// student attendance history by class
app.get("/api/attendance/my-attendance", ensureRole("STUDENT"), (req, res) => {
  autoCloseExpiredSessions();

  const { userId } = getAuth(req);
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ message: "Missing classId" });

  const list = db.attendance.filter((a) => a.classId === String(classId) && a.studentId === userId);
  list.sort((a, b) => b.checkedAt - a.checkedAt);
  res.json(list);
});

// ===================== LEAVES =====================
app.post("/api/attendance/leave-request", ensureRole("STUDENT"), (req, res) => {
  autoCloseExpiredSessions();

  const { userId } = getAuth(req);
  const { sessionId, reason } = req.body || {};
  if (!sessionId || !reason) return res.status(400).json({ message: "Missing sessionId/reason" });

  const s = db.sessions.find((x) => x._id === sessionId);
  if (!s) return res.status(404).json({ message: "Session not found" });

  const leave = {
    _id: uid(),
    classId: s.classId,
    sessionId: s._id,
    studentId: userId,
    reason: String(reason),
    status: "PENDING",
    createdAt: Date.now(),
  };
  db.leaves.push(leave);
  res.json({ message: "Gửi đơn xin vắng thành công", leave });
});

app.get("/api/attendance/leave-requests", ensureRole("TEACHER"), (req, res) => {
  autoCloseExpiredSessions();

  const { classId, status = "PENDING" } = req.query;
  if (!classId) return res.status(400).json({ message: "Missing classId" });

  let list = db.leaves.filter((l) => l.classId === String(classId));
  if (status) list = list.filter((l) => l.status === String(status).toUpperCase());
  list.sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

app.put("/api/attendance/leave-approve/:leaveId", ensureRole("TEACHER"), (req, res) => {
  const { leaveId } = req.params;
  const lv = db.leaves.find((l) => l._id === leaveId);
  if (!lv) return res.status(404).json({ message: "Leave not found" });

  lv.status = "APPROVED";
  lv.approvedAt = Date.now();
  res.json({ ok: true, leave: lv });
});

app.get("/api/attendance/my-leave-requests", ensureRole("STUDENT"), (req, res) => {
  const { userId } = getAuth(req);
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ message: "Missing classId" });

  const list = db.leaves.filter((l) => l.classId === String(classId) && l.studentId === userId);
  list.sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

// ===================== START =====================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log("Server running on", PORT));

