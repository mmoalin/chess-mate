import type { UciMove } from '../core/types';

export type EngineScore = { type: 'cp' | 'mate'; value: number };

export type EngineInfo = {
  depth: number | null;
  score: EngineScore | null;
  pv: string[];
};

export type AnalysisOptions = {
  depth?: number;
  moveTimeMs?: number;
};

export type EngineAnalysis = EngineInfo & {
  bestMove: UciMove | null;
};

type PendingAnalysis = {
  resolve: (analysis: EngineAnalysis) => void;
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
    const worker = this.ensureWorker();
    const depth = options.depth ?? 10;
    const moveTimeMs = options.moveTimeMs;

    return new Promise((resolve) => {
      this.pending = {
        resolve,
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

  stop() {
    this.worker?.postMessage('stop');
    this.worker?.terminate();
    this.worker = null;
    this.pending = null;
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = this.workerFactory();
      this.worker.onmessage = (event: MessageEvent<string>) => {
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
    if (bestMove && this.pending) {
      const pending = this.pending;
      this.pending = null;
      pending.resolve({ ...pending.latestInfo, bestMove });
    }
  }
}

function createStockfishWorker(): Worker {
  return new Worker(new URL('../../node_modules/stockfish/src/stockfish-17.1-asm-341ff22.js', import.meta.url));
}
