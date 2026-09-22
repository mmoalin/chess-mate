import legacyEmbeddedRepertoireGraphFixture from '../../data/fixtures/legacy-release.json';
const legacyEmbeddedRepertoireGraph = legacyEmbeddedRepertoireGraphFixture as unknown as import('../../domain/repertoire/types').RepertoireGraph;
import { describe, expect, it } from 'vitest';
import { starterConnectedLessons } from '../../data/connectedLessons';
import { whiteCourseLessons, whiteCourseDrills, whiteCourseLines } from '../../data/whiteOpeningCourses';
import { boardAfter } from '../../data/courseBuilder';
import { embeddedRepertoireGraph, withStarterConcepts } from '../../services/guidedContentRepository';
import { validateRepertoireGraph } from '../../domain/repertoire/validation';
import { buildPositionKey } from '../../domain/repertoire/positionKey';
import { buildDailySession } from '../../domain/repertoire/dailySessions';
import { recommendGuidedNextActivity } from '../../domain/repertoire/recommendations';
import { createInitialMastery } from '../../domain/repertoire/training';
import { GuidedLearnerRepository } from '../../services/guidedLearnerRepository';
import { createLessonSession, validateConnectedLesson } from './session';
import { advanceContinuation, continuationBoard, continuationMoves, openContinuation, submitContinuation } from './continuationJourney';
import { lessonForPosition, nextCourseContinuation, orderedLessons } from './course';

const queen = starterConnectedLessons.find((lesson) => lesson.key === 'lesson:queens-gambit-qgd')!;
const vienna = starterConnectedLessons[0];
const now = '2026-09-19T10:00:00.000Z';

