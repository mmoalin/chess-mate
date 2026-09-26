import { FULL_LESSON_MINUTES, CHECKPOINT_MINUTES, PLAN_LAB_MINUTES } from '../../features/connected/learningPresentation';
import type { LessonSession } from '../../features/connected/types';
import { starterCurriculumModules } from '../../features/curriculum/curriculum';
import type { ActivityOutcome, ActivityTarget, DailyDuration, DailySession, LearnerProfile, MasteryDimension, MasteryState, RepertoireBacklogItem, RepertoireGraph } from './types';
import { hasCheckpoint } from '../../features/connected/session';
import { CONTINUATION_MINUTES, continuationKey } from '../../features/connected/continuationJourney';
import { nextCourseContinuation, orderedLessons } from '../../features/connected/course';
import { currentReviewMastery } from '../../features/connected/contentRevisions';

const budgets: Record<DailyDuration, [number, number, number]> = { 5: [3, 3, 5], 10: [3, 3, 5], 20: [3, 12, 5] };
type PlannedTarget = Omit<ActivityTarget, 'attemptId'>;

export function buildDailySession(input: {
  learnerId: string; durationMinutes: DailyDuration; graph: RepertoireGraph; selectedOpeningKeys: string[];
  mastery: MasteryState[]; backlog: RepertoireBacklogItem[]; lessonSessions: LessonSession[]; profile?: LearnerProfile | null; now: string;
}): DailySession {
  const [reviewMinutes, learnMinutes, applyMinutes] = budgets[input.durationMinutes];
  input = { ...input, mastery: currentReviewMastery(input.graph, input.mastery) };
  const targets: PlannedTarget[] = [];
  const due = input.mastery.flatMap((state) => (['recall', 'understanding', 'tactics'] as MasteryDimension[]).map((dimension) => ({ state, dimension, progress: state[dimension] })))
    .filter(({ progress }) => progress.status !== 'unseen' && progress.dueAt <= input.now)
    .sort((a, b) => a.progress.dueAt.localeCompare(b.progress.dueAt));
  const dueTarget = due.map(({ state, dimension }) => targetForMastery(input.graph, state, dimension, reviewMinutes)).find(Boolean);
  const gap = input.backlog.filter((item) => item.status !== 'resolved').sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (dueTarget) targets.push(dueTarget);
  else if (gap) targets.push({ id: `daily:gap:${gap.id}`, kind: 'saved-position', phase: 'review', contentKey: gap.id, title: gap.title, reason: 'Review a position saved from one of your games.', estimatedMinutes: reviewMinutes, contentVersion: input.graph.release.version, openingFamilyKey: gap.openingFamilyKey, positionKey: gap.positionKey });

  const lessons = orderedLessons(input.graph, input.selectedOpeningKeys);
  const unfinished = input.lessonSessions.filter((session) => !session.completedAt && !session.supersededAt && lessons.some((lesson) => lesson.key === session.lessonKey)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const unstarted = lessons.find((lesson) => !input.lessonSessions.some((session) => session.lessonKey === lesson.key && session.completedAt && !session.reviewCheckpointId));
  const availableContinuation = nextCourseContinuation(lessons, input.lessonSessions, input.mastery);
  const lesson = unfinished ? lessons.find((item) => item.key === unfinished.lessonKey) : availableContinuation ? undefined : unstarted;
  const focused = lesson && !unfinished && input.durationMinutes < 20;
  const focusCheckpoint = lesson ? [...lesson.questions.map((q) => q.id), ...Object.keys(lesson.decisions)].find((id) => !input.mastery.some((m) => m.itemKey === lesson.key + '/' + id && (m.understanding.status !== 'unseen' || m.tactics.status !== 'unseen'))) ?? lesson.mainStartId : '';
  const continuingStep = unfinished?.continuation?.active && !unfinished.continuation.finished && lesson?.continuation?.id === unfinished.continuation.journeyId ? lesson.continuation.steps[unfinished.continuation.step] : undefined;
  if (lesson) targets.push({ id: `daily:learn:${unfinished ? 'session:' + unfinished.id : lesson.key}`, kind: 'connected-lesson', phase: 'learn', contentKey: unfinished ? 'session:' + unfinished.id : focused ? lesson.key + '/' + focusCheckpoint : lesson.key, lessonCheckpointId: continuingStep ? continuationKey(continuingStep.id) : undefined, title: continuingStep?.title ?? (unfinished ? `Continue ${lesson.title}` : focused ? `${lesson.title} · one checkpoint` : lesson.title), reason: continuingStep ? 'Resume this two-minute decision with your saved candidate and reply.' : focused ? 'One focused decision; the full lesson remains available in Repertoire.' : 'Connect opening moves to a practical middlegame plan.', estimatedMinutes: continuingStep || unfinished?.reviewCheckpointId?.startsWith('continuation:') ? CONTINUATION_MINUTES : focused || unfinished?.reviewCheckpointId ? CHECKPOINT_MINUTES : FULL_LESSON_MINUTES, contentVersion: lesson.version, openingFamilyKey: lesson.openingFamilyKey, learnerSide: lesson.side });
  else {
    const continuation = availableContinuation;
    if (continuation) targets.push({ id: `daily:learn:${continuation.lesson.key}/${continuationKey(continuation.step.id)}`, kind: 'connected-lesson', phase: 'learn', contentKey: continuation.lesson.key + '/' + continuationKey(continuation.step.id), title: continuation.step.title, reason: `Follow ${continuation.lesson.title} through one decision toward the ending.`, estimatedMinutes: CONTINUATION_MINUTES, contentVersion: continuation.lesson.version, openingFamilyKey: continuation.lesson.openingFamilyKey, learnerSide: continuation.lesson.side, dimension: 'understanding' });
    else {
      const unit = preferredUnits(input).find((item) => !input.mastery.some((state) => state.itemKey === item.key && state.recall.status === 'reliable'));
      if (unit) targets.push({ id: `daily:learn:${unit.key}`, kind: 'opening-unit', phase: 'learn', contentKey: unit.key, title: unit.title, reason: 'Recall the next short section of your repertoire.', estimatedMinutes: learnMinutes, contentVersion: input.graph.release.version, openingFamilyKey: unit.openingFamilyKey, positionKey: unit.startPositionKey, learnerSide: input.graph.openings[unit.openingFamilyKey]?.side, dimension: 'recall' });
    }
  }

  const focusOpening = targets.find((target) => target.openingFamilyKey)?.openingFamilyKey ?? input.selectedOpeningKeys[0];
  const concepts = Object.values(input.graph.conceptDrills ?? {}).filter((drill) => drill.openingFamilyKey === focusOpening && depthRank(drill.depth) <= depthRank(input.profile?.depth ?? 'foundation')).sort((a, b) => depthRank(b.depth) - depthRank(a.depth));
  const concept = orderConcepts(concepts, input.profile?.goal).find((drill) => !targets.some((target) => target.contentKey === drill.key));
  if (concept) targets.push({ id: `daily:apply:${concept.key}`, kind: 'concept-drill', phase: 'apply', contentKey: concept.key, title: concept.title, reason: 'Apply the same opening idea against a different reply.', estimatedMinutes: applyMinutes, contentVersion: input.graph.release.version, openingFamilyKey: concept.openingFamilyKey, learnerSide: input.graph.openings[concept.openingFamilyKey]?.side, dimension: 'understanding' });
  else {
    const study = starterCurriculumModules.flatMap((module) => module.tasks).find((task) => !input.mastery.some((state) => state.itemKey === `study:${task.id}` && state.understanding.status === 'reliable'));
    if (study) targets.push({ id: `daily:apply:study:${study.id}`, kind: 'study', phase: 'apply', contentKey: `study:${study.id}`, title: study.title, reason: 'Finish with one transferable chess decision.', estimatedMinutes: applyMinutes, contentVersion: input.graph.release.version, dimension: 'understanding' });
  }

  const now = input.now;
  let remaining = input.durationMinutes;
  const fitted = targets.filter((target) => { if (target.estimatedMinutes > remaining) return false; remaining -= target.estimatedMinutes; return true; });
  // An unfinished full lesson remains accessible even when the selected budget is short.
  if (!fitted.length && targets.length) fitted.push(targets[0]);
  const stableTargets = fitted.map((target) => ({ ...target, attemptId: crypto.randomUUID() }));
  return { id: crypto.randomUUID(), learnerId: input.learnerId, durationMinutes: input.durationMinutes, contentVersion: input.graph.release.version, targets: stableTargets, outcomes: [], currentIndex: 0, status: stableTargets.length ? 'active' : 'completed', createdAt: now, updatedAt: now, completedAt: stableTargets.length ? undefined : now };
}

export function finishDailyActivity(session: DailySession, outcome: Omit<ActivityOutcome, 'targetId' | 'completedAt'>, now: string): DailySession {
  const target = session.targets[session.currentIndex];
  if (!target || session.outcomes.some((item) => item.targetId === target.id)) return session;
  const outcomes = [...session.outcomes, { ...outcome, targetId: target.id, completedAt: now }];
  const currentIndex = session.currentIndex + 1;
  const completed = currentIndex >= session.targets.length;
  return { ...session, outcomes, currentIndex, status: completed ? 'completed' : 'active', completedAt: completed ? now : undefined, updatedAt: now };
}

export function currentDailyTarget(session: DailySession | null): ActivityTarget | null { return session?.status === 'active' ? session.targets[session.currentIndex] ?? null : null; }

function targetForMastery(graph: RepertoireGraph, state: MasteryState, dimension: MasteryDimension, minutes: number): PlannedTarget | null {
  const lesson = Object.values(graph.connectedLessons ?? {}).find((item) => state.itemKey.startsWith(item.key + '/') && hasCheckpoint(item, state.itemKey.slice(item.key.length + 1)));
  if (lesson) return { id: `daily:review:${state.itemKey}:${dimension}`, kind: 'connected-lesson', phase: 'review', contentKey: state.itemKey, title: `Review: ${lesson.title}`, reason: 'This exact lesson decision is due.', estimatedMinutes: state.itemKey.startsWith(lesson.key + '/continuation:') ? CONTINUATION_MINUTES : minutes, contentVersion: lesson.version, openingFamilyKey: lesson.openingFamilyKey, positionKey: state.positionKey, learnerSide: lesson.side, dimension };
  const concept = graph.conceptDrills?.[state.itemKey];
  if (concept) return { id: `daily:review:${state.itemKey}:${dimension}`, kind: 'concept-drill', phase: 'review', contentKey: concept.key, title: `Review: ${concept.title}`, reason: 'This plan is due for active recall.', estimatedMinutes: PLAN_LAB_MINUTES, contentVersion: graph.release.version, openingFamilyKey: concept.openingFamilyKey, positionKey: state.positionKey, learnerSide: graph.openings[concept.openingFamilyKey]?.side, dimension };
  const unit = graph.learningUnits[state.itemKey] ?? Object.values(graph.learningUnits).find((item) => state.itemKey === `legacy-unit:${item.lineKey}:${item.order}`);
  if (unit) return { id: `daily:review:${unit.key}:${dimension}`, kind: 'opening-unit', phase: 'review', contentKey: unit.key, title: `Review: ${unit.title}`, reason: 'Recall this exact section from its starting position.', estimatedMinutes: minutes, contentVersion: graph.release.version, openingFamilyKey: unit.openingFamilyKey, positionKey: unit.startPositionKey, learnerSide: graph.openings[unit.openingFamilyKey]?.side, dimension };
  if (state.itemKey.startsWith('study:')) return { id: `daily:review:${state.itemKey}:${dimension}`, kind: 'study', phase: 'review', contentKey: state.itemKey, title: 'Review a Study decision', reason: 'This transferable idea is due.', estimatedMinutes: minutes, contentVersion: graph.release.version, positionKey: state.positionKey, dimension };
  const motif = graph.motifs[state.itemKey];
  if (motif) return { id: `daily:review:${state.itemKey}:${dimension}`, kind: 'tactic', phase: 'review', contentKey: motif.key, title: `Review: ${motif.title}`, reason: 'This tactical pattern is due.', estimatedMinutes: minutes, contentVersion: graph.release.version, positionKey: state.positionKey, dimension };
  return null;
}

function preferredUnits(input: Parameters<typeof buildDailySession>[0]) {
  const depth = input.profile?.depth ?? 'foundation';
  return Object.values(input.graph.learningUnits).filter((unit) => input.selectedOpeningKeys.includes(unit.openingFamilyKey) && (unit.depth === depth || unit.depth === 'standard')).sort((a, b) => a.openingFamilyKey.localeCompare(b.openingFamilyKey) || a.order - b.order);
}
function depthRank(depth: 'foundation' | 'standard' | 'deep') { return { foundation: 0, standard: 1, deep: 2 }[depth]; }
function orderConcepts<T extends { themes: string[] }>(items: T[], goal?: LearnerProfile['goal']) { const preferred = goal === 'tactical-danger' || goal === 'sharp-gambits' ? ['calculation', 'initiative'] : goal === 'basic-plans' ? ['development', 'king-safety'] : []; return [...items].sort((a, b) => Number(preferred.some((tag) => b.themes.includes(tag))) - Number(preferred.some((tag) => a.themes.includes(tag)))); }
