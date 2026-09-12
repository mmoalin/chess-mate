import { Chess } from 'chess.js';

export function PawnStructure({ fen, label, side = 'white' }: { fen: string; label: string; side?: 'white' | 'black' }) {
  const chess = new Chess(fen);
  const squares = chess.board().flat();
  const labels = squares.filter((p) => p?.type === 'p').map((p) => `${p!.color === 'w' ? 'White' : 'Black'} pawn ${p!.square}`).join(', ');
  const ranks = side === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = (side === 'white' ? 'abcdefgh' : 'hgfedcba').split('');
  return <figure className="pawn-structure"><figcaption>{label}</figcaption><div className="pawn-mini-board" role="img" aria-label={`${label}: ${labels}`}>
    {ranks.flatMap((rank) => files.map((file) => { const square = `${file}${rank}`; const piece = squares.find((p) => p?.square === square && p.type === 'p'); return <span key={square} aria-hidden="true" className={(file.charCodeAt(0) + rank) % 2 ? 'light' : 'dark'}>{piece ? <span className={piece.color === 'w' ? 'white-pawn' : 'black-pawn'}>{piece.color === 'w' ? '♙' : '♟'}</span> : ''}</span>; }))}
  </div></figure>;
}
