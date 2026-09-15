import type { DailySession } from '../../domain/repertoire/types';
import { currentDailyTarget } from '../../domain/repertoire/dailySessions';

export function DailySessionBar({ session, canComplete = false, active = true, onResume, onComplete, onSkip, onSave }: { session: DailySession; canComplete?: boolean; active?: boolean; onResume?: () => void; onComplete: () => void; onSkip: () => void; onSave: () => void }) {
  const target = currentDailyTarget(session);
  if (!target) return null;
  if (!active) return <section className="daily-session-bar daily-session-paused" aria-label="Daily session saved"><div><span>Daily session saved</span><strong>{target.title}</strong></div><div className="button-row"><button className="secondary-button" onClick={onResume}>Return to daily activity</button><button className="link-button" onClick={onSave}>View Today</button></div></section>;
  return <section className="daily-session-bar" aria-label="Daily session progress">
    <div><span>{target.phase} · about {target.estimatedMinutes} min</span><strong>{session.currentIndex + 1} of {session.targets.length}: {target.title}</strong></div>
    <div className="daily-session-meter" aria-label={`${session.currentIndex} of ${session.targets.length} activities finished or skipped`}><span style={{ width: `${session.currentIndex / session.targets.length * 100}%` }} /></div>
    <div className="button-row"><button className="primary-button" disabled={!canComplete} aria-describedby={!canComplete ? 'daily-completion-help' : undefined} onClick={onComplete}>Complete & continue</button><details key={target.id} className="daily-session-options"><summary>Session options</summary><div className="button-row"><button className="secondary-button" onClick={onSkip}>Skip for today</button><button className="link-button" onClick={onSave}>Save & finish later</button></div>{!canComplete && <small id="daily-completion-help">Finish this activity’s checkpoints to continue. You can save or skip at any time.</small>}</details></div>
  </section>;
}
