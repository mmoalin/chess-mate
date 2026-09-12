import { LessonProgress } from './LessonProgress';
import type { LessonSession, ConnectedLesson } from '../connected/types';
import type { DailyDuration, DailySession, LearnerProfile, MasteryDimension, MasteryState, OpeningFamily, RepertoireBacklogItem } from '../../domain/repertoire/types';

export function TodayPanel(props: {
  sessions?: LessonSession[]; lessons?: Record<string, ConnectedLesson>; dailySession: DailySession | null; preview: DailySession;
  profile: LearnerProfile; openings: OpeningFamily[]; selectedOpeningKeys: string[]; mastery: MasteryState[]; backlog: RepertoireBacklogItem[];
  onStart: (targetKey: string) => void; onStartSession: () => void; onContinueSession: () => void; onDuration: (duration: DailyDuration) => void;
  onPreferences: (profile: LearnerProfile, openingKeys: string[]) => void;
}) {
  const now = new Date();
  const due = props.mastery.filter((item) => dimensions.some((dimension) => item[dimension].status !== 'unseen' && item[dimension].dueAt <= now.toISOString())).length;
  const active = props.dailySession?.status === 'active';
  const completed = props.dailySession?.status === 'completed';
  const recent = props.mastery.flatMap((item) => dimensions.map((dimension) => item[dimension].lastReviewedAt)).filter((date): date is string => Boolean(date && new Date(date).getTime() >= now.getTime() - 7 * 86400000));
  return <section className="dock-panel guided-today" aria-label="Today workspace">
    <p className="eyebrow">Today</p>
    <div className="today-heading"><div><h2>{completed ? 'Daily session complete' : active ? 'Continue your daily session' : 'Your guided practice'}</h2><p className="analysis">Review what is due, learn one useful idea, apply it, then stop with a clear recap.</p></div><span className="time-badge">About {(active || completed ? props.dailySession! : props.preview).targets.reduce((sum, target) => sum + target.estimatedMinutes, 0)} min</span></div>
    {completed && props.dailySession ? <Recap session={props.dailySession} mastery={props.mastery} /> : <>
      <div className="duration-picker" role="group" aria-label="Daily session length">{([5, 10, 20] as DailyDuration[]).map((minutes) => <button type="button" className={(props.profile.dailyDurationMinutes ?? 10) === minutes ? 'selected' : ''} key={minutes} onClick={() => props.onDuration(minutes)} disabled={active}>{minutes} min</button>)}</div>
      <ol className="session-preview" aria-label="Daily activity preview">{(active ? props.dailySession! : props.preview).targets.map((target, index) => <li key={target.id} className={(active ? props.dailySession!.currentIndex : 0) === index && active ? 'current' : ''}><span>{target.phase}</span><div><strong>{target.title}</strong><small>{target.reason} · about {target.estimatedMinutes} min</small></div></li>)}</ol>
      <button className="primary-button session-start" type="button" onClick={active ? props.onContinueSession : props.onStartSession}>{active ? 'Continue session' : 'Start session'}</button>
    </>}
    <section className="progress-story" aria-label="Learning progress"><div><strong>{recent.length}</strong><span>answers practised in 7 days</span></div>{dimensions.map((dimension) => { const items = props.mastery.filter((item) => item[dimension].status !== 'unseen'); const reliable = items.filter((item) => item[dimension].status === 'reliable').length; return <div key={dimension}><strong>{reliable}/{items.length}</strong><span>{labelDimension(dimension)}</span></div>; })}</section>
    <p className="analysis reliability-note"><strong>Reliable recall</strong> means you answered successfully across spaced reviews. Completing a lesson records the work; later recall makes it reliable. {due} item{due === 1 ? '' : 's'} currently due.</p>
    <LessonProgress sessions={props.sessions} lessons={props.lessons ?? {}} onOpen={props.onStart} />
    <section className="saved-positions" aria-label="Saved positions"><h3>Saved positions</h3>{props.backlog.filter((item) => item.status !== 'resolved').map((item) => <button className="theory-branch-button" type="button" key={item.id} onClick={() => props.onStart(item.id)}><span>{item.title}</span><small>Open saved position →</small></button>)}{props.backlog.every((item) => item.status === 'resolved') && <p>No positions awaiting review.</p>}</section>
    <details className="training-preferences"><summary>Training preferences</summary><Preferences {...props} /></details>
    <details className="reviewed-positions"><summary>Reviewed positions ({props.backlog.filter((item) => item.status === 'resolved').length})</summary>{props.backlog.filter((item) => item.status === 'resolved').map((item) => <button className="theory-branch-button" key={item.id} onClick={() => props.onStart(item.id)}>{item.title} · Open</button>)}</details>
  </section>;
}

