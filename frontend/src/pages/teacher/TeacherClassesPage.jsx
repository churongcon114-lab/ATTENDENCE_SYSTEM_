import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { attendanceApi } from "../../api/attendanceApi";

const DAYS = [
  { value: "MON", label: "Thứ 2" },
  { value: "TUE", label: "Thứ 3" },
  { value: "WED", label: "Thứ 4" },
  { value: "THU", label: "Thứ 5" },
  { value: "FRI", label: "Thứ 6" },
  { value: "SAT", label: "Thứ 7" },
  { value: "SUN", label: "Chủ nhật" },
];
const PERIODS = [1, 2, 3, 4];

export default function TeacherClassesPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [classes, setClasses] = useState([]);

  // form
  const [subjectName, setSubjectName] = useState("tin hoc");
  const [subjectCode, setSubjectCode] = useState("CN01");
  const [dayOfWeek, setDayOfWeek] = useState("MON");
  const [period, setPeriod] = useState(1);
  const [teacherName, setTeacherName] = useState("GV");

  async function load() {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await attendanceApi.getTeacherClasses();
      setClasses(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Network Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const byDayPeriod = useMemo(() => {
    const m = new Map();
    for (const c of classes) m.set(`${c.dayOfWeek}_${c.period}`, c);
    return m;
  }, [classes]);

  async function createClass(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      const res = await attendanceApi.createClass({
        subjectName,
        subjectCode,
        teacherName,
        dayOfWeek,
        period: Number(period),
      });
      setMsg("Tạo lớp thành công.");
      await load();
      // focus created class
      const created = res?.data;
      if (created?._id) {
        // optional navigate
      }
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.message || "Create failed");
    }
  }

  async function delClass(classId) {
    setError("");
    setMsg("");
    try {
      await attendanceApi.deleteTeacherClass(classId);
      setMsg("Đã xóa lớp.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Delete failed");
    }
  }

  function openSessions(c) {
    nav(`/teacher/classes/${c._id}/sessions`, { state: { classInfo: c } });
  }
  function openLeave(c) {
    nav(`/teacher/classes/${c._id}/leave`, { state: { classInfo: c } });
  }

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>/teacher/classes</div>
          <div style={{ marginTop: 6, color: "#bbb" }}>Tạo lớp và xem TKB</div>
        </div>
        <button type="button" onClick={load} style={btn}>Refresh</button>
      </div>

      {error ? <div style={toastErr}>Lỗi: {error}</div> : null}
      {msg ? <div style={toastOk}>{msg}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, alignItems: "start" }}>
        <div style={card}>
          <div style={{ fontWeight: 900 }}>Tạo lớp (Teacher)</div>

          <form onSubmit={createClass} style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div style={label}>Tên môn</div>
              <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} style={input} />
            </div>

            <div>
              <div style={label}>Mã môn</div>
              <input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} style={input} />
            </div>

            <div>
              <div style={label}>Tên GV</div>
              <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} style={input} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={label}>Thứ</div>
                <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} style={input}>
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={label}>Ca</div>
                <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} style={input}>
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" style={btnPrimary} disabled={loading}>Tạo lớp</button>

          
          </form>
        </div>

        <div style={panel}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>TKB (Teacher)</div>
          {loading ? (
            <div style={{ marginTop: 10, color: "#bbb" }}>Đang tải...</div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
              {DAYS.map((d) => (
                <div key={d.value} style={dayCard}>
                  <div style={dayTitle}>{d.label}</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {PERIODS.map((p) => {
                      const c = byDayPeriod.get(`${d.value}_${p}`);
                      if (!c) return <div key={p} style={emptySlot}>Ca {p}: Trống</div>;

                      return (
                        <div key={p} style={classSlot}>
                          <div style={{ fontWeight: 900 }}>
                            Ca {p}: {c.subjectName} - {c.subjectCode}
                          </div>
                          <div style={{ marginTop: 6, opacity: 0.85 }}>GV: {c.teacherName}</div>

                          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button type="button" style={linkBtn} onClick={() => openSessions(c)}>Quản lý điểm danh</button>
                            <button type="button" style={linkBtn} onClick={() => openLeave(c)}>Duyệt xin vắng</button>
                            <button type="button" style={dangerBtn} onClick={() => delClass(c._id)}>Xóa</button>
                          </div>
                        </div>
                      );
                    })}
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
const header = { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 };

const card = { background: "#1b1b1b", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 14, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" };
const panel = { background: "#1b1b1b", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 14, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" };

const label = { color: "#aaa", fontSize: 12, marginBottom: 6 };
const input = { width: "100%", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "#111", color: "#fff", fontWeight: 800 };

const btn = { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "#2a2a2a", color: "#fff", cursor: "pointer", fontWeight: 800 };
const btnPrimary = { padding: "12px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "#111", color: "#fff", cursor: "pointer", fontWeight: 900 };

const toastErr = { marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,120,120,0.35)", background: "rgba(255,0,0,0.06)", color: "#ffb3b3", fontWeight: 800 };
const toastOk = { marginBottom: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(120,255,120,.25)", background: "rgba(0,255,0,.06)", color: "#c9ffcf", fontWeight: 800 };

const dayCard = { background: "#171717", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 };
const dayTitle = { fontWeight: 900, fontSize: 14, color: "#fff" };
const emptySlot = { padding: 12, borderRadius: 10, border: "1px dashed rgba(255,255,255,0.18)", color: "#bdbdbd" };
const classSlot = { padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" };

const linkBtn = { padding: 0, border: "none", background: "transparent", color: "#6ea8ff", cursor: "pointer", fontWeight: 800 };
const dangerBtn = { padding: 0, border: "none", background: "transparent", color: "#ff9aa9", cursor: "pointer", fontWeight: 800 };
