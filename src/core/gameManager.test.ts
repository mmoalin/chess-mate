import { describe, expect, it } from 'vitest';
import { GameManager } from './gameManager';

describe('GameManager', () => {
  it('accepts legal moves and rejects illegal moves without changing position', () => {
    const manager = new GameManager();

    const legal = manager.attemptMove('e2', 'e4');
    const fenAfterLegalMove = manager.snapshot().fen;
    const illegal = manager.attemptMove('e2', 'e5');

    expect(legal.ok).toBe(true);
    expect(manager.snapshot().history).toEqual(['e4']);
    expect(illegal).toEqual({ ok: false, reason: 'Illegal move' });
    expect(manager.snapshot().fen).toBe(fenAfterLegalMove);
  });

  it('imports a PGN and exposes every replay position', () => {
    const manager = new GameManager();

    const result = manager.loadPgn('1. e4 e5 2. Nf3 Nc6');

    expect(result.ok).toBe(true);
    expect(manager.snapshot().history).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(manager.getReplayPositions()).toHaveLength(5);
    expect(manager.getReplayPositions()[0]).toContain(' w ');
    expect(manager.getReplayPositions()[3]).toContain(' b ');
    expect(manager.getReplayPositions()[4]).toContain(' w ');
  });
});
