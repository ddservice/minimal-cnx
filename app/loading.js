export default function Loading() {
  return (
    <div style={{ padding: '16px 0', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header Skeleton */}
      <div className="skeleton-card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: 140, height: 20, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 220, height: 14 }} />
        </div>
      </div>

      {/* KPI Tiles Skeleton */}
      <div className="kpis" style={{ marginBottom: 24 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: 80, height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 120, height: 24 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Content Skeleton Card */}
      <div className="skeleton-card" style={{ minHeight: 250, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ width: '40%', height: 22 }} />
        <div className="skeleton" style={{ width: '100%', height: 40 }} />
        <div className="skeleton" style={{ width: '100%', height: 40 }} />
        <div className="skeleton" style={{ width: '100%', height: 40 }} />
      </div>
    </div>
  );
}
