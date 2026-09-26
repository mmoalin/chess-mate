import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import previousContent from '../../data/fixtures/pre-black-release.json';
import { blackCourseLessons, blackCourseDrills, blackCourses } from '../../data/blackOpeningCourses';
import { legacyStarterRepertoires, starterRepertoires } from '../../data/repertoires';
import { compileDecisionPath, compileJourney } from '../../data/courseCompiler';
import { embeddedRepertoireGraph as graph, withStarterConcepts, GuidedContentRepository } from '../../services/guidedContentRepository';
import { bundledUpgradeDiagnostics } from '../../services/bundledCourseUpgrades';
import { GuidedBrowserStore } from '../../services/guidedStorage';
import { GuidedLearnerRepository } from '../../services/guidedLearnerRepository';
import { validateRepertoireGraph } from '../../domain/repertoire/validation';
import { buildPositionKey } from '../../domain/repertoire/positionKey';
import { buildDailySession } from '../../domain/repertoire/dailySessions';
import { createInitialMastery } from '../../domain/repertoire/training';
import { recommendGuidedNextActivity } from '../../domain/repertoire/recommendations';
import type { RepertoireGraph } from '../../domain/repertoire/types';
import { courseCatalog, lessonForPosition, mainCourseLesson, orderedLessons } from './course';
import { createLessonSession, positionAfter, validateConnectedLesson } from './session';
import { advanceContinuation, continuationBoard, openContinuation, submitContinuation } from './continuationJourney';

const previous = previousContent as unknown as RepertoireGraph;
const now = '2026-09-21T09:00:00.000Z';

