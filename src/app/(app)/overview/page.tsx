import { Fragment } from 'react';
import { getScopedData } from '@/lib/session';
import { kpis, PROGRESS_LABEL } from '@/lib/metrics';

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const COLORS = { done: '#2e9e55', failed: '#d9534f', learning: '#e0a800', notstarted: '#b8c0cc' } as const;

export default async function Overview() {
  const { data } = await getScopedData(['Lead', 'Manager', 'Admin']);
  const k = kpis(data);
  const total = k.progress.done + k.progress.failed + k.progress.learning + k.progress.notstarted;
  const products = [...new Set(k.rows.map(r => r.module.product))];

  return (
    <>
      <h1>ภาพรวมทีม</h1>
      <p className="sub">ข้อมูล ณ {new Date(data.generatedAt).toLocaleString('th-TH')}</p>

      <div className="cards">
        <div className="card kpi"><div className="l">Module ที่ใช้งาน</div><div className="v">{k.modules}</div><div className="n">สมาชิก {k.members} คน</div></div>
        <div className="card kpi"><div className="l">ความรู้ทีม (ถ่วงน้ำหนัก)</div><div className="v">{pct(k.current, k.target)}%</div>
          <div className="n">เริ่มต้น {pct(k.baseline, k.target)}% → ปัจจุบัน {k.current}/{k.target}</div></div>
        <div className="card kpi"><div className="l">ผ่านการสอบ Post-test</div><div className="v">{k.passRate === null ? '—' : `${k.passRate}%`}</div><div className="n">{k.passRate === null ? 'ยังไม่มีผลสอบ' : 'ของผู้ที่สอบแล้ว (คะแนนดีที่สุด)'}</div></div>
        <div className="card kpi"><div className="l">Learning Gain เฉลี่ย</div><div className="v">{k.avgGain === null ? '—' : `${k.avgGain >= 0 ? '+' : ''}${k.avgGain.toFixed(1)}`}</div><div className="n">คะแนน Post − Pre</div></div>
        <div className="card kpi"><div className="l">Single Point of Knowledge</div><div className="v">{k.singlePoint}</div><div className="n">Module ที่มีผู้รู้ไม่เกิน 1 คน</div></div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>สถานะการเรียนของผู้ที่ต้องเรียน ({total} รายการ)</h2>
        <div className="bar">{(Object.keys(COLORS) as (keyof typeof COLORS)[]).map(p =>
          <i key={p} style={{ width: `${pct(k.progress[p], total)}%`, background: COLORS[p] }} />)}</div>
        <div className="legend">{(Object.keys(COLORS) as (keyof typeof COLORS)[]).map(p =>
          <span key={p}><b style={{ background: COLORS[p] }} />{PROGRESS_LABEL[p]} {k.progress[p]}</span>)}</div>
      </div>

      <div className="card scroll">
        <h2>ความคืบหน้าแต่ละ Module</h2>
        <table>
          <thead><tr><th>Module</th><th className="num">Complexity</th><th className="num">รู้แล้ว (C)</th><th className="num">ต้องเรียน (P)</th><th className="num">สำเร็จ (N)</th>
            <th className="num">คนที่รู้ ก่อน → หลัง</th><th className="num">ทำ Pre-test แล้ว</th><th>วัน Pre-test</th><th>ข้อสังเกต</th></tr></thead>
          <tbody>{products.map(p => (
            <Fragment key={p}>
              <tr className="grp"><td colSpan={9}>{p}</td></tr>
              {k.rows.filter(r => r.module.product === p).map(r => (
                <tr key={r.module.id}>
                  <td>{r.module.name}</td><td className="num">{r.module.complexity}</td>
                  <td className="num">{r.c}</td><td className="num">{r.p}</td><td className="num">{r.n}</td>
                  <td className="num">{r.before} → {r.after}</td>
                  <td className="num">{r.learners ? `${r.preDone}/${r.learners}` : '—'}</td>
                  <td>{r.course?.preTestDate ?? '—'}</td>
                  <td>
                    {r.single && <span className="tag t-bad">ผู้รู้ไม่เกิน 1 คน</span>}
                    {r.noCourse && <span className="tag t-warn">มีผู้เรียนแต่ยังไม่มีคอร์ส</span>}
                    {r.course && r.p + r.n === 0 && <span className="tag t-info">คอร์สยังไม่มีผู้เรียน</span>}
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
