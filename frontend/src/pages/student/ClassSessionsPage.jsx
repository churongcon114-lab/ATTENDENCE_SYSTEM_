// src/pages/student/ClassSessionsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { attendanceApi } from "../../api/attendanceApi";

export default function ClassSessionsPage() {
  const { classId } = useParams();
  const location = useLocation();
  const classInfo = location.state?.classInfo;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [code, setCode] = useState("");
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);

  const title = useMemo(() => {
    if (classInfo?.subjectName && classInfo?.subjectCode) return `${classInfo.subjectName} - ${classInfo.subjectCode}`;
    return `ClassId: ${classId}`;
  }, [classInfo, classId]);

  async function load() {
    setLoading(true);
    setError("");
    setMsg("");

    try {
      // optional: session đang mở (nếu backend có)
      if (attendanceApi?.getActiveSessionByClass) {
        const r1 = await attendanceApi.getActiveSessionByClass(classId);
        setActiveSession(r1?.data || null);
      } else {
        setActiveSession(null);
      }

      // optional: lịch sử điểm danh của SV trong lớp
      if (attendanceApi?.getMyAttendanceByClass) {
        const r2 = await attendanceApi.getMyAttendanceByClass(classId);
        setHistory(Array.isArray(r2?.data) ? r2.data : []);
      } else {
        setHistory([]);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!classId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function checkIn() {
    setError("");
    setMsg("");

    const v = code.trim().toUpperCase();
    if (!v) {
      setError("Vui lòng nhập mã điểm danh.");
      return;
    }

    try {
      if (!attendanceApi?.studentCheckIn) {
        setError("Chưa có attendanceApi.studentCheckIn(). Hãy thêm endpoint check-in ở frontend/backend.");
        return;
      }

      // gợi ý payload: { classId, code } hoặc (classId, code) tùy bạn định nghĩa
      const res = await attendanceApi.studentCheckIn({ classId, code: v });
      setMsg(res?.data?.message || "Điểm danh thành công.");
      setCode("");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Check-in failed");
    }
  }

  return (
    <div style={page}>
      <div style={topRow}>
        <Link to="/student/classes" style={backLink}>
          ← Quay lại TKB
        </Link>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
        <div style={{ marginTop: 6, color: "#bbb" }}>Nhập mã điểm danh để check-in.</div>
      </div>

      {msg ? <div style={toastOk}>{msg}</div> : null}
      {error ? <div style={toastErr}>Lỗi: {error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <div style={card}>
          <div style={{ fontWeight: 900 }}>Điểm danh</div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#aaa", fontSize: 12 }}>Session đang mở</div>
            <div style={{ marginTop: 6, fontWeight: 800, color: "#fff" }}>
              {activeSession ? activeSession.lesson || activeSession._id : "Không có / chưa có API"}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã (VD: ABC123)"
              style={input}
            />
            <button type="button" onClick={checkIn} style={btnPrimary} disabled={loading}>
              Điểm danh
            </button>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 900 }}>Lịch sử điểm danh</div>
          {loading ? (
            <div style={{ marginTop: 10, color: "#bbb" }}>Đang tải...</div>
          ) : history.length === 0 ? (
            <div style={{ marginTop: 10, color: "#bbb" }}>Chưa có dữ liệu (hoặc bạn chưa làm API history).</div>
          ) : (
            <div style={{ marginTop: 10, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>Buổi</th>
                    <th style={th}>Thời gian</th>
                    <th style={th}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((x, i) => (
                    <tr key={x._id || i}>
                      <td style={td}>{i + 1}</td>
                      <td style={td}>{x.lesson || x.sessionId?.lesson || "—"}</td>
                      <td style={td}>{x.checkedAt ? new Date(x.checkedAt).toLocaleString() : "—"}</td>
                      <td style={td}>{x.status || "PRESENT"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== styles ===== */
const page = { minHeight: "100vh", background: "#222", color: "#eee", padding: 18 };
const topRow = { display: "flex", justifyContent: "space-between", alignItems: "center" };

const backLink = { color: "#6ea8ff", textDecoration: "none", fontWeight: 800 };

const card = {
  background: "#1b1b1b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const input = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#111",
  color: "#fff",
  fontWeight: 800,
  letterSpacing: 1,
};

const btnPrimary = {
  padding: "12px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};

const toastOk = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(120,255,120,0.25)",
  background: "rgba(0,255,0,0.06)",
  color: "#c9ffcf",
  fontWeight: 800,
};

const toastErr = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,120,120,0.35)",
  background: "rgba(255,0,0,0.06)",
  color: "#ffb3b3",
  fontWeight: 800,
};

const th = { textAlign: "left", padding: 10, borderBottom: "1px solid rgba(255,255,255,0.10)", color: "#bbb" };
const td = { padding: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" };