describe('Black course contracts', () => {
  it('ships six families, 34 core chapters, optional alternatives and a complete source graph', () => {
    expect(validateRepertoireGraph(graph)).toEqual([]);
    expect(blackCourses).toHaveLength(6);
    const lessons = orderedLessons(graph, blackCourses.map(course => course.key));
    expect(lessons.filter(lesson => !lesson.optional)).toHaveLength(34);
    expect(lessons.filter(lesson => lesson.optional)).toHaveLength(2);
    for (const lesson of blackCourseLessons) {
      expect(validateConnectedLesson(lesson), lesson.key).toEqual([]);
      expect(lesson.side).toBe('black');
      expect(Object.keys(lesson.decisions).filter(key => !key.startsWith('transfer-'))).toHaveLength(4);
      expect(Object.keys(lesson.decisions).filter(key => key.startsWith('transfer-'))).toHaveLength(2);
      expect(lesson.structureGuide?.counterplay).toBeTruthy();
      expect(blackCourseDrills.some(drill => drill.openingFamilyKey === lesson.openingFamilyKey && drill.title.startsWith(lesson.title) && drill.scenarios.length === 2)).toBe(true);
      for (const decision of Object.values(lesson.decisions)) expect(positionAfter(decision.movesBefore).turn()).toBe('b');
    }
  });

  it('preserves every old lesson answer, journey identity, and original source line', () => {
    for (const [key, old] of Object.entries(previous.connectedLessons!)) {
      expect(graph.connectedLessons![key].decisions).toEqual(old.decisions);
      if (key !== 'lesson:caro-active') expect(graph.connectedLessons![key].continuation).toEqual(old.continuation);
      expect(graph.connectedLessons![key].endgame).toEqual(old.endgame);
      expect(graph.connectedLessons![key].version).toBe(key === 'lesson:caro-active' ? 2 : old.version);
    }
    for (const line of legacyStarterRepertoires) expect(starterRepertoires.find(candidate => candidate.id === line.id)).toEqual(line);
  });

  it('resolves each branch and same-position opposite-colour courses independently', () => {
    for (const lesson of blackCourseLessons) {
      const positionKey = buildPositionKey(positionAfter(lesson.openingMoves).fen());
      expect(lessonForPosition(graph, { familyKey: lesson.openingFamilyKey, side: 'black', positionKey })?.key, lesson.key).toBe(lesson.key);
      expect(lessonForPosition(graph, { familyKey: lesson.openingFamilyKey, side: 'white', positionKey })).toBeUndefined();
    }
    const alien = '1.e4 c6 2.d4 d5 3.Nd2 dxe4 4.Nxe4 Nf6 5.Ng5 Nbd7 6.Bc4';
    expect(lessonForPosition(graph, { familyKey: 'black-alien-gambit-defense', side: 'black', pgn: alien })?.key).toBe('lesson:black-alien-main');
    expect(lessonForPosition(graph, { familyKey: 'black-queens-gambit-main', side: 'black', pgn: '1.d4 d5 2.Bf4 Nf6 3.c4 e6 4.Nc3' })?.key).toBe('lesson:black-queens-gambit-main:bf4');
    expect(lessonForPosition(graph, { familyKey: 'black-sicilian-basic', pgn: '1.e4 c5 2.Nf3' })?.key).toBe('lesson:black-sicilian-main');
  });

  it('uses active course descriptors and keeps optional chapters after every core chapter', () => {
    const catalog = courseCatalog(graph);
    expect(catalog['black-vienna-main'].role).toBe('response');
    expect(catalog['black-sicilian-basic'].role).toBe('repertoire');
    const lessons = orderedLessons(graph, blackCourses.map(course => course.key));
    expect(lessons.slice(-2).every(lesson => lesson.optional)).toBe(true);
    for (const course of blackCourses) expect(mainCourseLesson(graph, course.key)?.key).toBe(course.mainLessonKey);
  });

  for (const course of blackCourses.filter(course => course.key !== 'black-caro-kann-main')) it(`persists, resumes and reviews all six journey decisions: ${course.key}`, async () => {
    const lesson = mainCourseLesson(graph, course.key)!;
    const journey = lesson.continuation!;
    expect(journey.steps).toHaveLength(6);
    const repository = new GuidedLearnerRepository(null);
    const other = createLessonSession(graph.connectedLessons!['lesson:vienna-development'], 'local', 'repertoire');
    await repository.saveLessonSession(other);
    let session = openContinuation(createLessonSession(lesson, 'local', 'repertoire'), journey);
    for (const [index, step] of journey.steps.entries()) {
      const candidate = step.candidates.find(candidate => candidate.move === step.main[0].san)!;
      session.continuation = { ...session.continuation!, started: true, candidate: candidate.move, choice: candidate.reasonIds[0], prediction: step.main[1].san };
      await repository.saveLessonSession(session);
      session = (await repository.loadLessonSessions('local')).find(saved => saved.id === session.id)!;
      session = submitContinuation(session, journey);
      expect(session.answers['continuation:' + step.id]?.correct).toBe(true);
      const first = structuredClone(session.answers);
      await repository.saveLessonSession(session);
      session = (await repository.loadLessonSessions('local')).find(saved => saved.id === session.id)!;
      session.continuation = { ...session.continuation!, submitted: false, choice: 'automatic' };
      session = submitContinuation(session, journey);
      expect(session.answers).toEqual(first);
      const replay = positionAfter(journey.openingPrefix);
      for (const part of journey.steps.slice(0, index + 1)) [...part.bridge, ...part.main].forEach(move => replay.move(move.san));
      expect(replay.fen()).toBe(continuationBoard(journey, index, true).fen());
      session = advanceContinuation(session, journey);
    }
    expect(session.continuation?.finished).toBe(true);
    const remaining = continuationBoard(journey, 5, true).board().flat().filter(piece => piece && !['p', 'k'].includes(piece.type));
    expect(remaining.length).toBeLessThanOrEqual(6);
    if (course.key !== 'black-london-main') expect(remaining.some(piece => piece?.type === 'q')).toBe(false);
    expect((await repository.loadLessonSessions('local')).find(saved => saved.id === other.id)).toEqual(other);
    const completed = { ...session, completedAt: now };
    const due = createInitialMastery({ learnerId: 'local', itemKey: lesson.key + '/continuation:' + journey.steps[2].id, positionKey: '', now });
    due.understanding.status = 'learning'; due.understanding.dueAt = now;
    const input = { graph, selectedOpeningKeys: [course.key], lessonSessions: [completed], mastery: [due], backlog: [], now };
    expect(recommendGuidedNextActivity(input).targetKey).toBe(due.itemKey);
    expect(buildDailySession({ ...input, learnerId: 'local', durationMinutes: 10 }).targets[0]).toMatchObject({ contentKey: due.itemKey, estimatedMinutes: 2 });
    expect(createLessonSession(lesson, 'local', 'today', 'continuation:' + journey.steps[2].id).continuation?.step).toBe(2);
  });

  it('allows the main journey before sidelines and preserves assistance versus legal exploration', () => {
    const lesson = mainCourseLesson(graph, 'black-sicilian-basic')!; const journey = lesson.continuation!;
    const completed = { ...createLessonSession(lesson, 'local', 'repertoire'), completedAt: now };
    const input = { graph, selectedOpeningKeys: [lesson.openingFamilyKey], lessonSessions: [completed], mastery: [], backlog: [], now };
    expect(recommendGuidedNextActivity(input).targetKey).toBe(lesson.key + '/continuation:' + journey.steps[0].id);
    let session = openContinuation(createLessonSession(lesson, 'local', 'repertoire'), journey);
    const board = continuationBoard(journey, 0); const step = journey.steps[0];
    const unknown = board.moves().find(move => !step.candidates.some(candidate => candidate.move === move))!;
    board.move(unknown);
    session.continuation = { ...session.continuation!, started: true, candidate: unknown, choice: step.candidates[0].reasonIds[0], prediction: board.moves()[0] };
    session = submitContinuation(session, journey);
    expect(session.answers).toEqual({});
    expect(session.continuation?.exploring).toBe(true);
    session.assistance['continuation:' + step.id] = { hint: true, revealed: false };
    session.continuation = { ...session.continuation!, candidate: step.main[0].san, prediction: step.main[1].san };
    session = submitContinuation(session, journey);
    expect(session.answers['continuation:' + step.id].hintUsed).toBe(true);
  });
});

