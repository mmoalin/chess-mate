export type BoardOrientation = 'white' | 'black';

export type GameMode = 'opening-trainer' | 'curriculum' | 'game-review';

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
