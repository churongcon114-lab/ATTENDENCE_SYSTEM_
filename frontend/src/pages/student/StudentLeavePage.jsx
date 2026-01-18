// src/pages/student/StudentLeavePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { attendanceApi } from "../../api/attendanceApi";

export default function StudentLeavePage() {
  const { classId } = useParams();
  const location = useLocation();
  const classInfo = location.state?.classInfo;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [reason, setReason] = useState("");

  const [myLeaves, setMyLeaves] = useState([]);

  const title = useMemo(() => {
    if (classInfo?.subjectName && classInfo?.subjectCode) return `${classInfo.subjectName} - ${classInfo.subjectCode}`;
    return `ClassId: ${classId}`;
  }, [classInfo, classId]);

  async function load() {
    setLoading(true);
    setError("");
    setMsg("");

    try {
      // optional: danh sách session để chọn khi xin vắng
      if (attendanceApi?.getSessionsByClass) {
        const r1 = await attendanceApi.getSessionsByClass(classId);
        const list = Array.isArray(r1?.data) ? r1.data : [];
        setSessions(list);
        setSessionId((prev) => prev || list?.[0]?._id || "");
      } else {
        setSessions([]);
        setSessionId("");
      }

      // optional: list đơn xin vắng của SV
      if (attendanceApi?.getMyLeaveRequestsByClass) {
        const r2 = await attendanceApi.getMyLeaveRequestsByClass(classId);
        setMyLeaves(Array.isArray(r2?.data) ? r2.data : []);
      } else {
        setMyLeaves([]);
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

  async function submitLeave(e) {
    e.preventDefault();
    setError("");
    setMsg("");

    const r = reason.trim();
    if (!r) {
      setError("Vui lòng nhập lý do xin vắng.");
      return;
    }

    try {
      if (!attendanceApi?.createLeaveRequest) {
        setError("Chưa có attendanceApi.createLeaveRequest(). Hãy thêm endpoint tạo đơn xin vắng.");
        return;
      }

      // gợi ý payload: { classId, sessionId (optional), reason }
      await attendanceApi.createLeaveRequest({
        classId,
        sessionId: sessionId || undefined,
        reason: r,
      });

      setMsg("Gửi đơn xin vắng thành công.");
      setReason("");
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Submit failed");
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
        <div style={{ fontWeight: 900, fontSize: 18 }}>Xin vắng — {title}</div>
        <div style={{ marginTop: 6, color: "#bbb" }}>Tạo đơn xin vắng (sẽ chờ GV duyệt).</div>
      </div>

      {msg ? <div style={toastOk}>{msg}</div> : null}
      {error ? <div style={toastErr}>Lỗi: {error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <div style={card}>
          <div style={{ fontWeight: 900 }}>Tạo đơn</div>

          <form onSubmit={submitLeave} style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div style={label}>Buổi học</div>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                style={select}
                disabled={loading || sessions.length === 0}
              >
                {sessions.length === 0 ? (
                  <option value="">(Chưa có API session / không bắt buộc chọn)</option>
                ) : (
                  sessions.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.lesson || s._id} — {s.startTime ? new Date(s.startTime).toLocaleString() : "—"}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <div style={label}>Lý do</div>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={5} style={textarea} placeholder="Nhập lý do xin vắng..." />
            </div>

            <button type="submit" style={btnPrimary} disabled={loading}>
              Gửi đơn
            </button>
          </form>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 900 }}>Đơn của tôi</div>
          {loading ? (
            <div style={{ marginTop: 10, color: "#bbb" }}>Đang tải...</div>
          ) : myLeaves.length === 0 ? (
            <div style={{ marginTop: 10, color: "#bbb" }}>Chưa có dữ liệu (hoặc bạn chưa làm API list đơn).</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {myLeaves.map((lv) => (
                <div key={lv._id} style={leaveItem}>
                  <div style={{ fontWeight: 900 }}>
                    {lv.sessionId?.lesson || "Session"} — <span style={{ color: "#cfd8ff" }}>{lv.status}</span>
                  </div>
                  <div style={{ marginTop: 6, color: "#ddd" }}>Lý do: {lv.reason || "—"}</div>
                  <div style={{ marginTop: 6, color: "#aaa", fontSize: 12 }}>
                    Tạo lúc: {lv.createdAt ? new Date(lv.createdAt).toLocaleString() : "—"}
                  </div>
                </div>
              ))}
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

const label = { color: "#aaa", fontSize: 12, marginBottom: 6 };

const select = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#111",
  color: "#fff",
  fontWeight: 800,
};

const textarea = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#111",
  color: "#fff",
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

const leaveItem = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
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
