import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { importGame } from './import';
import { analysisSummary, assessMove, evaluate, GameAnalysisController, lossBetween, relative, supportedAnswer } from './analysis';
import { ANALYSIS_VERSION, type Evidence, type PositionResult, type PracticeCard, type PracticeSession } from './types';
import { GameReviewRepository } from './repository';
import { resetGuidedMemoryStoreForTests } from '../../services/guidedStorage';
import { cardMastery, dueCards } from './practice';

const start = new Chess().fen();
const evidence = (fen: string, value: number, type: 'cp' | 'mate' = 'cp', depth = 16): Evidence => ({ fen, version: ANALYSIS_VERSION, depth, requestedDepth: depth, score: { type, value }, pv: [new Chess(fen).moves({ verbose: true })[0]].filter(Boolean).map((m) => m.from + m.to + (m.promotion ?? '')) });
describe('single-game import', () => {
  it('deduplicates headers, comments and variations but separates learner colour', async () => {
    const a = await importGame('1. e4 {hello} e5 (1... c5) 2. Nf3 *', 'white');
    const b = await importGame('[Event "Other"]\n\n1. e4 e5 2. Nf3 *', 'white');
    expect(a.id).toBe(b.id); expect(a.id).not.toBe((await importGame(b.pgn, 'black')).id);
    expect(a.pgn).toContain('{hello}'); expect(a.pgn).toContain('(1... c5)');
    expect(a.moves).toEqual(['e2e4', 'e7e5', 'g1f3']); expect(a.fens).toHaveLength(4);
  });
  it('preserves a custom FEN and promotion', async () => {
    const game = await importGame('[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/6K1 w - - 0 1"]\n\n1. a8=Q+ *', 'white');
    expect(game.moves).toEqual(['a7a8q']); expect(game.startFen).toContain('7k/P7');
  });
  it('accepts castling and terminal main lines', async () => {
    expect((await importGame('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O *', 'white')).moves.at(-1)).toBe('e1g1');
    const game = await importGame('1. f3 e5 2. g4 Qh4# 0-1', 'black'); expect(new Chess(game.fens.at(-1)).isCheckmate()).toBe(true);
  });
  it.each(['1. e4 e5 1-0\n1. d4 d5 0-1', '[Event "A"]\n1. e4 *\n[Event "B"]\n1. d4 *', '1. e5 *', '1. e4 (1. d4', '[Variant "Chess960"]\n1. e4 *'])('rejects unsupported input: %s', async (pgn) => { await expect(importGame(pgn, 'white')).rejects.toThrow(); });
  it('enforces byte and ply limits', async () => {
    await expect(importGame(' '.repeat(1024 * 1024 + 1), 'white')).rejects.toThrow('1 MB');
    await expect(importGame(Array.from({ length: 151 }, (_, i) => `${2*i+1}. Nf3 Nf6 ${2*i+2}. Ng1 Ng8`).join(' '), 'white')).rejects.toThrow('600 plies');
  });
});
describe('score perspective and confirmation', () => {
  it('publishes only confirmed findings, ranks ties by ply and prefers four-ply separation', async () => {
    const game = await importGame('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 5. Nf3 Nf6 *','white');
    const results: PositionResult[] = game.fens.flatMap((fen) => [12,16].map((depth) => ({ schema:1 as const,id:fen+depth,runId:'r',fen,depth,evidence:evidence(fen,100,'cp',depth) })));
    expect(analysisSummary(game,'r',results).findings.map((f)=>f.ply)).toEqual([0,4,8]);
    expect(analysisSummary(game,'r',results.filter((r)=>r.depth===12))).toMatchObject({complete:false,findings:[]});
  });
  it('assesses legal alternatives at depth 16 and leaves missing evidence ungraded', async () => {
    const engine={analyze:vi.fn().mockResolvedValue({...evidence(new Chess().fen(),-60),depth:16,bestMove:null})};
    const reference={...evidence(start,100),pv:['e2e4']};
    expect((await assessMove(engine,reference,'e4','white')).correct).toBe(true); expect(engine.analyze).not.toHaveBeenCalled();
    expect((await assessMove(engine,reference,'d4','white')).correct).toBe(true);
    expect(engine.analyze.mock.calls[0][1]).toMatchObject({depth:16,timeoutMs:30000});
    await expect(assessMove(engine,{...reference,depth:12},'d4','white')).rejects.toThrow('Missing');
  });
  it('normalises both colours without turning mate into centipawns', async () => {
    const game = await importGame('1. e4 e5 *', 'white');
    expect(lossBetween(evidence(start, 100), evidence(game.fens[1], 80), 'white').loss).toBe(180);
    expect(lossBetween(evidence(game.fens[1], 100), evidence(game.fens[2], 80), 'black').loss).toBe(180);
    expect(lossBetween(evidence(start, 3, 'mate'), evidence(game.fens[1], -200), 'white')).toEqual({ loss: null, mate: true, severity: 0 });
    expect(supportedAnswer(evidence(start, 2, 'mate'), evidence(game.fens[1], -9, 'mate'), 'white')).toBe(true);
    expect(supportedAnswer(evidence(start, 0), evidence(game.fens[1], 1, 'mate'), 'white')).toBe(false);
    expect(supportedAnswer(evidence(start, 100), evidence(game.fens[1], -50), 'white')).toBe(true);
    expect(supportedAnswer(evidence(start, 100), evidence(game.fens[1], -49), 'white')).toBe(false);
  });
  it('handles checkmate and draws without starting the engine', async () => {
    const engine = { analyze: vi.fn() };
    const result = await evaluate(engine, '7k/6Q1/5K2/8/8/8/8/8 b - - 0 1', 16);
    expect(relative(result, 'white')).toEqual({ type: 'mate', value: 1 });
    expect((await evaluate(engine, '7k/8/6K1/8/8/8/8/8 w - - 0 1', 16)).terminal).toBe('draw');
    expect(engine.analyze).not.toHaveBeenCalled();
  });
  it('retains incremental results, confirms losses and resumes from exact cached evidence', async () => {
    const game = await importGame('1. e4 *', 'white'); const saved: PositionResult[] = [];
    const engine = { stop: vi.fn(), analyze: vi.fn(async (fen: string, options?: { depth?: number }) => ({ ...evidence(fen, fen === start ? 200 : 0), depth: options?.depth ?? 12, bestMove: null })) };
    const controller = new GameAnalysisController(engine);
    await controller.run(game, 'run', [], async (r) => { saved.push(r); });
    expect(engine.analyze).toHaveBeenCalledTimes(4);
    expect(analysisSummary(game, 'run', saved).findings).toHaveLength(1);
    await controller.run(game, 'run2', saved, async (r) => { saved.push(r); });
    expect(engine.analyze).toHaveBeenCalledTimes(4);
    expect(analysisSummary(game, 'run2', saved).complete).toBe(true);
  });
  it('keeps worker failures incomplete, then resumes without losing successful results', async () => {
    const game = await importGame('1. e4 *', 'white'); const saved: PositionResult[] = [];
    const engine = { stop: vi.fn(), analyze: vi.fn().mockResolvedValueOnce({ ...evidence(start, 10), depth: 12, bestMove: null }).mockRejectedValueOnce(new Error('timeout')) };
    await new GameAnalysisController(engine).run(game, 'run', [], async (r) => { saved.push(r); });
    expect(saved[0].evidence).toBeDefined(); expect(saved[1].error).toBe('timeout');
    expect(analysisSummary(game, 'run', saved)).toMatchObject({ complete: false, findings: [] });
  });
  it('rejects shallow results and ignores stale replies after cancellation', async () => {
    await expect(evaluate({ analyze: vi.fn().mockResolvedValue({ ...evidence(start, 10), depth: 9 }) }, start, 12)).rejects.toThrow('Incomplete');
    let release!: (value: unknown) => void; const save = vi.fn();
    const engine = { stop: vi.fn(), analyze: vi.fn().mockImplementation(() => new Promise((resolve) => { release = resolve; })) };
    const controller = new GameAnalysisController(engine); const game = await importGame('1. e4 *', 'white');
    const pending = controller.run(game, 'a', [], save); controller.stop(); release({ ...evidence(start, 0), depth: 12 });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' }); expect(save).not.toHaveBeenCalled();
  });
});
describe('local repository and practice history', () => {
  beforeEach(resetGuidedMemoryStoreForTests);
  it('isolates accounts, requires explicit guest copy and preserves cards after game deletion', async () => {
    const repo = new GameReviewRepository(null); const game = await importGame('1. e4 *', 'white');
    await repo.save('local', 'game', game); expect((await repo.load('account')).games).toEqual([]);
    await repo.copyGuest('account'); expect((await repo.load('account')).games).toHaveLength(1);
    await repo.save('account', 'game', game, true); expect((await repo.load('account')).games).toHaveLength(0);
    expect((await repo.load('local')).games).toHaveLength(1);
    await expect(repo.save('account', 'game', game)).rejects.toThrow('removed'); expect(await repo.pending('account')).toBe(1);
  });
  it('keeps drafts and the first due answer authoritative across retries', async () => {
    const repo = new GameReviewRepository(null), game = await importGame('1. e4 *', 'white');
    const card: PracticeCard = { schema: 1, id: 'card', gameId: game.id, side: 'white', version: ANALYSIS_VERSION, createdAt: '2026-09-01T00:00:00Z', finding: { ply: 0, fen: start, played: 'e2e4', alternative: 'd2d4', before: evidence(start, 150), after: evidence(game.fens[1], 0), loss: 150, severity: 150, category: 'evaluation', explanation: 'Evaluation loss' } };
    const first: PracticeSession = { schema: 1, id: 'first', cardId: card.id, createdAt: card.createdAt, updatedAt: card.createdAt, move: 'd4', plan: 'Control the centre', assisted: false, submittedAt: '2026-09-01T00:01:00Z', correct: false };
    await repo.save('local', 'card', card); await repo.save('local', 'session', first);
    const retry = { ...first, id: 'retry', correct: true, createdAt: '2026-09-01T00:02:00Z', submittedAt: '2026-09-01T00:03:00Z' };
    const mastery = cardMastery('local', card, [retry, first]); expect(mastery.tactics.streak).toBe(0);
    expect(dueCards('local', await repo.load('local'), '2026-09-01T12:00:00Z')).toHaveLength(0);
    expect((await repo.load('local')).sessions[0].plan).toBe('Control the centre');
    expect(cardMastery('local', card, [{ ...first, correct: true, assisted: true }]).tactics.score).toBe(0);
  });
});
