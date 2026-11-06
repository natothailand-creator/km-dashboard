import Link from 'next/link';
import { getScopedData } from '@/lib/session';
import { filterScoped } from '@/lib/filters';
import { avg, buildCell, MODES, TONE_CLASS, type Mode } from '@/lib/matrix';
import { FilterBar } from '@/components/FilterBar';

const LEGEND: Record<Mode, { cls: string; mark: string; text: string }[]> = {
  status: [{ cls: 'bg-emerald-100', mark: '✔', text: 'C รู้แล้ว' }, { cls: 'bg-amber-100', mark: '●', text: 'P ต้องเรียน' }, { cls: 'bg-sky-100', mark: '✔', text: 'N เรียนสำเร็จปีนี้' }],
  pre: [{ cls: 'bg-emerald-100', mark: '✔', text: 'รู้จริง (≥ เกณฑ์สูง) หรือ C' }, { cls: 'bg-amber-100', mark: '●', text: 'รู้บางส่วน' }, { cls: 'bg-red-100', mark: '✖', text: 'ไม่รู้' }, { cls: 'bg-slate-100', mark: '-', text: 'ยังไม่สอบ Pre-test' }],
  post: [{ cls: 'bg-emerald-100', mark: '✔', text: 'ผ่าน / รู้แล้ว' }, { cls: 'bg-amber-100', mark: '●', text: 'กำลังเรียน / รอคะแนนอัตนัย' }, { cls: 'bg-red-100', mark: '✖', text: 'สอบไม่ผ่าน' }, { cls: 'bg-slate-100', mark: '-', text: 'ยังไม่เริ่มเรียน' }],
  gain: [{ cls: 'bg-emerald-100', mark: '▲', text: 'พัฒนา ≥ 30 คะแนน' }, { cls: 'bg-white border border-slate-200', mark: '▲', text: 'พัฒนาน้อยกว่า 30' }, { cls: 'bg-red-100', mark: '▼', text: 'คะแนนลดลง' }, { cls: 'bg-slate-100', mark: '-', text: 'ยังไม่มีทั้ง Pre และ Post' }],
};
const FOOT_LABEL: Record<Mode, string> = { status: 'จำนวนคนที่ "รู้" (C + N)', pre: 'จำนวนคนที่ "รู้จริง" ก่อนเรียน', post: 'จำนวนคนที่ "รู้" (C + ผ่าน)', gain: 'พัฒนาการเฉลี่ย (คะแนน)' };
const SUM_HEAD: Record<Mode, string> = { status: 'สรุป (รู้ / ที่เกี่ยวข้อง)', pre: 'สรุป (รู้ / ที่เกี่ยวข้อง)', post: 'สรุป (รู้ / ที่เกี่ยวข้อง)', gain: 'พัฒนาการเฉลี่ย' };
const fmtGain = (g: number | null) => (g === null ? '-' : `${g >= 0 ? '+' : ''}${g.toFixed(0)}`);

