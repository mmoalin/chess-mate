import { Chess } from 'chess.js';
import { buildPositionKey } from '../../domain/repertoire/positionKey';
import type { MasteryDimension } from '../../domain/repertoire/types';
import type { ConnectedLesson, LessonSession } from './types';
import { validateJourney } from './endgameJourney';

export function positionAfter(moves: string[]): Chess {
  const chess = new Chess();
  for (const move of moves) chess.move(move);
  return chess;
}
export function checkpointKey(lessonKey: string, checkpoint: string): string { return lessonKey + '/' + checkpoint; }
export function hasCheckpoint(lesson: ConnectedLesson, id: string): boolean {
  if (lesson.endgame?.steps.some((step) => 'endgame:' + step.id === id)) return true;
  if (lesson.decisions[id] || lesson.questions.some((q) => q.id === id)) return true;
  if (!/^opening:\d+$/.test(id)) return false;
  const ply = Number(id.slice(8));
  return ply >= 0 && ply < lesson.openingMoves.length && ply % 2 === (lesson.side === 'white' ? 0 : 1);
}
export function createLessonSession(lesson: ConnectedLesson, learnerId: string, returnDestination: LessonSession['returnDestination'], reviewCheckpointId?: string): LessonSession {
  const session: LessonSession = {
    id: crypto.randomUUID(), learnerId, lessonKey: lesson.key, contentVersion: lesson.version,
    stage: 'opening', checkpointId: 'opening:0', moves: [], answers: {}, assistance: {}, completedCheckpoints: [],
    openingRecall: false, returnDestination, updatedAt: new Date().toISOString(), reviewCheckpointId
  };
  if (reviewCheckpointId) {
    if (!hasCheckpoint(lesson, reviewCheckpointId)) throw new Error('This lesson checkpoint is no longer available.');
    session.checkpointId = reviewCheckpointId;
    const journeyStep = lesson.endgame?.steps.findIndex((step) => 'endgame:' + step.id === reviewCheckpointId) ?? -1;
    if (journeyStep >= 0) { session.stage = 'summary'; session.journey = { active: true, step: journeyStep }; return session; }
    if (reviewCheckpointId.startsWith('opening:')) {
      session.openingRecall = true;
      session.moves = lesson.openingMoves.slice(0, Number(reviewCheckpointId.slice(8)));
      return session;
    }
    const decision = lesson.decisions[reviewCheckpointId];
    session.stage = decision ? (reviewCheckpointId.startsWith('transfer-') ? 'transfer' : 'main') : 'question';
    session.moves = [...(decision?.movesBefore ?? lesson.openingMoves)];
  }
  return session;
}
function touch(session: LessonSession): LessonSession { return { ...session, updatedAt: new Date().toISOString() }; }
export function assist(session: LessonSession, reveal = false): LessonSession {
  const old = session.assistance[session.checkpointId];
  return touch({ ...session, assistance: { ...session.assistance, [session.checkpointId]: { ...old, hint: true, revealed: Boolean(old?.revealed || reveal) } } });
}
export function analyseAssist(session: LessonSession): LessonSession {
  const old = session.assistance[session.checkpointId];
  return touch({ ...session, assistance: { ...session.assistance, [session.checkpointId]: { hint: old?.hint ?? false, revealed: old?.revealed ?? false, analysis: true } } });
}
function grade(session: LessonSession, response: string, correct: boolean, dimension: MasteryDimension): LessonSession {
  if (session.answers[session.checkpointId]) return session;
  const help = session.assistance[session.checkpointId];
  return touch({ ...session, answers: { ...session.answers, [session.checkpointId]: {
    id: crypto.randomUUID(), learnerId: session.learnerId, itemKey: checkpointKey(session.lessonKey, session.checkpointId),
    positionKey: buildPositionKey(positionAfter(session.moves).fen()), dimension, response, correct,
    hintUsed: Boolean(help?.hint || help?.analysis), revealed: Boolean(help?.revealed || help?.analysis), createdAt: new Date().toISOString()
  } } });
}
function solved(session: LessonSession): LessonSession {
  return { ...session, completedCheckpoints: [...new Set([...session.completedCheckpoints, session.checkpointId])] };
}
function finish(session: LessonSession): LessonSession {
  return touch({ ...session, stage: 'summary', completedAt: new Date().toISOString() });
}
export function startQuestions(session: LessonSession, lesson: ConnectedLesson): LessonSession {
  return touch({ ...session, stage: 'question', checkpointId: lesson.questions[0].id, moves: [...lesson.openingMoves] });
}
export function replayOpening(session: LessonSession, lesson: ConnectedLesson): LessonSession {
  if (session.stage !== 'opening') return session;
  const moves = [...session.moves, lesson.openingMoves[session.moves.length]];
  if (moves.length >= lesson.openingMoves.length) return startQuestions({ ...session, moves }, lesson);
  return touch({ ...session, moves, checkpointId: 'opening:' + moves.length });
}
export function enableRecall(session: LessonSession, lesson: ConnectedLesson): LessonSession {
  let next = { ...session, openingRecall: true };
  while (next.stage === 'opening' && positionAfter(next.moves).turn() !== lesson.side[0]) next = replayOpening(next, lesson);
  return touch(next);
}
export function answerQuestion(session: LessonSession, lesson: ConnectedLesson, choiceId: string) {
  const question = lesson.questions.find((item) => item.id === session.checkpointId);
  const choice = question?.choices.find((item) => item.id === choiceId);
  if (session.stage !== 'question' || !choice) return { session, feedback: '', correct: false };
  let next = grade(session, choiceId, choice.correct, 'understanding');
  if (choice.correct) next = solved(next);
  return { session: touch(next), feedback: choice.feedback, correct: choice.correct };
}
export function nextQuestion(session: LessonSession, lesson: ConnectedLesson): LessonSession {
  if (!session.completedCheckpoints.includes(session.checkpointId)) return session;
  if (session.reviewCheckpointId) return finish(session);
  const next = lesson.questions[lesson.questions.findIndex((item) => item.id === session.checkpointId) + 1];
  return touch(next ? { ...session, checkpointId: next.id } : {
    ...session, stage: 'main', checkpointId: lesson.mainStartId, moves: [...lesson.decisions[lesson.mainStartId].movesBefore]
  });
}
export function beginTransfer(session: LessonSession, lesson: ConnectedLesson): LessonSession {
  return touch({ ...session, stage: 'transfer', checkpointId: lesson.transferStartId, moves: [...lesson.decisions[lesson.transferStartId].movesBefore] });
}
export function playLessonMove(session: LessonSession, lesson: ConnectedLesson, from: string, to: string, promotion?: string) {
  const unchanged = (feedback: string) => ({ session, feedback, accepted: false, ungraded: false });
  if (session.contentVersion !== lesson.version) return unchanged('This lesson changed. Restart with the updated content.');
  if (!['opening', 'main', 'transfer'].includes(session.stage)) return unchanged('Use the lesson controls before playing another move.');
  const chess = positionAfter(session.moves);
  if (chess.turn() !== lesson.side[0]) return unchanged('Wait for the opponent reply.');
  let san: string;
  try { san = chess.move({ from, to, promotion }).san; } catch { return unchanged('That move is not legal.'); }
  if (session.stage === 'opening') {
    if (!session.openingRecall) return unchanged('Choose Recall my moves or use the replay controls.');
    const correct = san === lesson.openingMoves[session.moves.length];
    let next = grade(session, san, correct, 'recall');
    if (!correct) return { ...unchanged('That is not the lesson line. Try again or reveal the next move.'), session: next };
    next = replayOpening(solved(next), lesson);
    if (session.reviewCheckpointId) return { session: finish(next), feedback: 'Opening checkpoint reviewed.', accepted: true, ungraded: false };
    while (next.stage === 'opening' && positionAfter(next.moves).turn() !== lesson.side[0]) next = replayOpening(next, lesson);
    return { session: next, feedback: 'Correct. ' + lesson.openingExplanations[session.moves.length], accepted: true, ungraded: false };
  }
  const decision = lesson.decisions[session.checkpointId];
  const answer = decision.answers.find((item) => item.moveSan === san);
  if (!answer) {
    const mistake = decision.mistakes[san];
    return { session: mistake ? grade(session, san, false, decision.dimension) : session,
      feedback: mistake ?? 'This legal move is outside the authored continuation. It is ungraded. Try an authored candidate or analyse the position.', accepted: false, ungraded: !mistake };
  }
  let next = solved(grade(session, san, true, decision.dimension));
  next = { ...next, moves: [...session.moves, san, ...answer.repliesSan] };
  if (session.reviewCheckpointId) next = finish(next);
  else if (answer.nextId) next.checkpointId = answer.nextId;
  else if (session.stage === 'main') next.stage = 'transfer-intro';
  else next = finish(next);
  return { session: touch(next), feedback: answer.feedback, accepted: true, ungraded: false };
}

