import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { EngineService, type EngineAnalysis } from './engineService';

export function formatAnalysis(fen: string, result: EngineAnalysis): string {
  const position = new Chess(fen);
  const side = position.turn() === 'w' ? 'White' : 'Black';
  if (!result.bestMove) return 'No legal move: this position has ended.';
  let candidate: string;
  try { candidate = position.move(result.bestMove).san; }
  catch { return 'The engine returned an unavailable move. Try analyzing this position again.'; }
  const score = result.score;
  const evaluation = !score ? '' : score.type === 'mate'
    ? ` ${score.value > 0 ? side : side === 'White' ? 'Black' : 'White'} can force mate in ${Math.abs(score.value)}.`
    : ` Evaluation ${(score.value * (side === 'White' ? 1 : -1) / 100).toFixed(2)} pawns from White’s perspective.`;
  return `${side} to move · Candidate: ${candidate}.${evaluation}${result.depth ? ` Depth ${result.depth}.` : ''}`;
}

/** Results and pending work belong to both a position and its learning context. */
export function usePositionAnalysis(fen: string, scope: string) {
  const engine = useRef(new EngineService());
  const generation = useRef(0);
  const key = scope + '|' + fen;
  const currentKey = useRef(key);
  currentKey.current = key;
  const [result, setResult] = useState({ key: '', text: '', busy: false });
  useEffect(() => {
    return () => { generation.current++; engine.current.stop(); };
  }, [key]);
  const stop = () => {
    generation.current++;
    engine.current.stop();
    setResult({ key, text: 'Analysis stopped. You can try again.', busy: false });
  };
  const run = async () => {
    const request = ++generation.current;
    engine.current.stop();
    setResult({ key, text: 'Analyzing this position…', busy: true });
    try {
      const analysis = await engine.current.analyze(fen, { depth: 8 });
      if (request === generation.current && currentKey.current === key) setResult({ key, text: formatAnalysis(fen, analysis), busy: false });
    } catch {
      if (request === generation.current && currentKey.current === key) setResult({ key, text: 'Analysis is unavailable. Your position is preserved; try again when ready.', busy: false });
    }
  };
  return { text: result.key === key ? result.text : '', busy: result.key === key && result.busy, run, stop };
}
