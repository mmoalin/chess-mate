import { describe, expect, it } from 'vitest';
import { EngineService, parseBestMove, parseInfoLine } from './engineService';

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

  it('reports candidate loss in centipawns from the original mover perspective', async () => {
    const scores = [50, -20];
    const worker = {
      onmessage: null as ((event: MessageEvent<string>) => void) | null,
      postMessage(message: string) {
        if (!message.startsWith('go ')) return;
        const score = scores.shift() ?? 0;
        this.onmessage?.({ data: `info depth 6 score cp ${score} pv e2e4` } as MessageEvent<string>);
        this.onmessage?.({ data: 'bestmove e2e4' } as MessageEvent<string>);
      },
      terminate() {}
    };
    const service = new EngineService(() => worker as unknown as Worker);
    const comparison = await service.compareMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { from: 'd2', to: 'd4' }, { depth: 6 });
    expect(comparison.delta).toBe(-30);
  });
});