export function validateConnectedLesson(lesson: ConnectedLesson): string[] {
  const errors: string[] = [];
  if (lesson.endgame) errors.push(...validateJourney(lesson.endgame));
  const check = (condition: boolean, message: string) => { if (!condition) errors.push(message); };
  try {
    check(Number.isInteger(lesson.version) && lesson.version > 0, 'Lesson needs a positive content version.');
    check(new Set(lesson.questions.map((q) => q.id)).size === lesson.questions.length, 'Question identifiers must be unique.');
    check(lesson.questions.every((q) => !lesson.decisions[q.id]), 'Questions and board checkpoints must have distinct identities.');
    positionAfter(lesson.openingMoves);
    check(lesson.openingMoves.length === lesson.modelPositionPly, 'Model position does not match opening replay.');
    check(lesson.openingExplanations.length === lesson.openingMoves.length, 'Every opening move needs an explanation.');
    check(lesson.questions.length >= 2 && lesson.questions.every((q) => q.choices.some((c) => c.correct)), 'Structure and plan questions need correct answers.');
    const visited = new Set<string>();
    const walk = (id: string, stack: string[] = []): number => {
      if (stack.includes(id)) throw new Error('Lesson path contains a cycle.');
      const step = lesson.decisions[id];
      if (!step) throw new Error('Missing checkpoint: ' + id);
      visited.add(id);
      const before = positionAfter(step.movesBefore);
      check(before.turn() === lesson.side[0], 'Wrong player turn at ' + id);
      check(step.id === id && step.answers.length > 0, 'Checkpoint needs an identity and accepted answer: ' + id);
      check(new Set(step.answers.map((a) => a.moveSan)).size === step.answers.length, 'Accepted moves must be unique at ' + id);
      check(step.answers.every((a) => !(a.moveSan in step.mistakes)), 'A move cannot be both accepted and a mistake at ' + id);
      for (const mistake of Object.keys(step.mistakes)) positionAfter([...step.movesBefore, mistake]);
      const lengths = step.answers.map((answer) => {
        const continuation = [...step.movesBefore, answer.moveSan, ...answer.repliesSan];
        positionAfter(continuation);
        if (!answer.nextId) return 1;
        check(JSON.stringify(continuation) === JSON.stringify(lesson.decisions[answer.nextId]?.movesBefore), 'Discontinuous path at ' + id);
        return 1 + walk(answer.nextId, [...stack, id]);
      });
      return Math.min(...lengths);
    };
    check(walk(lesson.mainStartId) >= 3, 'Main path needs three linked decisions.');
    check(walk(lesson.transferStartId) >= 2, 'Transfer path needs two linked decisions.');
    check(Object.keys(lesson.decisions).every((id) => visited.has(id)), 'Every authored checkpoint must be reachable.');
    const main = lesson.decisions[lesson.mainStartId].movesBefore;
    check(JSON.stringify(main.slice(0, lesson.openingMoves.length)) === JSON.stringify(lesson.openingMoves), 'Main path must continue the opening.');
    const transfer = lesson.decisions[lesson.transferStartId].movesBefore;
    check(transfer.length === lesson.transferCheckpointMoves.length + 1 && positionAfter(lesson.transferCheckpointMoves).turn() !== lesson.side[0], 'Transfer must introduce one opponent reply at the shared checkpoint.');
    check(JSON.stringify(transfer.slice(0, lesson.transferCheckpointMoves.length)) === JSON.stringify(lesson.transferCheckpointMoves), 'Transfer must start at the declared shared position.');
    check(Object.values(lesson.decisions).some((d) => JSON.stringify(d.movesBefore.slice(0, lesson.transferCheckpointMoves.length)) === JSON.stringify(lesson.transferCheckpointMoves) && !d.id.startsWith('transfer-')), 'Transfer checkpoint must belong to the main path.');
    check(Object.values(lesson.decisions).some((d) => d.dimension === 'tactics'), 'Lesson needs a concrete tactical consequence.');
  } catch (error) { errors.push(error instanceof Error ? error.message : 'Invalid lesson position.'); }
  return errors;
}
