export default function Kpi({ icon, label, value, sub, cls, plain }) {
  return (
    <div className="kpi">
      <div className={`kpi-icon${!plain && cls ? ` ${cls}` : ''}`}><i className={`ti ${icon}`} /></div>
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className={`kpi-val${!plain && cls ? ` ${cls}` : ''}`} style={plain ? { fontSize: 20 } : undefined}>{value}</div>
        {sub ? <div className="kpi-sub">{sub}</div> : null}
      </div>
    </div>
  );
}
