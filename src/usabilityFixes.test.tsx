import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import App from './App';
import { GuidedLearnerRepository } from './services/guidedLearnerRepository';
import { SupabasePersistence } from './services/supabasePersistence';
import { starterConnectedLessons } from './data/connectedLessons';
import { createLessonSession } from './features/connected/session';
import { EngineService } from './services/engineService';
import { createInitialMastery } from './domain/repertoire/training';
import { embeddedRepertoireGraph } from './services/guidedContentRepository';

vi.mock('react-chessboard', () => ({ Chessboard: ({ options }: any) => <div aria-label="Test board" data-fen={options.position}>{new Chess(options.position).moves({ verbose: true }).map((m) => <button key={m.san} onClick={() => options.onPieceDrop({ sourceSquare: m.from, targetSquare: m.to })}>{'Play ' + m.san}</button>)}</div> }));
const click = (name: string | RegExp) => userEvent.click(screen.getByRole('button', { name }));
const fen = () => screen.getByLabelText('Test board').getAttribute('data-fen');
afterEach(() => vi.restoreAllMocks());
describe('usability regression flows', () => {
  it('restores an opening Plan Lab at the same scenario after refresh', async () => {
    const first = render(<App />); await click(/Start learning/i); await click('Train openings'); await click('Practise opening plans');
    await userEvent.click(screen.getAllByRole('radio')[0]); await click('Check plan'); await click('Test it on the board');
    const before = fen(); first.unmount(); const second = render(<App />);
    await screen.findByRole('region', { name: 'Idea training' });
    expect(fen()).toBe(before);
    expect(screen.getByRole('region', { name: 'Idea training' })).toHaveTextContent('More than one sound answer may be accepted');
    const saved = JSON.parse(localStorage.getItem('chess-workspace:local')!);
    const scenario = embeddedRepertoireGraph.conceptDrills![saved.activeConceptKey].scenarios[0];
    const alternative = new Chess(before!).moves({ verbose: true }).find((m) => ![...scenario.preferredMovesUci, ...scenario.acceptableMovesUci].includes(m.from + m.to + (m.promotion ?? '')))!;
    vi.spyOn(EngineService.prototype, 'compareMove').mockImplementation(() => new Promise(() => {}));
    await click('Play ' + alternative.san);
    expect(fen()).not.toBe(before);
    second.unmount(); render(<App />);
    await screen.findByRole('region', { name: 'Idea training' });
    expect(fen()).toBe(before);
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('interrupted scenario');
  });
  it('returns a due Study review to its own module and task', async () => {
    const repository = new GuidedLearnerRepository(null);
    for (const lesson of starterConnectedLessons) await repository.saveLessonSession({ ...createLessonSession(lesson, 'local', 'today'), stage: 'summary', completedAt: new Date().toISOString() });
    const mastery = createInitialMastery({ learnerId: 'local', itemKey: 'study:basic-endgames-opposition', positionKey: '8/8/4k3/8/8/4K3/4P3/8 w - -', now: '2020-01-01T00:00:00Z' });
    mastery.understanding.status = 'learning';
    await repository.saveMastery(mastery);
    render(<App />); await click(/Start learning/i);
    await screen.findByText('Review a weak position'); await click('Start now');
    expect(screen.getByRole('heading', { name: 'Basic Endgames' })).toBeInTheDocument();
    expect(fen()).toBe('8/8/4k3/8/8/4K3/4P3/8 w - - 0 1');
  });
  it('preserves an unanswered engine turn across reload and provides a working retry', async () => {
    vi.spyOn(EngineService.prototype, 'bestMove').mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ from: 'e7', to: 'e5' });
    const first = render(<App />); await click(/Start learning/i); await click('Review'); await click('Play vs Stockfish'); await click('Play e4');
    await screen.findByRole('button', { name: 'Get Stockfish reply' }); const awaiting = fen();
    first.unmount(); render(<App />);
    await screen.findByRole('button', { name: 'Get Stockfish reply' }); expect(fen()).toBe(awaiting);
    await click('Get Stockfish reply');
    await waitFor(() => expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Engine replied e5'));
    expect(fen()).not.toBe(awaiting);
  });

  it('records revealed tactical answers without awarding unassisted mastery', async () => {
    render(<App />); await click(/Start learning/i); await click('Train openings'); await click(/Tactical decision 2/);
    await click('Reveal'); await click('Play fxe5');
    await waitFor(async () => expect(await new SupabasePersistence(null).loadPositionProgress('local')).toEqual([expect.objectContaining({ correctCount: 1, hintCount: 1, masteryScore: 0 })]));
    expect((await new GuidedLearnerRepository(null).loadAttempts('local'))[0]).toMatchObject({ hintUsed: true, revealed: true });
  });
  it('uses the endgame board, retries a wrong move, and keeps Study progress after remount', async () => {
    const first = render(<App />);
    await click(/Start learning/i); await click('Study');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Study module' }), 'basic-endgames');
    const original = fen();
    expect(original).toBe('8/8/4k3/8/8/4K3/4P3/8 w - - 0 1');
    await click('Practise this position'); await click('Play Kd3');
    expect(fen()).toBe(original);
    await click('Play Ke4'); expect(fen()).not.toBe(original);
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Correct.');
    await userEvent.click(screen.getByRole('radio', { name: /Take the opposition/ })); await click('Check answer');
    await waitFor(async () => expect(await new SupabasePersistence(null).loadCurriculumProgress('local')).toEqual([expect.objectContaining({ taskId: 'basic-endgames-opposition', status: 'passed' })]));
    first.unmount(); render(<App />);
    await screen.findByRole('heading', { name: 'Basic Endgames' });
    await waitFor(() => expect(screen.getByRole('button', { name: /Win the Opposition/ })).toHaveTextContent('✓'));
  });

  it('keeps a valid game on invalid input and restores the selected replay position', async () => {
    const first = render(<App />); await click(/Start learning/i); await click('Review'); await click('Load PGN');
    await click('Inspect position before the difference'); const original = fen();
    await userEvent.clear(screen.getByRole('textbox', { name: 'PGN input' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'PGN input' }), '1. nonsense'); await click('Load PGN');
    expect(screen.getByRole('alert')).toHaveTextContent('Your current board has been kept'); expect(fen()).toBe(original);
    first.unmount(); render(<App />);
    await screen.findByRole('textbox', { name: 'PGN input' }); expect(fen()).toBe(original);
  });

  it('saves gap notes, returns from the related lesson, and lets a reviewed gap reopen', async () => {
    const first = render(<App />); await click(/Start learning/i); await click('Review');
    await userEvent.clear(screen.getByRole('textbox', { name: 'PGN input' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'PGN input' }), '1. e4 e5 2. Nc3 Nf6 3. Bc4'); await click('Load PGN');
    expect(screen.getByText(/First different move: 3.Bc4/)).toBeInTheDocument();
    await click('Today'); await click(/Open saved position/);
    expect(screen.queryByRole('textbox', { name: 'PGN input' })).not.toBeInTheDocument();
    const original = fen();
    await userEvent.type(screen.getByRole('textbox', { name: 'Candidate move and plan' }), 'f4: challenge the centre'); await click('Save notes');
    await click(/Study related lesson:/); await click('Save & leave lesson'); expect(fen()).toBe(original);
    await click('Mark reviewed'); first.unmount(); render(<App />);
    await screen.findByRole('textbox', { name: 'Candidate move and plan' });
    expect(screen.getByRole('textbox', { name: 'Candidate move and plan' })).toHaveValue('f4: challenge the centre');
    await click('Back to Today'); expect(screen.getByText('No positions awaiting review.')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Reviewed positions (1)')); await click(/· Open$/); await click('Reopen for review');
    expect((await new GuidedLearnerRepository(null).loadBacklog('local'))[0].status).toBe('new');
  });

  it('shows completed lessons separately from reliable units in Today and Repertoire', async () => {
    const lesson = starterConnectedLessons[0];
    await new GuidedLearnerRepository(null).saveLessonSession({ ...createLessonSession(lesson, 'local', 'today'), stage: 'summary', completedAt: new Date().toISOString() });
    render(<App />); await click(/Start learning/i);
    await screen.findByRole('heading', { name: '1 lesson completed' });
    expect(screen.getByText('reliable').parentElement).toHaveTextContent('0');
    await click('Repertoire'); expect(screen.getByRole('heading', { name: '1 lesson completed' })).toBeInTheDocument();
  });
});