export default async function SkillMatrix({ searchParams }: { searchParams: Promise<{ mode?: string; product?: string; team?: string }> }) {
  const sp = await searchParams;
  const mode: Mode = MODES.some(m => m.id === sp.mode) ? (sp.mode as Mode) : 'status';
  const { data: all } = await getScopedData(['Lead', 'Manager', 'Admin']);
  const products = [...new Set(all.modules.filter(m => m.active).map(m => m.product))];
  const teams = [...new Set(all.members.map(m => m.team).filter((t): t is string => !!t))];
  const filters = { product: products.includes(sp.product ?? '') ? sp.product : undefined, team: teams.includes(sp.team ?? '') ? sp.team : undefined };
  const d = filterScoped(all, filters);

  const groups = [...new Set(d.modules.filter(m => m.active).map(m => m.product))].map(p => ({ product: p, mods: d.modules.filter(m => m.active && m.product === p) }));
  const mods = groups.flatMap(g => g.mods);
  const status = new Map(d.memberModules.map(x => [`${x.memberId}|${x.moduleId}`, x.status]));
  const rows = d.members.map(mem => ({ mem, cells: mods.map(mod => buildCell(d, mem, mod, status.get(`${mem.id}|${mod.id}`), mode)) }));

  const colKnown = mods.map((_, ci) => rows.filter(r => r.cells[ci].known).length);
  const colGain = mods.map((_, ci) => avg(rows.flatMap(r => (r.cells[ci].gain !== null && r.cells[ci].relevant ? [r.cells[ci].gain as number] : []))));
  const allRel = rows.flatMap(r => r.cells.filter(c => c.relevant));
  const corner = mode === 'gain' ? fmtGain(avg(allRel.filter(c => c.gain !== null).map(c => c.gain as number)))
    : `${allRel.length ? Math.round((allRel.filter(c => c.known).length / allRel.length) * 100) : 0}%`;
  const href = (m: Mode) => `?${new URLSearchParams({ mode: m, ...(filters.product && { product: filters.product }), ...(filters.team && { team: filters.team }) }).toString()}`;

  return (
    <>
      <FilterBar action="/skill-matrix" products={products} teams={teams} product={filters.product} team={filters.team} hidden={{ mode }} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ตารางทักษะรายบุคคล (Skill Matrix Heatmap)</h1>
          <p className="text-xs text-slate-500 mt-1">ใคร × Module จัดกลุ่มตาม Product | ชี้เมาส์ที่ช่องเพื่อดู Pre / Post / Gain | ช่องว่าง = ไม่อยู่ในแผนของคนนั้น</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
          {MODES.map(m => (
            <Link key={m.id} href={href(m.id)} className={`px-4 py-2 rounded-lg transition ${mode === m.id ? 'bg-white text-axons-blue shadow-sm' : 'text-slate-600'}`}>{m.label}</Link>
          ))}
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-700">คำอธิบายสัญลักษณ์และสี:</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {LEGEND[mode].map(l => (
            <span key={l.text} className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded text-[9px] flex items-center justify-center text-slate-600 ${l.cls}`}>{l.mark}</span>{l.text}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto max-h-[calc(100vh-300px)]">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <th rowSpan={2} className="p-3 text-left sticky left-0 bg-slate-100 min-w-[190px] z-30 shadow-sm">สมาชิกทีม / Module</th>
              {groups.map(g => (
                <th key={g.product} colSpan={g.mods.length} className="p-2 text-center border-l border-slate-300 text-axons-blue font-semibold whitespace-normal break-words">{g.product}</th>
              ))}
              <th rowSpan={2} className="p-3 text-center border-l-2 border-slate-300 bg-slate-200 font-bold min-w-[120px] whitespace-normal">{SUM_HEAD[mode]}</th>
            </tr>
            <tr className="bg-slate-100 border-b border-slate-200">
              {mods.map(m => (
                <th key={m.id} title={`${m.id}: ${m.name}`} className="h-28 align-bottom p-1 border-l border-slate-200 font-medium min-w-[52px]">
                  <span className="inline-block [writing-mode:vertical-rl] rotate-180 text-[11px] leading-tight max-h-24 overflow-hidden">{m.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map(({ mem, cells }) => {
              const rel = cells.filter(c => c.relevant);
              const sum = mode === 'gain' ? fmtGain(avg(rel.filter(c => c.gain !== null).map(c => c.gain as number))) : `${rel.filter(c => c.known).length} / ${rel.length}`;
              return (
                <tr key={mem.id} className="hover:bg-slate-50 transition">
                  <td className="p-2 sticky left-0 bg-white border-r border-slate-200 z-10 whitespace-nowrap">
                    <span className="font-medium text-slate-800">{mem.name}</span>
                    <span className="block text-[10px] text-slate-400">{mem.team ?? ''}</span>
                  </td>
                  {cells.map((c, ci) => (
                    <td key={mods[ci].id} title={c.title} className={`p-2 text-center border-l border-white ${TONE_CLASS[c.tone]}`}>
                      <span className="text-[11px] whitespace-nowrap">{c.text}</span>
                    </td>
                  ))}
                  <td className="p-2 text-center border-l-2 border-slate-300 font-bold bg-slate-50 text-slate-800">{sum}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
              <td className="p-3 text-left sticky left-0 bg-slate-100 border-r border-slate-200 z-10 whitespace-nowrap">{FOOT_LABEL[mode]}</td>
              {mods.map((m, ci) => mode === 'gain'
                ? <td key={m.id} className="p-2 text-center border-l border-slate-200">{fmtGain(colGain[ci])}</td>
                : <td key={m.id} className={`p-2 text-center border-l border-slate-200 ${colKnown[ci] <= 1 ? 'bg-red-200 text-axons-red' : ''}`}>{colKnown[ci]}</td>)}
              <td className="p-3 text-center border-l-2 border-slate-300 bg-slate-200">{mode === 'gain' ? `เฉลี่ย ${corner}` : `ครอบคลุม ${corner}`}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {mode !== 'gain' && <p className="text-[11px] text-slate-400">พื้นแดงในแถวล่าง = Module ที่มีผู้รู้ไม่เกิน 1 คน (Single Point of Knowledge)</p>}
    </>
  );
}