function Recap({ session, mastery }: { session: DailySession; mastery: MasteryState[] }) {
  const completed = session.outcomes.filter((item) => item.status === 'completed');
  const correct = completed.reduce((sum, item) => sum + item.correct, 0); const total = completed.reduce((sum, item) => sum + item.total, 0);
  const nextDue = mastery.flatMap((item) => dimensions.map((dimension) => item[dimension])).filter((item) => item.status !== 'unseen').sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0]?.dueAt;
  return <article className="daily-recap"><div className="recap-mark">✓</div><h3>Nice work. You can stop here.</h3><p>{completed.length} activities completed · {session.outcomes.filter((item) => item.status === 'partial').length} partially practised · {session.outcomes.filter((item) => item.status === 'skipped').length} skipped{total ? ` · ${correct}/${total} answers correct (including assisted)` : ''} · {completed.reduce((sum, item) => sum + item.assistanceUsed, 0)} used assistance.</p>{completed.find((item) => item.takeaway)?.takeaway && <p><strong>Takeaway:</strong> {completed.find((item) => item.takeaway)!.takeaway}</p>}<p className="analysis">{nextDue ? `Next review: ${new Date(nextDue).toLocaleDateString()}.` : 'No review is scheduled yet.'}</p></article>;
}

function Preferences(props: Parameters<typeof TodayPanel>[0]) {
  const updateProfile = (change: Partial<LearnerProfile>) => props.onPreferences({ ...props.profile, ...change, updatedAt: new Date().toISOString() }, props.selectedOpeningKeys);
  const toggleOpening = (key: string, checked: boolean) => props.onPreferences({ ...props.profile, updatedAt: new Date().toISOString() }, checked ? [...new Set([...props.selectedOpeningKeys, key])] : props.selectedOpeningKeys.filter((item) => item !== key));
  return <div className="preferences-grid"><label className="field-label">Training goal<select value={props.profile.goal} onChange={(event) => updateProfile({ goal: event.target.value as LearnerProfile['goal'] })}><option value="basic-plans">Learn basic plans</option><option value="tactical-danger">Become tactically dangerous</option><option value="sharp-gambits">Learn sharper lines</option><option value="deep-repertoire">Build a deeper repertoire</option></select></label><label className="field-label">Depth<select value={props.profile.depth} onChange={(event) => updateProfile({ depth: event.target.value as LearnerProfile['depth'] })}><option value="foundation">Foundation</option><option value="standard">Standard</option><option value="deep">Deep</option></select></label><fieldset><legend>My openings</legend>{props.openings.map((opening) => <label className="preference-check" key={opening.key}><input type="checkbox" checked={props.selectedOpeningKeys.includes(opening.key)} onChange={(event) => toggleOpening(opening.key, event.target.checked)} disabled={props.selectedOpeningKeys.length === 1 && props.selectedOpeningKeys.includes(opening.key)} />{opening.name}</label>)}<p className="analysis">Black vs 1.d4 coverage is planned for a future content phase.</p></fieldset></div>;
}
const dimensions: MasteryDimension[] = ['recall', 'understanding', 'tactics'];
function labelDimension(value: MasteryDimension) { return value === 'recall' ? 'reliable recall' : value === 'understanding' ? 'reliable plans' : 'reliable tactics'; }
