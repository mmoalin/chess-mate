import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import App from './App';
import { EngineService } from './services/engineService';
import { GuidedLearnerRepository, LOCAL_LEARNER_ID } from './services/guidedLearnerRepository';

vi.mock('./components/ChessBoardUI', () => ({
  ChessBoardUI: ({ fen, orientation, legalTargets, onMoveAttempt }: any) => <div aria-label="Test board" data-fen={fen} data-side={orientation}>
    {new Chess(fen).moves({ verbose: true }).filter((move) => legalTargets[move.from]?.includes(move.to)).map((move) => <button key={move.san} onClick={() => onMoveAttempt(move.from, move.to, move.promotion)}>Play {move.san}</button>)}
  </div>
}));
afterEach(() => vi.restoreAllMocks());
const click = (name: string) => userEvent.click(screen.getByRole('button', { name }));
const fen = () => screen.getByLabelText('Test board').getAttribute('data-fen');
async function start() { const view = render(<App />); await click('Start learning'); return view; }
function engineReplies() {
  return vi.spyOn(EngineService.prototype, 'bestMove').mockImplementation(async (position) => {
    const moves = new Chess(position).moves({ verbose: true });
    const move = ['e5', 'Nc6', 'Nf6'].map((san) => moves.find((candidate) => candidate.san === san)).find(Boolean) ?? moves[0];
    return { from: move.from, to: move.to };
  });
}

describe('UX review regressions', () => {
  it('preserves an engine game across Study, Today, the active mode button, and reload', async () => {
    const replies = engineReplies();
    const view = await start();
    await click('Review'); await click('Play vs Stockfish');
    for (const [index, move] of ['e4', 'Nf3', 'Bc4'].entries()) {
      await click('Play ' + move);
      await waitFor(() => expect(replies).toHaveBeenCalledTimes(index + 1));
      await waitFor(() => expect(new Chess(fen()!).turn()).toBe('w'));
    }
    const original = fen();
    await click('Study'); await click('3 Choose the Safe Plan'); await click('Today');
    view.unmount(); const resumed = render(<App />);
    await screen.findByRole('button', { name: 'Start session' });
    await click('Review');
    expect(fen()).toBe(original);
    await click('Play vs Stockfish'); expect(fen()).toBe(original);
    resumed.unmount(); render(<App />);
    await waitFor(() => expect(fen()).toBe(original));
    expect(replies).toHaveBeenCalledTimes(3);
    await click('Show moves');
    expect(screen.getByRole('region', { name: 'Move history' })).toHaveTextContent('Nf6');
  });

  it('keeps the imported PGN and selected replay ply separate from engine and Study boards', async () => {
    const view = await start();
    await click('Review'); await click('Load PGN'); await click('Previous move');
    const selected = fen();
    await click('Play vs Stockfish'); expect(fen()).toBe(new Chess().fen());
    await click('Study'); await click('3 Choose the Safe Plan'); await click('Review');
    await click('Review a game'); expect(fen()).toBe(selected);
    view.unmount(); render(<App />);
    await waitFor(() => expect(fen()).toBe(selected));
    await click('Next move'); expect(fen()).not.toBe(selected);
    await click('Previous move'); expect(fen()).toBe(selected);
  });

  it('ignores an interrupted reply and requests exactly one replacement on return', async () => {
    const pending: Array<(value: { from: string; to: string }) => void> = [];
    const engine = vi.spyOn(EngineService.prototype, 'bestMove').mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    await start(); await click('Review'); await click('Play vs Stockfish'); await click('Play e4');
    await waitFor(() => expect(engine).toHaveBeenCalledTimes(1));
    await click('Study'); const study = fen();
    await act(async () => pending[0]({ from: 'e7', to: 'e5' }));
    expect(fen()).toBe(study);
    await click('Review');
    await waitFor(() => expect(engine).toHaveBeenCalledTimes(2));
    await act(async () => pending[1]({ from: 'e7', to: 'e5' }));
    const expected = new Chess(); expected.move('e4'); expected.move('e5');
    expect(fen()).toBe(expected.fen());
    expect(engine).toHaveBeenCalledTimes(2);
  });

  it('retains each Study task board when changing tasks and workspaces', async () => {
    await start(); await click('Study'); await click('Practise this position'); await click('Play Nf3');
    const practised = fen();
    await click('3 Choose the Safe Plan'); expect(fen()).not.toBe(practised);
    await click('1 Explain a Developing Move'); expect(fen()).toBe(practised);
    await click('Review'); await click('Study'); expect(fen()).toBe(practised);
  });

  it.each([
    { before: null, wrong: 'e3', correct: 'e4' },
    { before: 'Repertoire move 2: e5', wrong: 'a3', correct: 'Nc3' },
    { before: 'Repertoire move 9: Nf3', wrong: 'Bd6', correct: 'Be7' }
  ])('retries $wrong from the exact position without regrading the correction', async ({ before, wrong, correct }) => {
    vi.spyOn(EngineService.prototype, 'compareMove').mockResolvedValue({ delta: 0 } as any);
    await start(); await click('Train openings');
    if (before) await click(before);
    const original = fen();
    await click('Play ' + wrong);
    await screen.findByRole('button', { name: 'Retry this move' });
    const repository = new GuidedLearnerRepository(null);
    await waitFor(async () => expect((await repository.loadAttempts(LOCAL_LEARNER_ID)).length).toBeGreaterThan(0));
    const attempts = await repository.loadAttempts(LOCAL_LEARNER_ID);
    await click('Retry this move'); expect(fen()).toBe(original);
    await click('Play ' + correct);
    expect(fen()).not.toBe(original);
    expect(await repository.loadAttempts(LOCAL_LEARNER_ID)).toEqual(attempts);
  });

  it('restores the correct turn before Reveal and keeps exploration ungraded', async () => {
    vi.spyOn(EngineService.prototype, 'compareMove').mockResolvedValue({ delta: 0 } as any);
    await start(); await click('Train openings'); await click('Repertoire move 2: e5');
    const original = fen(); await click('Play a3');
    await click('Explore this continuation'); await click('Play Nc6');
    await click('Reveal'); expect(fen()).toBe(original);
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Repertoire move: Nc3');
    await click('Play Nc3'); expect(fen()).not.toBe(original);
  });
});
