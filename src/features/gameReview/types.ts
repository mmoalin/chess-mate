import type { EngineScore } from '../../services/engineService';

export const ANALYSIS_VERSION = 'stockfish-17.1-game-v1';
export type Side = 'white' | 'black';
export type Game = { schema: 1; id: string; fingerprint: string; headers: Record<string, string>; startFen: string; moves: string[]; sans: string[]; fens: string[]; pgn: string; side: Side; createdAt: string };
export type Evidence = { fen: string; version: string; requestedDepth: number; depth: number; score: EngineScore; pv: string[]; settings?: { depth: number; timeoutMs: number; threads: number; hashMb: number }; terminal?: 'mate' | 'draw' };
export type PositionResult = { schema: 1; id: string; runId: string; fen: string; depth: number; evidence?: Evidence; error?: string; assessment?: { before: Evidence; after: Evidence; side: Side; played: string; afterFen: string; learnerLossCp: number | null; lostForcedWin: boolean; allowedForcedLoss: boolean } };
export type AnalysisRun = { schema: 1; id: string; gameId: string; version: string; createdAt: string };
export type Finding = { ply: number; fen: string; played: string; alternative: string; before: Evidence; after: Evidence; loss: number | null; category: 'mate' | 'material' | 'evaluation'; severity: number; explanation: string };
export type PracticeCard = { schema: 1; id: string; gameId: string; side: Side; version: string; finding: Finding; createdAt: string };
export type PracticeSession = { schema: 1; id: string; cardId: string; createdAt: string; updatedAt: string; move: string; plan: string; assisted: boolean; practiceOnly?: boolean; originAttemptId?: string; submittedAt?: string; correct?: boolean; error?: string; evidence?: Evidence };
export type GameRecord = Game | AnalysisRun | PositionResult | PracticeCard | PracticeSession;
export type RecordKind = 'game' | 'run' | 'position' | 'card' | 'session';
export type Envelope = { kind: RecordKind; id: string; value: GameRecord; revision: number; mutationId: string; pending: boolean; deleted: boolean };
export type Library = { games: Game[]; runs: AnalysisRun[]; positions: PositionResult[]; cards: PracticeCard[]; sessions: PracticeSession[] };
