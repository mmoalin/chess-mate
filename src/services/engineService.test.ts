import { describe, expect, it } from 'vitest';
import { parseBestMove, parseInfoLine } from './engineService';

describe('engine output parsing', () => {
  it('parses bestmove lines', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toEqual({ from: 'e2', to: 'e4', promotion: undefined });
    expect(parseBestMove('bestmove a7a8q')).toEqual({ from: 'a7', to: 'a8', promotion: 'q' });
  });

  it('parses centipawn and mate evaluation lines', () => {
    expect(parseInfoLine('info depth 12 score cp 34 pv e2e4 e7e5')).toEqual({
      depth: 12,
      score: { type: 'cp', value: 34 },
      pv: ['e2e4', 'e7e5']
    });
    expect(parseInfoLine('info depth 7 score mate -2 pv h2h4')).toEqual({
      depth: 7,
      score: { type: 'mate', value: -2 },
      pv: ['h2h4']
    });
  });
});
