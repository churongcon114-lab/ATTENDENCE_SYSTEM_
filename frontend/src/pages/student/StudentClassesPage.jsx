// src/pages/student/StudentClassesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { attendanceApi } from "../../api/attendanceApi";

// ✅ DEMO SYNC với TeacherClassesPage (cùng key) :contentReference[oaicite:2]{index=2}
const STORAGE_KEY = "attendance_teacher_classes_v1";

// ✅ GIỮ GIỐNG TeacherClassesPage để dữ liệu khớp dayOfWeek/period :contentReference[oaicite:3]{index=3}
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

function safeJsonParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function normalizeClasses(arr) {
  if (!Array.isArray(arr)) return [];
  // đảm bảo id/period/dayOfWeek đúng kiểu
  return arr
    .filter(Boolean)
    .map((c) => ({
      id: c.id || c._id,
      subjectName: c.subjectName || c.name || "",
      subjectCode: c.subjectCode || c.code || "",
      teacherName: c.teacherName || c.teacher || "",
      dayOfWeek: c.dayOfWeek,
      period: Number(c.period),
    }))
    .filter((c) => c.id && c.dayOfWeek && Number.isFinite(c.period));
}

export default function StudentClassesPage() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  async function loadData() {
    setLoading(true);
    setError("");

    // 1) ƯU TIÊN API (khi bạn có backend)
    try {
      if (attendanceApi?.getMyClasses) {
        const res = await attendanceApi.getMyClasses(); // res.data = [{...}]
        const list = normalizeClasses(res?.data || []);
        setClasses(list);
        setSelectedId((prev) => prev ?? list?.[0]?.id ?? null);
        setLoading(false);
        return;
      }
    } catch (e) {
      // nếu API lỗi, rơi xuống demo localStorage
    }

    // 2) FALLBACK DEMO: đọc từ localStorage key giống TeacherClassesPage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = normalizeClasses(safeJsonParse(raw || "[]", []));
      setClasses(list);
      setSelectedId((prev) => prev ?? list?.[0]?.id ?? null);
    } catch (e) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byDayPeriod = useMemo(() => {
    const map = new Map();
    for (const c of classes) map.set(`${c.dayOfWeek}_${c.period}`, c);
    return map;
  }, [classes]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === selectedId) || null, [classes, selectedId]);

  function openSessions(c) {
    nav(`/student/classes/${c.id}/sessions`, { state: { classInfo: c } });
  }
  function openLeave(c) {
    nav(`/student/classes/${c.id}/leave`, { state: { classInfo: c } });
  }

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <div style={pathText}>/student/classes</div>
          <div style={subText}>Lịch học tuần (demo)</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={loadData} style={btn}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <div style={toastErr}>Lỗi: {error}</div> : null}

      <div style={layout}>
        {/* LEFT: timetable */}
        <div style={leftCol}>
          {loading ? (
            <div style={{ color: "#ddd" }}>Đang tải...</div>
          ) : (
            DAYS.map((d) => (
              <div key={d.value} style={dayCard}>
                <div style={dayTitle}>{d.label}</div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {PERIODS.map((p) => {
                    const c = byDayPeriod.get(`${d.value}_${p}`);
                    if (!c) {
                      return (
                        <div key={p} style={emptySlot}>
                          Ca {p}: Trống
                        </div>
                      );
                    }

                    return (
                      <div
                        key={p}
                        style={{
                          ...classSlot,
                          outline: selectedId === c.id ? "2px solid rgba(120,120,255,0.55)" : "none",
                        }}
                        onClick={() => setSelectedId(c.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <div style={{ fontWeight: 900 }}>
                          Ca {p}: {c.subjectName} - {c.subjectCode}
                        </div>
                        <div style={{ marginTop: 6, opacity: 0.85 }}>Giảng viên: {c.teacherName || "—"}</div>

                        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button type="button" style={linkBtn} onClick={(e) => (e.stopPropagation(), openSessions(c))}>
                            Tham gia lớp
                          </button>
                          <button type="button" style={linkBtn} onClick={(e) => (e.stopPropagation(), openLeave(c))}>
                            Xin vắng
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT: details */}
        <div style={rightCol}>
          {!selectedClass ? (
            <div style={panel}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Chi tiết lớp</div>
              <div style={{ marginTop: 10, color: "#bbb" }}>Chọn một lớp ở TKB bên trái để xem chi tiết.</div>
            </div>
          ) : (
            <div style={panel}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Chi tiết lớp</div>

              <div style={{ marginTop: 14 }}>
                <div style={kvLabel}>Môn học</div>
                <div style={kvValue}>
                  {selectedClass.subjectName} - {selectedClass.subjectCode}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={kvLabel}>Giảng viên</div>
                <div style={kvValue}>{selectedClass.teacherName || "—"}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={kvLabel}>Lịch</div>
                <div style={kvValue}>
                  {DAYS.find((x) => x.value === selectedClass.dayOfWeek)?.label || selectedClass.dayOfWeek} — Ca{" "}
                  {selectedClass.period}
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" style={btnPrimary} onClick={() => openSessions(selectedClass)}>
                  Vào buổi điểm danh
                </button>
                <button type="button" style={btnGhost} onClick={() => openLeave(selectedClass)}>
                  Tạo đơn xin vắng
                </button>
              </div>

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 800 }}>Ghi chú</div>
                <div style={{ marginTop: 8, color: "#bbb", lineHeight: 1.5 }}>
                  Nếu bạn dùng backend: hãy implement <b>attendanceApi.getMyClasses()</b> để trang này lấy đúng lớp mà SV đã
                  được ghi danh.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== styles ===== */
const page = {
  minHeight: "100vh",
  background: "#222",
  color: "#eee",
  padding: 18,
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 14,
};

const pathText = { fontWeight: 900, fontSize: 18, color: "#fff" };
const subText = { marginTop: 6, color: "#bbb" };

const layout = {
  display: "grid",
  gridTemplateColumns: "340px 1fr",
  gap: 16,
  alignItems: "start",
};

const leftCol = { display: "grid", gap: 14 };
const rightCol = { minHeight: 200 };

const dayCard = {
  background: "#1b1b1b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const dayTitle = { fontWeight: 900, fontSize: 14, color: "#fff" };

const emptySlot = {
  padding: 12,
  borderRadius: 10,
  border: "1px dashed rgba(255,255,255,0.18)",
  color: "#bdbdbd",
};

const classSlot = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
  cursor: "pointer",
};

const panel = {
  background: "#1b1b1b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const kvLabel = { color: "#aaa", fontSize: 12 };
const kvValue = { marginTop: 4, fontWeight: 800, color: "#fff" };

const btn = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#2a2a2a",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const btnPrimary = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};

const btnGhost = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#2a2a2a",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};

const linkBtn = {
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#6ea8ff",
  cursor: "pointer",
  fontWeight: 800,
};

const toastErr = {
  marginBottom: 12,
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,120,120,0.35)",
  background: "rgba(255,0,0,0.06)",
  color: "#ffb3b3",
  fontWeight: 800,
};
