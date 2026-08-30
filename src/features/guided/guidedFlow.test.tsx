import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { GuidedLearnerRepository, LOCAL_LEARNER_ID } from '../../services/guidedLearnerRepository';

vi.mock('react-chessboard', () => ({ Chessboard: ({ options }: { options: { position: string } }) => <div aria-label="Chess board mock" data-position={options.position} /> }));

describe('guided repertoire flow', () => {
  it('captures rating and goal, then builds a position-based repertoire map', async () => {
    render(<App />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Rating source/i }), 'lichess');
    await userEvent.type(screen.getByRole('spinbutton', { name: /Optional rating/i }), '1450');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Training goal/i }), 'tactical-danger');
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Repertoire$/i }));

    expect(screen.getByRole('region', { name: /Repertoire map/i })).toHaveTextContent(/Vienna/i);
    expect(screen.getByRole('region', { name: /Repertoire map/i })).toHaveTextContent(/Black vs 1.d4/i);
    const profile = await new GuidedLearnerRepository(null).loadProfile(LOCAL_LEARNER_ID);
    expect(profile).toMatchObject({ ratingSource: 'lichess', ratingValue: 1450, depth: 'standard', goal: 'tactical-danger' });
  });

  it('shows a single guided next action in Today', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Today$/i }));
    expect(screen.getByRole('region', { name: /Today workspace/i })).toHaveTextContent(/One clear next action/i);
    expect(screen.getByRole('region', { name: /Today workspace/i })).toHaveTextContent(/Continue with the next uncovered repertoire branch/i);
  });

  it('restores anonymous onboarding from local storage after remount', async () => {
    const first = render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    first.unmount();
    render(<App />);
    await waitFor(() => expect(screen.queryByRole('region', { name: /Guided repertoire setup/i })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^Today$/i })).toBeInTheDocument();
  });

  it('turns a PGN divergence into a visible game gap', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Review$/i }));
    const pgn = screen.getByRole('textbox', { name: /PGN input/i });
    await userEvent.clear(pgn); await userEvent.type(pgn, '1. e4 e5 2. Nc3 Nf6 3. a3');
    await userEvent.click(screen.getByRole('button', { name: /Load PGN/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Today$/i }));
    expect(screen.getByRole('region', { name: /Today workspace/i })).toHaveTextContent(/1 game gaps/i);
  });
});
