import preAlienEmbeddedRepertoireGraphFixture from '../../data/fixtures/pre-alien-release.json';
const preAlienEmbeddedRepertoireGraph = preAlienEmbeddedRepertoireGraphFixture as unknown as import('../../domain/repertoire/types').RepertoireGraph;
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { alienCourseLessons, alienCourseDrills } from '../../data/alienOpeningCourses';
import { legacyStarterRepertoires, starterRepertoires } from '../../data/repertoires';
import { starterConnectedLessons } from '../../data/connectedLessons';
import { embeddedRepertoireGraph, withStarterConcepts, GuidedContentRepository } from '../../services/guidedContentRepository';
import { GuidedBrowserStore } from '../../services/guidedStorage';
import { GuidedLearnerRepository } from '../../services/guidedLearnerRepository';
import { validateRepertoireGraph } from '../../domain/repertoire/validation';
import { buildPositionKey } from '../../domain/repertoire/positionKey';
import { buildDailySession } from '../../domain/repertoire/dailySessions';
import { createInitialMastery } from '../../domain/repertoire/training';
import { recommendGuidedNextActivity } from '../../domain/repertoire/recommendations';
import { createLessonSession, validateConnectedLesson } from './session';
import { advanceContinuation, continuationBoard, openContinuation, submitContinuation } from './continuationJourney';
import { lessonForPosition, orderedLessons } from './course';

const family = 'white-alien-gambit-main';
const main = alienCourseLessons[0];
const now = '2026-09-19T15:00:00.000Z';

describe('Alien Gambit course', () => {
  it('validates complete chapters and preserves all existing Alien source records', () => {
    expect(validateRepertoireGraph(embeddedRepertoireGraph)).toEqual([]);
    expect(orderedLessons(embeddedRepertoireGraph, [family]).map(l => l.courseOrder)).toEqual([0, 1, 2, 3, 4]);
    for (const original of legacyStarterRepertoires.filter(l => l.id.includes('alien'))) {
      expect(starterRepertoires.find(l => l.id === original.id)).toEqual(original);
    }
    for (const lesson of alienCourseLessons) {
      expect(validateConnectedLesson(lesson)).toEqual([]);
      expect(Object.keys(lesson.decisions).filter(id => !id.startsWith('transfer-'))).toHaveLength(4);
      expect(Object.keys(lesson.decisions).filter(id => id.startsWith('transfer-'))).toHaveLength(2);
      expect(lesson.openingExplanations).toHaveLength(lesson.openingMoves.length);
      expect(lesson.structureGuide?.ending).toBeTruthy();
      expect(alienCourseDrills.find(d => d.key === lesson.key.replace('lesson:', 'concept:'))?.scenarios).toHaveLength(2);
    }
    expect(main.introduction).toMatch(/unsound/);
    expect(main.decisions['decision-1'].answers[0].feedback).toMatch(/Black better/);
  });

  it('routes accepted branches and genuine Nd2 transpositions to the right chapter', () => {
    const prefix = '1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nf6 5.Ng5';
    expect(lessonForPosition(embeddedRepertoireGraph, { familyKey: family, pgn: prefix })?.key).toBe(main.key);
    expect(lessonForPosition(embeddedRepertoireGraph, { familyKey: family, pgn: prefix + ' h6 6.Nxf7 Kxf7 7.Nf3 c5' })?.key).toBe(alienCourseLessons[1].key);
    expect(lessonForPosition(embeddedRepertoireGraph, { familyKey: family, pgn: prefix + ' h6 6.Nxf7 Kxf7 7.Nf3 Bf5' })?.key).toBe(alienCourseLessons[2].key);
    const transposed = '1.e4 c6 2.d4 d5 3.Nd2 dxe4 4.Nxe4 Nf6 5.Ng5 Nbd7';
    expect(lessonForPosition(embeddedRepertoireGraph, { familyKey: family, pgn: transposed })?.key).toBe(alienCourseLessons[4].key);
    const board = new Chess(); alienCourseLessons[3].openingMoves.forEach(move => board.move(move));
    expect(lessonForPosition(embeddedRepertoireGraph, { familyKey: family, positionKey: buildPositionKey(board.fen()) })?.key).toBe(alienCourseLessons[3].key);
  });

  it('persists every journey checkpoint before and after submission without changing another White course', async () => {
    const journey = main.continuation!;
    expect(journey.steps).toHaveLength(6);
    const repository = new GuidedLearnerRepository(null);
    const queen = starterConnectedLessons.find(l => l.key === 'lesson:queens-gambit-qgd')!;
    const other = createLessonSession(queen, 'local', 'repertoire');
    await repository.saveLessonSession(other);
    let session = openContinuation(createLessonSession(main, 'local', 'repertoire'), journey);
    for (const [index, step] of journey.steps.entries()) {
      session.continuation = { ...session.continuation!, started: true, candidate: step.main[0].san, choice: 'main-plan', prediction: step.main[1].san };
      await repository.saveLessonSession(session);
      session = (await repository.loadLessonSessions('local')).find(s => s.id === session.id)!;
      session = submitContinuation(session, journey);
      expect(session.answers['continuation:' + step.id]?.correct).toBe(true);
      const first = structuredClone(session.answers['continuation:' + step.id]);
      await repository.saveLessonSession(session);
      session = (await repository.loadLessonSessions('local')).find(s => s.id === session.id)!;
      session.continuation = { ...session.continuation!, submitted: false, choice: 'automatic' };
      session = submitContinuation(session, journey);
      expect(session.answers['continuation:' + step.id]).toEqual(first);
      const replay = new Chess();
      journey.openingPrefix.forEach(move => replay.move(move));
      for (const part of journey.steps.slice(0, index + 1)) [...part.bridge, ...part.main].forEach(move => replay.move(move.san));
      expect(replay.fen()).toBe(continuationBoard(journey, index, true).fen());
      session = advanceContinuation(session, journey);
    }
    expect(session.continuation?.finished).toBe(true);
    const pieces = continuationBoard(journey, 5, true).board().flat().filter(Boolean);
    expect(pieces.some(piece => piece!.type === 'q')).toBe(false);
    expect(pieces.filter(piece => piece!.color === 'w' && piece!.type === 'r')).toHaveLength(2);
    expect((await repository.loadLessonSessions('local')).find(s => s.id === other.id)).toEqual(other);
  });

  it('keeps assistance and unknown legal exploration separate from independent answers', () => {
    const journey = main.continuation!;
    let session = openContinuation(createLessonSession(main, 'local', 'repertoire'), journey);
    const board = continuationBoard(journey, 0);
    const unknown = board.moves().find(move => !journey.steps[0].candidates.some(candidate => candidate.move === move))!;
    board.move(unknown);
    session.continuation = { ...session.continuation!, started: true, candidate: unknown, choice: 'main-plan', prediction: board.moves()[0] };
    session = submitContinuation(session, journey);
    expect(session.continuation?.exploring).toBe(true);
    expect(session.answers).toEqual({});
    session.continuation = { ...session.continuation!, candidate: 'Qe2', prediction: 'Be8' };
    session.assistance['continuation:coordinate'] = { hint: true, revealed: false };
    session = submitContinuation(session, journey);
    expect(session.continuation?.result?.assisted).toBe(true);
    expect(session.answers['continuation:coordinate'].hintUsed).toBe(true);
  });

  it('schedules its journey before unstarted sidelines and provides exact two-minute reviews', () => {
    const completed = { ...createLessonSession(main, 'local', 'repertoire'), completedAt: now };
    const input = { graph: embeddedRepertoireGraph, selectedOpeningKeys: [family], lessonSessions: [completed], mastery: [], backlog: [], now };
    expect(recommendGuidedNextActivity(input).targetKey).toBe(main.key + '/continuation:coordinate');
    expect(buildDailySession({ ...input, learnerId: 'local', durationMinutes: 10 }).targets.find(t => t.phase === 'learn')).toMatchObject({ contentKey: main.key + '/continuation:coordinate', estimatedMinutes: 2 });
    const due = createInitialMastery({ learnerId: 'local', itemKey: main.key + '/continuation:active-rooks', positionKey: '', now });
    due.understanding.status = 'learning'; due.understanding.dueAt = now;
    expect(recommendGuidedNextActivity({ ...input, mastery: [due] }).targetKey).toBe(due.itemKey);
    let review = createLessonSession(main, 'local', 'today', 'continuation:active-rooks');
    review.continuation = { ...review.continuation!, started: true, candidate: 'Rc1', choice: 'main-plan', prediction: 'Kf6' };
    review = advanceContinuation(submitContinuation(review, main.continuation!), main.continuation!);
    expect(Object.keys(review.answers)).toEqual(['continuation:active-rooks']);
    expect(review.completedAt).toBeTruthy();
  });
});

