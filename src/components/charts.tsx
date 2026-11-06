// กราฟแบบ SVG วาดที่เซิร์ฟเวอร์ (ไม่ต้องใช้ JavaScript ฝั่งเบราว์เซอร์)
export interface BarItem { label: string; title: string; a: number; b: number }

export function BarCompare({ items, max }: { items: BarItem[]; max: number }) {
  const W = 1000, H = 270, L = 38, R = 8, T = 10, B = 40;
  const iw = W - L - R, ih = H - T - B, n = Math.max(items.length, 1), gw = iw / n, bw = Math.min(14, gw * 0.34);
  const step = Math.max(1, Math.ceil(max / 4)), top = step * Math.max(1, Math.ceil(max / step));
  const y = (v: number) => T + ih - (v / top) * ih;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="จำนวนคนที่รู้ในแต่ละ Module ก่อนและหลังเรียน">
      {ticks.map(t => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
          <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
        </g>
      ))}
      <text transform={`translate(10 ${T + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#94a3b8">จำนวนคน</text>
      {items.map((it, i) => {
        const cx = L + gw * i + gw / 2;
        return (
          <g key={it.label}>
            <title>{it.title}</title>
            <rect x={cx - bw - 1} y={y(it.a)} width={bw} height={y(0) - y(it.a)} fill="#CBD5E1" rx="2" />
            <rect x={cx + 1} y={y(it.b)} width={bw} height={y(0) - y(it.b)} fill="#00A859" rx="2" />
            <text x={cx} y={H - B + 14} textAnchor="middle" fontSize="9" fill="#64748b">{it.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export interface DonutSeg { value: number; color: string; label: string }
export function Donut({ segments }: { segments: DonutSeg[] }) {
  const r = 70, c = 2 * Math.PI * r, total = segments.reduce((a, s) => a + s.value, 0);
  let acc = 0;
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" role="img" aria-label="สัดส่วนสถานะการเรียน">
      <circle cx="100" cy="100" r={r} fill="none" stroke="#E2E8F0" strokeWidth="26" />
      {total > 0 && segments.filter(s => s.value > 0).map(s => {
        const len = (s.value / total) * c, off = -acc;
        acc += len;
        return (
          <circle key={s.label} cx="100" cy="100" r={r} fill="none" stroke={s.color} strokeWidth="26"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={off} transform="rotate(-90 100 100)">
            <title>{s.label}: {s.value}</title>
          </circle>
        );
      })}
      <text x="100" y="98" textAnchor="middle" fontSize="28" fontWeight="700" fill="#1E293B">{total}</text>
      <text x="100" y="118" textAnchor="middle" fontSize="11" fill="#64748b">รายการ</text>
    </svg>
  );
}
