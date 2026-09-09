import type { UciMove } from '../core/types';
import { Chess } from 'chess.js';

export type EngineScore = { type: 'cp' | 'mate'; value: number };

export type EngineInfo = {
  depth: number | null;
  score: EngineScore | null;
  pv: string[];
};

export type AnalysisOptions = {
  depth?: number;
  moveTimeMs?: number;
  timeoutMs?: number;
};

export type EngineAnalysis = EngineInfo & {
  bestMove: UciMove | null;
};

type PendingAnalysis = {
  resolve: (analysis: EngineAnalysis) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  latestInfo: EngineInfo;
};

export function parseBestMove(line: string): UciMove | null {
  const match = line.match(/^bestmove\s+([a-h][1-8])([a-h][1-8])([qrbn])?/);
  if (!match) return null;

  return {
    from: match[1],
    to: match[2],
    promotion: match[3]
  };
}

export function parseInfoLine(line: string): EngineInfo | null {
  if (!line.startsWith('info ')) return null;

  const tokens = line.split(/\s+/);
  const depthIndex = tokens.indexOf('depth');
  const scoreIndex = tokens.indexOf('score');
  const pvIndex = tokens.indexOf('pv');
  const depth = depthIndex >= 0 ? Number(tokens[depthIndex + 1]) : null;
  const scoreType = scoreIndex >= 0 ? tokens[scoreIndex + 1] : null;
  const rawScoreValue = scoreIndex >= 0 ? Number(tokens[scoreIndex + 2]) : Number.NaN;
  let score: EngineScore | null = null;
  if ((scoreType === 'cp' || scoreType === 'mate') && Number.isFinite(rawScoreValue)) {
    score = { type: scoreType, value: rawScoreValue };
  }

  return {
    depth: Number.isFinite(depth) ? depth : null,
    score,
    pv: pvIndex >= 0 ? tokens.slice(pvIndex + 1) : []
  };
}

export class EngineService {
  private worker: Worker | null = null;
  private pending: PendingAnalysis | null = null;

  constructor(private readonly workerFactory = createStockfishWorker) {}

  async analyze(fen: string, options: AnalysisOptions = {}): Promise<EngineAnalysis> {
    if (this.pending) throw new Error('Engine is already analysing a position.');
    if (new Chess(fen).isGameOver()) return { depth: null, score: null, pv: [], bestMove: null };
    const worker = this.ensureWorker();
    const depth = options.depth ?? 10;
    const moveTimeMs = options.moveTimeMs;

    return new Promise((resolve, reject) => {
      this.pending = {
        resolve,
        reject,
        timer: setTimeout(() => this.failPending(new Error('Engine timed out. Try again.')), options.timeoutMs ?? 15000),
        latestInfo: { depth: null, score: null, pv: [] }
      };

      worker.postMessage('uci');
      worker.postMessage('isready');
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(moveTimeMs ? `go movetime ${moveTimeMs}` : `go depth ${depth}`);
    });
  }

  async bestMove(fen: string, options: AnalysisOptions = {}): Promise<UciMove | null> {
    const analysis = await this.analyze(fen, options);
    return analysis.bestMove;
  }

  async compareMove(fen: string, candidate: UciMove, options: AnalysisOptions = {}): Promise<{ candidate: EngineAnalysis; best: EngineAnalysis; delta: number | null }> {
    const position = new Chess(fen);
    position.move(candidate);
    const best = await this.analyze(fen, options);
    const candidateAnalysis = await this.analyze(position.fen(), options);
    const bestForMover = scoreForSideToMove(best.score);
    const candidateForMover = candidateAnalysis.score ? -scoreForSideToMove(candidateAnalysis.score)! : null;
    return { candidate: candidateAnalysis, best, delta: bestForMover === null || candidateForMover === null ? null : candidateForMover - bestForMover };
  }

  stop() {
    this.failPending(new DOMException('Engine request cancelled.', 'AbortError'));
  }

  private failPending(error: Error) {
    const pending = this.pending;
    this.pending = null;
    if (pending) { clearTimeout(pending.timer); pending.reject(error); }
    this.worker?.postMessage('stop');
    this.worker?.terminate();
    this.worker = null;
    this.pending = null;
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = this.workerFactory();
      const worker = this.worker;
      worker.onerror = () => { if (this.worker === worker) this.failPending(new Error('Stockfish could not start.')); };
      worker.onmessage = (event: MessageEvent<string>) => {
        if (this.worker !== worker) return;
        this.handleMessage(String(event.data));
      };
    }

    return this.worker;
  }

  private handleMessage(message: string) {
    const info = parseInfoLine(message);
    if (info && this.pending) {
      this.pending.latestInfo = info;
    }

    const bestMove = parseBestMove(message);
    if (message.startsWith('bestmove ') && this.pending) {
      const pending = this.pending;
      this.pending = null;
      clearTimeout(pending.timer);
      pending.resolve({ ...pending.latestInfo, bestMove });
    }
  }
}

function scoreForSideToMove(score: EngineScore | null): number | null {
  if (!score) return null;
  return score.type === 'mate' ? Math.sign(score.value || 1) * 10000 : score.value;
}

function createStockfishWorker(): Worker {
  return new Worker(new URL('../../node_modules/stockfish/src/stockfish-17.1-asm-341ff22.js', import.meta.url));
}
