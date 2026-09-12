import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { Chess } from 'chess.js';
import { starterRepertoires } from '../../data/repertoires';
import { positionKeyToFen } from '../../domain/repertoire/positionKey';
import { GuidedLearnerRepository, LOCAL_LEARNER_ID } from '../../services/guidedLearnerRepository';

vi.mock('react-chessboard', () => ({ Chessboard: ({ options }: { options: { position: string; onPieceDrop: (move: { sourceSquare: string; targetSquare: string }) => boolean } }) => <div aria-label="Chess board mock" data-position={options.position}><button onClick={() => options.onPieceDrop({ sourceSquare: 'd2', targetSquare: 'd3' })}>Play d3</button><button onClick={() => options.onPieceDrop({ sourceSquare: 'f4', targetSquare: 'e5' })}>Play fxe5</button></div> }));

describe('guided repertoire flow', () => {
  it('captures rating and goal, then builds a position-based repertoire map', async () => {
    render(<App />);
    await userEvent.click(screen.getByText('Customize repertoire and training level'));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Rating source/i }), 'lichess');
    await userEvent.type(screen.getByRole('spinbutton', { name: /Optional rating/i }), '1450');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Training goal/i }), 'tactical-danger');
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /^Repertoire$/i }));

    expect(screen.getByRole('region', { name: /Repertoire map/i })).toHaveTextContent(/Vienna/i);
    expect(screen.getByRole('region', { name: /Repertoire map/i })).toHaveTextContent(/Black vs 1.d4/i);
    const profile = await new GuidedLearnerRepository(null).loadProfile(LOCAL_LEARNER_ID);
    expect(profile).toMatchObject({ ratingSource: 'lichess', ratingValue: 1450, depth: 'standard', goal: 'tactical-danger' });
  });

  it('shows a bounded guided session in Today', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /^Today$/i }));
    expect(screen.getByRole('region', { name: /Today workspace/i })).toHaveTextContent(/Your guided practice/i);
    expect(screen.getByRole('region', { name: /Today workspace/i })).toHaveTextContent(/One focused decision/i);
    expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument();
  });

  it('moves through a daily routine and ends with a recap', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Start session' }));
    expect(screen.getByRole('region', { name: 'Daily session progress' })).toHaveTextContent('learn');
    expect(screen.getByRole('button', { name: 'Complete & continue' })).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'White has central space, but the open lines also make king safety urgent.' }));
    await userEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Finish checkpoint' }));
    expect(screen.getByRole('button', { name: 'Complete & continue' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Save & finish later' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue session' }));
    expect(screen.getByRole('heading', { name: 'Checkpoint complete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete & continue' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Complete & continue' }));
    expect(screen.getByRole('region', { name: 'Daily session progress' })).toHaveTextContent('apply');
    expect(screen.getByRole('button', { name: 'Complete & continue' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Skip for today' }));
    expect(screen.getByRole('region', { name: 'Today workspace' })).toHaveTextContent('Daily session complete');
    expect(screen.getByText('Nice work. You can stop here.')).toBeInTheDocument();
    expect(screen.getByText(/1 activities completed.*1 skipped/)).toBeInTheDocument();
  });

  it('retains idea-first practice from the opening and checks the plan before board play', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /Practise opening plans/i }));
    expect(screen.getByRole('region', { name: /Idea training/i })).toHaveTextContent(/Plan Lab \+ Adaptive Sparring/i);
    await userEvent.click(screen.getAllByRole('radio')[0]);
    await userEvent.click(screen.getByRole('button', { name: /Check plan/i }));
    expect(screen.getByRole('region', { name: /Idea training/i })).toHaveTextContent(/Plan recognized/i);
    await userEvent.click(screen.getByRole('button', { name: /Test it on the board/i }));
    expect(screen.getByRole('region', { name: /Idea training/i })).toHaveTextContent(/More than one sound answer may be accepted/i);
  });

  it('connects a line to its model continuation, tactical position and plan lesson', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    const line = starterRepertoires.find((item) => item.id === 'white-vienna-main')!;
    const chess = new Chess();
    line.movesSan.slice(0, line.modelPositionPly).forEach((move) => chess.move(move));
    await userEvent.click(screen.getByRole('button', { name: /See the resulting position/i }));
    expect(screen.getByLabelText('Chess board mock')).toHaveAttribute('data-position', chess.fen());
    line.middlegameIdeas![0].planMoves!.forEach((move) => chess.move(move));
    await userEvent.click(screen.getByRole('button', { name: 'Show plan move 3: O-O' }));
    expect(screen.getByLabelText('Chess board mock')).toHaveAttribute('data-position', chess.fen());
    expect(screen.getByRole('region', { name: /Feedback/i })).toHaveTextContent('example continuation');
    await userEvent.click(screen.getByRole('button', { name: /Tactical decision 2/i }));
    expect(screen.getByLabelText('Chess board mock')).toHaveAttribute('data-position', new Chess(line.criticalPositions![1].fen).fen());
    await userEvent.click(screen.getByRole('button', { name: /^Hint$/i }));
    expect(screen.getByText(line.criticalPositions![1].hint!)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Practise opening plans/i }));
    expect(screen.getByRole('region', { name: /Idea training/i })).toHaveTextContent('Vienna');
  });

  it('restores a tactical decision after a wrong move and resets when returning to line training', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /Tactical decision 2/i }));
    const position = screen.getByLabelText('Chess board mock').getAttribute('data-position');
    await userEvent.click(screen.getByRole('button', { name: 'Play d3' }));
    expect(screen.getByLabelText('Chess board mock')).toHaveAttribute('data-position', position);
    expect(screen.getByRole('region', { name: /Feedback/i })).toHaveTextContent('Try again');
    await userEvent.click(screen.getByRole('button', { name: 'Play fxe5' }));
    expect(screen.getByRole('region', { name: /Feedback/i })).toHaveTextContent('Correct.');
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    expect(screen.getByLabelText('Chess board mock')).toHaveAttribute('data-position', new Chess().fen());
  });

  it('lets learners choose a specific opening plan from the repertoire', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /^Repertoire$/i }));
    await userEvent.click(screen.getAllByText('3 plan lessons for this opening')[0]);
    await userEvent.click(screen.getByRole('button', { name: /Convert initiative into development/i }));
    expect(screen.getByRole('region', { name: /Idea training/i })).toHaveTextContent('Bring pieces before forcing tactics');
  });

  it('restores anonymous onboarding from local storage after remount', async () => {
    const first = render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    first.unmount();
    render(<App />);
    await waitFor(() => expect(screen.queryByRole('region', { name: /Guided repertoire setup/i })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^Today$/i })).toBeInTheDocument();
  });

  it('turns a PGN divergence into a visible game gap', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Train openings' }));
    await userEvent.click(screen.getByRole('button', { name: /^Review$/i }));
    const pgn = screen.getByRole('textbox', { name: /PGN input/i });
    await userEvent.clear(pgn); await userEvent.type(pgn, '1. e4 e5 2. Nc3 Nf6 3. a3');
    await userEvent.click(screen.getByRole('button', { name: /Load PGN/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Today$/i }));
    expect(screen.getByRole('region', { name: /Today workspace/i })).toHaveTextContent(/Compare the repertoire choice before 3.a3/i);
    const [gap] = await new GuidedLearnerRepository(null).loadBacklog(LOCAL_LEARNER_ID);
    await userEvent.click(screen.getByRole('button', { name: /Open saved position/i }));
    expect(screen.getByLabelText('Chess board mock')).toHaveAttribute('data-position', new Chess(positionKeyToFen(gap.positionKey)).fen());
    expect(screen.getByRole('region', { name: /Feedback/i })).toHaveTextContent('Saved gap:');
  });
});
