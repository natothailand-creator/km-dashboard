import Link from 'next/link';
import { Fragment } from 'react';
import { getScopedData } from '@/lib/session';
import { filterScoped } from '@/lib/filters';
import { failRows, followUps, kpis, knowerNames, PROGRESS_LABEL } from '@/lib/metrics';
import { BarCompare, Donut } from '@/components/charts';
import { FilterBar } from '@/components/FilterBar';

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const COLORS = { notstarted: '#CBD5E1', learning: '#D69E2E', failed: '#E53E3E', done: '#00A859' } as const;
const ORDER = ['notstarted', 'learning', 'failed', 'done'] as const;
const BADGE = { failed: 'bg-red-100 text-axons-red', essay: 'bg-amber-100 text-axons-yellow', nopre: 'bg-slate-100 text-slate-600' } as const;
const BADGE_TEXT = { failed: 'ไม่ผ่าน', essay: 'รอตรวจ', nopre: 'ยังไม่เริ่ม' } as const;

function Kpi({ label, icon, chip, value, unit, sub, subClass }: {
  label: string; icon: string; chip: string; value: string; unit?: string; sub: string; subClass: string;
}) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span className={`${chip} p-2 rounded-lg`}><i className={`fa-solid ${icon}`} /></span>
      </div>
      <p className="text-3xl font-bold text-slate-800 mt-2">{value}{unit && <span className="text-sm font-normal text-slate-500"> {unit}</span>}</p>
      <span className={`text-[11px] ${subClass}`}>{sub}</span>
    </div>
  );
}

