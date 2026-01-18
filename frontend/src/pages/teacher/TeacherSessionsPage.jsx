import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const sessionKey = (classId) => `attendance_active_session_${classId}`;
const checkinsKey = (classId) => `attendance_checkins_${classId}`;

function generateCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function fmtTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
function safeLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export default function TeacherSessionsPage() {
  const { classId } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const classInfo = location.state?.classInfo;

  // Load session/checkins từ localStorage để teacher/student trùng nhau
  const [session, setSession] = useState(() => safeLoad(sessionKey(classId), null));
  const [checkins, setCheckins] = useState(() => safeLoad(checkinsKey(classId), []));

  const [durationMin, setDurationMin] = useState(10);
  const [now, setNow] = useState(Date.now());

  // Sync localStorage
  useEffect(() => {
    localStorage.setItem(sessionKey(classId), JSON.stringify(session));
  }, [classId, session]);

  useEffect(() => {
    localStorage.setItem(checkinsKey(classId), JSON.stringify(checkins));
  }, [classId, checkins]);

  // Tick timer nếu đang mở
  useEffect(() => {
    if (!session?.isRunning) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [session?.isRunning]);

  // Auto stop nếu hết giờ
  useEffect(() => {
    if (!session?.isRunning) return;
    if (session.endAt && now >= session.endAt) {
      setSession((s) => (s ? { ...s, isRunning: false } : s));
    }
  }, [now, session]);

  const remainingMs = useMemo(() => {
    if (!session?.isRunning || !session?.endAt) return 0;
    return Math.max(0, session.endAt - now);
  }, [session, now]);

  const remainingText = useMemo(() => {
    const s = Math.floor(remainingMs / 1000);
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}m ${String(ss).padStart(2, "0")}s`;
  }, [remainingMs]);

  function startSession() {
    const code = generateCode(6);
    const startAt = Date.now();
    const endAt = startAt + Number(durationMin) * 60 * 1000;

    setSession({
      classId,
      code,
      startAt,
      endAt,
      isRunning: true,
    });

    // phiên mới -> reset checkins
    setCheckins([]);
  }

  function stopSession() {
    setSession((s) => (s ? { ...s, isRunning: false } : s));
  }

  function clearSession() {
    if (!confirm("Xóa phiên điểm danh hiện tại?")) return;
    setSession(null);
  }

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <button
        type="button"
        onClick={() => nav("/teacher/classes")}
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
      >
        ← Quay lại
      </button>

      <div style={{ marginTop: 12 }}>
        <h1 style={{ marginBottom: 6 }}>Quản lý buổi điểm danh</h1>
        <div style={{ color: "#555" }}>
          Lớp:{" "}
          <b>
            {classInfo ? `${classInfo.subjectName} - ${classInfo.subjectCode}` : `ClassId: ${classId}`}
          </b>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginTop: 16 }}>
        {/* Control */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, background: "#fff", padding: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Mở điểm danh</div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ fontWeight: 600 }}>Thời lượng (phút):</label>
            <input
              type="number"
              min={1}
              max={180}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              style={{ width: 120, padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
              disabled={session?.isRunning}
            />

            {!session?.isRunning ? (
              <button
                type="button"
                onClick={startSession}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}
              >
                Tạo mã & Bắt đầu
              </button>
            ) : (
              <button
                type="button"
                onClick={stopSession}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #f3c2c2", background: "#fff5f5", color: "#b00020" }}
              >
                Dừng
              </button>
            )}

            <button
              type="button"
              onClick={clearSession}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}
            >
              Xóa phiên
            </button>
          </div>

          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#fafafa", border: "1px dashed #ccc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#666", fontSize: 13 }}>Mã điểm danh</div>
                <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: 2 }}>
                  {session?.code || "------"}
                </div>
              </div>

              <div>
                <div style={{ color: "#666", fontSize: 13 }}>Trạng thái</div>
                <div style={{ fontWeight: 800 }}>
                  {session?.isRunning ? `Đang mở • Còn ${remainingText}` : "Chưa mở / Đã dừng / Hết hạn"}
                </div>
                <div style={{ color: "#777", marginTop: 4 }}>
                  Bắt đầu: {session?.startAt ? fmtTime(session.startAt) : "--:--:--"} • Kết thúc:{" "}
                  {session?.endAt ? fmtTime(session.endAt) : "--:--:--"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, background: "#fff", padding: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Đã điểm danh</div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>{checkins.length}</div>
          <div style={{ color: "#666" }}>Sinh viên</div>
        </div>
      </div>

      {/* Checkins list */}
      <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 12, background: "#fff", padding: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Danh sách sinh viên đã điểm danh</div>

        {checkins.length === 0 ? (
          <div style={{ marginTop: 10, color: "#777" }}>Chưa có sinh viên nào điểm danh.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>MSSV</th>
                  <th style={th}>Họ tên</th>
                  <th style={th}>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {checkins
                  .slice()
                  .sort((a, b) => a.checkedAt - b.checkedAt)
                  .map((s, idx) => (
                    <tr key={s.studentId}>
                      <td style={td}>{idx + 1}</td>
                      <td style={td}>{s.studentId}</td>
                      <td style={td}>{s.studentName}</td>
                      <td style={td}>{fmtTime(s.checkedAt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eee", color: "#555", fontWeight: 700, fontSize: 13 };
const td = { padding: "10px 8px", borderBottom: "1px solid #f0f0f0" };
