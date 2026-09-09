import { describe, expect, it } from 'vitest';
import { starterConnectedLessons } from '../../data/connectedLessons';
import { answerQuestion, assist, beginTransfer, createLessonSession, enableRecall, nextQuestion, playLessonMove, positionAfter, startQuestions, validateConnectedLesson } from './session';
import type { ConnectedLesson, LessonSession } from './types';

function play(session: LessonSession, lesson: ConnectedLesson, san: string) {
  const move = positionAfter(session.moves).move(san);
  return playLessonMove(session, lesson, move.from, move.to, move.promotion);
}
describe('connected lesson sessions', () => {
  for (const lesson of starterConnectedLessons) {
    it('validates every authored path in ' + lesson.title, () => expect(validateConnectedLesson(lesson)).toEqual([]));
    it('completes linked decisions and visibly rewinds for ' + lesson.side, () => {
      let session = startQuestions(createLessonSession(lesson, 'local', 'today'), lesson);
      expect(Object.keys(session.answers)).toHaveLength(0);
      for (const question of lesson.questions) {
        session = answerQuestion(session, lesson, question.choices.find((c) => c.correct)!.id).session;
        session = nextQuestion(session, lesson);
      }
      while (session.stage === 'main') {
        const step = lesson.decisions[session.checkpointId];
        const result = play(session, lesson, step.answers[0].moveSan);
        expect(result.accepted).toBe(true);
        session = result.session;
      }
      expect(session.stage).toBe('transfer-intro');
      const endMain = session.moves;
      session = beginTransfer(session, lesson);
      expect(session.moves).not.toEqual(endMain);
      while (session.stage === 'transfer') session = play(session, lesson, lesson.decisions[session.checkpointId].answers[0].moveSan).session;
      expect(session.stage).toBe('summary');
      expect(session.completedAt).toBeTruthy();
      expect(Object.values(session.answers).every((a) => a.correct)).toBe(true);
      expect(positionAfter(session.moves).turn()).not.toBe(lesson.side[0]);
      expect(JSON.parse(JSON.stringify(session))).toEqual(session);
    });
  }
  const lesson = starterConnectedLessons[0];
  it('keeps the first answer and assistance on retry', () => {
    let session = assist(startQuestions(createLessonSession(lesson, 'local', 'today'), lesson), true);
    session = answerQuestion(session, lesson, '1').session;
    const first = session.answers.structure;
    session = answerQuestion(session, lesson, '0').session;
    expect(session.answers.structure).toEqual(first);
    expect(first).toMatchObject({ correct: false, hintUsed: true, revealed: true });
    expect(session.completedCheckpoints).toContain('structure');
  });
  it('restores a mistake and keeps unauthored moves ungraded', () => {
    const session = createLessonSession(lesson, 'local', 'today', 'recapture');
    const wrong = play(session, lesson, 'Qd3');
    expect(wrong.session.moves).toEqual(session.moves);
    expect(wrong.session.answers.recapture.correct).toBe(false);
    const correct = play(wrong.session, lesson, 'bxc3');
    expect(correct.session.answers.recapture.correct).toBe(false);
    expect(correct.session.stage).toBe('summary');
    const alternative = play(createLessonSession(lesson, 'local', 'today', 'develop'), lesson, 'd3');
    expect(alternative.ungraded).toBe(true);
    expect(Object.keys(alternative.session.answers)).toHaveLength(0);
  });
  it('scores recall only when explicitly enabled and resumes the exact checkpoint', () => {
    let session = enableRecall(createLessonSession(lesson, 'local', 'repertoire'), lesson);
    session = play(session, lesson, 'e4').session;
    expect(session.moves).toEqual(['e4', 'e5']);
    expect(Object.values(session.answers)[0].dimension).toBe('recall');
    const review = createLessonSession(lesson, 'local', 'today', 'transfer-castle');
    expect(review.moves).toEqual(lesson.decisions['transfer-castle'].movesBefore);
    expect(play(review, lesson, 'O-O').session.stage).toBe('summary');
    const openingReview = createLessonSession(lesson, 'local', 'today', 'opening:0');
    expect(play(openingReview, lesson, 'e4').session.stage).toBe('summary');
  });
  it('rejects discontinuities and stale content', () => {
    const invalid = structuredClone(lesson);
    invalid.decisions.castle.movesBefore = [...lesson.openingMoves];
    expect(validateConnectedLesson(invalid).length).toBeGreaterThan(0);
    const session = createLessonSession(lesson, 'local', 'today', 'develop');
    session.contentVersion = 0;
    expect(play(session, lesson, 'Be2').accepted).toBe(false);
  });
});
