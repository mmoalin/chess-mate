import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import App from '../../App';
import { starterConnectedLessons } from '../../data/connectedLessons';
import { createLessonSession, hasCheckpoint, positionAfter } from './session';
import { journeyPosition, submitJourney, validateJourney } from './endgameJourney';
import { ConnectedLessonWorkspace } from './ConnectedLessonWorkspace';
import type { LessonSession } from './types';
import { GuidedLearnerRepository } from '../../services/guidedLearnerRepository';
import { EngineService } from '../../services/engineService';
import { matchPgnToRepertoire } from '../../domain/repertoire/pgn';
import { embeddedRepertoireGraph } from '../../services/guidedContentRepository';
import { buildDailySession } from '../../domain/repertoire/dailySessions';

vi.mock('react-chessboard', () => ({ Chessboard: ({ options }: any) => <div aria-label="Test board" data-fen={options.position}>{new Chess(options.position).moves({ verbose: true }).map((m) => <button key={m.san} onClick={() => options.onPieceDrop({ sourceSquare: m.from, targetSquare: m.to })}>{'Play ' + m.san}</button>)}</div> }));
afterEach(() => vi.restoreAllMocks());
const click = (name: string) => userEvent.click(screen.getByRole('button', { name }));
const vienna = starterConnectedLessons[0];
const caro = starterConnectedLessons[1];
function show(initial: LessonSession, lesson = vienna, depth: 'foundation' | 'deep' = 'foundation') {
  const changed = vi.fn();
  const view = render(<ConnectedLessonWorkspace lesson={lesson} initialSession={initial} depth={depth} repository={new GuidedLearnerRepository(null)} onSessionChange={changed} onPersisted={() => {}} onExit={() => {}} />);
  return { ...view, changed };
}

