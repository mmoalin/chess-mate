import type { ConnectedLesson, LessonSession } from './types';

export const FULL_LESSON_MINUTES = 12;
export const CHECKPOINT_MINUTES = 3;
export const PLAN_LAB_MINUTES = 5;

export function answerTitle(lesson: ConnectedLesson, key: string): string {
  const ply = key.startsWith('opening:') ? Number(key.slice(8)) : NaN;
  if (Number.isInteger(ply) && lesson.openingMoves[ply]) return `${Math.floor(ply / 2) + 1}${ply % 2 ? '…' : '.'}${lesson.openingMoves[ply]} · ${lesson.openingExplanations[ply]}`;
  const endgame = lesson.endgame?.steps.find((step) => 'endgame:' + step.id === key);
  if (endgame) return endgame.title;
  const continuation = lesson.continuation?.steps.find((step) => 'continuation:' + step.id === key);
  if (continuation) return continuation.title;
  return lesson.questions.find((q) => q.id === key)?.prompt ?? lesson.decisions[key]?.prompt ?? key;
}

export function independentAnswers(session: LessonSession) {
  return Object.values(session.answers).filter((a) => a.correct && !a.hintUsed && !a.revealed).length;
}
