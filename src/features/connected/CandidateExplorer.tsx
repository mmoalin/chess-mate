import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Chess } from 'chess.js';
import { ChessBoardUI } from '../../components/ChessBoardUI';
import { EngineService, type EngineAnalysis } from '../../services/engineService';
import { moveLabel } from '../../core/notation';

type Comparison = { label: string; san: string; moves: string[]; score: string; depth: number | null };
export function CandidateExplorer({ fen, side, candidate, lessonMove, explanation, comparisons, saveFeedback, onReturn, onAssistance }: {
  fen: string; side: 'white' | 'black'; candidate?: string; lessonMove?: string; explanation?: string;
  comparisons?: Record<string, string>;
  saveFeedback?: ReactNode;
  onReturn: () => void; onAssistance: () => void;
}) {
  const [moves, setMoves] = useState<string[]>(candidate ? [candidate] : []);
  const [choice, setChoice] = useState(candidate ?? '');
  const [rows, setRows] = useState<Comparison[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const results = useRef<HTMLDivElement>(null);
  const engine = useRef(new EngineService());
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; engine.current.stop(); }, []);
  useEffect(() => {
    if (busy || !rows.length) return;
    const element = results.current;
    const panel = element?.closest<HTMLElement>('.dock-panel');
    element?.focus({ preventScroll: true });
    if (element && panel) panel.scrollTo?.({ top: panel.scrollTop + element.getBoundingClientRect().top - panel.getBoundingClientRect().top - 16 });
  }, [busy]);
  const board = new Chess(fen);
  for (const move of moves) board.move(move);
  const targets: Record<string, string[]> = {};
  if (!busy) for (const move of board.moves({ verbose: true })) (targets[move.from] ??= []).push(move.to);

  function stop() { generation.current++; engine.current.stop(); setBusy(false); }
  async function compare() {
    if (!choice) return;
    stop(); onAssistance(); setError(''); setRows([]); setBusy(true);
    const request = ++generation.current;
    try {
      const base = await engine.current.analyze(fen, { depth: 10 });
      if (request !== generation.current) return;
      const suggested = base.bestMove ? new Chess(fen).move(base.bestMove).san : undefined;
      const options = [{ label: 'Your candidate', san: choice }, { label: 'Lesson example', san: lessonMove }, { label: 'Engine suggestion', san: suggested }].filter((item): item is { label: string; san: string } => Boolean(item.san));
      const cache = new Map<string, Comparison>();
      for (const option of options) {
        let row = cache.get(option.san);
        if (!row) {
          const after = new Chess(fen); after.move(option.san);
          const analysis = await engine.current.analyze(after.fen(), { depth: 10 });
          if (request !== generation.current) return;
          row = { label: option.label, san: option.san, moves: [option.san, ...principalVariation(after.fen(), analysis)], score: scoreLabel(after, analysis), depth: analysis.depth };
          cache.set(option.san, row);
        }
        setRows((previous) => [...previous, { ...row!, label: option.label }]);
      }
    } catch (e) { if (request === generation.current) setError(e instanceof Error ? e.message : 'Analysis unavailable. You can still explore and return to your checkpoint.'); }
    finally { if (request === generation.current) setBusy(false); }
  }
  return <section className="workspace connected-workspace" aria-label="Candidate comparison">
    <div className="board-column"><ChessBoardUI fen={board.fen()} orientation={side} legalTargets={targets} onMoveAttempt={(from, to, promotion) => {
      if (busy) return false;
      try { const played = board.move({ from, to, promotion }); if (!moves.length) { setChoice(played.san); setRows([]); } setMoves([...moves, played.san]); return { accepted: true, message: `${played.san}. Exploration only; your checkpoint is preserved.` }; } catch { return false; }
    }} /></div>
    <aside className="task-dock"><section className="dock-panel candidate-panel">
      {saveFeedback}
      <p className="eyebrow">Explore & compare · ungraded</p><h2>{choice ? `What changes after ${choice}?` : 'Try a candidate on the board'}</h2>
      <p>Play either side to investigate a line. Your lesson position and recorded answers are preserved.</p>
      <div className="button-row"><button className="primary-button" onClick={onReturn}>Return to checkpoint</button><button className="secondary-button" onClick={() => { stop(); setMoves([]); setChoice(''); setRows([]); setError(''); }}>Try another candidate</button><button className="secondary-button" disabled={!moves.length || busy} onClick={() => setMoves(moves.slice(0, -1))}>Undo exploration move</button></div>
      <p className="assistance-note">Comparing candidates uses analysis and marks this checkpoint as assisted. Moving pieces here alone does not grade your answer.</p>
      <button className="secondary-button" disabled={!choice || busy} onClick={() => void compare()}>{busy ? 'Comparing candidates…' : 'Compare with lesson move'}</button>
      {busy && <button className="link-button" onClick={stop}>Stop comparison</button>}
      {error && <p role="alert">{error} Your exploration is preserved. Retry comparison when ready.</p>}
      <div ref={results} tabIndex={-1} className="candidate-results" aria-label="Comparison results" aria-live="polite">{rows.map((row) => <article className="lesson-card" key={row.label}>
        <h3>{row.label}: {row.san}</h3><p>{row.score} · depth {row.depth ?? 'unavailable'}</p>
        <p>{row.moves[1] ? `Engine reply: ${row.moves[1]}.` : 'No engine reply available.'} {comparisons?.[row.san] ?? (row.label === 'Lesson example' ? explanation : 'Compare the reply, king safety, and changes to the pawn structure.')}</p>
        <div className="move-strip" aria-label={`${row.label} continuation`}>{row.moves.map((move, i) => <button key={i} onClick={() => setMoves(row.moves.slice(0, i + 1))}>{moveLabel(i + 1, move, fen)}</button>)}</div>
      </article>)}</div>
      {rows.length > 0 && <p className="analysis">Scores are from White’s perspective at the displayed search depth. A lesson move illustrates an idea; it need not be the engine’s first choice.</p>}
    </section></aside>
  </section>;
}

function principalVariation(fen: string, analysis: EngineAnalysis): string[] {
  const board = new Chess(fen); const moves: string[] = [];
  const pv = analysis.pv.length ? analysis.pv : analysis.bestMove ? [analysis.bestMove.from + analysis.bestMove.to + (analysis.bestMove.promotion ?? '')] : [];
  for (const uci of pv.slice(0, 5)) { try { moves.push(board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined }).san); } catch { break; } }
  return moves;
}
function scoreLabel(board: Chess, result: EngineAnalysis) {
  if (board.isCheckmate()) return 'Checkmate';
  if (board.isDraw()) return 'Draw';
  if (!result.score) return 'Evaluation unavailable';
  const value = result.score.value * (board.turn() === 'w' ? 1 : -1);
  return result.score.type === 'mate' ? `${value > 0 ? 'White' : 'Black'} has a mating line` : `${value >= 0 ? '+' : ''}${(value / 100).toFixed(2)} pawns`;
}
