import Link from 'next/link';

/** แถบตัวกรอง (Product / ทีม) แบบ GET ไม่ต้องใช้ JavaScript ฝั่งเบราว์เซอร์ */
export function FilterBar({ action, products, teams, product, team, hidden = {} }: {
  action: string; products: string[]; teams: string[]; product?: string; team?: string; hidden?: Record<string, string>;
}) {
  const reset = Object.keys(hidden).length ? `${action}?${new URLSearchParams(hidden).toString()}` : action;
  return (
    <form method="get" action={action} className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="flex items-center space-x-2">
        <i className="fa-solid fa-filter text-axons-blue" />
        <span className="font-semibold text-slate-700 text-sm">ตัวกรอง:</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200">
          <i className="fa-solid fa-cube text-slate-400 mr-2" />
          <select name="product" defaultValue={product ?? ''} className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer">
            <option value="">ทุก Product ({products.length})</option>
            {products.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex items-center bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200">
          <i className="fa-solid fa-users text-slate-400 mr-2" />
          <select name="team" defaultValue={team ?? ''} className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer">
            <option value="">ทุกทีม</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <button type="submit" className="bg-axons-blue text-white text-xs px-4 py-1.5 rounded-lg font-medium hover:bg-axons-blueDark transition border-0">ใช้ตัวกรอง</button>
        <Link href={reset} className="text-axons-blue hover:underline font-medium text-xs px-2 py-1"><i className="fa-solid fa-rotate-left mr-1" />รีเซ็ต</Link>
      </div>
    </form>
  );
}
