import type { DailySession } from '../../domain/repertoire/types';
import { currentDailyTarget } from '../../domain/repertoire/dailySessions';

export function DailySessionBar({ session, onComplete, onSkip, onSave }: { session: DailySession; onComplete: () => void; onSkip: () => void; onSave: () => void }) {
  const target = currentDailyTarget(session);
  if (!target) return null;
  return <section className="daily-session-bar" aria-label="Daily session progress">
    <div><span>{target.phase} · about {target.estimatedMinutes} min</span><strong>{session.currentIndex + 1} of {session.targets.length}: {target.title}</strong></div>
    <div className="daily-session-meter" aria-label={`${session.currentIndex} of ${session.targets.length} activities completed`}><span style={{ width: `${session.currentIndex / session.targets.length * 100}%` }} /></div>
    <div className="button-row"><button className="primary-button" onClick={onComplete}>Complete & continue</button><button className="secondary-button" onClick={onSkip}>Skip for today</button><button className="link-button" onClick={onSave}>Save & finish later</button></div>
  </section>;
}
