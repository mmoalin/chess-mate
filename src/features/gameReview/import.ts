import { Chess } from 'chess.js';
import type { Game, Side } from './types';

export async function digest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function importGame(pgn: string, side: Side): Promise<Game> {
  if (new TextEncoder().encode(pgn).length > 1024 * 1024) throw new Error('Import one PGN of at most 1 MB.');
  if (!pgn.trim()) throw new Error('Paste or upload a PGN first.');
  // Remove comments and nested variations before counting main-line results/headers.
  let main = '', variation = 0, comment = false, lineComment = false, header = false, quoted = false, escaped = false;
  for (const char of pgn) {
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (comment) { if (char === '}') comment = false; continue; }
    if (header) {
      main += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = !quoted;
      else if (char === ']' && !quoted) header = false;
      continue;
    }
    if (char === '[' && !variation) { header = true; main += char; continue; }
    if (char === '{') { comment = true; continue; }
    if (char === ';') { lineComment = true; continue; }
    if (char === '(') { variation++; continue; }
    if (char === ')') { if (--variation < 0) throw new Error('Malformed PGN variation.'); continue; }
    if (!variation) main += char;
  }
  if (comment || variation || header) throw new Error('Malformed PGN: an unclosed header, comment or variation.');
  const tags = [...main.matchAll(/\[(\w+)\s+"(?:[^"\\]|\\.)*"\]/g)].map((match) => match[1]);
  const movetext = main.replace(/\[[^\]]*\]/g, '');
  const results = [...movetext.matchAll(/(?:^|\s)(1-0|0-1|1\/2-1\/2|\*)(?=\s|$)/g)];
  if (new Set(tags).size !== tags.length || results.length > 1 || (results[0] && movetext.slice(results[0].index! + results[0][0].length).trim())) throw new Error('Import one game at a time. Multi-game PGN files are not supported.');
  const chess = new Chess();
  try { chess.loadPgn(pgn); } catch { throw new Error('Invalid PGN: check the starting FEN and legal main-line moves.'); }
  const headers = chess.getHeaders();
  if (headers.Variant && !/^(standard|chess|normal)$/i.test(headers.Variant)) throw new Error('Only standard chess is supported.');
  const history = chess.history({ verbose: true });
  if (!history.length) throw new Error('The game must contain at least one legal move.');
  if (history.length > 600) throw new Error('Import a game with at most 600 plies (300 moves).');
  const startFen = history[0].before;
  const moves = history.map((move) => move.from + move.to + (move.promotion ?? ''));
  const fingerprint = await digest(JSON.stringify([startFen, moves, side]));
  return { schema: 1, id: fingerprint, fingerprint, headers, startFen, moves, sans: history.map((move) => move.san), fens: [startFen, ...history.map((move) => move.after)], pgn: pgn.trim(), side, createdAt: new Date().toISOString() };
}
