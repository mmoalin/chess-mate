import { Chessboard } from 'react-chessboard';
import type { BoardOrientation } from '../core/types';

type Arrow = {
  startSquare: string;
  endSquare: string;
  color: string;
};

type ChessBoardUIProps = {
  fen: string;
  orientation: BoardOrientation;
  legalTargets: Record<string, string[]>;
  lastMove?: { from: string; to: string } | null;
  arrows?: Arrow[];
  onMoveAttempt: (from: string, to: string, promotion?: string) => boolean;
};

export function ChessBoardUI({ fen, orientation, legalTargets, lastMove, arrows = [], onMoveAttempt }: ChessBoardUIProps) {
  const highlightedSquares = buildSquareStyles(legalTargets, lastMove);

  return (
    <div className="board-shell" aria-label="Chess board" style={{ minWidth: 320, minHeight: 320 }}>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          showNotation: true,
          allowDrawingArrows: true,
          arrows,
          squareStyles: highlightedSquares,
          boardStyle: {
            borderRadius: 8,
            boxShadow: '0 18px 40px rgba(16, 24, 40, 0.16)'
          },
          darkSquareStyle: { backgroundColor: '#6d7f5f' },
          lightSquareStyle: { backgroundColor: '#ede7d2' },
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!targetSquare) return false;
            return onMoveAttempt(sourceSquare, targetSquare, 'q');
          }
        }}
      />
    </div>
  );
}

function buildSquareStyles(
  legalTargets: Record<string, string[]>,
  lastMove?: { from: string; to: string } | null
): Record<string, React.CSSProperties> {
  const styles: Record<string, React.CSSProperties> = {};

  for (const [from, targets] of Object.entries(legalTargets)) {
    if (targets.length > 0) {
      styles[from] = { boxShadow: 'inset 0 0 0 3px rgba(43, 126, 98, 0.55)' };
    }
  }

  if (lastMove) {
    styles[lastMove.from] = { backgroundColor: 'rgba(247, 181, 56, 0.45)' };
    styles[lastMove.to] = { backgroundColor: 'rgba(247, 181, 56, 0.55)' };
  }

  return styles;
}
