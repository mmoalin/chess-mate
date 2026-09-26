import type { DailySession, MasteryState, RepertoireGraph } from '../../domain/repertoire/types';
import { hasCheckpoint } from './session';

/** Redirect only explicitly retired content; never infer a replacement by position. */
export function replacementTarget(graph: RepertoireGraph, key: string): string {
  if (graph.conceptDrills[key]) return key;
  const drill = Object.values(graph.conceptDrills).find(item => item.replaces?.includes(key));
  if (drill) return drill.key;
  for (const lesson of Object.values(graph.connectedLessons ?? {})) {
    if (!key.startsWith(lesson.key + '/')) continue;
    const checkpoint = key.slice(lesson.key.length + 1);
    const replacement = lesson.replacesCheckpoints?.[checkpoint];
    if (!hasCheckpoint(lesson, checkpoint) && replacement && hasCheckpoint(lesson, replacement)) return lesson.key + '/' + replacement;
  }
  return key;
}

/** Scheduling reads a projection. Historical attempts and mastery are never rewritten. */
export function currentReviewMastery(graph: RepertoireGraph, mastery: MasteryState[]): MasteryState[] {
  return mastery.flatMap(state => {
    const key = replacementTarget(graph, state.itemKey);
    if (key === state.itemKey) return [state];
    if (mastery.some(current => current.itemKey === key)) return [];
    return [{ ...state, itemKey: key, recall: fresh(state.recall), understanding: fresh(state.understanding), tactics: fresh(state.tactics) }];
  });
}
function fresh(progress: MasteryState['understanding']): MasteryState['understanding'] {
  return { ...progress, score: 0, streak: 0, intervalDays: 1, status: progress.status === 'unseen' ? 'unseen' : 'learning', lastReviewedAt: undefined };
}

export function updateRetiredDailyTargets(graph: RepertoireGraph, session: DailySession): DailySession {
  let changed = false;
  const targets = session.targets.map((target, index) => {
    if (index < session.currentIndex || session.outcomes.some(outcome => outcome.targetId === target.id)) return target;
    const contentKey = replacementTarget(graph, target.contentKey);
    if (contentKey === target.contentKey) return target;
    changed = true;
    const lesson = Object.values(graph.connectedLessons ?? {}).find(item => contentKey.startsWith(item.key + '/'));
    const drill = graph.conceptDrills[contentKey];
    return { ...target, contentKey, attemptId: crypto.randomUUID(), lessonCheckpointId: lesson ? contentKey.slice(lesson.key.length + 1) : undefined, contentVersion: lesson?.version ?? graph.release.version, title: lesson?.title ?? drill?.title ?? target.title, reason: 'Updated content: practise the corrected decision afresh. Earlier answers remain in your history.' };
  });
  return changed ? { ...session, targets } : session;
}
