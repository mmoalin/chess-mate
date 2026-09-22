import { Chess } from 'chess.js';
import type { PlanChoice } from '../../domain/repertoire/types';
import { buildPositionKey } from '../../domain/repertoire/positionKey';
import type { ConnectedLesson, LessonSession } from './types';

export type AnnotatedMove = { san: string; note: string };
export type ContinuationCandidate = {
  move: string;
  assessment: 'accepted' | 'mistake';
  explanation: string;
  reasonIds: string[];
  replies: { move: string; sound: boolean; explanation: string }[];
};
export type ContinuationStep = {
  id: string; title: string; prompt: string; hint: string; takeaway: string;
  bridge: AnnotatedMove[];
  main: AnnotatedMove[];
  choices: PlanChoice[];
  candidates: ContinuationCandidate[];
};
export type ContinuationJourney = {
  id: string; title: string; introduction: string; sourceCheckpointId: string;
  openingPrefix: string[]; steps: ContinuationStep[];
  sourceMove?: string;
};
export type ComponentFeedback = { status: 'correct' | 'incorrect' | 'unassessed'; text: string };
export type ContinuationResult = {
  candidate: string; choice: string; prediction: string; reflection: string;
  move: ComponentFeedback; reason: ComponentFeedback; reply: ComponentFeedback;
  assisted: boolean;
};
export type ContinuationProgress = {
  journeyId: string; active: boolean; step: number; started: boolean; finished?: boolean;
  candidate?: string; choice?: string; prediction?: string; reflection?: string;
  submitted?: boolean; result?: ContinuationResult; error?: string;
  firstResults: Record<string, ContinuationResult>;
  latestResults: Record<string, ContinuationResult>;
  inspectionPly?: number; exploring?: boolean;
};

export const CONTINUATION_MINUTES = 2;
export const continuationKey = (id: string) => 'continuation:' + id;

export function continuationMoves(journey: ContinuationJourney, index: number, after = false): AnnotatedMove[] {
  const moves = journey.openingPrefix.map((san) => ({ san, note: 'Earlier move in the opening lesson.' }));
  for (let i = 0; i <= index; i++) {
    const step = journey.steps[i];
    if (!step) break;
    moves.push(...step.bridge);
    if (i < index || after) moves.push(...step.main);
  }
  return moves;
}
export function continuationBoard(journey: ContinuationJourney, index: number, after = false): Chess {
  const board = new Chess();
  for (const { san } of continuationMoves(journey, index, after)) board.move(san);
  return board;
}
export function openContinuation(session: LessonSession, journey: ContinuationJourney, index?: number): LessonSession {
  const previous = session.continuation?.journeyId === journey.id ? session.continuation : undefined;
  return { ...session, journey: session.journey ? { ...session.journey, active: false } : undefined,
    continuation: index === undefined && previous ? { ...previous, active: true } : {
      journeyId: journey.id, active: true, step: index ?? 0, started: false, firstResults: {}, latestResults: {}
    }, updatedAt: new Date().toISOString() };
}

export function submitContinuation(session: LessonSession, journey: ContinuationJourney): LessonSession {
  const progress = session.continuation;
  if (!progress || progress.journeyId !== journey.id || progress.submitted || !progress.started || progress.finished) return session;
  const step = journey.steps[progress.step];
  const choice = step?.choices.find((item) => item.id === progress.choice);
  if (!step || !choice || !progress.candidate || !progress.prediction?.trim()) return session;
  const board = continuationBoard(journey, progress.step);
  let candidate: string, prediction: string;
  try { candidate = board.move(progress.candidate).san; prediction = board.move(progress.prediction.trim()).san; }
  catch { return { ...session, continuation: { ...progress, error: 'Enter a legal opponent reply for your candidate. Your decision has not been graded.' }, updatedAt: new Date().toISOString() }; }
  const authored = step.candidates.find((item) => item.move === candidate);
  if (!authored) return { ...session, continuation: { ...progress, exploring: true, error: undefined }, updatedAt: new Date().toISOString() };
  const reply = authored.replies.find((item) => item.move === prediction);
  const key = continuationKey(step.id);
  const help = session.assistance[key];
  const result: ContinuationResult = {
    candidate, choice: choice.id, prediction, reflection: progress.reflection?.trim() ?? '',
    move: { status: authored.assessment === 'accepted' ? 'correct' : 'incorrect', text: authored.explanation },
    reason: { status: authored.reasonIds.includes(choice.id) ? 'correct' : 'incorrect', text: choice.feedback + (authored.reasonIds.includes(choice.id) ? '' : ' Compare this with what your chosen move actually changes.') },
    reply: { status: reply ? reply.sound ? 'correct' : 'incorrect' : 'unassessed', text: reply?.explanation ?? `${prediction} is legal but not assessed in this authored comparison. Legality alone does not establish the strongest reply.` },
    assisted: Boolean(help?.hint || help?.revealed || help?.analysis)
  };
  const first = progress.firstResults[step.id];
  const assessed = [result.move, result.reason, result.reply].every((item) => item.status !== 'unassessed');
  const now = new Date().toISOString();
  const answers = !first && assessed && !session.answers[key] ? { ...session.answers, [key]: {
    id: crypto.randomUUID(), learnerId: session.learnerId, itemKey: session.lessonKey + '/' + key,
    positionKey: buildPositionKey(continuationBoard(journey, progress.step).fen()), dimension: 'understanding' as const,
    response: `${candidate}; ${choice.label}; predicted ${prediction}`, correct: [result.move, result.reason, result.reply].every((item) => item.status === 'correct'),
    hintUsed: Boolean(help?.hint || help?.analysis), revealed: Boolean(help?.revealed || help?.analysis), createdAt: now
  } } : session.answers;
  return { ...session, answers, completedCheckpoints: [...new Set([...session.completedCheckpoints, key])],
    continuation: { ...progress, candidate, prediction, submitted: true, result, error: undefined,
      firstResults: { ...progress.firstResults, [step.id]: first ?? result }, latestResults: { ...progress.latestResults, [step.id]: result } }, updatedAt: now };
}

