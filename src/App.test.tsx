import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: { position: string } }) => (
    <div aria-label="Chess board mock" data-position={options.position}>
      Board position: {options.position}
    </div>
  )
}));

describe('App', () => {
  it('lands on Today with one next action after onboarding', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Set up your training/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    expect(screen.getByRole('region', { name: 'Today workspace' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Start session' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Show today|Hide today/i })).not.toBeInTheDocument();
  });

  it('keeps repertoire moves above lesson details in the task dock', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));

    const dock = screen.getByRole('complementary', { name: /Task dock/i });
    const dockText = dock.textContent ?? '';

    expect(screen.getByRole('region', { name: /Repertoire moves/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Moves near board/i })).toHaveTextContent(/1 \/ 10/i);
    expect(dockText.indexOf('Move')).toBeLessThan(dockText.indexOf('Lesson goal'));
  });

  it('shows setup before mounting the interactive board', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /Set up your training/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Account/i })).toBeInTheDocument();
  });

  it('uses a single task dock instead of stacked utility cards', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));

    const dock = screen.getByRole('complementary', { name: /Task dock/i });
    expect(dock).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Feedback/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Move List/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show moves/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Account/i })).toBeInTheDocument();
  });

  it('opens move history as a collapsed drawer utility', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));

    expect(screen.queryByRole('region', { name: /Move history/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Show moves/i }));

    expect(screen.getByRole('region', { name: /Move history/i })).toHaveTextContent(/No moves yet/i);
    expect(screen.getByRole('button', { name: /Hide moves/i })).toBeInTheDocument();
  });

  it('navigates the board to a clicked move in the move history', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /Review/i }));
    await userEvent.click(screen.getByRole('button', { name: /Load PGN/i }));
    const finalPosition = screen.getByLabelText('Chess board mock').getAttribute('data-position');

    await userEvent.click(screen.getByRole('button', { name: /Show moves/i }));
    await userEvent.click(screen.getByRole('button', { name: /Move 1.e4/i }));

    const selectedPosition = screen.getByLabelText('Chess board mock').getAttribute('data-position');
    expect(selectedPosition).not.toBe(finalPosition);
    expect(selectedPosition).toContain(' b ');
  });

  it('switches to game review mode from the mode tabs', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /Review/i }));

    expect(screen.getByRole('textbox', { name: /PGN input/i })).toHaveValue('1. e4 e5 2. Nf3 Nc6');
    expect(screen.getByRole('button', { name: /Load PGN/i })).toBeInTheDocument();
  });

  it('uses Review for both PGN replay and engine play', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /Review/i }));
    await userEvent.click(screen.getByRole('button', { name: /Play vs Stockfish/i }));

    expect(screen.getByText(/Stockfish replies automatically/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset game/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /PGN input/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Review a game/i }));

    expect(screen.getByRole('textbox', { name: /PGN input/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Load PGN/i })).toBeInTheDocument();
  });

  it('copies played moves as standard PGN', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /Repertoire move 1: e4/i }));
    await userEvent.click(screen.getByRole('button', { name: /Copy PGN/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('e4')));
    expect(screen.getByText(/PGN copied/i)).toBeInTheDocument();
  });


  it('switches to the curriculum study workflow', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /Study/i }));

    expect(screen.getByRole('heading', { name: /Opening Principles/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Explain a Developing Move/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pass score/i)).toBeInTheDocument();
  });

  it('lets a beginner use hint and reveal during opening practice', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /Openings/i }));
    await userEvent.click(screen.getByRole('button', { name: /Hint/i }));

    expect(screen.getByText(/Look for e4/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Reveal/i }));

    expect(screen.getByText(/Repertoire move: e4/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Feedback/i })).toHaveTextContent(/Repertoire move: e4/i);
  });

  it('navigates the board when a repertoire move chip is clicked', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    const initialPosition = screen.getByLabelText('Chess board mock').getAttribute('data-position');

    await userEvent.click(screen.getByRole('button', { name: /Repertoire move 2: e5/i }));

    const selectedPosition = screen.getByLabelText('Chess board mock').getAttribute('data-position');
    expect(selectedPosition).not.toBe(initialPosition);
    expect(selectedPosition).toContain(' w ');
    expect(screen.getByRole('region', { name: /Repertoire moves/i })).toHaveTextContent(/3 \/ 10/i);
  });

  it('scores an interactive curriculum choice and unlocks the next task', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /Study/i }));
    await userEvent.click(screen.getByRole('radio', { name: /Develop a knight toward the centre/i }));
    await userEvent.click(screen.getByRole('button', { name: /Check answer/i }));

    expect(screen.getByText(/Score 10\/10/i)).toBeInTheDocument();
    expect(screen.getByText(/Correct choice/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next task/i })).toBeEnabled();
  });

  it('detects where a review PGN leaves the selected repertoire', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /Review/i }));
    await userEvent.click(screen.getByRole('button', { name: /Load PGN/i }));

    expect(screen.getByText(/matched through 1…e5/i)).toBeInTheDocument();
    expect(screen.getByText(/First different move: 2.Nf3/i)).toBeInTheDocument();
  });

  it('shows beginner difficulty and middlegame ideas for the default opening line', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));

    expect(screen.getByText(/Beginner/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Middlegame ideas/i })).toHaveTextContent(
      /Build the attack after development/i
    );
  });

  it('surfaces theory branches without making them the default lesson', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));

    expect(screen.getByRole('heading', { name: /Vienna Game: Main Development Plan/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Theory branches/i })).toHaveTextContent(/Vienna Gambit/i);
  });
});
