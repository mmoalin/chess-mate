import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { starterRepertoires } from '../../data/repertoires';
import { buildLearningUnits, compileLegacyLines } from './graph';
import { matchPgnToRepertoire } from './pgn';
import { buildPositionKey } from './positionKey';
import { classifyMove, createInitialMastery, scheduleReview } from './training';
import { validateRepertoireGraph } from './validation';

describe('guided repertoire domain', () => {
  it('canonicalizes clocks and irrelevant en-passant fields while preserving meaningful position state', () => {
    expect(buildPositionKey('8/8/8/8/8/8/8/K6k w - - 0 1')).toBe(buildPositionKey('8/8/8/8/8/8/8/K6k w - - 99 42'));
    expect(buildPositionKey('8/8/8/8/8/8/8/K6k w - - 0 1')).not.toBe(buildPositionKey('8/8/8/8/8/8/8/K6k b - - 0 1'));
    expect(buildPositionKey('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPP2PPP/RNBQKBNR w KQkq d6 0 3')).toContain(' d6');
  });

  it('compiles every legacy line into a valid graph and learning units', () => {
    const graph = compileLegacyLines(starterRepertoires);
    expect(Object.keys(graph.openings).length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(graph.positions).length).toBeGreaterThan(20);
    expect(Object.keys(buildLearningUnits(graph, 'foundation')).length).toBeGreaterThan(0);
    expect(validateRepertoireGraph(graph)).toEqual([]);
  });

  it('classifies repertoire, alternative, and uncovered moves without treating all differences as errors', () => {
    const graph = compileLegacyLines(starterRepertoires);
    const opening = graph.openings['white-vienna-main'];
    const main = Object.values(graph.edges).find((edge) => edge.from === opening.rootPositionKey && edge.openingFamilyKeys.includes(opening.key))!;
    expect(classifyMove({ graph, positionKey: main.from, playedUci: main.uci, openingFamilyKey: opening.key }).kind).toBe('preferred');
    expect(classifyMove({ graph, positionKey: main.from, playedUci: 'a2a3', openingFamilyKey: opening.key, engineCentipawnLoss: 20 }).kind).toBe('reasonable');
    expect(classifyMove({ graph, positionKey: main.from, playedUci: 'a2a3', openingFamilyKey: opening.key }).kind).toBe('uncovered');
  });

  it('schedules failures sooner and grows intervals after unassisted success', () => {
    const now = '2026-08-28T10:00:00.000Z';
    const initial = createInitialMastery({ learnerId: 'local', itemKey: 'unit', positionKey: 'position', now });
    const failed = scheduleReview(initial, { id: 'a', learnerId: 'local', itemKey: 'unit', positionKey: 'position', dimension: 'recall', response: 'a3', correct: false, hintUsed: false, revealed: false, createdAt: now });
    expect(failed.recall.intervalDays).toBe(1);
    const first = scheduleReview(initial, { id: 'b', learnerId: 'local', itemKey: 'unit', positionKey: 'position', dimension: 'recall', response: 'e4', correct: true, hintUsed: false, revealed: false, createdAt: now });
    const second = scheduleReview(first, { id: 'c', learnerId: 'local', itemKey: 'unit', positionKey: 'position', dimension: 'recall', response: 'e4', correct: true, hintUsed: false, revealed: false, createdAt: '2026-08-29T10:00:00.000Z' });
    expect(second.recall.intervalDays).toBe(3);
  });

  it('matches PGN paths and identifies the side responsible for a divergence', () => {
    const graph = compileLegacyLines(starterRepertoires);
    const result = matchPgnToRepertoire({ pgn: '1. e4 e5 2. Nc3 Nf6 3. a3', graph, selectedOpeningFamilyKeys: ['white-vienna-main'] });
    expect(result.matchedPlyCount).toBe(4);
    expect(result.divergencePly).toBe(5);
    expect(result.divergingSide).toBe('learner');
    expect(result.recommendedAction).toBe('schedule-tactic');
  });

  it('chooses the strongest family match instead of the first shared opening move', () => {
    const graph = compileLegacyLines(starterRepertoires);
    const result = matchPgnToRepertoire({ pgn: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6', graph, selectedOpeningFamilyKeys: ['white-alien-gambit-main', 'black-caro-kann-main'] });
    expect(result.matchedOpeningFamilyKey).toBe('black-caro-kann-main');
    expect(result.matchedPlyCount).toBe(10);
    expect(result.divergencePly).toBeNull();
  });

  it('creates the same key for a transposed position', () => {
    const a = new Chess();
    ['Nf3', 'Nf6', 'g3', 'g6'].forEach((move) => a.move(move));
    const b = new Chess();
    ['g3', 'g6', 'Nf3', 'Nf6'].forEach((move) => b.move(move));
    expect(buildPositionKey(a.fen())).toBe(buildPositionKey(b.fen()));
  });
});