describe('Alien release compatibility', () => {
  it('upgrades the previous White release through cached loading with every dependency', async () => {
    const store = new GuidedBrowserStore();
    const before = structuredClone(preAlienEmbeddedRepertoireGraph);
    before.release.id = 'remote-white-release';
    await store.put('content:published', before);
    const graph = await new GuidedContentRepository(null, store).loadPublished();
    expect(graph.release).toEqual(before.release);
    expect(orderedLessons(graph, [family])).toHaveLength(5);
    expect(validateRepertoireGraph(graph)).toEqual([]);
    for (const [key, lesson] of Object.entries(before.connectedLessons!)) {
      if (key === 'lesson:caro-active') {
        expect(graph.connectedLessons![key].decisions).toEqual(lesson.decisions);
        expect(graph.connectedLessons![key].version).toBe(2);
      } else expect(graph.connectedLessons![key]).toMatchObject(lesson);
    }
    expect(withStarterConcepts(graph)).toEqual(graph);
  });

  it('preserves edited source records and authored Alien journeys', () => {
    const before = structuredClone(preAlienEmbeddedRepertoireGraph);
    before.openings[family].summary = 'An editor’s repertoire';
    expect(withStarterConcepts(before).connectedLessons![main.key]).toBeUndefined();
    const current = structuredClone(embeddedRepertoireGraph);
    current.connectedLessons![main.key].continuation!.title = 'An authored model game';
    expect(withStarterConcepts(current).connectedLessons![main.key].continuation!.title).toBe('An authored model game');
    const incompatible = structuredClone(preAlienEmbeddedRepertoireGraph);
    incompatible.openings[family].lineKeys = [];
    expect(withStarterConcepts(incompatible).connectedLessons![main.key]).toBeUndefined();
  });
});
