import { describe, expect, it, vi } from 'vitest';
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

describe('engine lifecycle', () => {
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  function fake() {
    const worker = { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null as ((event: MessageEvent<string>) => void) | null, onerror: null as (() => void) | null };
    return { worker, service: new EngineService(() => worker as unknown as Worker) };
  }
  it('rejects overlapping requests and settles cancelled promises', async () => {
    const { service, worker } = fake();
    const pending = service.analyze(startFen);
    const cancelled = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(service.analyze(startFen)).rejects.toThrow('already analysing');
    service.stop();
    await cancelled;
    expect(worker.terminate).toHaveBeenCalled();
  });
  it('settles a no-move response and never starts a worker for a terminal position', async () => {
    const { service, worker } = fake();
    const pending = service.analyze(startFen);
    worker.onmessage?.({ data: 'bestmove (none)' } as MessageEvent<string>);
    expect((await pending).bestMove).toBeNull();
    const factory = vi.fn();
    const terminal = new EngineService(factory);
    expect((await terminal.analyze('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1')).bestMove).toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });
  it('times out and rejects worker startup failures', async () => {
    vi.useFakeTimers();
    try {
      const { service, worker } = fake();
      const timedOut = expect(service.analyze(startFen, { timeoutMs: 20 })).rejects.toThrow('timed out');
      await vi.advanceTimersByTimeAsync(21); await timedOut;
      const failed = expect(service.analyze(startFen)).rejects.toThrow('could not start');
      worker.onerror?.(); await failed;
    } finally { vi.useRealTimers(); }
  });
});
