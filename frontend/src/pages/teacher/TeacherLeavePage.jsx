import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { attendanceApi } from "../../api/attendanceApi";

export default function TeacherLeavePage() {
  const { classId } = useParams();
  const location = useLocation();
  const classInfo = location.state?.classInfo;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [leaves, setLeaves] = useState([]);

  const title = useMemo(() => {
    if (classInfo?.subjectName && classInfo?.subjectCode) return `${classInfo.subjectName} - ${classInfo.subjectCode}`;
    return `Class: ${classId}`;
  }, [classInfo, classId]);

  async function load() {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await attendanceApi.getLeaveRequestsByClass(classId, "PENDING");
      setLeaves(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Network Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!classId) return;
    load();
  }, [classId]);

  async function approve(id) {
    setError("");
    setMsg("");
    try {
      await attendanceApi.approveLeave(id);
      setMsg("Duyệt đơn thành công.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Approve failed");
    }
  }

  return (
    <div style={page}>
      <Link to="/teacher/classes" style={backLink}>← Quay lại Classes</Link>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Duyệt xin vắng — {title}</div>
        <div style={{ marginTop: 6, color: "#bbb" }}>Chỉ hiển thị đơn PENDING.</div>
      </div>

      {msg ? <div style={toastOk}>{msg}</div> : null}
      {error ? <div style={toastErr}>Lỗi: {error}</div> : null}

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ color: "#bbb" }}>Đang tải...</div>
        ) : leaves.length === 0 ? (
          <div style={{ color: "#bbb" }}>Không có đơn xin vắng.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {leaves.map((lv) => (
              <div key={lv._id} style={card}>
                <div style={{ fontWeight: 900 }}>Student: {lv.studentId} — Status: {lv.status}</div>
                <div style={{ marginTop: 10, color: "#ddd" }}>Session: {lv.sessionId}</div>
                <div style={{ marginTop: 10, color: "#ddd" }}>Lý do: <b>{lv.reason}</b></div>
                <button type="button" style={btnPrimary} onClick={() => approve(lv._id)}>Approve</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const page = { minHeight: "100vh", background: "#222", color: "#eee", padding: 18 };
const backLink = { color: "#6ea8ff", textDecoration: "none", fontWeight: 800 };

const card = { border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 14, background: "#1b1b1b" };

const btnPrimary = { marginTop: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "#111", color: "#fff", cursor: "pointer", fontWeight: 900 };

const toastOk = { marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(120,255,120,.25)", background: "rgba(0,255,0,.06)", color: "#c9ffcf", fontWeight: 800 };
const toastErr = { marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,120,120,.35)", background: "rgba(255,0,0,.06)", color: "#ffb3b3", fontWeight: 800 };
