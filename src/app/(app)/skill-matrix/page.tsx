import Link from 'next/link';
import { Fragment } from 'react';
import { getScopedData } from '@/lib/session';
import { bestPost, levelOf, preScore } from '@/lib/metrics';

type View = 'status' | 'pre' | 'post';
const VIEWS: { id: View; label: string }[] = [{ id: 'status', label: 'สถานะ C/P/N' }, { id: 'pre', label: 'คะแนน Pre-test' }, { id: 'post', label: 'คะแนน Post-test' }];

export default async function SkillMatrix({ searchParams }: { searchParams: Promise<{ view?: string; product?: string }> }) {
  const sp = await searchParams;
  const view: View = sp.view === 'pre' || sp.view === 'post' ? sp.view : 'status';
  const { data } = await getScopedData(['Lead', 'Manager', 'Admin']);
  const active = data.modules.filter(m => m.active);
  const products = [...new Set(active.map(m => m.product))];
  const shown = products.filter(p => !sp.product || p === sp.product);
  const lookup = new Map(data.memberModules.map(x => [`${x.memberId}|${x.moduleId}`, x.status]));

  function cell(memberId: string, moduleId: string): { text: string; cls: string } {
    const st = lookup.get(`${memberId}|${moduleId}`);
    if (!st) return { text: '', cls: '' };
    if (view === 'status') return { text: st, cls: `c-${st}` };
    if (st === 'C') return { text: '', cls: 'c-C' };
    if (view === 'pre') {
      const s = preScore(data, memberId, moduleId), lv = levelOf(s, data.settings);
      return s === null ? { text: '·', cls: '' } : { text: String(Math.round(s)), cls: `lv-${lv}` };
    }
    const p = bestPost(data, memberId, moduleId);
    if (!p) return { text: '·', cls: '' };
    return { text: p.total === null ? '…' : String(Math.round(p.total)), cls: p.total === null ? '' : p.passed ? 'res-ok' : 'res-bad' };
  }
  const q = (o: Record<string, string | undefined>) => '?' + new URLSearchParams(Object.entries(o).filter((e): e is [string, string] => !!e[1])).toString();

  return (
    <>
      <h1>Skill Matrix</h1>
      <p className="sub">ใคร × Module จัดกลุ่มตาม Product</p>
      <div className="toolbar">
        <span className="seg">{VIEWS.map(v => <Link key={v.id} className={view === v.id ? 'on' : ''} href={q({ view: v.id, product: sp.product })}>{v.label}</Link>)}</span>
        <form method="get">
          <input type="hidden" name="view" value={view} />
          <select name="product" defaultValue={sp.product ?? ''}>
            <option value="">ทุก Product</option>{products.map(p => <option key={p} value={p}>{p}</option>)}
          </select> <button type="submit">กรอง</button>
        </form>
        <span className="legend">
          {view === 'status' ? <><span><b className="c-C" />C รู้แล้ว</span><span><b className="c-P" />P ต้องเรียน</span><span><b className="c-N" />N เรียนสำเร็จ</span></>
            : view === 'pre' ? <><span><b className="lv-know" />รู้จริง</span><span><b className="lv-partial" />รู้บางส่วน</span><span><b className="lv-none" />ไม่รู้</span><span>· ยังไม่สอบ</span></>
            : <><span><b className="res-ok" />ผ่าน</span><span><b className="res-bad" />ไม่ผ่าน</span><span>· ยังไม่สอบ, … รอคะแนนอัตนัย</span></>}
        </span>
      </div>
      <div className="card scroll">
        <table className="mx">
          <thead><tr><th>Module</th>{data.members.map(m => <th key={m.id} className="v" title={m.name}><span>{m.name.split(' ')[0]}</span></th>)}</tr></thead>
          <tbody>{shown.map(p => (
            <Fragment key={p}>
              <tr className="grp"><td colSpan={data.members.length + 1}>{p}</td></tr>
              {active.filter(m => m.product === p).map(mod => (
                <tr key={mod.id}>
                  <td>{mod.name}</td>
                  {data.members.map(mem => { const c = cell(mem.id, mod.id); return <td key={mem.id} className={`c ${c.cls}`}>{c.text}</td>; })}
                </tr>
              ))}
            </Fragment>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
