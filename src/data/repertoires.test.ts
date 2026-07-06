import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { starterRepertoires } from './repertoires';

describe('starterRepertoires', () => {
  it('contains legal SAN sequences from the starting position', () => {
    for (const line of starterRepertoires) {
      const chess = new Chess();

      for (const move of line.movesSan) {
        const result = chess.move(move);
        expect(result, `${line.id} should accept ${move}`).not.toBeNull();
      }
    }
  });

  it('keeps theory branches linked to real beginner parent lines', () => {
    const ids = new Set(starterRepertoires.map((line) => line.id));

    for (const line of starterRepertoires.filter((item) => item.difficulty === 'theory')) {
      expect(line.parentLineId, `${line.id} should declare a parentLineId`).toBeTruthy();
      expect(ids.has(line.parentLineId ?? ''), `${line.id} should reference an existing parent`).toBe(true);
      expect(starterRepertoires.find((item) => item.id === line.parentLineId)?.difficulty).toBe('beginner');
    }
  });

  it('gives every beginner line a middlegame plan and valid model position', () => {
    for (const line of starterRepertoires.filter((item) => item.difficulty !== 'theory')) {
      expect(line.middlegameIdeas?.length, `${line.id} should have middlegame ideas`).toBeGreaterThan(0);
      expect(line.modelPositionPly, `${line.id} should mark a model position`).toBeGreaterThan(0);
      expect(line.modelPositionPly, `${line.id} model position should be inside the line`).toBeLessThanOrEqual(
        line.movesSan.length
      );
    }
  });
});
