import { Chess } from 'chess.js';
import type { PositionKey } from './types';

export function buildPositionKey(fen: string): PositionKey {
  const chess = new Chess(fen);
  const [board, turn, castling = '-', enPassant = '-'] = chess.fen().split(' ');
  const normalizedCastling = normalizeCastling(castling);
  const normalizedEnPassant = hasLegalEnPassant(chess) ? enPassant : '-';
  return `${board} ${turn} ${normalizedCastling} ${normalizedEnPassant}`;
}

export function positionKeyToFen(key: PositionKey): string {
  return `${key} 0 1`;
}

function normalizeCastling(value: string): string {
  if (value === '-') return value;
  const normalized = ['K', 'Q', 'k', 'q'].filter((flag) => value.includes(flag)).join('');
  return normalized || '-';
}

function hasLegalEnPassant(chess: Chess): boolean {
  return chess.moves({ verbose: true }).some((move) => move.flags.includes('e'));
}
