// src/pages/student/StudentLeavePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { attendanceApi } from "../../api/attendanceApi";

function fmt(ts) {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function StudentLeavePage() {
  const { classId } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const classInfo = location.state?.classInfo;

  const subjectCode = classInfo?.subjectCode || "—";
  const subjectName = classInfo?.subjectName || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [reason, setReason] = useState("");

  const [myLeaves, setMyLeaves] = useState([]);

  const sessionOptions = useMemo(() => {
    const arr = Array.isArray(sessions) ? sessions : [];
    return arr.map((s) => ({
      id: s?._id || s?.id,
      label: s?.lesson ? `Buổi ${s.lesson}` : `Session ${String(s?._id || s?.id).slice(0, 6)}`,
      raw: s,
    }));
  }, [sessions]);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      setMsg("");

      const [rs, ra, rl] = await Promise.allSettled([
        attendanceApi.getSessionsByClass(classId),
        attendanceApi.getActiveSessionByClass(classId),
        attendanceApi.getMyLeaveRequestsByClass(classId),
      ]);

      const list = rs.status === "fulfilled" ? (rs.value?.data || []) : [];
      const act = ra.status === "fulfilled" ? (ra.value?.data || null) : null;
      const leaves = rl.status === "fulfilled" ? (rl.value?.data || []) : [];

      setSessions(Array.isArray(list) ? list : []);
      setMyLeaves(Array.isArray(leaves) ? leaves : []);

      // ưu tiên active session
      const actId = act?._id || act?.id;
      if (actId) setSelectedSessionId(actId);
      else if (!selectedSessionId && (list?.[0]?._id || list?.[0]?.id)) setSelectedSessionId(list[0]._id || list[0].id);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!classId) {
      setError("Thiếu classId trên URL.");
      setLoading(false);
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function onSubmitLeave() {
    try {
      setMsg("");
      setError("");

      const sid = selectedSessionId;
      const r = String(reason || "").trim();

      if (!sid) {
        setError("Bạn chưa chọn buổi (session) để xin vắng.");
        return;
      }
      if (!r) {
        setError("Vui lòng nhập lý do xin vắng.");
        return;
      }

      await attendanceApi.requestLeave(sid, r);
      setMsg("Gửi đơn xin vắng thành công.");
      setReason("");

      const rl = await attendanceApi.getMyLeaveRequestsByClass(classId);
      setMyLeaves(rl.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Gửi đơn thất bại");
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <button
        type="button"
        onClick={() => nav(`/student/classes/${classId}/sessions`, { state: { classInfo } })}
        style={{ background: "transparent", border: "none", color: "#7aa7ff", cursor: "pointer", padding: 0 }}
      >
        ← Quay lại điểm danh
      </button>

      <div style={{ marginTop: 10 }}>
        <h2 style={{ margin: "6px 0" }}>Xin vắng</h2>
        <div style={{ opacity: 0.85 }}>
          Môn: <b>{subjectCode}</b> — {subjectName}
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #5a2323", background: "#2a0f0f", color: "#ffb4b4" }}>
          Lỗi: {error}
        </div>
      ) : null}

      {msg ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #224a2b", background: "#0f2416", color: "#b7ffca" }}>
          {msg}
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* LEFT: create request */}
        <div style={{ border: "1px solid #333", borderRadius: 14, background: "#111", padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Tạo đơn xin vắng</div>

          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Chọn buổi (session)
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#0d0d0d", color: "#fff" }}
              >
                {sessionOptions.length === 0 ? (
                  <option value="">(Chưa có session)</option>
                ) : (
                  <>
                    <option value="">-- Chọn session --</option>
                    {sessionOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              Lý do
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Em bị ốm / bận việc..."
                rows={4}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#0d0d0d", color: "#fff" }}
              />
            </label>

            <button
              type="button"
              onClick={onSubmitLeave}
              disabled={loading}
              style={{ padding: 10, borderRadius: 12, border: "1px solid #333", background: "#0d0d0d", color: "#fff", cursor: "pointer" }}
            >
              Gửi đơn
            </button>
          </div>
        </div>

        {/* RIGHT: my leave requests */}
        <div style={{ border: "1px solid #333", borderRadius: 14, background: "#111", padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Đơn xin vắng của tôi</div>

          {loading ? (
            <div>Đang tải...</div>
          ) : myLeaves.length === 0 ? (
            <div style={{ opacity: 0.8 }}>Chưa có đơn xin vắng.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>#</th>

                    {/* ✅ đổi Session -> Môn */}
                    <th style={th}>Môn</th>

                    <th style={th}>Buổi</th>
                    <th style={th}>Trạng thái</th>
                    <th style={th}>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeaves.map((lv, idx) => (
                    <tr key={lv._id || idx}>
                      <td style={td}>{idx + 1}</td>

                      {/* ✅ trên: mã môn | dưới: tên môn */}
                      <td style={td}>
                        <div style={{ fontWeight: 800 }}>{subjectCode}</div>
                        <div style={{ opacity: 0.8, fontSize: 12, marginTop: 2 }}>{subjectName}</div>
                      </td>

                      <td style={td}>
                        {lv?.sessionId?.lesson ? `Buổi ${lv.sessionId.lesson}` : (lv?.lesson ? `Buổi ${lv.lesson}` : "-")}
                      </td>
                      <td style={td}>{String(lv.status || "PENDING").toUpperCase()}</td>
                      <td style={td}>{fmt(lv.createdAt || lv.time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* show reason list dưới bảng nếu muốn */}
              <div style={{ marginTop: 10, opacity: 0.85 }}>
                {myLeaves.map((lv, idx) => (
                  <div key={lv._id || idx} style={{ padding: "8px 0", borderTop: idx === 0 ? "none" : "1px solid #1a1a1a" }}>
                    <b>#{idx + 1}</b> — Lý do: {lv.reason || "-"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #222", color: "#ddd", fontWeight: 700, fontSize: 13 };
const td = { padding: "10px 8px", borderBottom: "1px solid #1a1a1a", color: "#eee" };
