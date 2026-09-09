import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChessBoardUI } from './ChessBoardUI';
import { GameManager } from '../core/gameManager';

vi.mock('react-chessboard', () => ({ Chessboard: ({ options }: any) => <div>{Array.from({ length: 64 }, (_, index) => {
  const square = String.fromCharCode(97 + index % 8) + (8 - Math.floor(index / 8));
  const Square = options.squareRenderer;
  return <div key={square} onClick={() => options.onSquareClick({ square })}><Square square={square}><span tabIndex={0}>piece renderer</span></Square></div>;
})}</div> }));

describe('board input', () => {
  it('has one named tab stop and plays using square navigation', async () => {
    const manager = new GameManager(); const onMoveAttempt = vi.fn(() => true);
    const view = render(<ChessBoardUI {...manager.snapshot()} orientation="white" onMoveAttempt={onMoveAttempt} />);
    expect(view.container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    const pawn = screen.getByRole('button', { name: 'e2, White pawn' });
    await userEvent.tab(); expect(pawn).toHaveFocus(); await userEvent.keyboard('{Enter}{ArrowUp}{ArrowUp}{Enter}');
    expect(onMoveAttempt).toHaveBeenCalledWith('e2', 'e4', undefined);
    expect(screen.getByRole('button', { name: 'e4, empty' })).toHaveFocus();
  });
  it('reverses arrow directions for Black and lets Escape cancel selection', async () => {
    const manager = new GameManager(); manager.applySanMove('e4');
    const onMoveAttempt = vi.fn(() => true);
    render(<ChessBoardUI {...manager.snapshot()} orientation="black" onMoveAttempt={onMoveAttempt} />);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}{Escape}{ArrowUp}{ArrowUp}{Enter}');
    expect(onMoveAttempt).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'e5, empty' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'e7, Black pawn' }));
    await userEvent.click(screen.getByRole('button', { name: 'e5, empty' }));
    expect(onMoveAttempt).toHaveBeenCalledWith('e7', 'e5', undefined);
  });
  it('does not allow tap moves on an inspection board', async () => {
    const manager = new GameManager(); const onMoveAttempt = vi.fn(() => true);
    render(<ChessBoardUI fen={manager.snapshot().fen} legalTargets={{}} orientation="white" onMoveAttempt={onMoveAttempt} />);
    await userEvent.click(screen.getByRole('button', { name: 'e2, White pawn' }));
    await userEvent.click(screen.getByRole('button', { name: 'e4, empty' }));
    expect(onMoveAttempt).not.toHaveBeenCalled();
  });
});