describe('complete White opening courses', () => {
  it('ships all eleven core White chapters with source lines, explanations and contrasting drills', () => {
    expect(validateRepertoireGraph(embeddedRepertoireGraph)).toEqual([]);
    expect(orderedLessons(embeddedRepertoireGraph, ['white-vienna-main'])).toHaveLength(5);
    expect(orderedLessons(embeddedRepertoireGraph, ['white-queens-gambit-main'])).toHaveLength(6);
    for (const lesson of starterConnectedLessons.filter((item) => item.side === 'white')) {
      expect(validateConnectedLesson(lesson), lesson.key).toEqual([]);
      const length = (start: string) => { let id: string | null = start, count = 0; while (id) { count++; id = lesson.decisions[id].answers[0].nextId; } return count; };
      expect(length(lesson.mainStartId)).toBeGreaterThanOrEqual(4);
      expect(length(lesson.transferStartId)).toBeGreaterThanOrEqual(2);
    }
    expect(whiteCourseLines.every((line) => line.difficulty === 'beginner')).toBe(true);
    for (const [index, lesson] of whiteCourseLessons.entries()) {
      expect(lesson.structureGuide?.ending).toBeTruthy();
      expect(whiteCourseDrills[index].scenarios.length).toBeGreaterThanOrEqual(2);
      expect(Object.values(lesson.decisions).some((decision) => Object.keys(decision.mistakes).length)).toBe(true);
    }
  });

  for (const lesson of [vienna, queen]) it(`replays and persists every ${lesson.title} continuation checkpoint`, async () => {
    const journey = lesson.continuation!;
    expect(journey.steps).toHaveLength(6);
    let session = openContinuation(createLessonSession(lesson, 'local', 'repertoire'), journey);
    const repository = new GuidedLearnerRepository(null);
    for (const [index, step] of journey.steps.entries()) {
      const candidate = step.candidates[0];
      const reply = candidate.replies.find((item) => item.sound)!;
      session.continuation = { ...session.continuation!, started: true, candidate: candidate.move, choice: candidate.reasonIds[0], prediction: reply.move, reflection: 'I compared the actual recapture.' };
      await repository.saveLessonSession(session);
      session = (await repository.loadLessonSessions('local')).find((item) => item.id === session.id)!;
      session = submitContinuation(session, journey);
      expect(session.answers['continuation:' + step.id].correct).toBe(true);
      const first = structuredClone(session.continuation!.firstResults[step.id]);
      session.continuation = { ...session.continuation!, submitted: false, choice: 'automatic' };
      session = submitContinuation(session, journey);
      expect(session.continuation!.firstResults[step.id]).toEqual(first);
      expect(session.answers['continuation:' + step.id].correct).toBe(true);
      const full = continuationMoves(journey, index, true).map((move) => move.san);
      expect(boardAfter(full).fen()).toBe(continuationBoard(journey, index, true).fen());
      session = advanceContinuation(session, journey);
    }
    expect(session.continuation?.finished).toBe(true);
    const finalBoard = continuationBoard(journey, journey.steps.length - 1, true);
    expect(finalBoard.board().flat().filter(Boolean).every((piece) => ['k', 'p', 'r'].includes(piece!.type))).toBe(true);
    await repository.saveLessonSession(session);
    expect((await repository.loadLessonSessions('local')).find((item) => item.id === session.id)?.continuation).toEqual(session.continuation);
  });

  it('matches branch-specific games and transpositions, with a main-chapter fallback for shared prefixes', () => {
    expect(lessonForPosition(embeddedRepertoireGraph, { familyKey: queen.openingFamilyKey, pgn: '1. d4 d5 2. c4 dxc4 3. Nf3 Nf6' })?.key).toBe('lesson:queens-gambit-accepted');
    expect(lessonForPosition(embeddedRepertoireGraph, { familyKey: queen.openingFamilyKey, pgn: '1. d4 d5 2. c4 c6 3. cxd5 cxd5 4. Nc3 Nc6 5. Bf4 Nf6 6. e3' })?.key).toBe('lesson:queens-gambit-slav');
    expect(lessonForPosition(embeddedRepertoireGraph, { familyKey: queen.openingFamilyKey, pgn: '1. d4 d5 2. c4' })?.key).toBe(queen.key);
    const accepted = whiteCourseLessons.find((lesson) => lesson.key === 'lesson:vienna-accepted')!;
    expect(lessonForPosition(embeddedRepertoireGraph, { familyKey: vienna.openingFamilyKey, positionKey: buildPositionKey(boardAfter(accepted.decisions['decision-2'].movesBefore).fen()) })?.key).toBe(accepted.key);
    expect(lessonForPosition(embeddedRepertoireGraph, { positionKey: 'unrecognized-position' })).toBeUndefined();
  });

  it('orders chapters deterministically and schedules a main journey before unstarted sidelines', () => {
    const completed = { ...createLessonSession(queen, 'local', 'today'), completedAt: now };
    const input = { graph: embeddedRepertoireGraph, selectedOpeningKeys: [queen.openingFamilyKey], lessonSessions: [completed], mastery: [], backlog: [], now };
    const reversed = { ...embeddedRepertoireGraph, connectedLessons: Object.fromEntries(Object.entries(embeddedRepertoireGraph.connectedLessons!).reverse()) };
    expect(orderedLessons(reversed, [queen.openingFamilyKey]).map((lesson) => lesson.courseOrder)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(recommendGuidedNextActivity(input).targetKey).toBe(queen.key + '/continuation:prepare-b4');
    for (const durationMinutes of [5, 10, 20] as const) {
      const daily = buildDailySession({ ...input, learnerId: 'local', durationMinutes });
      expect(daily.targets.find((target) => target.phase === 'learn')).toMatchObject({ contentKey: queen.key + '/continuation:prepare-b4', estimatedMinutes: 2, learnerSide: 'white' });
    }
    expect(nextCourseContinuation([vienna], [completed], [])).toBeUndefined();
    const due = createInitialMastery({ learnerId: 'local', itemKey: queen.key + '/continuation:create-target', positionKey: '', now });
    due.understanding.status = 'learning'; due.understanding.dueAt = now;
    expect(recommendGuidedNextActivity({ ...input, mastery: [due] }).targetKey).toBe(due.itemKey);
    const unfinished = createLessonSession(whiteCourseLessons[5], 'local', 'today');
    expect(recommendGuidedNextActivity({ ...input, lessonSessions: [completed, unfinished], mastery: [due] }).targetKey).toBe('session:' + unfinished.id);
  });

  it('opens and completes an exact two-minute review without completing the opening lesson', () => {
    const journey = queen.continuation!;
    const step = journey.steps[2];
    let session = createLessonSession(queen, 'local', 'today', 'continuation:' + step.id);
    session.continuation = { ...session.continuation!, started: true, candidate: 'b5', choice: 'main-plan', prediction: 'Bg4' };
    session = submitContinuation(session, journey);
    session = advanceContinuation(session, journey);
    expect(session.completedAt).toBeTruthy();
    expect(Object.keys(session.answers)).toEqual(['continuation:create-target']);
    expect(session.continuation?.finished).toBe(true);
  });
});

describe('conservative White course upgrades', () => {
  it('upgrades a complete legacy bundle and preserves release identity and existing lesson keys', () => {
    const before = structuredClone(legacyEmbeddedRepertoireGraph);
    before.release.id = 'remote-published-id';
    const after = withStarterConcepts(before);
    expect(after.release).toEqual(before.release);
    expect(after.openings[queen.openingFamilyKey]).toBeDefined();
    expect(after.connectedLessons?.[vienna.key].decisions).toEqual(before.connectedLessons?.[vienna.key].decisions);
    expect(after.connectedLessons?.[vienna.key].continuation?.steps).toHaveLength(6);
    expect(validateRepertoireGraph(after)).toEqual([]);
    expect(before.openings[queen.openingFamilyKey]).toBeUndefined();
    expect(withStarterConcepts(after)).toEqual(after);
  });

  it('preserves edited lessons, custom journeys and drills while upgrading unchanged source lines', () => {
    const before = structuredClone(legacyEmbeddedRepertoireGraph);
    before.connectedLessons![vienna.key].decisions.develop.prompt = 'An editor’s explanation';
    before.connectedLessons![vienna.key].continuation = structuredClone(vienna.continuation!);
    before.connectedLessons![vienna.key].continuation!.title = 'An editor’s model game';
    before.conceptDrills['concept:vienna-centre-first'].summary = 'Custom summary';
    const after = withStarterConcepts(before);
    expect(after.connectedLessons![vienna.key]).toEqual(before.connectedLessons![vienna.key]);
    expect(after.conceptDrills['concept:vienna-centre-first']).toEqual(before.conceptDrills['concept:vienna-centre-first']);
    expect(after.connectedLessons![queen.key]).toBeDefined();
  });

  it('skips edited family dependencies while allowing independent courses', () => {
    const before = structuredClone(legacyEmbeddedRepertoireGraph);
    before.openings[vienna.openingFamilyKey].summary = 'An edited repertoire';
    const after = withStarterConcepts(before);
    expect(after.openings[queen.openingFamilyKey]).toBeDefined();
    expect(after.connectedLessons!['lesson:vienna-accepted']).toBeUndefined();
    expect(after.openings[vienna.openingFamilyKey].summary).toBe('An edited repertoire');
    const missing = structuredClone(before);
    missing.openings[vienna.openingFamilyKey].lineKeys = [];
    delete missing.connectedLessons![vienna.key].continuation;
    expect(withStarterConcepts(missing).connectedLessons![vienna.key].continuation).toBeUndefined();
  });
});
