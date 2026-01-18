import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { attendanceApi } from "../../api/attendanceApi";

export default function TeacherSessionsPage() {
  const { classId } = useParams();
  const location = useLocation();
  const classInfo = location.state?.classInfo;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [durationMin, setDurationMin] = useState(10);
  const [active, setActive] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [attendees, setAttendees] = useState([]);

  const timerRef = useRef(null);
  const [now, setNow] = useState(Date.now());

  const title = useMemo(() => {
    if (classInfo?.subjectName && classInfo?.subjectCode) return `${classInfo.subjectName} - ${classInfo.subjectCode}`;
    return `Class: ${classId}`;
  }, [classInfo, classId]);

  async function load() {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const rActive = await attendanceApi.getActiveSessionByClass(classId);
      setActive(rActive?.data || null);

      const rList = await attendanceApi.getSessionsByClass(classId);
      const list = Array.isArray(rList?.data) ? rList.data : [];
      setSessions(list);

      const act = rActive?.data;
      if (act?._id) {
        const rAtt = await attendanceApi.getSessionAttendees(act._id);
        setAttendees(Array.isArray(rAtt?.data) ? rAtt.data : []);
      } else {
        setAttendees([]);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Network Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [classId]);

  // tick timer for remaining
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timerRef.current);
  }, []);

  const remainingText = useMemo(() => {
    if (!active || active.status !== "OPEN") return "Không có phiên mở";
    const ms = active.endTime - now;
    if (ms <= 0) return "Hết giờ (đang tự đóng)";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `Còn ${m}m ${ss}s`;
  }, [active, now]);

  async function startSession() {
    setError("");
    setMsg("");
    try {
      const res = await attendanceApi.createSession({
        classId,
        durationMin: Number(durationMin),
      });
      setMsg("Đã mở phiên điểm danh.");
      setActive(res?.data || null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Create session failed");
    }
  }

  async function stopSession() {
    if (!active?._id) return;
    setError("");
    setMsg("");
    try {
      await attendanceApi.closeSession(active._id);
      setMsg("Đã đóng phiên.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Close session failed");
    }
  }

  async function refreshAttendees() {
    if (!active?._id) return;
    try {
      const r = await attendanceApi.getSessionAttendees(active._id);
      setAttendees(Array.isArray(r?.data) ? r.data : []);
    } catch {}
  }

  useEffect(() => {
    refreshAttendees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?._id]);

  return (
    <div style={page}>
      <Link to="/teacher/classes" style={backLink}>← Quay lại Classes</Link>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 22 }}>Quản lý buổi điểm danh</div>
        <div style={{ marginTop: 6, color: "#bbb" }}>Lớp: <b>{title}</b></div>
      </div>

      {error ? <div style={toastErr}>Lỗi: {error}</div> : null}
      {msg ? <div style={toastOk}>{msg}</div> : null}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
        <div style={card}>
          <div style={{ fontWeight: 900 }}>Mở điểm danh</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ color: "#aaa" }}>Thời lượng (phút):</div>
            <input
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              style={{ ...input, width: 90 }}
              type="number"
              min={1}
            />
            <button type="button" style={btnPrimary} onClick={startSession} disabled={loading}>
              Mở điểm danh
            </button>
            <button type="button" style={btnGhost} onClick={stopSession} disabled={!active || active.status !== "OPEN"}>
              Dừng
            </button>
            <button type="button" style={btn} onClick={load}>Refresh</button>
          </div>

          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px dashed rgba(255,255,255,.18)", background: "rgba(255,255,255,.03)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ color: "#aaa", fontSize: 12 }}>Mã điểm danh</div>
                <div style={{ marginTop: 6, fontWeight: 900, fontSize: 24, letterSpacing: 2 }}>
                  {active?.status === "OPEN" ? active.attendanceCode : "—"}
                </div>
              </div>
              <div>
                <div style={{ color: "#aaa", fontSize: 12 }}>Trạng thái</div>
                <div style={{ marginTop: 6, fontWeight: 900 }}>
                  {active?.status === "OPEN" ? `Đang mở • ${remainingText}` : "Không có phiên mở"}
                </div>
                {active ? (
                  <div style={{ marginTop: 6, color: "#bbb", fontSize: 12 }}>
                    Bắt đầu: {new Date(active.startTime).toLocaleTimeString()} • Kết thúc: {new Date(active.endTime).toLocaleTimeString()}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 900 }}>Danh sách sinh viên đã điểm danh</div>
            {attendees.length === 0 ? (
              <div style={{ marginTop: 8, color: "#bbb" }}>Chưa có sinh viên nào điểm danh.</div>
            ) : (
              <div style={{ marginTop: 8, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>#</th>
                      <th style={th}>StudentId</th>
                      <th style={th}>Thời gian</th>
                      <th style={th}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map((a, i) => (
                      <tr key={a._id || i}>
                        <td style={td}>{i + 1}</td>
                        <td style={td}>{a.studentId}</td>
                        <td style={td}>{new Date(a.checkedAt).toLocaleString()}</td>
                        <td style={td}>{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button type="button" style={{ ...btn, marginTop: 10 }} onClick={refreshAttendees} disabled={!active || active.status !== "OPEN"}>
              Reload danh sách
            </button>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 900 }}>Danh sách phiên (sessions)</div>
          {loading ? (
            <div style={{ marginTop: 10, color: "#bbb" }}>Đang tải...</div>
          ) : sessions.length === 0 ? (
            <div style={{ marginTop: 10, color: "#bbb" }}>Chưa có phiên nào.</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {sessions.map((s) => (
                <div key={s._id} style={item}>
                  <div style={{ fontWeight: 900 }}>
                    {s.lesson || s._id} — <span style={{ color: "#cfd8ff" }}>{s.status}</span>
                  </div>
                  <div style={{ marginTop: 6, color: "#bbb", fontSize: 12 }}>
                    Code: <b>{s.attendanceCode}</b> • {new Date(s.startTime).toLocaleString()} → {new Date(s.endTime).toLocaleString()}
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

const page = { minHeight: "100vh", background: "#222", color: "#eee", padding: 18 };
const backLink = { color: "#6ea8ff", textDecoration: "none", fontWeight: 800 };

const card = { background: "#1b1b1b", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 14, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" };
const input = { padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "#111", color: "#fff", fontWeight: 800 };

const btn = { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "#2a2a2a", color: "#fff", cursor: "pointer", fontWeight: 800 };
const btnPrimary = { ...btn, background: "#111", fontWeight: 900 };
const btnGhost = { ...btn, background: "#2a2a2a", fontWeight: 900 };

const toastErr = { marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,120,120,.35)", background: "rgba(255,0,0,.06)", color: "#ffb3b3", fontWeight: 800 };
const toastOk = { marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(120,255,120,.25)", background: "rgba(0,255,0,.06)", color: "#c9ffcf", fontWeight: 800 };

const item = { padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,0.03)" };
const th = { textAlign: "left", padding: 10, borderBottom: "1px solid rgba(255,255,255,0.10)", color: "#bbb" };
const td = { padding: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" };
