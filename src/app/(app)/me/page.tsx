import { getScopedData } from '@/lib/session';
import { bestPost, LEVEL_LABEL, levelOf, preScore, PROGRESS_LABEL, progressOf } from '@/lib/metrics';

const STATUS_LABEL = { C: 'รู้แล้ว', P: 'ต้องเรียน', N: 'เรียนสำเร็จปีนี้' } as const;
const ORDER = { P: 0, N: 1, C: 2 } as const;

export default async function Me() {
  const { user, data } = await getScopedData();
  const mine = data.memberModules.filter(x => x.memberId === user.memberId)
    .map(x => ({ x, mod: data.modules.find(m => m.id === x.moduleId) }))
    .filter((r): r is { x: typeof r.x; mod: NonNullable<typeof r.mod> } => !!r.mod && r.mod.active)
    .sort((a, b) => ORDER[a.x.status] - ORDER[b.x.status] || a.mod.product.localeCompare(b.mod.product));
  const count = (s: 'C' | 'P' | 'N') => mine.filter(r => r.x.status === s).length;

  return (
    <>
      <h1>การเรียนของฉัน</h1>
      <p className="sub">{user.name}</p>
      <div className="cards">
        <div className="card kpi"><div className="l">รู้แล้ว</div><div className="v">{count('C')}</div><div className="n">Module</div></div>
        <div className="card kpi"><div className="l">ต้องเรียน</div><div className="v">{count('P')}</div><div className="n">Module</div></div>
        <div className="card kpi"><div className="l">เรียนสำเร็จปีนี้</div><div className="v">{count('N')}</div><div className="n">Module</div></div>
      </div>
      <div className="card scroll">
        <table>
          <thead><tr><th>Product</th><th>Module</th><th>สถานะ</th><th className="num">Pre-test</th><th>ระดับก่อนเรียน</th><th className="num">Post-test (ดีที่สุด)</th><th>ความคืบหน้า</th></tr></thead>
          <tbody>{mine.map(({ x, mod }) => {
            const pre = preScore(data, x.memberId, x.moduleId), post = bestPost(data, x.memberId, x.moduleId), lv = levelOf(pre, data.settings);
            const pg = progressOf(data, x.memberId, x.moduleId, x.status);
            return (
              <tr key={x.moduleId}>
                <td>{mod.product}</td><td>{mod.name}</td>
                <td><span className={`tag t-${x.status === 'C' ? 'ok' : x.status === 'P' ? 'warn' : 'info'}`}>{STATUS_LABEL[x.status]}</span></td>
                <td className="num">{pre === null ? '—' : Math.round(pre)}</td>
                <td>{lv ? <span className={`tag lv-${lv}`}>{LEVEL_LABEL[lv]}</span> : '—'}</td>
                <td className="num">{post === null ? '—' : post.total === null ? 'รอคะแนนอัตนัย' : `${Math.round(post.total)} ${post.passed ? '(ผ่าน)' : '(ไม่ผ่าน)'}`}</td>
                <td>{pg ? PROGRESS_LABEL[pg] : '—'}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </>
  );
}
