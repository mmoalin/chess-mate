import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import type { BoardOrientation } from '../core/types';

type Props = {
  fen: string;
  orientation: BoardOrientation;
  legalTargets: Record<string, string[]>;
  lastMove?: { from: string; to: string } | null;
  arrows?: { startSquare: string; endSquare: string; color: string }[];
  onMoveAttempt: (from: string, to: string, promotion?: string) => boolean;
};
type Interaction = {
  chess: Chess; selected: string; focused: string; helpId: string;
  onFocus: (square: string) => void;
  onKey: (event: KeyboardEvent, square: string) => void;
};
const InteractionContext = createContext<Interaction | null>(null);
const names: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

// Stable identity preserves keyboard focus across position and selection updates.
function AccessibleSquare({ square, children }: { square: string; children?: ReactNode }) {
  const context = useContext(InteractionContext)!;
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // Pointer dragging belongs to the library; square controls own keyboard access.
    content.current?.querySelectorAll<HTMLElement>('[tabindex]').forEach((element) => { element.tabIndex = -1; });
  });
  const piece = context.chess.get(square as Square);
  return <div className="board-square-control" role="button" data-board-control={square}
    tabIndex={context.focused === square ? 0 : -1}
    aria-label={`${square}, ${piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${names[piece.type]}` : 'empty'}`}
    aria-pressed={context.selected === square} aria-describedby={context.helpId}
    onFocus={() => context.onFocus(square)} onKeyDown={(event) => context.onKey(event, square)}>
    <div ref={content} aria-hidden="true" className="board-square-content">{children}</div>
  </div>;
}

export function ChessBoardUI({ fen, orientation, legalTargets, lastMove, arrows = [], onMoveAttempt }: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const root = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const [selected, setSelected] = useState('');
  const [focused, setFocused] = useState(orientation === 'white' ? 'e2' : 'e7');
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => { setSelected(''); }, [fen]);
  useEffect(() => { setFocused(orientation === 'white' ? 'e2' : 'e7'); setSelected(''); }, [orientation]);
  function attempt(from: string, to: string) {
    const accepted = onMoveAttempt(from, to, promotionForMove(fen, from, to));
    setSelected('');
    setAnnouncement(accepted ? `${from} to ${to}.` : 'That move is unavailable. Select a piece and try again.');
    return accepted;
  }
  function select(square: string) {
    setFocused(square);
    if (selected === square) { setSelected(''); setAnnouncement('Selection cleared.'); return; }
    if (selected && legalTargets[selected]?.includes(square)) { attempt(selected, square); return; }
    if (legalTargets[square]?.length) {
      setSelected(square);
      setAnnouncement(`${names[chess.get(square as Square)!.type]} on ${square} selected. Legal destinations: ${[...new Set(legalTargets[square])].join(', ')}.`);
    } else { setSelected(''); setAnnouncement('Choose a piece that can move in this position.'); }
  }
  function onKey(event: KeyboardEvent, square: string) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); select(square); return; }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setSelected(''); setAnnouncement('Selection cleared.'); return; }
    const direction = orientation === 'white' ? 1 : -1;
    const offsets: Record<string, [number, number]> = { ArrowUp: [0, direction], ArrowDown: [0, -direction], ArrowLeft: [-direction, 0], ArrowRight: [direction, 0] };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault(); event.stopPropagation();
    const file = Math.max(0, Math.min(7, square.charCodeAt(0) - 97 + offset[0]));
    const rank = Math.max(1, Math.min(8, Number(square[1]) + offset[1]));
    const next = String.fromCharCode(97 + file) + rank;
    setFocused(next);
    root.current?.querySelector<HTMLElement>(`[data-board-control="${next}"]`)?.focus({ preventScroll: true });
  }
  const styles: Record<string, React.CSSProperties> = {};
  if (lastMove) for (const square of [lastMove.from, lastMove.to]) styles[square] = { backgroundColor: 'rgba(247, 181, 56, .55)' };
  if (selected) {
    styles[selected] = { boxShadow: 'inset 0 0 0 4px #245b46' };
    for (const square of legalTargets[selected] ?? []) styles[square] = { backgroundImage: 'radial-gradient(circle, rgba(25,70,48,.65) 18%, transparent 20%)' };
  }
  return <InteractionContext.Provider value={{ chess, selected, focused, helpId, onFocus: setFocused, onKey }}>
    <div ref={root} className="board-shell" aria-label="Chess board">
      <p className="sr-only" id={helpId}>Arrow keys move one square. Enter or Space selects a piece and its destination. Escape cancels. You can also tap two squares or drag a piece.</p>
      <Chessboard options={{
        position: fen, boardOrientation: orientation, showNotation: true, allowDrawingArrows: true, arrows,
        allowDragging: Object.keys(legalTargets).length > 0,
        canDragPiece: ({ square }) => Boolean(square && legalTargets[square]?.length),
        squareRenderer: AccessibleSquare, squareStyles: styles,
        boardStyle: { borderRadius: 8, boxShadow: '0 18px 40px rgba(16, 24, 40, 0.16)' },
        darkSquareStyle: { backgroundColor: '#6d7f5f' }, lightSquareStyle: { backgroundColor: '#ede7d2' },
        onSquareClick: ({ square }) => select(square),
        onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? attempt(sourceSquare, targetSquare) : false
      }} />
      <span className="sr-only" role="status">{announcement}</span>
    </div>
  </InteractionContext.Provider>;
}

export function promotionForMove(fen: string, sourceSquare: string, targetSquare: string): string | undefined {
  const piece = new Chess(fen).get(sourceSquare as Square);
  return piece?.type === 'p' && (targetSquare.endsWith('1') || targetSquare.endsWith('8')) ? 'q' : undefined;
}
