import { Chess } from 'chess.js';
const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export function note(board, san) {
  const next = new Chess(board.fen()); const move = next.move(san);
  const who = move.color === 'b' ? 'Black' : 'White';
  if (move.isKingsideCastle() || move.isQueensideCastle()) return `${who} castles, moving the king away from the central files and bringing a rook toward the centre.`;
  let text = move.isEnPassant() ? `${who} captures en passant from ${move.from} to ${move.to}, removing the pawn beside ${move.from}. The two-square pawn advance made this reply possible for one move.`
    : move.captured ? `${who} captures the ${names[move.captured]} on ${move.to} with the ${names[move.piece]} from ${move.from}. Recount the material and check the possible recaptures.`
    : `${who} ${['n', 'b'].includes(move.piece) && ['1', '8'].includes(move.from[1]) ? 'develops' : 'moves'} the ${names[move.piece]} from ${move.from} to ${move.to}.`;
  if (move.promotion) text += ` The pawn promotes to a ${names[move.promotion]}; update the material count and look for checks.`;
  const targets = next.board().flat().filter(piece => piece && piece.color !== move.color && next.attackers(piece.square, move.color).includes(move.to));
  if (targets.length) text += ` From ${move.to}, it attacks ${targets.map(piece => `the ${names[piece.type]} on ${piece.square}`).join(' and ')}.`;
  else if (['n', 'b'].includes(move.piece)) text += ' Compare its new squares with the opponent’s central pawn breaks.';
  else if (move.piece === 'p' && !move.promotion && !move.isEnPassant()) text += ['d4', 'e4', 'd5', 'e5'].includes(move.to) ? ' The pawn claims central space; check how the opponent can challenge its support.' : ' Check which squares this irreversible pawn move leaves behind.';
  else if (move.piece === 'r') text += ' Check the file and possible entry squares before exchanging rooks.';
  else if (move.piece === 'q') text += ' Check the opponent’s forcing moves before relying on the new queen placement.';
  else if (move.piece === 'k') text += ' King activity must be balanced against checks and exposed squares.';
  if (next.isCheck()) text += ' The opponent must answer the check before continuing a positional plan.';
  return text;
}