export function advanceContinuation(session: LessonSession, journey: ContinuationJourney): LessonSession {
  const progress = session.continuation;
  if (!progress?.submitted || progress.journeyId !== journey.id) return session;
  const finished = progress.step === journey.steps.length - 1 || session.reviewCheckpointId === continuationKey(journey.steps[progress.step].id);
  return { ...session, continuation: { journeyId: journey.id, active: true, started: true, step: finished ? progress.step : progress.step + 1,
    finished, firstResults: progress.firstResults, latestResults: progress.latestResults },
    completedAt: finished && session.reviewCheckpointId?.startsWith('continuation:') ? new Date().toISOString() : session.completedAt,
    updatedAt: new Date().toISOString() };
}

export function continuationResultLabel(result: ContinuationResult): string {
  const components = [result.move, result.reason, result.reply];
  if (components.some((item) => item.status === 'incorrect')) return 'Needs review';
  if (components.some((item) => item.status === 'unassessed')) return 'Completed · reply unassessed';
  return result.assisted ? 'Completed with assistance' : 'Independently correct';
}

export function validateContinuation(lesson: ConnectedLesson): string[] {
  const journey = lesson.continuation;
  if (!journey) return [];
  const errors: string[] = [];
  try {
    const source = lesson.decisions[journey.sourceCheckpointId];
    const sourceAnswer = journey.sourceMove ? source?.answers.find(answer => answer.moveSan === journey.sourceMove) : source?.answers[0];
    if (!source || !sourceAnswer || sourceAnswer.nextId || JSON.stringify(journey.openingPrefix) !== JSON.stringify([...source.movesBefore, sourceAnswer.moveSan, ...sourceAnswer.repliesSan])) errors.push('Continuation must start at the declared main-line ending.');
    let mainId: string | null = lesson.mainStartId;
    const visited = new Set<string>();
    while (mainId && !visited.has(mainId)) { visited.add(mainId); mainId = lesson.decisions[mainId]?.answers[0]?.nextId ?? null; }
    if (!visited.has(journey.sourceCheckpointId)) errors.push('Continuation source is not on the main branch.');
    if (!journey.id || !journey.steps.length || new Set(journey.steps.map((step) => step.id)).size !== journey.steps.length) errors.push('Continuation needs unique checkpoint identities.');
    for (const [index, step] of journey.steps.entries()) {
      const board = continuationBoard(journey, index);
      if (board.turn() !== lesson.side[0]) errors.push('Wrong continuation turn: ' + step.id);
      if (![...step.bridge, ...step.main].every((move) => move.note.trim())) errors.push('Every continuation move needs an annotation: ' + step.id);
      if (step.candidates.filter((candidate) => candidate.assessment === 'accepted').length < 2) errors.push('Missing plausible alternative: ' + step.id);
      if (new Set(step.candidates.map((candidate) => candidate.move)).size !== step.candidates.length) errors.push('Duplicate candidate: ' + step.id);
      if (!step.candidates.some((candidate) => candidate.move === step.main[0]?.san && candidate.assessment === 'accepted' && candidate.replies.some((reply) => reply.move === step.main[1]?.san))) errors.push('Main continuation must have assessed moves and replies: ' + step.id);
      for (const candidate of step.candidates) {
        const after = new Chess(board.fen()); after.move(candidate.move);
        if (!candidate.explanation || (candidate.assessment === 'accepted' && !candidate.reasonIds.length) || !candidate.reasonIds.every((id) => step.choices.some((choice) => choice.id === id))) errors.push('Missing candidate reason: ' + step.id);
        if (!candidate.replies.length || (candidate.assessment === 'accepted' && !candidate.replies.some((reply) => reply.sound))) errors.push('Missing candidate response: ' + step.id);
        for (const reply of candidate.replies) { new Chess(after.fen()).move(reply.move); if (!reply.explanation) errors.push('Missing reply explanation: ' + step.id); }
      }
      continuationBoard(journey, index, true);
    }
  } catch (error) { errors.push(error instanceof Error ? error.message : 'Invalid continuation.'); }
  return errors;
}
