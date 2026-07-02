import { Chess, type Move } from 'chess.js';
import type { GameSnapshot, MoveAttemptResult } from './types';

export class GameManager {
  private game: Chess;
  private replayPositions: string[];

  constructor(fen?: string) {
    this.game = new Chess(fen);
    this.replayPositions = [this.game.fen()];
  }

  snapshot(): GameSnapshot {
    return {
      fen: this.game.fen(),
      pgn: this.game.pgn(),
      history: this.game.history(),
      turn: this.game.turn(),
      isGameOver: this.game.isGameOver(),
      legalTargets: this.getLegalTargets()
    };
  }

  attemptMove(from: string, to: string, promotion = 'q'): MoveAttemptResult {
    const move = this.tryMove({ from, to, promotion });

    if (!move) {
      return { ok: false, reason: 'Illegal move' };
    }

    this.replayPositions = [...this.replayPositions, this.game.fen()];
    return { ok: true, san: move.san, fen: this.game.fen() };
  }

  applySanMove(san: string): MoveAttemptResult {
    const move = this.tryMove(san);

    if (!move) {
      return { ok: false, reason: 'Illegal move' };
    }

    this.replayPositions = [...this.replayPositions, this.game.fen()];
    return { ok: true, san: move.san, fen: this.game.fen() };
  }

  undo(): Move | null {
    const move = this.game.undo();
    this.replayPositions = this.replayPositions.slice(0, Math.max(1, this.replayPositions.length - 1));
    return move;
  }

  reset(fen?: string) {
    this.game = new Chess(fen);
    this.replayPositions = [this.game.fen()];
  }

  loadPgn(pgn: string): { ok: true } | { ok: false; reason: string } {
    try {
      const imported = new Chess();
      imported.loadPgn(pgn);

      const replay = new Chess();
      const positions = [replay.fen()];
      for (const san of imported.history()) {
        replay.move(san);
        positions.push(replay.fen());
      }

      this.game = imported;
      this.replayPositions = positions;
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'Invalid PGN' };
    }
  }

  getReplayPositions(): string[] {
    return [...this.replayPositions];
  }

  private getLegalTargets(): Record<string, string[]> {
    const targets: Record<string, string[]> = {};

    for (const move of this.game.moves({ verbose: true })) {
      targets[move.from] ??= [];
      targets[move.from].push(move.to);
    }

    return targets;
  }

  private tryMove(move: string | { from: string; to: string; promotion?: string }): Move | null {
    try {
      return this.game.move(move);
    } catch {
      return null;
    }
  }
}