describe('shared compiler and safe course upgrades', () => {
  it('rejects wrong turns, missing edges and duplicate checkpoint identities', () => {
    const node = { id: 'one', prompt: 'Develop', change: 'e4', hint: 'Centre', dimension: 'understanding' as const, mistakes: {}, answers: [{ moveSan: 'c5', repliesSan: [], nextId: null, feedback: 'Challenge d4.' }] };
    expect(compileDecisionPath(['e4'], [node], 'black').one.movesBefore).toEqual(['e4']);
    expect(() => compileDecisionPath(['e4'], [node], 'white')).toThrow(/turn/);
    expect(() => compileDecisionPath(['e4'], [node, node], 'black')).toThrow(/unique/);
    expect(() => compileDecisionPath(['e4'], [{ ...node, answers: [{ ...node.answers[0], nextId: 'missing' }] }], 'black')).toThrow(/Missing/);
    const main = blackCourseLessons[0];
    expect(() => compileJourney(main, { id: 'bad', title: 'Bad', introduction: 'Test', sourceCheckpointId: main.mainStartId, sourceMove: 'bad', steps: [] })).toThrow(/source/);
  });

  it('upgrades an old cached bundle atomically and keeps release and learner records intact', async () => {
    const store = new GuidedBrowserStore(); const before = structuredClone(previous); before.release.id = 'authored-release';
    await store.put('content:published', before);
    const upgraded = await new GuidedContentRepository(null, store).loadPublished();
    expect(upgraded.release).toEqual(before.release);
    for (const course of blackCourses) expect(mainCourseLesson(upgraded, course.key)?.key).toBe(course.mainLessonKey);
    expect(validateRepertoireGraph(upgraded)).toEqual([]);
    expect(withStarterConcepts(upgraded)).toEqual(upgraded);
    expect(before.openings['black-vienna-main']).toBeUndefined();
  });

  it('preserves edited source families and authored journeys while upgrading independent packages', () => {
    const before = structuredClone(previous);
    before.openings['black-sicilian-basic'].summary = 'Editor-owned Sicilian';
    before.connectedLessons!['lesson:caro-active'].continuation!.title = 'Editor-owned ending';
    const after = withStarterConcepts(before);
    expect(after.openings['black-sicilian-basic'].summary).toBe('Editor-owned Sicilian');
    expect(after.connectedLessons!['lesson:black-sicilian-main']).toBeUndefined();
    expect(after.connectedLessons!['lesson:black-vienna-main']).toBeDefined();
    expect(after.connectedLessons!['lesson:caro-active'].continuation!.title).toBe('Editor-owned ending');
    expect(bundledUpgradeDiagnostics(after).some(message => message.includes('skipped'))).toBe(true);
  });

  it('does not repair a deleted source edge by attaching a dependent course', () => {
    const before = structuredClone(previous);
    const edge = Object.values(before.edges).find(edge => edge.legacyLineIds.includes('black-alien-gambit-defense') && edge.san === 'Nbd7')!;
    delete before.edges[edge.key];
    const after = withStarterConcepts(before);
    expect(after.connectedLessons!['lesson:black-alien-main']).toBeUndefined();
    expect(after.edges[edge.key]).toBeUndefined();
  });
});
