import { describe, expect, it } from 'vitest';
import previousData from '../../data/fixtures/pre-white-companions-release.json';
import { companionLessons, companionDrills } from '../../data/whiteCompanionCourses';
import { embeddedRepertoireGraph as graph, withStarterConcepts, GuidedContentRepository } from '../../services/guidedContentRepository';
import { GuidedBrowserStore } from '../../services/guidedStorage';
import { GuidedLearnerRepository } from '../../services/guidedLearnerRepository';
import { validateRepertoireGraph } from '../../domain/repertoire/validation';
import { createInitialMastery } from '../../domain/repertoire/training';
import { buildDailySession } from '../../domain/repertoire/dailySessions';
import type { RepertoireGraph } from '../../domain/repertoire/types';
import { createLessonSession, positionAfter, validateConnectedLesson } from './session';
import { advanceContinuation, continuationBoard, openContinuation, submitContinuation } from './continuationJourney';
import { lessonForPosition, mainCourseLesson } from './course';
import { addCompanions, companionKeys, whiteCoverageGroups } from './coverage';
import { currentReviewMastery, replacementTarget, updateRetiredDailyTargets } from './contentRevisions';
import { bundledUpgradeDiagnostics } from '../../services/bundledCourseUpgrades';
const previous = previousData as unknown as RepertoireGraph;
const now = '2026-09-25T12:00:00Z';

