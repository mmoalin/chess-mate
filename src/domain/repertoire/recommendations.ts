import type { LearningUnit, MasteryState, RepertoireBacklogItem, RepertoireGraph } from './types';
import type { LessonSession } from '../../features/connected/types';
import { hasCheckpoint } from '../../features/connected/session';

export type GuidedNextActivity =
  | { kind: 'connected-lesson'; targetKey: string; title: string; reason: string }
  | { kind: 'review'; targetKey: string; title: string; reason: string }
  | { kind: 'concept-drill'; targetKey: string; title: string; reason: string }
  | { kind: 'game-gap'; targetKey: string; title: string; reason: string }
  | { kind: 'learning-unit'; targetKey: string; title: string; reason: string }
  | { kind: 'tactic'; targetKey: string; title: string; reason: string }
  | { kind: 'complete'; targetKey: ''; title: string; reason: string };

export function recommendGuidedNextActivity(input: {
  graph: RepertoireGraph;
  selectedOpeningKeys: string[];
  mastery: MasteryState[];
  backlog: RepertoireBacklogItem[];
  now: string;
  lessonSessions?: LessonSession[];
}): GuidedNextActivity {
  const lessons = Object.values(input.graph.connectedLessons ?? {}).filter((lesson) => input.selectedOpeningKeys.includes(lesson.openingFamilyKey));
  const sessions = input.lessonSessions ?? [];
  const unfinished = sessions.filter((s) => !s.completedAt && !s.supersededAt && lessons.some((l) => l.key === s.lessonKey)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (unfinished) return { kind: 'connected-lesson', targetKey: 'session:' + unfinished.id, title: 'Continue ' + lessons.find((l) => l.key === unfinished.lessonKey)!.title, reason: 'Resume your saved lesson at the same position and checkpoint.' };
  const continuing = sessions.filter((session) => !session.supersededAt && !session.reviewCheckpointId && session.continuation && !session.continuation.finished && lessons.some((lesson) => lesson.key === session.lessonKey && lesson.continuation?.id === session.continuation?.journeyId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (continuing) return { kind: 'connected-lesson', targetKey: continuing.lessonKey + '/continuation', title: 'Continue the Caro-Kann journey', reason: 'Resume your saved continuation from the main line into the ending.' };
  const dueLesson = input.mastery.flatMap((state) => [state.recall, state.understanding, state.tactics].map((dimension) => ({ state, dimension })))
    .filter(({ state, dimension }) => lessons.some((lesson) => state.itemKey.startsWith(lesson.key + '/') && hasCheckpoint(lesson, state.itemKey.slice(lesson.key.length + 1))) && dimension.status !== 'unseen' && dimension.dueAt <= input.now)
    .sort((a, b) => a.dimension.dueAt.localeCompare(b.dimension.dueAt))[0];
  if (dueLesson) return { kind: 'connected-lesson', targetKey: dueLesson.state.itemKey, title: 'Review a lesson decision', reason: 'Revisit this exact checkpoint with its opening context.' };
  const unstarted = lessons.find((lesson) => !sessions.some((s) => s.lessonKey === lesson.key && s.completedAt && !s.reviewCheckpointId));
  if (unstarted) return { kind: 'connected-lesson', targetKey: unstarted.key, title: unstarted.title, reason: 'Connect the opening to a plan, linked decisions, and a different opponent reply.' };
  const due = input.mastery
    .flatMap((state) => [state.recall, state.understanding, state.tactics].map((dimension) => ({ state, dimension })))
    .filter(({ dimension }) => dimension.status !== 'unseen' && dimension.dueAt <= input.now)
    .sort((a, b) => a.dimension.dueAt.localeCompare(b.dimension.dueAt))[0];
  if (due) {
    const dueDrill = Object.values(input.graph.conceptDrills ?? {}).find((drill) => drill.key === due.state.itemKey);
    return dueDrill
      ? { kind: 'concept-drill', targetKey: dueDrill.key, title: dueDrill.title, reason: 'This opening idea is due for a decision-based review.' }
      : { kind: 'review', targetKey: due.state.itemKey, title: 'Review a weak position', reason: 'This item is due now.' };
  }

  const gap = input.backlog.find((item) => item.status === 'new');
  if (gap) return { kind: 'game-gap', targetKey: gap.id, title: gap.title, reason: 'A recent game exposed this repertoire gap.' };

  const concept = Object.values(input.graph.conceptDrills ?? {})
    .filter((drill) => input.selectedOpeningKeys.includes(drill.openingFamilyKey))
    .sort((a, b) => a.openingFamilyKey.localeCompare(b.openingFamilyKey) || a.order - b.order)
    .find((drill) => !input.mastery.some((state) => state.itemKey === drill.key && state.understanding.status === 'reliable'));
  if (concept) return { kind: 'concept-drill', targetKey: concept.key, title: concept.title, reason: 'Learn one opening idea, then apply it against two different replies.' };

  const units = Object.values(input.graph.learningUnits)
    .filter((unit) => input.selectedOpeningKeys.includes(unit.openingFamilyKey))
    .sort(compareUnits);
  const incomplete = units.find((unit) => !input.mastery.some((state) => state.itemKey === unit.key && state.recall.status === 'reliable'));
  if (incomplete) return unitActivity(incomplete);

  const motif = Object.values(input.graph.motifs).find((candidate) =>
    candidate.positionKeys.some((position) => input.selectedOpeningKeys.some((opening) => input.graph.positions[position]?.openingFamilyKeys.includes(opening)))
  );
  if (motif) return { kind: 'tactic', targetKey: motif.key, title: motif.title, reason: 'Practise a tactic linked to your repertoire.' };

  return { kind: 'complete', targetKey: '', title: 'Repertoire up to date', reason: 'No learning or review item is currently due.' };
}

function compareUnits(a: LearningUnit, b: LearningUnit): number {
  return a.openingFamilyKey.localeCompare(b.openingFamilyKey) || a.order - b.order || a.key.localeCompare(b.key);
}

function unitActivity(unit: LearningUnit): GuidedNextActivity {
  return { kind: 'learning-unit', targetKey: unit.key, title: unit.title, reason: 'Continue with the next uncovered repertoire branch.' };
}
