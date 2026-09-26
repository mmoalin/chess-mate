import { buildPositionKey } from '../../domain/repertoire/positionKey';
import { createInitialMastery, scheduleReview } from '../../domain/repertoire/training';
import type { RepertoireGraph } from '../../domain/repertoire/types';
import { Chess } from 'chess.js';
import type { Library, PracticeCard, PracticeSession, Side } from './types';

export function cardMastery(owner: string, card: PracticeCard, sessions: PracticeSession[]) {
  let state = createInitialMastery({ learnerId: owner, itemKey: 'game-position:' + card.id, positionKey: buildPositionKey(card.finding.fen), now: card.createdAt });
  const ordered = sessions.filter((s) => s.cardId === card.id && !s.practiceOnly && s.submittedAt && s.correct !== undefined).sort((a, b) => a.submittedAt!.localeCompare(b.submittedAt!) || a.id.localeCompare(b.id));
  // One independent review per due window. Extra attempts and conflicting offline answers remain history.
  for (const session of ordered) {
    if (state.tactics.lastReviewedAt && session.createdAt < state.tactics.dueAt) continue;
    state = scheduleReview(state, { id: session.id, learnerId: owner, itemKey: state.itemKey, positionKey: state.positionKey, dimension: 'tactics', response: session.move, correct: session.correct!, hintUsed: session.assisted, revealed: session.assisted, createdAt: session.submittedAt! });
  }
  return state;
}
export function dueCards(owner: string, library: Library, now: string) {
  return library.cards.map((card) => ({ card, mastery: cardMastery(owner, card, library.sessions) })).filter(({ mastery }) => mastery.tactics.status === 'unseen' || mastery.tactics.dueAt <= now).sort((a, b) => a.mastery.tactics.dueAt.localeCompare(b.mastery.tactics.dueAt));
}
export function matchingLessons(graph: RepertoireGraph, fen: string, side: Side) {
  const key = buildPositionKey(fen);
  return Object.values(graph.connectedLessons ?? {}).filter((lesson) => {
    if (lesson.side !== side || !graph.openings[lesson.openingFamilyKey]) return false;
    return Object.values(lesson.decisions).some((decision) => {
      const board = new Chess();
      try { decision.movesBefore.forEach((move) => board.move(move)); return buildPositionKey(board.fen()) === key; } catch { return false; }
    });
  });
}