describe('White companion release', () => {
  it('ships complete legal chapters, two contrasting scenarios and continuous journeys', () => {
    expect(validateRepertoireGraph(graph)).toEqual([]);
    expect(companionLessons).toHaveLength(12); expect(companionDrills).toHaveLength(15);
    for (const lesson of companionLessons) {
      expect(validateConnectedLesson(lesson)).toEqual([]);
      expect(positionAfter(lesson.openingMoves).turn()).toBe('w');
      expect(lesson.questions).toHaveLength(2);
      expect(Object.keys(lesson.decisions).filter(id => !id.startsWith('transfer-'))).toHaveLength(4);
      expect(Object.keys(lesson.decisions).filter(id => id.startsWith('transfer-'))).toHaveLength(2);
      expect(companionDrills.find(drill => drill.title.startsWith(lesson.title))?.scenarios).toHaveLength(2);
    }
    for (const key of companionKeys) {
      const lesson = mainCourseLesson(graph, key)!;
      expect(lesson.continuation!.steps).toHaveLength(6);
      const ending = continuationBoard(lesson.continuation!, 5, true);
      expect(ending.board().flat().some(piece => piece?.type === 'q')).toBe(false);
      expect(ending.board().flat().some(piece => piece?.type === 'r')).toBe(true);
    }
  });

  for (const family of companionKeys) it(`persists first answers and reopens all six exact journey checkpoints for ${family}`, async () => {
    const lesson = mainCourseLesson(graph, family)!; const journey = lesson.continuation!;
    const repository = new GuidedLearnerRepository(null);
    let session = openContinuation(createLessonSession(lesson, 'local', 'repertoire'), journey);
    for (const [index, step] of journey.steps.entries()) {
      session.continuation = { ...session.continuation!, started: true, candidate: step.main[0].san, choice: step.candidates[0].reasonIds[0], prediction: step.main[1].san };
      session = submitContinuation(session, journey);
      expect(session.answers['continuation:' + step.id].correct).toBe(true);
      await repository.saveLessonSession(session);
      session = (await repository.loadLessonSessions('local')).find(saved => saved.id === session.id)!;
      expect(session.continuation!.firstResults[step.id].move.status).toBe('correct');
      const checkpoint = createLessonSession(lesson, 'local', 'today', 'continuation:' + step.id);
      expect(checkpoint.continuation!.step).toBe(index);
      session = advanceContinuation(session, journey);
    }
    expect(session.continuation!.finished).toBe(true);
    const completed = createLessonSession(lesson, 'local', 'today'); completed.completedAt = now;
    const daily = buildDailySession({ learnerId: 'local', durationMinutes: 5, graph, selectedOpeningKeys: [family], lessonSessions: [completed], mastery: [], backlog: [], now });
    expect(daily.targets[0].contentKey).toBe(lesson.key + '/continuation:' + journey.steps[0].id);
    expect(daily.targets[0].estimatedMinutes).toBe(2);
  });

  it('resolves the Sicilian/French transposition without duplicating lessons or Black progress', () => {
    const key = mainCourseLesson(graph, 'white-sicilian-alapin')!.course!.coverage!.routes.find(route => route.key === 'french-transposition')!.lessonKeys[0];
    const pgn = '1.e4 c5 2.c3 e6 3.d4 d5 4.e5 Nc6 5.Nf3 Qb6';
    expect(lessonForPosition(graph, { pgn, familyKey: 'white-french-advance', side: 'white' })?.key).toBe(key);
    expect(lessonForPosition(graph, { pgn, familyKey: 'white-french-advance', side: 'black' })).toBeUndefined();
    expect(companionDrills.find(drill => drill.key === 'concept:white-sicilian-alapin:recognition')!.relatedLessons![0].lessonKey).toBe(key);
  });

  it('derives availability from active metadata and rejects false coverage declarations', () => {
    const active = structuredClone(graph); const main = mainCourseLesson(active, companionKeys[0])!;
    delete main.course!.coverage;
    expect(whiteCoverageGroups(active).find(group => group.reply === 'c5')!.courses).toHaveLength(0);
    main.course!.coverage = structuredClone(mainCourseLesson(graph, companionKeys[0])!.course!.coverage!);
    main.course!.coverage.routes[0].lessonKeys = ['lesson:caro-active'];
    expect(validateRepertoireGraph(active).some(issue => issue.code === 'course-coverage-invalid')).toBe(true);
    expect(addCompanions(['white-vienna-main', companionKeys[0]], companionKeys)).toEqual(['white-vienna-main', ...companionKeys]);
  });

  it('atomically upgrades a previous cache, installs French dependencies and preserves unrelated teaching', async () => {
    const store = new GuidedBrowserStore(); const before = structuredClone(previous); before.release.id = 'remote-draft-identity';
    await store.put('content:published', before);
    const upgraded = await new GuidedContentRepository(null, store).loadPublished();
    expect(upgraded.release).toEqual(before.release);
    expect(validateRepertoireGraph(upgraded)).toEqual([]);
    expect(withStarterConcepts(upgraded)).toEqual(upgraded);
    for (const key of companionKeys) expect(mainCourseLesson(upgraded, key)).toBeDefined();
    expect(upgraded.conceptDrills['concept:caro-resolve-centre']).toBeUndefined();
    expect(upgraded.connectedLessons!['lesson:caro-active'].version).toBe(2);
    for (const [key, lesson] of Object.entries(before.connectedLessons!)) if (key !== 'lesson:caro-active') {
      expect(upgraded.connectedLessons![key].decisions).toEqual(lesson.decisions);
      expect(upgraded.connectedLessons![key].continuation).toEqual(lesson.continuation);
    }
  });

  it('preserves custom Caro content and reports the correction conflict', () => {
    const before = structuredClone(previous);
    before.connectedLessons!['lesson:caro-active'].continuation!.title = 'My own ending';
    before.conceptDrills['concept:caro-resolve-centre'].summary = 'Editor-owned drill';
    const after = withStarterConcepts(before);
    expect(after.connectedLessons!['lesson:caro-active'].continuation!.title).toBe('My own ending');
    expect(after.conceptDrills['concept:caro-resolve-centre'].summary).toBe('Editor-owned drill');
    expect(after.conceptDrills['concept:caro-resolve-centre-v2']).toBeUndefined();
    expect(bundledUpgradeDiagnostics(after).some(note => note.includes('correction'))).toBe(true);
    expect(mainCourseLesson(after, companionKeys[0])).toBeDefined();
  });

  it('keeps historic Caro mastery but schedules replacement checkpoints without inherited credit', () => {
    const lesson = graph.connectedLessons!['lesson:caro-active']; const oldKey = lesson.key + '/continuation:blockade';
    const key = replacementTarget(graph, oldKey);
    expect(key).toBe(lesson.key + '/continuation:v2-counterplay');
    const old = createInitialMastery({ learnerId: 'local', itemKey: oldKey, positionKey: 'old', now });
    old.understanding = { ...old.understanding, score: 95, streak: 6, status: 'reliable', dueAt: now };
    const projected = currentReviewMastery(graph, [old]);
    expect(projected[0].understanding).toMatchObject({ score: 0, streak: 0 });
    expect(old.understanding.score).toBe(95);
    const session = createLessonSession(lesson, 'local', 'today', key.slice(lesson.key.length + 1));
    expect(session.answers).toEqual({});
    const daily = buildDailySession({ learnerId: 'local', durationMinutes: 5, graph, selectedOpeningKeys: ['black-caro-kann-main'], lessonSessions: [], mastery: [old], backlog: [], now });
    expect(daily.targets[0].contentKey).toBe(key);
    const stale = structuredClone(daily); stale.targets[0].contentKey = oldKey;
    expect(updateRetiredDailyTargets(graph, stale).targets[0].contentKey).toBe(key);
    expect(stale.targets[0].contentKey).toBe(oldKey);
    const fresh = createInitialMastery({ learnerId: 'local', itemKey: key, positionKey: 'new', now });
    expect(currentReviewMastery(graph, [old, fresh])).toEqual([fresh]);
    expect(replacementTarget(graph, 'concept:caro-resolve-centre')).toBe('concept:caro-resolve-centre-v2');
  });
});
