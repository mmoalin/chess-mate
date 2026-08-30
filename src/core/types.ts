export type BoardOrientation = 'white' | 'black';

export type GameMode = 'today' | 'repertoire' | 'idea-training' | 'opening-trainer' | 'curriculum' | 'game-review' | 'admin';

export type MoveAttemptResult =
  | { ok: true; san: string; fen: string }
  | { ok: false; reason: string };


export type GameSnapshot = {
  fen: string;
  pgn: string;
  history: string[];
  turn: 'w' | 'b';
  isGameOver: boolean;
  legalTargets: Record<string, string[]>;
};

export type UciMove = {
  from: string;
  to: string;
  promotion?: string;
};
