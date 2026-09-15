import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { starterConnectedLessons } from '../../data/connectedLessons';
import { createLessonSession, hasCheckpoint, validateConnectedLesson } from './session';
import { advanceContinuation, continuationBoard, continuationKey, continuationMoves, continuationResultLabel, openContinuation, submitContinuation, validateContinuation } from './continuationJourney';
import { GuidedLearnerRepository } from '../../services/guidedLearnerRepository';
import { embeddedRepertoireGraph } from '../../services/guidedContentRepository';
import { buildDailySession } from '../../domain/repertoire/dailySessions';

const lesson = starterConnectedLessons[1];
const journey = lesson.continuation!;
function attempt(index = 0, alternative = 0) {
  const step = journey.steps[index];
  const candidate = step.candidates[alternative];
  const session = createLessonSession(lesson, 'local', 'today', continuationKey(step.id));
  session.continuation = { ...session.continuation!, started: true, candidate: candidate.move, choice: candidate.reasonIds[0] ?? 'automatic', prediction: candidate.replies[0].move, reflection: 'Consider the resulting structure.' };
  return session;
}

describe('continuous Caro-Kann content and assessment', () => {
  it('replays from the original opening through all six checkpoints to a rook ending', () => {
    expect(validateConnectedLesson(lesson)).toEqual([]);
    expect(journey.steps).toHaveLength(6);
    const chess = new Chess();
    for (const move of journey.openingPrefix) chess.move(move);
    expect(chess.history().at(-1)).toBe('c5');
    for (const [index, step] of journey.steps.entries()) {
      step.bridge.forEach(({ san }) => chess.move(san));
      expect(chess.fen()).toBe(continuationBoard(journey, index).fen());
      expect(chess.turn()).toBe('b');
      step.main.forEach(({ san }) => chess.move(san));
      expect(chess.fen()).toBe(continuationBoard(journey, index, true).fen());
    }
    expect(chess.board().flat().filter((piece) => piece && !['r', 'p', 'k'].includes(piece.type))).toHaveLength(0);
    expect(chess.get('c6')).toMatchObject({ color: 'b', type: 'p' });
    expect(chess.isCheck()).toBe(true);
    expect(continuationMoves(journey, 5, true).map((move) => move.san)).toEqual(chess.history());
    expect(chess.history()).toHaveLength(57);
  });

  it('rejects disconnected prefixes, illegal alternatives and missing explanations', () => {
    const altered = structuredClone(lesson);
    altered.continuation!.openingPrefix = [];
    expect(validateContinuation(altered).length).toBeGreaterThan(0);
    const illegal = structuredClone(lesson);
    illegal.continuation!.steps[0].candidates[1].replies[0].move = 'Qh9';
    expect(validateContinuation(illegal).length).toBeGreaterThan(0);
    const missing = structuredClone(lesson);
    missing.continuation!.steps[0].main[0].note = '';
    expect(validateContinuation(missing)).toContain('Every continuation move needs an annotation: central-tension');
  });

  for (let index = 0; index < 6; index++) {
    for (const alternative of [0, 1]) it(`assesses checkpoint ${index + 1}, candidate ${alternative + 1} and reopens its exact position`, () => {
      const initial = attempt(index, alternative);
      const result = submitContinuation(initial, journey);
      const key = continuationKey(journey.steps[index].id);
      expect(hasCheckpoint(lesson, key)).toBe(true);
      expect(result.answers[key]).toMatchObject({ correct: true, hintUsed: false, revealed: false });
      expect(continuationResultLabel(result.continuation!.result!)).toBe('Independently correct');
      expect(advanceContinuation(result, journey)).toMatchObject({ completedAt: expect.any(String), continuation: { finished: true } });
      expect(submitContinuation(result, journey)).toBe(result);
    });
  }

  it('keeps unknown legal moves ungraded and opens isolated exploration', () => {
    const initial = attempt();
    initial.continuation!.candidate = 'a6'; initial.continuation!.prediction = 'a3';
    const result = submitContinuation(initial, journey);
    expect(result.answers).toEqual({});
    expect(result.continuation).toMatchObject({ exploring: true, firstResults: {} });
    expect(result.completedCheckpoints).toEqual([]);
  });

  it('separates unassessed replies from wrong answers and preserves that first submission', () => {
    const initial = attempt(); initial.continuation!.prediction = 'a3';
    const result = submitContinuation(initial, journey);
    expect(result.continuation!.result!.reply.status).toBe('unassessed');
    expect(result.answers).toEqual({});
    expect(continuationResultLabel(result.continuation!.result!)).toBe('Completed · reply unassessed');
    const retried = submitContinuation({ ...result, continuation: { ...result.continuation!, submitted: false, prediction: 'cxd4' } }, journey);
    expect(retried.answers).toEqual({});
    expect(retried.continuation!.firstResults).toEqual(result.continuation!.firstResults);
    expect(retried.continuation!.latestResults['central-tension'].reply.status).toBe('correct');
  });

  it('retains a wrong first reason, assistance, reflections and attempt identity across storage and retries', async () => {
    const initial = attempt(); initial.continuation!.choice = 'automatic';
    const key = 'continuation:central-tension';
    initial.assistance[key] = { hint: true, revealed: false, analysis: true };
    const result = submitContinuation(initial, journey);
    const repository = new GuidedLearnerRepository(null);
    await repository.saveLessonSession(result);
    await repository.saveLessonSession(result);
    const resumed = (await repository.loadLessonSessions('local')).find((session) => session.id === result.id)!;
    expect(resumed.continuation).toEqual(result.continuation);
    expect(resumed.answers[key]).toMatchObject({ correct: false, hintUsed: true, revealed: true });
    const retried = submitContinuation({ ...resumed, continuation: { ...resumed.continuation!, submitted: false, choice: 'clarify' } }, journey);
    expect(retried.answers[key]).toEqual(resumed.answers[key]);
    expect(retried.continuation!.firstResults).toEqual(resumed.continuation!.firstResults);
    expect(retried.continuation!.result!.reflection).toBe('Consider the resulting structure.');
    await repository.saveLessonSession(retried);
    expect((await repository.loadAttempts('local')).filter((answer) => answer.itemKey.endsWith(key))).toHaveLength(1);
  });

  it('detects the documented rook blunder without calling the opponent recapture wrong', () => {
    const result = submitContinuation(attempt(5, 2), journey);
    expect(result.continuation!.result).toMatchObject({ move: { status: 'incorrect' }, reason: { status: 'incorrect' }, reply: { status: 'correct' } });
    expect(result.answers['continuation:rook-activity'].correct).toBe(false);
  });

  it('does not grade illegal reply notation or finish an untouched checkpoint', () => {
    const initial = attempt(); initial.continuation!.prediction = 'Qh9';
    const result = submitContinuation(initial, journey);
    expect(result.answers).toEqual({});
    expect(result.continuation!.error).toMatch(/legal opponent reply/);
    expect(advanceContinuation(initial, journey)).toBe(initial);
  });

  it('preserves old endgame progress and returns an alternative to the exact main continuation', () => {
    let initial = createLessonSession(lesson, 'local', 'repertoire');
    initial.journey = { active: true, step: 2, candidate: 'Qxd3' };
    initial = openContinuation(initial, journey);
    expect(initial.journey).toMatchObject({ active: false, step: 2, candidate: 'Qxd3' });
    initial.continuation = { ...attempt(0, 1).continuation!, firstResults: {}, latestResults: {} };
    const next = advanceContinuation(submitContinuation(initial, journey), journey);
    expect(next.continuation).toMatchObject({ step: 1, started: true });
    expect(next.continuation!.candidate).toBeUndefined();
    expect(next.completedAt).toBeUndefined();
    expect(continuationBoard(journey, next.continuation!.step).get('d4')).toMatchObject({ type: 'p', color: 'w' });
    expect(openContinuation(next, journey).continuation).toEqual(next.continuation);
  });

  it('schedules new and due continuation checkpoints as two-minute activities', async () => {
    const complete = createLessonSession(lesson, 'local', 'today'); complete.completedAt = '2026-09-15T12:00:00Z';
    const input = { learnerId: 'local', graph: embeddedRepertoireGraph, selectedOpeningKeys: [lesson.openingFamilyKey], mastery: [], backlog: [], lessonSessions: [complete], now: '2026-09-16T12:00:00Z' };
    for (const durationMinutes of [5, 10, 20] as const) {
      const daily = buildDailySession({ ...input, durationMinutes });
      expect(daily.targets[0]).toMatchObject({ contentKey: lesson.key + '/continuation:central-tension', estimatedMinutes: 2 });
      expect(daily.targets.reduce((sum, target) => sum + target.estimatedMinutes, 0)).toBeLessThanOrEqual(durationMinutes);
    }
    const repository = new GuidedLearnerRepository(null);
    await repository.saveLessonSession(submitContinuation(attempt(), journey));
    const mastery = await repository.loadMastery('local');
    mastery[0].understanding.dueAt = input.now;
    const daily = buildDailySession({ ...input, mastery, durationMinutes: 5 });
    expect(daily.targets[0]).toMatchObject({ phase: 'review', contentKey: lesson.key + '/continuation:central-tension', estimatedMinutes: 2 });
  });

  it('bounds a daily resume of an unfinished full journey without losing its session identity', () => {
    const pending = openContinuation(createLessonSession(lesson, 'local', 'repertoire'), journey);
    pending.continuation!.candidate = 'cxd4'; pending.continuation!.started = true;
    const daily = buildDailySession({ learnerId: 'local', graph: embeddedRepertoireGraph, durationMinutes: 5, selectedOpeningKeys: [lesson.openingFamilyKey], mastery: [], backlog: [], lessonSessions: [pending], now: '2026-09-16T12:00:00Z' });
    expect(daily.targets[0]).toMatchObject({ contentKey: 'session:' + pending.id, lessonCheckpointId: 'continuation:central-tension', estimatedMinutes: 2 });
    expect(daily.targets.reduce((sum, target) => sum + target.estimatedMinutes, 0)).toBeLessThanOrEqual(5);
  });
});
