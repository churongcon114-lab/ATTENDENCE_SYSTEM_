import express from "express";
import LeaveRequest from "../models/LeaveRequest.js";

const router = express.Router();

const roleOf = (req) => String(req.headers["x-role"] || "").toUpperCase();
const uidOf = (req) => String(req.headers["x-user-id"] || "").trim();

router.post("/leave-request", async (req, res) => {
  try {
    const role = roleOf(req);
    const studentId = uidOf(req);
    if (!studentId) return res.status(401).json({ message: "Missing x-user-id" });
    if (role !== "STUDENT") return res.status(403).json({ message: "Only STUDENT can create leave request" });

    const {
      sessionId = "",
      classId = "",
      startDate = "",
      endDate = "",
      reason = "",
      studentName = "",
      studentCode = "",
      subjectCode = "",
      subjectName = "",
    } = req.body || {};

    const r = String(reason || "").trim();
    if (!r) return res.status(400).json({ message: "reason is required" });

    // ✅ mode cũ (nếu bạn vẫn muốn giữ)
    if (sessionId) {
      const cid = String(classId || "").trim();
      if (!cid) return res.status(400).json({ message: "classId is required" });

      const doc = await LeaveRequest.create({
        classId: cid,
        sessionId: String(sessionId),
        studentId,
        studentName,
        studentCode,
        subjectCode,
        subjectName,
        reason: r,
        status: "PENDING",
      });
      return res.json(doc);
    }

    // ✅ mode mới (HƯỚNG B): không cần sessionId
    const cid = String(classId || "").trim();
    if (!cid) return res.status(400).json({ message: "classId is required" });

    const s = String(startDate || "").trim();
    const e = String(endDate || "").trim();
    if (!s || !e) return res.status(400).json({ message: "startDate/endDate is required" });

    const ds = new Date(s).getTime();
    const de = new Date(e).getTime();
    if (Number.isNaN(ds) || Number.isNaN(de)) return res.status(400).json({ message: "Invalid date" });
    if (ds > de) return res.status(400).json({ message: "startDate must be <= endDate" });

    const doc = await LeaveRequest.create({
      classId: cid,
      sessionId: "",
      studentId,
      studentName,
      studentCode,
      subjectCode,
      subjectName,
      startDate: s,
      endDate: e,
      reason: r,
      status: "PENDING",
    });

    return res.json(doc);
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

router.get("/my-leave-requests", async (req, res) => {
  try {
    const role = roleOf(req);
    const studentId = uidOf(req);
    if (!studentId) return res.status(401).json({ message: "Missing x-user-id" });
    if (role !== "STUDENT") return res.status(403).json({ message: "Only STUDENT can view own requests" });

    const classId = String(req.query.classId || "").trim();
    if (!classId) return res.status(400).json({ message: "classId is required" });

    const list = await LeaveRequest.find({ classId, studentId }).sort({ createdAt: -1 });
    return res.json(list);
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

router.get("/leave-requests", async (req, res) => {
  try {
    const role = roleOf(req);
    if (role !== "TEACHER") return res.status(403).json({ message: "Only TEACHER can view requests" });

    const classId = String(req.query.classId || "").trim();
    if (!classId) return res.status(400).json({ message: "classId is required" });

    const status = String(req.query.status || "PENDING").toUpperCase();
    const q = { classId };
    if (status !== "ALL") q.status = status;

    const list = await LeaveRequest.find(q).sort({ createdAt: -1 });
    return res.json(list);
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

router.put("/leave-approve/:id", async (req, res) => {
  try {
    const role = roleOf(req);
    const teacherId = uidOf(req);
    if (role !== "TEACHER") return res.status(403).json({ message: "Only TEACHER can approve" });

    const teacherNote = String(req.body?.teacherNote || "").trim();

    const doc = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: "APPROVED", teacherNote, decidedAt: new Date(), decidedBy: teacherId },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Leave not found" });
    return res.json(doc);
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

router.put("/leave-reject/:id", async (req, res) => {
  try {
    const role = roleOf(req);
    const teacherId = uidOf(req);
    if (role !== "TEACHER") return res.status(403).json({ message: "Only TEACHER can reject" });

    const teacherNote = String(req.body?.teacherNote || "").trim();

    const doc = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: "REJECTED", teacherNote, decidedAt: new Date(), decidedBy: teacherId },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Leave not found" });
    return res.json(doc);
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});

export default router;
