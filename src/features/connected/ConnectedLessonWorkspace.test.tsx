import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { ConnectedLessonWorkspace } from './ConnectedLessonWorkspace';
import { starterConnectedLessons } from '../../data/connectedLessons';
import { createLessonSession, positionAfter } from './session';
import type { LessonSession } from './types';
import { GuidedLearnerRepository } from '../../services/guidedLearnerRepository';
import { EngineService } from '../../services/engineService';
import App from '../../App';

vi.mock('react-chessboard', () => ({ Chessboard: ({ options }: any) => <div aria-label="Test board" data-fen={options.position} data-side={options.boardOrientation}>{new Chess(options.position).moves({ verbose: true }).map((m) => <button key={m.san} onClick={() => options.onPieceDrop({ sourceSquare: m.from, targetSquare: m.to })}>{'Play ' + m.san}</button>)}</div> }));
afterEach(() => vi.restoreAllMocks());
const click = (name: string) => userEvent.click(screen.getByRole('button', { name }));
const vienna = starterConnectedLessons[0];
function show(initialSession: LessonSession, lesson = vienna) {
  const onSessionChange = vi.fn();
  const repository = new GuidedLearnerRepository(null);
  const view = render(<ConnectedLessonWorkspace lesson={lesson} initialSession={initialSession} repository={repository} onSessionChange={onSessionChange} onPersisted={() => {}} onExit={() => {}} />);
  return { ...view, onSessionChange, repository };
}
describe('connected lesson interface', () => {
  for (const lesson of starterConnectedLessons) it('finishes both branches and hands the exact position to Stockfish for ' + lesson.side, async () => {
    const reply = vi.spyOn(EngineService.prototype, 'bestMove').mockImplementation(async (fen) => {
      const move = new Chess(fen).moves({ verbose: true })[0]; return { from: move.from, to: move.to };
    });
    const { onSessionChange } = show(createLessonSession(lesson, 'local', 'today'), lesson);
    await click('Go to model position');
    for (const question of lesson.questions) {
      await userEvent.click(screen.getByRole('radio', { name: question.choices.find((c) => c.correct)!.label }));
      await click('Check answer'); await click('Continue lesson');
    }
    let latest = () => onSessionChange.mock.calls.at(-1)![0] as LessonSession;
    while (latest().stage === 'main') await click('Play ' + lesson.decisions[latest().checkpointId].answers[0].moveSan);
    expect(screen.getByRole('heading', { name: 'Test a different opponent reply' })).toBeInTheDocument();
    await click('Rewind and test the different reply');
    while (latest().stage === 'transfer') await click('Play ' + lesson.decisions[latest().checkpointId].answers[0].moveSan);
    expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument();
    const before = latest();
    await click('Play from here');
    await waitFor(() => expect(reply).toHaveBeenCalledWith(positionAfter(before.moves).fen(), { depth: 6 }));
    await waitFor(() => expect(latest().moves.length).toBe(before.moves.length + 1));
    expect(screen.getByLabelText('Test board')).toHaveAttribute('data-side', lesson.side);
    await click('Return to lesson');
    expect(screen.getByLabelText('Test board')).toHaveAttribute('data-fen', positionAfter(before.moves).fen());
    expect(latest().answers).toEqual(before.answers);
  });

  it('restores from the app after a reload and leaves history inspection ungraded', async () => {
    const session = createLessonSession(vienna, 'local', 'today', 'develop');
    await new GuidedLearnerRepository(null).saveLessonSession(session);
    localStorage.setItem('connected-active:local', session.id);
    const first = render(<App />);
    await screen.findByRole('heading', { name: vienna.decisions.develop.prompt });
    await userEvent.click(screen.getByText('Inspect move history'));
    await click('1. e4');
    await click('Play e5');
    expect(screen.getByLabelText('Test board')).toHaveAttribute('data-fen', positionAfter(['e4']).fen());
    await click('Resume active position');
    expect(screen.getByLabelText('Test board')).toHaveAttribute('data-fen', positionAfter(session.moves).fen());
    first.unmount();
    render(<App />);
    await screen.findByRole('heading', { name: vienna.decisions.develop.prompt });
    expect(screen.getByLabelText('Test board')).toHaveAttribute('data-fen', positionAfter(session.moves).fen());
    expect(await new GuidedLearnerRepository(null).loadAttempts('local')).toHaveLength(0);
  });

  it('ignores an engine answer after returning to the lesson', async () => {
    let resolve!: (move: { from: string; to: string }) => void;
    vi.spyOn(EngineService.prototype, 'bestMove').mockImplementation(() => new Promise((done) => { resolve = done; }));
    const session = { ...createLessonSession(vienna, 'local', 'today'), stage: 'summary' as const, moves: ['e4'], completedAt: new Date().toISOString() };
    const { onSessionChange } = show(session);
    await click('Play from here');
    await waitFor(() => expect(resolve).toBeDefined());
    await click('Return to lesson');
    const calls = onSessionChange.mock.calls.length;
    await act(async () => resolve({ from: 'e7', to: 'e5' }));
    expect(onSessionChange).toHaveBeenCalledTimes(calls);
    expect(screen.getByLabelText('Test board')).toHaveAttribute('data-fen', positionAfter(['e4']).fen());
  });

  it('discards analysis when the lesson moves to a different position', async () => {
    let resolve!: (value: any) => void;
    vi.spyOn(EngineService.prototype, 'analyze').mockImplementation(() => new Promise((done) => { resolve = done; }));
    show(createLessonSession(vienna, 'local', 'today'));
    await click('Analyse position');
    await click('Go to model position');
    await act(async () => resolve({ bestMove: { from: 'e2', to: 'e4' }, score: null, depth: 8, pv: [] }));
    expect(screen.queryByText(/Engine candidate:/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Test board')).toHaveAttribute('data-fen', positionAfter(vienna.openingMoves).fen());
  });

  it('keeps a completed lesson available when the engine is unavailable or the game is over', async () => {
    const engine = vi.spyOn(EngineService.prototype, 'bestMove').mockRejectedValue(new Error('Worker unavailable'));
    const view = show({ ...createLessonSession(vienna, 'local', 'today'), stage: 'summary', moves: ['e4'], completedAt: new Date().toISOString() });
    await click('Play from here');
    await screen.findByText('Worker unavailable');
    await click('Return to lesson');
    expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument();
    view.unmount(); engine.mockClear();
    show({ ...createLessonSession(vienna, 'local', 'today'), stage: 'summary', moves: ['f3', 'e5', 'g4', 'Qh4#'], completedAt: new Date().toISOString() });
    await click('Play from here');
    expect(screen.getByText('Game over: checkmate.')).toBeInTheDocument();
    expect(engine).not.toHaveBeenCalled();
  });

  it('preserves old results and requires restart when content changes', async () => {
    const old = createLessonSession(vienna, 'local', 'today', 'develop');
    old.contentVersion = 0;
    const { onSessionChange } = show(old);
    await click('Play Be2');
    expect(onSessionChange).not.toHaveBeenCalled();
    await click('Restart updated lesson');
    expect(onSessionChange.mock.calls[0][0].supersededAt).toBeTruthy();
    expect(onSessionChange.mock.calls.at(-1)![0].contentVersion).toBe(vienna.version);
  });
});
