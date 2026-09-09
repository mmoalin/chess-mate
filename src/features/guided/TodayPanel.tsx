import type { GuidedNextActivity } from '../../domain/repertoire/recommendations';
import type { MasteryState, RepertoireBacklogItem } from '../../domain/repertoire/types';

export function TodayPanel(props: { next: GuidedNextActivity; mastery: MasteryState[]; backlog: RepertoireBacklogItem[]; onStart: (targetKey: string) => void }) {
  const due = props.mastery.filter((item) => [item.recall, item.understanding, item.tactics].some((dimension) => dimension.status !== 'unseen' && dimension.dueAt <= new Date().toISOString())).length;
  const reliable = props.mastery.filter((item) => item.recall.status === 'reliable').length;
  return (
    <section className="dock-panel guided-today" aria-label="Today workspace">
      <p className="eyebrow">Today</p>
      <h2>One clear next action</h2>
      <article className="next-action-card">
        <span>{formatKind(props.next.kind)}</span>
        <strong>{props.next.title}</strong>
        <p>{props.next.reason}</p>
        {props.next.targetKey && <button className="primary-button" type="button" onClick={() => props.onStart(props.next.targetKey)}>Start now</button>}
      </article>
      <section className="saved-positions" aria-label="Saved positions"><h3>Saved positions</h3><p className="analysis">Gaps are saved automatically. Open one to inspect the board and analyse your next move.</p>{props.backlog.filter((item) => item.status !== 'resolved').map((item) => <button className="theory-branch-button" type="button" key={item.id} onClick={() => props.onStart(item.id)}><span>{item.title}</span><small>Open saved position →</small></button>)}{props.backlog.length === 0 && <p>No saved gaps yet.</p>}</section>
      <div className="guided-stats"><span><strong>{due}</strong> due</span><span><strong>{reliable}</strong> reliable</span><span><strong>{props.backlog.filter((item) => item.status === 'new').length}</strong> game gaps</span></div>
    </section>
  );
}

function formatKind(value: GuidedNextActivity['kind']): string { return value.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' '); }
