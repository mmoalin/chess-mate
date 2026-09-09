import type { LessonSession, ConnectedLesson } from '../connected/types';

export function LessonProgress({ sessions = [], lessons, onOpen }: { sessions?: LessonSession[]; lessons: Record<string, ConnectedLesson>; onOpen: (key: string) => void }) {
  const completed = sessions.filter((session) => session.completedAt && !session.supersededAt && !session.reviewCheckpointId);
  const latest = [...new Map(completed.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).map((s) => [s.lessonKey, s])).values()];
  if (!latest.length) return null;
  return <section className="lesson-completions" aria-label="Completed lessons"><h3>{latest.length} {latest.length === 1 ? 'lesson' : 'lessons'} completed</h3>
    <p className="analysis">Completion records your work. Reliability grows through successful spaced reviews.</p>
    {latest.map((s) => <button key={s.id} className="theory-branch-button" onClick={() => onOpen('session:' + s.id)}><span>✓ {lessons[s.lessonKey]?.title ?? 'Opening lesson'}</span><small>Completed {new Date(s.completedAt!).toLocaleDateString()} · View results →</small></button>)}
  </section>;
}
