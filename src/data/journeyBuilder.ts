/** Compatibility adapter for existing authored journeys. New courses use compileJourney. */
import type { ConnectedLesson } from '../features/connected/types';
import type { AnnotatedMove, ContinuationJourney, ContinuationStep } from '../features/connected/continuationJourney';

const annotated = (pairs: [string, string][]): AnnotatedMove[] => pairs.map(([san, note]) => ({ san, note }));
type Decision = { id: string; title: string; hint: string; takeaway: string; bridge: [string, string][]; main: [string, string][]; alternative: [move: string, reason: string, reply: string, feedback: string]; mainReason: string };
export function journey(lesson: ConnectedLesson, sourceCheckpointId: string, id: string, title: string, decisions: Decision[]): ContinuationJourney {
  const source = lesson.decisions[sourceCheckpointId];
  return {
    id, title, sourceCheckpointId,
    openingPrefix: [...source.movesBefore, source.answers[0].moveSan, ...source.answers[0].repliesSan],
    introduction: 'An original illustrative continuation of this lesson’s main branch, not a historical game, forced sequence, or claim that every move is best. Replay connects every position without a jump. Compare alternatives and stronger replies before returning explicitly to the example. The ending is a position to play, not a claimed win.',
    steps: decisions.map((decision): ContinuationStep => ({
      id: decision.id, title: decision.title, prompt: decision.title + '. Compare the two plans in the position before choosing.', hint: decision.hint, takeaway: decision.takeaway,
      bridge: annotated(decision.bridge), main: annotated(decision.main),
      choices: [
        { id: 'main-plan', label: decision.mainReason, correct: true, feedback: decision.main[0][1] },
        { id: 'alternative-plan', label: decision.alternative[1], correct: true, feedback: decision.alternative[1] },
        { id: 'automatic', label: 'Copy the example because this opening always leads to a winning ending.', correct: false, feedback: 'These moves are an illustration. Check the opponent’s reply and the resulting piece activity; the opening name guarantees neither this position nor a win.' }
      ],
      candidates: [
        { move: decision.main[0][0], assessment: 'accepted', explanation: decision.main[0][1], reasonIds: ['main-plan'], replies: [{ move: decision.main[1][0], sound: true, explanation: decision.main[1][1] }] },
        { move: decision.alternative[0], assessment: 'accepted', explanation: decision.alternative[1], reasonIds: ['alternative-plan'], replies: [{ move: decision.alternative[2], sound: true, explanation: decision.alternative[3] }] }
      ]
    }))
  };
}
