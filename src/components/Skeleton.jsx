/** Yuklanish holatlari — matn o'rniga kontent shakli ko'rsatiladi */

export function SkeletonStats() {
  return (
    <div className="stats-grid">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="card statcard">
          <div className="sk" style={{ width: 38, height: 38, borderRadius: 11, marginBottom: 12 }} />
          <div className="sk sk-line" style={{ width: "55%", height: 24 }} />
          <div className="sk sk-line" style={{ width: "75%" }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCourses({ count = 3 }) {
  return (
    <div className="course-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card course-card">
          <div className="sk sk-card" style={{ borderRadius: 0 }} />
          <div className="course-body">
            <div className="sk sk-line" style={{ width: "70%", height: 17 }} />
            <div className="sk sk-line" style={{ width: "100%" }} />
            <div className="sk sk-line" style={{ width: "45%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 0" }}>
          <div className="sk" style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0 }} />
          {Array.from({ length: cols - 1 }).map((_, c) => (
            <div key={c} className="sk" style={{ height: 13, flex: c === 0 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPageHead() {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="sk sk-title" />
      <div className="sk sk-line" style={{ width: 320 }} />
    </div>
  );
}

export function SkeletonLessons({ rows = 4 }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 0" }}>
          <div className="sk" style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="sk sk-line" style={{ width: "55%" }} />
            <div className="sk sk-line" style={{ width: "80%", marginBottom: 0 }} />
          </div>
          <div className="sk" style={{ width: 70, height: 24, borderRadius: 999, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}
