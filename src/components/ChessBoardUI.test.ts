import { describe, expect, it } from 'vitest';
import { promotionForMove } from './ChessBoardUI';

describe('chessboard promotion handling', () => {
  it('does not tag ordinary moves as promotions', () => {
    expect(promotionForMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2', 'e4')).toBeUndefined();
  });

  it('defaults a last-rank pawn move to a queen', () => {
    expect(promotionForMove('8/P7/8/8/8/8/8/k6K w - - 0 1', 'a7', 'a8')).toBe('q');
  });
});