export default async function Overview({ searchParams }: { searchParams: Promise<{ product?: string; team?: string }> }) {
  const sp = await searchParams;
  const { data: all } = await getScopedData(['Lead', 'Manager', 'Admin']);
  const products = [...new Set(all.modules.filter(m => m.active).map(m => m.product))];
  const teams = [...new Set(all.members.map(m => m.team).filter((t): t is string => !!t))];
  const filters = { product: products.includes(sp.product ?? '') ? sp.product : undefined, team: teams.includes(sp.team ?? '') ? sp.team : undefined };
  const data = filterScoped(all, filters);

  const k = kpis(data);
  const today = new Date().toISOString().slice(0, 10);
  const fails = failRows(data).filter(r => r.failed > 0).slice(0, 5);
  const follow = followUps(data, today);
  const total = ORDER.reduce((a, p) => a + k.progress[p], 0);
  const singles = k.rows.filter(r => r.single).sort((a, b) => b.module.complexity - a.module.complexity);
  const covNow = pct(k.current, k.target), covGain = covNow - pct(k.baseline, k.target);
  const productList = [...new Set(k.rows.map(r => r.module.product))];

  return (
    <>
      <FilterBar action="/overview" products={products} teams={teams} product={filters.product} team={filters.team} />

      <div>
        <h1 className="text-2xl font-bold text-slate-800">ภาพรวมความรู้และทักษะทีม (Team Overview)</h1>
        <p className="text-xs text-slate-500 mt-1">ข้อมูล ณ {new Date(data.generatedAt).toLocaleString('th-TH')}</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="จำนวน Module ที่ใช้งาน" icon="fa-cubes" chip="bg-blue-50 text-axons-blue" value={String(k.modules)} sub={`${productList.length} Product`} subClass="text-slate-400" />
        <Kpi label="จำนวนสมาชิก" icon="fa-users" chip="bg-blue-50 text-axons-blue" value={String(k.members)} unit="คน" sub={`${new Set(data.members.map(m => m.team)).size} ทีม`} subClass="text-slate-400" />
        <Kpi label="% Knowledge Coverage" icon="fa-chart-line" chip="bg-green-50 text-axons-green" value={`${covNow}%`}
          sub={covGain > 0 ? `+${covGain}% เทียบก่อนเรียน` : 'ยังไม่เปลี่ยนจากก่อนเรียน'} subClass={covGain > 0 ? 'text-axons-green font-semibold' : 'text-slate-400'} />
        <Kpi label="% ผ่านการสอบ" icon="fa-circle-check" chip="bg-green-50 text-axons-green" value={k.passRate === null ? '—' : `${k.passRate}%`}
          sub={k.passRate === null ? 'ยังไม่มีผลสอบ Post-test' : `เกณฑ์ผ่าน ≥ ${data.settings.passScore} คะแนน`} subClass="text-slate-400" />
        <Kpi label="Learning Gain เฉลี่ย" icon="fa-bolt" chip="bg-purple-50 text-purple-600" value={k.avgGain === null ? '—' : `${k.avgGain >= 0 ? '+' : ''}${k.avgGain.toFixed(1)}`}
          sub="คะแนน Post − Pre" subClass="text-purple-600 font-medium" />
      </div>

      {/* กราฟ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm">เปรียบเทียบจำนวนคนที่ &quot;รู้&quot; แต่ละ Module (ก่อน vs ปัจจุบัน)</h3>
          <p className="text-xs text-slate-400 mb-3">แท่งเทา = ก่อนเรียน (C), แท่งเขียว = ปัจจุบัน (C + N) | แกน X คือเลข Module เลื่อนเมาส์เพื่อดูชื่อ</p>
          <BarCompare max={k.members} items={k.rows.map(r => ({ label: String(parseInt(r.module.id.slice(1), 10)), title: `${r.module.product} / ${r.module.name}: ก่อน ${r.before} → ปัจจุบัน ${r.after} คน`, a: r.before, b: r.after }))} />
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">สัดส่วนสถานะการเรียนของทีม</h3>
            <p className="text-xs text-slate-400">เฉพาะรายการที่ต้องเรียน (P และ N)</p>
          </div>
          <div className="h-52 relative flex items-center justify-center my-2">
            <Donut segments={ORDER.map(p => ({ value: k.progress[p], color: COLORS[p], label: PROGRESS_LABEL[p] }))} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
            {ORDER.map(p => (
              <span key={p} className="flex items-center"><i className="fa-solid fa-circle mr-2" style={{ color: COLORS[p] }} />{PROGRESS_LABEL[p]}: {k.progress[p]} ({pct(k.progress[p], total)}%)</span>
            ))}
          </div>
        </div>
      </div>

      {/* Single Point of Knowledge */}
      {singles.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start space-x-3">
            <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xl mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">แจ้งเตือนความเสี่ยง: Single Point of Knowledge (เสี่ยงต่อความต่อเนื่องของงาน)</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                พบ <strong>{singles.length} Module</strong> ที่มีผู้รู้ไม่เกิน 1 คน เช่น{' '}
                {singles.slice(0, 4).map((r, i) => {
                  const who = knowerNames(data, r.module.id);
                  return <span key={r.module.id}>{i > 0 && ', '}<strong>{r.module.name}</strong> ({who.length ? who[0] : 'ไม่มีผู้รู้'})</span>;
                })}
                {singles.length > 4 && ` และอีก ${singles.length - 4} Module`}
              </p>
            </div>
          </div>
          <Link href="/skill-matrix" className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition shrink-0">ดูใน Skill Matrix</Link>
        </div>
      )}

      {/* ตารางล่าง */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3">
            <i className="fa-solid fa-circle-exclamation text-axons-red" /> Module ที่ต้องให้ความสนใจ (อัตราไม่ผ่านสูงสุด)
          </h3>
          {fails.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">ยังไม่มี Module ที่มีผู้สอบ Post-test ไม่ผ่าน</p>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr><th className="p-2.5">Module</th><th className="p-2.5 text-center">ผู้สอบ</th><th className="p-2.5 text-center">ไม่ผ่าน</th><th className="p-2.5 text-right">% ไม่ผ่าน</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fails.map(r => (
                  <tr key={r.module.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-medium text-slate-800 whitespace-normal">{r.module.name}</td>
                    <td className="p-2.5 text-center">{r.examinees}</td>
                    <td className="p-2.5 text-center text-axons-red font-semibold">{r.failed}</td>
                    <td className="p-2.5 text-right"><span className={`px-2 py-0.5 rounded-full font-bold ${r.rate >= 0.25 ? 'bg-red-100 text-axons-red' : 'bg-amber-100 text-axons-yellow'}`}>{(r.rate * 100).toFixed(1)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3">
            <i className="fa-solid fa-user-clock text-axons-yellow" /> รายการสมาชิกที่ต้องเร่งติดตาม
            {follow.length > 0 && <span className="text-[11px] font-normal text-slate-400">({follow.length} รายการ)</span>}
          </h3>
          {follow.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">ไม่มีรายการค้างติดตาม</p>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr><th className="p-2.5">ชื่อ-นามสกุล</th><th className="p-2.5">ปัญหา / ประเด็น</th><th className="p-2.5 text-center">สถานะ</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {follow.slice(0, 8).map((f, i) => (
                  <tr key={`${f.memberId}-${i}`} className="hover:bg-slate-50">
                    <td className="p-2.5 font-medium text-slate-800 whitespace-nowrap">{f.name}</td>
                    <td className="p-2.5 text-slate-500 whitespace-normal">{f.issue}</td>
                    <td className="p-2.5 text-center"><span className={`${BADGE[f.kind]} px-2 py-0.5 rounded-full whitespace-nowrap`}>{BADGE_TEXT[f.kind]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {follow.length > 8 && <p className="text-[11px] text-slate-400 mt-2">และอีก {follow.length - 8} รายการ</p>}
        </div>
      </div>

      {/* ความคืบหน้าแต่ละ Module */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <h3 className="font-bold text-slate-800 text-sm mb-3">ความคืบหน้าแต่ละ Module</h3>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold">
            <tr>
              <th className="p-2.5">Module</th><th className="p-2.5 text-center">Complexity</th><th className="p-2.5 text-center">รู้แล้ว (C)</th>
              <th className="p-2.5 text-center">ต้องเรียน (P)</th><th className="p-2.5 text-center">สำเร็จ (N)</th><th className="p-2.5 text-center">คนที่รู้ ก่อน → ปัจจุบัน</th>
              <th className="p-2.5 text-center">ทำ Pre-test แล้ว</th><th className="p-2.5">วัน Pre-test</th><th className="p-2.5">ข้อสังเกต</th>
            </tr>
          </thead>
          <tbody>
            {productList.map(p => (
              <Fragment key={p}>
                <tr className="bg-slate-100"><td colSpan={9} className="p-2.5 font-semibold text-axons-blue">{p}</td></tr>
                {k.rows.filter(r => r.module.product === p).map(r => (
                  <tr key={r.module.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2.5 font-medium text-slate-800">{r.module.name}</td>
                    <td className="p-2.5 text-center">{r.module.complexity}</td>
                    <td className="p-2.5 text-center">{r.c}</td><td className="p-2.5 text-center">{r.p}</td><td className="p-2.5 text-center">{r.n}</td>
                    <td className="p-2.5 text-center">{r.before} → {r.after}</td>
                    <td className="p-2.5 text-center">{r.learners ? `${r.preDone}/${r.learners}` : '—'}</td>
                    <td className="p-2.5">{r.course?.preTestDate ?? '—'}</td>
                    <td className="p-2.5">
                      {r.single && <span className="bg-red-100 text-axons-red px-2 py-0.5 rounded-full mr-1">ผู้รู้ไม่เกิน 1 คน</span>}
                      {r.noCourse && <span className="bg-amber-100 text-axons-yellow px-2 py-0.5 rounded-full mr-1">มีผู้เรียนแต่ยังไม่มีคอร์ส</span>}
                      {r.course && r.p + r.n === 0 && <span className="bg-blue-100 text-axons-blue px-2 py-0.5 rounded-full">คอร์สยังไม่มีผู้เรียน</span>}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