describe('learning experience integrity', () => {
  it('distinguishes exhausted coverage from a real line difference', () => {
    const common = { graph: embeddedRepertoireGraph, selectedOpeningFamilyKeys: ['white-vienna-main'] };
    expect(matchPgnToRepertoire({ ...common, pgn: '1.e4 e5 2.Nc3 Nf6 3.f4 d5 4.fxe5 Nxe4 5.Nf3 Be7 6.Bc4 *' })).toMatchObject({ coverageEnded: true, recommendedAction: 'none', matchedPlyCount: 10 });
    expect(matchPgnToRepertoire({ ...common, pgn: '1.e4 e5 2.Nc3 Nf6 3.a3 *' })).toMatchObject({ coverageEnded: false, divergencePly: 5 });
  });

  it('does not create a forgotten-move item after reaching the end of a stored line', async () => {
    render(<App />); await click('Start learning'); await click('Review');
    await userEvent.clear(screen.getByRole('textbox', { name: 'PGN input' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'PGN input' }), '1.e4 e5 2.Nc3 Nf6 3.f4 d5 4.fxe5 Nxe4 5.Nf3 Be7 6.Bc4 *');
    await click('Load PGN');
    expect(screen.getByText(/You reached the end of this stored line/)).toBeInTheDocument();
    expect(await new GuidedLearnerRepository(null).loadBacklog('local')).toHaveLength(0);
    await click('Choose a middlegame plan');
    expect(screen.getByRole('heading', { name: vienna.questions[0].prompt })).toBeInTheDocument();
  });

  it('uses real activity estimates and a focused checkpoint for short sessions', () => {
    for (const durationMinutes of [5, 10, 20] as const) {
      const session = buildDailySession({ learnerId: 'local', durationMinutes, graph: embeddedRepertoireGraph, selectedOpeningKeys: ['white-vienna-main'], mastery: [], backlog: [], lessonSessions: [], now: new Date().toISOString() });
      expect(session.targets.reduce((sum, target) => sum + target.estimatedMinutes, 0)).toBeLessThanOrEqual(durationMinutes);
      expect(session.targets[0].contentKey).toBe(durationMinutes < 20 ? vienna.key + '/structure' : vienna.key);
      const lab = session.targets.find((target) => target.kind === 'concept-drill');
      if (lab) expect(lab.estimatedMinutes).toBe(5);
    }
  });

  it('requires explanation and a legal reply in the independent challenge', async () => {
    const initial = createLessonSession(vienna, 'local', 'today', 'develop');
    const { changed } = show(initial, vienna, 'deep');
    await click('Play Be2');
    expect(screen.getByRole('button', { name: 'Check my decision' })).toBeDisabled();
    expect(changed).not.toHaveBeenCalled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Your plan' }), 'Clear f1 to prepare castling.');
    await userEvent.type(screen.getByRole('textbox', { name: 'Predicted reply' }), 'Nc6');
    await click('Check my decision');
    expect(changed.mock.calls.at(-1)![0]).toMatchObject({ completedAt: expect.any(String), reflections: { develop: { move: 'Be2', plan: 'Clear f1 to prepare castling.', reply: 'Nc6' } } });
    expect(screen.getByText(/Independently correct/)).toBeInTheDocument();
  });

  it('compares a legal alternative and returns to the exact checkpoint with analysis assistance', async () => {
    vi.spyOn(EngineService.prototype, 'analyze').mockImplementation(async (fen) => {
      const board = new Chess(fen); const san = board.turn() === 'w' ? 'd4' : board.get('c4')?.type === 'b' ? 'dxc4' : 'Nc6';
      const move = board.move(san);
      return { bestMove: { from: move.from, to: move.to }, depth: 10, score: { type: 'cp', value: 30 }, pv: [move.from + move.to] };
    });
    const initial = createLessonSession(vienna, 'local', 'today', 'develop');
    const { changed } = show(initial);
    await click('Play Bc4');
    expect(screen.getByLabelText('Test board')).toHaveAttribute('data-fen', positionAfter([...initial.moves, 'Bc4']).fen());
    await click('Compare with lesson move');
    await screen.findByRole('heading', { name: 'Engine suggestion: d4' });
    expect(screen.getByText(/Engine reply: dxc4/)).toBeInTheDocument();
    await click('Return to checkpoint');
    expect(screen.getByLabelText('Test board')).toHaveAttribute('data-fen', positionAfter(initial.moves).fen());
    expect(screen.queryByText(/Candidate: Be2/)).not.toBeInTheDocument();
    await click('Play Be2');
    expect(changed.mock.calls.at(-1)![0].answers.develop).toMatchObject({ correct: true, hintUsed: true, revealed: true });
    expect(screen.getByText(/Completed with assistance/)).toBeInTheDocument();
  });

  it('ignores a late comparison result after returning to the lesson', async () => {
    let resolve!: (value: any) => void;
    vi.spyOn(EngineService.prototype, 'analyze').mockImplementation(() => new Promise((done) => { resolve = done; }));
    show(createLessonSession(vienna, 'local', 'today', 'develop'));
    await click('Play Bc4'); await click('Compare with lesson move');
    await click('Return to checkpoint');
    await act(async () => resolve({ bestMove: { from: 'd2', to: 'd4' }, depth: 10, score: null, pv: [] }));
    expect(screen.queryByRole('region', { name: 'Candidate comparison' })).not.toBeInTheDocument();
  });

  it('keeps a diagnostic separate from a scheduled full lesson and records skipped answers as partial', async () => {
    render(<App />); await click('Start learning'); await click('20 min'); await click('Start session');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Independent challenge: move, explain, predict' }));
    await click('Check what I know');
    expect(screen.getByRole('region', { name: 'Daily session saved' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Complete & continue' })).not.toBeInTheDocument();
    await click('Return to daily activity'); await click('Go to model position');
    await userEvent.click(screen.getByRole('radio', { name: vienna.questions[0].choices.find((choice) => !choice.correct)!.label }));
    await click('Check answer'); await userEvent.click(screen.getByText('Session options')); await click('Skip for today');
    await userEvent.click(screen.getByText('Session options')); await click('Skip for today');
    expect(screen.getByText(/0 activities completed.*1 partially practised.*1 skipped/)).toBeInTheDocument();
  });

  for (const lesson of starterConnectedLessons) it('ends practice after four learner moves and preserves its recap for ' + lesson.side, async () => {
    const engine = vi.spyOn(EngineService.prototype, 'bestMove').mockImplementation(async (fen) => {
      const moves = new Chess(fen).moves({ verbose: true });
      const move = moves.find((m) => m.piece === 'p') ?? moves[0];
      return { from: move.from, to: move.to };
    });
    const initial = { ...createLessonSession(lesson, 'local', 'today'), stage: 'summary' as const, moves: [...lesson.openingMoves] };
    const { changed } = show(initial, lesson);
    await click('Practise a 4-move plan');
    for (let index = 0; index < 4; index++) {
      await waitFor(() => expect(positionAfter(changed.mock.calls.at(-1)![0].moves).turn()).toBe(lesson.side[0]));
      const moves = positionAfter(changed.mock.calls.at(-1)![0].moves).moves({ verbose: true });
      await click('Play ' + (moves.find((m) => m.piece === 'p') ?? moves[0]).san);
    }
    await screen.findByRole('heading', { name: 'Plan practice complete' });
    const finalMoves = [...changed.mock.calls.at(-1)![0].moves];
    const engineCalls = engine.mock.calls.length;
    await click('Play ' + positionAfter(finalMoves).moves()[0]);
    expect(changed.mock.calls.at(-1)![0].moves).toEqual(finalMoves);
    expect(engine).toHaveBeenCalledTimes(engineCalls);
    await userEvent.type(screen.getByRole('textbox', { name: 'Practice reflection' }), 'I prepared the pawn break while checking threats.');
    await click('Return to lesson');
    expect(changed.mock.calls.at(-1)![0].moves).toEqual(initial.moves);
    expect(changed.mock.calls.at(-1)![0].practiceReview.moves).toEqual(finalMoves);
    await userEvent.click(screen.getByText('Review your last practice'));
    await click('Reopen practice position');
    expect(screen.getByRole('textbox', { name: 'Practice reflection' })).toHaveValue('I prepared the pawn break while checking threats.');
    await click('Return to lesson');
    await click('Practise the other lesson ending');
    await click('Return to lesson');
    expect(changed.mock.calls.at(-1)![0].moves).toEqual(initial.moves);
  });

  it('continues an optional journey opened from a structure checkpoint without completing that checkpoint', async () => {
    const initial = createLessonSession(caro, 'local', 'today', 'structure');
    initial.journey = { active: true, step: 0, candidate: 'c5', choice: 'plan', prediction: 'b3' };
    const { changed } = show(initial, caro);
    await click('Check the connection'); await click('Continue the connection');
    expect(changed.mock.calls.at(-1)![0].journey.step).toBe(1);
    expect(changed.mock.calls.at(-1)![0].completedAt).toBeUndefined();
    expect(screen.getByRole('heading', { name: caro.endgame!.steps[1].title })).toBeInTheDocument();
  });

  for (const lesson of starterConnectedLessons) it('validates and persists the complete endgame journey for ' + lesson.side, async () => {
    const journey = lesson.endgame!;
    expect(validateJourney(journey)).toEqual([]);
    let session = createLessonSession(lesson, 'local', 'today');
    for (const [index, step] of journey.steps.entries()) {
      session.journey = { active: true, step: index, candidate: step.move, choice: 'plan', prediction: step.replies[0] };
      session = submitJourney(session, journey);
      expect(session.answers['endgame:' + step.id].correct).toBe(true);
      const resumed = createLessonSession(lesson, 'local', 'today', 'endgame:' + step.id);
      expect(resumed.journey?.step).toBe(index);
      expect(hasCheckpoint(lesson, 'endgame:' + step.id)).toBe(true);
      const persisted = new GuidedLearnerRepository(null);
      await persisted.saveLessonSession(session);
      await persisted.saveLessonSession(session);
      expect((await persisted.loadAttempts('local')).filter((a) => a.itemKey.startsWith(lesson.key + '/endgame:'))).toHaveLength(index + 1);
    }
  });

  it('plays the Caro-Kann journey, survives remount, and preserves a wrong first answer on retry', async () => {
    const initial = createLessonSession(caro, 'local', 'today', 'endgame:exchange');
    const view = show(initial, caro);
    await click('Play Qxd3');
    await userEvent.click(screen.getByRole('radio', { name: caro.endgame!.steps[2].choices[0].label }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Endgame predicted reply' }), 'Rxd3');
    await click('Check the connection');
    const saved = view.changed.mock.calls.at(-1)![0] as LessonSession;
    expect(saved.answers['endgame:exchange'].correct).toBe(false);
    view.unmount();
    const resumed = show(JSON.parse(JSON.stringify(saved)), caro);
    expect(screen.getByText(/Compare your choice with this example/)).toBeInTheDocument();
    await click('Try this decision again'); await click('Play Qxd3');
    await userEvent.click(screen.getByRole('radio', { name: caro.endgame!.steps[2].choices[1].label }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Endgame predicted reply' }), 'Rxd3');
    await click('Check the connection'); await click('See journey recap');
    await waitFor(() => expect(resumed.changed.mock.calls.at(-1)![0].completedAt).toBeTruthy());
    expect(resumed.changed.mock.calls.at(-1)![0].answers['endgame:exchange']).toEqual(saved.answers['endgame:exchange']);
    expect(screen.getByRole('heading', { name: 'Connected journey complete' })).toBeInTheDocument();
    expect(journeyPosition(caro.endgame!, 3).get('d3')?.type).toBe('r');
  });
});
