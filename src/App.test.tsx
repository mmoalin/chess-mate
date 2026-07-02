import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('react-chessboard', () => ({
  Chessboard: () => <div aria-label="Chess board mock" />
}));

describe('App', () => {
  it('starts with beginner onboarding and lands on the dashboard recommendation', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /Set up your training/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));

    expect(screen.queryByRole('heading', { name: /Today/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Today summary/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show today/i })).toBeInTheDocument();
    expect(screen.queryByText(/Next lesson/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Show today/i }));

    expect(screen.getByRole('region', { name: /Today summary/i })).toBeInTheDocument();
    expect(screen.getByText(/Next lesson/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Hide today/i }));

    expect(screen.queryByRole('region', { name: /Today summary/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Vienna Game: Main Development/i })).toBeInTheDocument();
  });

  it('keeps repertoire moves above lesson details in the task dock', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));

    const dock = screen.getByRole('complementary', { name: /Task dock/i });
    const dockText = dock.textContent ?? '';

    expect(screen.getByRole('region', { name: /Repertoire moves/i })).toBeInTheDocument();
    expect(dockText.indexOf('Move')).toBeLessThan(dockText.indexOf('Lesson goal'));
  });

  it('renders the opening trainer as the first workflow', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /Set up your training/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Account/i })).toBeInTheDocument();
  });

  it('uses a single task dock instead of stacked utility cards', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));

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

    expect(screen.queryByRole('region', { name: /Move history/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Show moves/i }));

    expect(screen.getByRole('region', { name: /Move history/i })).toHaveTextContent(/No moves yet/i);
    expect(screen.getByRole('button', { name: /Hide moves/i })).toBeInTheDocument();
  });

  it('switches to game review mode from the mode tabs', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: /Review/i }));

    expect(screen.getByRole('textbox', { name: /PGN input/i })).toHaveValue('1. e4 e5 2. Nf3 Nc6');
    expect(screen.getByRole('button', { name: /Load PGN/i })).toBeInTheDocument();
  });

  it('switches to the curriculum study workflow', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: /Study/i }));

    expect(screen.getByRole('heading', { name: /Opening Principles/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Explain a Developing Move/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pass score/i)).toBeInTheDocument();
  });

  it('lets a beginner use hint and reveal during opening practice', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: /Openings/i }));
    await userEvent.click(screen.getByRole('button', { name: /Hint/i }));

    expect(screen.getByText(/Look for e4/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Reveal/i }));

    expect(screen.getByText(/Repertoire move: e4/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Feedback/i })).toHaveTextContent(/Repertoire move: e4/i);
  });

  it('scores a curriculum task answer and marks it complete', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: /Study/i }));
    await userEvent.type(
      screen.getByRole('textbox', { name: /Task answer/i }),
      'A developing move brings a knight toward the center and helps castle.'
    );
    await userEvent.click(screen.getByRole('button', { name: /Submit answer/i }));

    expect(screen.getByText(/Score 10\/10/i)).toBeInTheDocument();
    expect(screen.getByText(/Good work/i)).toBeInTheDocument();
  });

  it('detects where a review PGN leaves the selected repertoire', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));
    await userEvent.click(screen.getByRole('button', { name: /Review/i }));
    await userEvent.click(screen.getByRole('button', { name: /Load PGN/i }));

    expect(screen.getByText(/Matched 2 moves in Vienna Game: Main Development/i)).toBeInTheDocument();
    expect(screen.getByText(/Left book on move 3/i)).toBeInTheDocument();
  });
});
