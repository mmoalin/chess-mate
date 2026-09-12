import { Chess } from 'chess.js';
import type { PlanChoice } from '../../domain/repertoire/types';
import type { LessonSession } from './types';
import { buildPositionKey } from '../../domain/repertoire/positionKey';

export type JourneyStep = {
  id: string; title: string; prompt: string; move: string; replies: string[];
  explanation: string; choices: PlanChoice[]; hint: string;
  /** A separately labelled transfer exercise, never an unexplained position jump. */
  transferFen?: string; transferContext?: string;
};
export type EndgameJourney = { title: string; introduction: string; setupFen: string; side: 'white' | 'black'; steps: JourneyStep[] };
export type JourneyProgress = { active: boolean; step: number; candidate?: string; choice?: string; prediction?: string; feedback?: string; submitted?: boolean; finished?: boolean };

export function journeyPosition(journey: EndgameJourney, index: number): Chess {
  let chess = new Chess(journey.setupFen);
  for (let i = 0; i <= index; i++) {
    const step = journey.steps[i];
    if (!step) break;
    if (step.transferFen) chess = new Chess(step.transferFen);
    if (i < index) for (const san of [step.move, ...step.replies]) chess.move(san);
  }
  return chess;
}

export function submitJourney(session: LessonSession, journey: EndgameJourney): LessonSession {
  const progress = session.journey;
  if (!progress || progress.submitted) return session;
  const step = journey.steps[progress.step];
  const choice = step.choices.find((item) => item.id === progress.choice);
  if (!progress.candidate || !choice || !progress.prediction?.trim()) return session;
  const before = journeyPosition(journey, progress.step);
  const after = new Chess(before.fen());
  try { after.move(progress.candidate); after.move(progress.prediction.trim()); }
  catch { return { ...session, journey: { ...progress, feedback: 'Enter a legal opponent reply in move notation. You can use a hint or change the candidate.' } }; }
  const correct = progress.candidate === step.move && choice.correct;
  const key = 'endgame:' + step.id;
  const help = session.assistance[key];
  const now = new Date().toISOString();
  return { ...session, updatedAt: now, answers: session.answers[key] ? session.answers : { ...session.answers, [key]: {
    id: crypto.randomUUID(), learnerId: session.learnerId, itemKey: session.lessonKey + '/' + key, positionKey: buildPositionKey(before.fen()),
    dimension: 'understanding', response: `${progress.candidate}; ${choice.label}; predicted ${progress.prediction}`, correct,
    hintUsed: Boolean(help?.hint || help?.analysis), revealed: Boolean(help?.revealed || help?.analysis), createdAt: now
  } }, completedCheckpoints: [...new Set([...session.completedCheckpoints, key])], journey: { ...progress, submitted: true,
    feedback: `${correct ? 'You connected the move to the structure.' : 'Compare your choice with this example.'} ${choice.feedback} ${step.explanation} Your predicted reply was ${progress.prediction}; the example continues ${step.replies.join(' ')}. Other legal replies can lead to different plans.` } };
}

export function validateJourney(journey: EndgameJourney): string[] {
  const errors: string[] = [];
  if (!journey.steps.length) errors.push('An endgame journey needs at least one checkpoint.');
  if (new Set(journey.steps.map((step) => step.id)).size !== journey.steps.length) errors.push('Duplicate journey checkpoint.');
  for (const [i, step] of journey.steps.entries()) {
    try {
      const chess = journeyPosition(journey, i);
      if (chess.turn() !== journey.side[0]) errors.push('Wrong side at ' + step.id);
      if (step.transferFen && !step.transferContext) errors.push('Unlabelled transfer at ' + step.id);
      if (!step.choices.some((choice) => choice.correct)) errors.push('Missing reason at ' + step.id);
      for (const move of [step.move, ...step.replies]) chess.move(move);
    } catch (e) { errors.push(`${step.id}: ${e instanceof Error ? e.message : 'Invalid position'}`); }
  }
  return errors;
}
