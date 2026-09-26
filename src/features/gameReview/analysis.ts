import { Chess } from 'chess.js';
import { EngineService } from '../../services/engineService';
import { ANALYSIS_VERSION, type Evidence, type Finding, type Game, type PositionResult, type Side } from './types';

export const settings = (depth: number) => ({ depth, timeoutMs: depth === 16 ? 30000 : 15000, threads: 1, hashMb: 16 });
export const resultKey = (runId: string, fen: string, depth: number) => `${runId}:${depth}:${fen}`;
function completeEvidence(result: PositionResult): result is PositionResult & { evidence: Evidence } {
  const e = result.evidence;
  const expected = settings(result.depth);
  const matchingSettings = !e?.settings || Object.entries(expected).every(([key, value]) => e.settings?.[key as keyof typeof expected] === value);
  return !!e && matchingSettings && e.version === ANALYSIS_VERSION && e.fen === result.fen && e.requestedDepth === result.depth && e.depth >= result.depth && !!e.score && Number.isFinite(e.score.value) && ['cp','mate'].includes(e.score.type) && (e.terminal === 'mate' || e.terminal === 'draw' || (Array.isArray(e.pv) && e.pv.length > 0));
}
export function relative(e: Evidence, side: Side) {
  const sign = (e.fen.split(' ')[1] === (side === 'white' ? 'w' : 'b')) ? 1 : -1;
  if (e.terminal === 'mate') return { type: 'mate' as const, value: -sign };
  return { type: e.score.type, value: e.score.value * sign };
}
export function lossBetween(before: Evidence, after: Evidence, side: Side): { loss: number | null; mate: boolean; severity: number } {
  const a = relative(before, side), b = relative(after, side);
  const win = (s: typeof a) => s.type === 'mate' && s.value > 0;
  const lose = (s: typeof a) => s.type === 'mate' && s.value < 0;
  if ((win(a) && !win(b)) || (!lose(a) && lose(b))) return { loss: null, mate: true, severity: 0 };
  const loss = a.type === 'cp' && b.type === 'cp' ? Math.max(0, a.value - b.value) : null;
  return { loss, mate: false, severity: loss ?? 0 };
}
export function supportedAnswer(before: Evidence, after: Evidence, side: Side): boolean {
  const a = relative(before, side), b = relative(after, side);
  if (a.type === 'mate' && a.value > 0) return b.type === 'mate' && b.value > 0;
  if (b.type === 'mate') return b.value > 0 || (a.type === 'mate' && a.value < 0);
  if (a.type === 'mate' && a.value < 0) return true;
  return a.type === 'cp' && b.type === 'cp' && a.value - b.value <= 50;
}
export async function evaluate(engine: Pick<EngineService, 'analyze'>, fen: string, depth: number): Promise<Evidence> {
  const board = new Chess(fen);
  if (board.isGameOver()) return { fen, version: ANALYSIS_VERSION, settings: settings(depth), requestedDepth: depth, depth, score: { type: board.isCheckmate() ? 'mate' : 'cp', value: 0 }, terminal: board.isCheckmate() ? 'mate' : 'draw', pv: [] };
  const result = await engine.analyze(fen, settings(depth));
  if (!result.score || (result.depth ?? 0) < depth || !result.pv.length) throw new Error('Incomplete engine evidence. Retry this position.');
  return { fen, version: ANALYSIS_VERSION, settings: settings(depth), requestedDepth: depth, depth: result.depth!, score: result.score, pv: result.pv };
}
export async function assessMove(engine: Pick<EngineService, 'analyze'>, reference: Evidence, move: string, side: Side) {
  if (reference.version !== ANALYSIS_VERSION || reference.requestedDepth !== 16 || reference.depth < 16 || !reference.score || !reference.pv.length) throw new Error('Missing confirmed grading evidence.');
  const board = new Chess(reference.fen), candidate = board.move(move);
  const uci = candidate.from + candidate.to + (candidate.promotion ?? '');
  // The reference PV already assessed this exact move at depth 16. Reuse that evidence.
  if (uci === reference.pv[0]) return { correct: true, evidence: reference };
  const evidence = await evaluate(engine, board.fen(), 16);
  return { correct: supportedAnswer(reference, evidence, side), evidence };
}
export class GameAnalysisController {
  private generation = 0;
  constructor(private engine: Pick<EngineService, 'analyze' | 'stop'> = new EngineService()) {}
  stop() { this.generation++; this.engine.stop(); }
  async run(game: Game, runId: string, previous: PositionResult[], save: (result: PositionResult) => Promise<void>) {
    this.stop(); const generation = this.generation;
    const cache = new Map(previous.filter(completeEvidence).map((r) => [`${r.depth}:${r.fen}`, r.evidence]));
    const check = () => { if (generation !== this.generation) throw new DOMException('Analysis paused.', 'AbortError'); };
    const get = async (fen: string, depth: number) => {
      check(); const id = resultKey(runId, fen, depth);
      try {
        const evidence = cache.get(`${depth}:${fen}`) ?? await evaluate(this.engine, fen, depth); check();
        cache.set(`${depth}:${fen}`, evidence);
        await save({ schema: 1, id, runId, fen, depth, evidence }); check(); return evidence;
      } catch (error) {
        check(); await save({ schema: 1, id, runId, fen, depth, error: error instanceof Error ? error.message : 'Engine failed.' });
        return undefined;
      }
    };
    const retainLoss = async (ply: number, before: Evidence, after: Evidence) => {
      check(); const a = relative(before, game.side), b = relative(after, game.side);
      await save({ schema:1, id:`${runId}:assessment:${ply}:${before.requestedDepth}`, runId, fen:before.fen, depth:before.requestedDepth,
        assessment:{ before, after, side:game.side, played:game.moves[ply], afterFen:after.fen, learnerLossCp:lossBetween(before,after,game.side).loss,
          lostForcedWin:a.type==='mate' && a.value>0 && !(b.type==='mate' && b.value>0), allowedForcedLoss:!(a.type==='mate' && a.value<0) && b.type==='mate' && b.value<0 } });
      check();
    };
    for (let ply = 0; ply < game.moves.length; ply++) {
      if (new Chess(game.fens[ply]).turn() !== (game.side === 'white' ? 'w' : 'b')) continue;
      const before = await get(game.fens[ply], 12), after = await get(game.fens[ply + 1], 12);
      if (!before || !after) continue;
      await retainLoss(ply, before, after);
      const loss = lossBetween(before, after, game.side);
      if (loss.mate || (loss.loss ?? 0) >= 100) { const confirmedBefore = await get(game.fens[ply], 16), confirmedAfter = await get(game.fens[ply + 1], 16); if (confirmedBefore && confirmedAfter) await retainLoss(ply, confirmedBefore, confirmedAfter); }
    }
  }
}
export function analysisSummary(game: Game, runId: string, results: PositionResult[]) {
  const evidence = new Map(results.filter(completeEvidence).filter((r) => r.runId === runId).map((r) => [`${r.depth}:${r.fen}`, r.evidence]));
  const findings: Finding[] = []; let total = 0, completed = 0;
  for (let ply = 0; ply < game.moves.length; ply++) {
    if (new Chess(game.fens[ply]).turn() !== (game.side === 'white' ? 'w' : 'b')) continue;
    total++;
    const first = evidence.get(`12:${game.fens[ply]}`), next = evidence.get(`12:${game.fens[ply + 1]}`);
    if (!first || !next) continue;
    const screened = lossBetween(first, next, game.side);
    if (!screened.mate && (screened.loss ?? 0) < 100) { completed++; continue; }
    const before = evidence.get(`16:${game.fens[ply]}`), after = evidence.get(`16:${game.fens[ply + 1]}`);
    if (!before || !after) continue;
    completed++; const loss = lossBetween(before, after, game.side);
    // Independent searches can disagree across the move boundary. If the
    // confirmed best move is the move played, there is no corrective alternative.
    if (before.pv[0] === game.moves[ply]) continue;
    if (!loss.mate && (loss.loss ?? 0) < 100) continue;
    const facts = continuationFacts(after, game.side);
    const a = relative(before, game.side), b = relative(after, game.side);
    const mateExplanation = [a.type === 'mate' && a.value > 0 && !(b.type === 'mate' && b.value > 0) ? 'The reference line forces mate; the played move no longer retains that confirmed outcome.' : '', !(a.type === 'mate' && a.value < 0) && b.type === 'mate' && b.value < 0 ? 'The played move allows the opponent to force mate in the confirmed line.' : ''].filter(Boolean).join(' ');
    findings.push({ ply, fen: before.fen, played: game.moves[ply], alternative: before.pv[0], before, after, loss: loss.loss, severity: loss.severity, category: loss.mate ? 'mate' : facts.materialLoss ? 'material' : 'evaluation', explanation: loss.mate ? mateExplanation : `The confirmed evaluation loss is ${loss.loss} centipawns. ${facts.text}` });
  }
  const ranked = findings.sort((a, b) => Number(b.category === 'mate') - Number(a.category === 'mate') || b.severity - a.severity || a.ply - b.ply);
  const selected: Finding[] = [];
  for (const finding of ranked) if (selected.every((old) => Math.abs(old.ply - finding.ply) >= 4) && selected.length < 3) selected.push(finding);
  for (const finding of ranked) if (selected.length < 3 && !selected.includes(finding)) selected.push(finding);
  return { total, completed, complete: total === completed, findings: selected };
}
function material(board: Chess, side: Side) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  return board.board().flat().reduce((sum, piece) => sum + (piece ? values[piece.type] * (piece.color === (side === 'white' ? 'w' : 'b') ? 1 : -1) : 0), 0);
}
export function continuationFacts(evidence: Evidence, side: Side) {
  const board = new Chess(evidence.fen), initial = material(board, side); const facts: string[] = [];
  for (const uci of evidence.pv.slice(0, 8)) {
    try { const move = board.move(uci); if (move.captured) facts.push(`${move.san} captures a ${ {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'}[move.captured]}`); else if (move.san.includes('+') || move.san.includes('#')) facts.push(`${move.san} gives ${board.isCheckmate() ? 'mate' : 'check'}`); } catch { break; }
  }
  return { materialLoss: material(board, side) < initial, text: facts.length ? `In the displayed continuation: ${facts.join('; ')}.` : 'Replay the engine continuation to inspect the difference.' };
}
