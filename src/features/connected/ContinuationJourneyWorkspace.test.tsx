import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { starterConnectedLessons } from '../../data/connectedLessons';
import { ConnectedLessonWorkspace } from './ConnectedLessonWorkspace';
import { createLessonSession } from './session';
import { continuationBoard, continuationKey, openContinuation } from './continuationJourney';
import { GuidedLearnerRepository } from '../../services/guidedLearnerRepository';
import { EngineService } from '../../services/engineService';
import type { LessonSession } from './types';
import App from '../../App';

vi.mock('react-chessboard', () => ({ Chessboard: ({ options }: any) => <div aria-label="Test board" data-fen={options.position}>{new Chess(options.position).moves({ verbose: true }).map((move) => <button key={move.san} onClick={() => options.onPieceDrop({ sourceSquare: move.from, targetSquare: move.to })}>Play {move.san}</button>)}</div> }));
afterEach(() => vi.restoreAllMocks());
const lesson = starterConnectedLessons[1];
const journey = lesson.continuation!;
const click = async (name: string | RegExp) => userEvent.click(await screen.findByRole('button', { name }));
function show(initial: LessonSession) {
  const changed = vi.fn(); const exit = vi.fn();
  const view = render(<ConnectedLessonWorkspace lesson={lesson} initialSession={initial} repository={new GuidedLearnerRepository(null)} onSessionChange={changed} onPersisted={() => {}} onExit={exit} />);
  return { ...view, changed, exit, latest: () => changed.mock.calls.at(-1)![0] as LessonSession };
}

describe('continuous journey interactions', () => {
  it('restores a pending choice, explanation and reply, then retains a wrong first result after retry', async () => {
    const initial = createLessonSession(lesson, 'local', 'today', 'continuation:central-tension');
    const view = show(initial);
    await click('Continue from …c5'); await click('Play cxd4');
    await userEvent.click(screen.getByRole('radio', { name: journey.steps[0].choices[2].label }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Continuation predicted reply' }), 'cxd4');
    await userEvent.type(screen.getByRole('textbox', { name: 'Continuation reflection' }), 'Compare the open file.');
    const pending = JSON.parse(JSON.stringify(view.latest())); view.unmount();
    const resumed = show(pending);
    expect(screen.getByRole('radio', { name: journey.steps[0].choices[2].label })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Continuation predicted reply' })).toHaveValue('cxd4');
    await click('Check my connection');
    expect(screen.getByRole('heading', { name: 'First submission: Needs review' })).toBeInTheDocument();
    const submitted = JSON.parse(JSON.stringify(resumed.latest())); resumed.unmount();
    const afterReload = show(submitted);
    expect(screen.getByRole('textbox', { name: 'Continuation reflection' })).toHaveValue('Compare the open file.');
    expect(screen.getByRole('textbox', { name: 'Continuation predicted reply' })).toBeDisabled();
    expect(screen.getByText(/White can also recapture Nxd4/)).toBeInTheDocument();
    await click('Try this decision again'); await click('Play cxd4');
    await userEvent.click(screen.getByRole('radio', { name: journey.steps[0].choices[0].label }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Continuation predicted reply' }), 'Nxd4');
    await click('Check my connection');
    expect(screen.getByRole('heading', { name: 'First submission: Needs review' })).toBeInTheDocument();
    expect(afterReload.latest().answers['continuation:central-tension']).toEqual(submitted.answers['continuation:central-tension']);
    await click('See continuation recap');
    expect(afterReload.latest().completedAt).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Continuous journey recap' })).toBeInTheDocument();
  });

  it('requires an explicit return from an alternative and replays the bridge without changing answers', async () => {
    const view = show(openContinuation(createLessonSession(lesson, 'local', 'repertoire'), journey));
    await click('Continue from …c5'); await click('Play Rc8');
    await userEvent.click(screen.getByRole('radio', { name: journey.steps[0].choices[1].label }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Continuation predicted reply' }), 'Qe2');
    await click('Check my connection');
    expect(screen.getByRole('button', { name: 'Return to main line & continue' })).toBeInTheDocument();
    const recorded = view.latest().answers;
    await click('Return to main line & continue');
    expect(screen.getByLabelText('Test board')).toHaveAttribute('data-fen', continuationBoard(journey, 1).fen());
    await userEvent.click(screen.getByText('Replay every move from the opening'));
    await click('15…cxd4');
    expect(screen.getByText('Black resolves the central contact.')).toBeInTheDocument();
    await click('Return to active decision');
    expect(view.latest().answers).toEqual(recorded);
    await click('Save & leave'); expect(view.exit).toHaveBeenCalledWith('today');
  });

  it('explores an unassessed move and discards late analysis without grading it', async () => {
    let resolve!: (value: any) => void;
    vi.spyOn(EngineService.prototype, 'analyze').mockImplementation(() => new Promise((done) => { resolve = done; }));
    const view = show(openContinuation(createLessonSession(lesson, 'local', 'repertoire'), journey));
    await click('Continue from …c5'); await click('Play a6');
    expect(screen.getByRole('region', { name: 'Candidate comparison' })).toBeInTheDocument();
    await click('Compare with lesson move');
    await click('Return to checkpoint');
    await act(async () => resolve({ bestMove: { from: 'c5', to: 'd4' }, depth: 10, score: null, pv: [] }));
    expect(view.latest().answers).toEqual({});
    expect(view.latest().assistance['continuation:central-tension'].analysis).toBe(true);
    await click('Change candidate');
    expect(screen.getByLabelText('Test board')).toHaveAttribute('data-fen', continuationBoard(journey, 0).fen());
  });

  it('completes all six decisions, exposes the whole replay and preserves the separate endgame exercise', async () => {
    const initial = createLessonSession(lesson, 'local', 'repertoire'); initial.stage = 'summary';
    initial.journey = { active: false, step: 2 };
    const view = show(initial);
    await click('Follow this position into an ending'); await click('Continue from …c5');
    for (const [index, step] of journey.steps.entries()) {
      expect(screen.getByRole('heading', { name: step.title })).toBeInTheDocument();
      await click('Play ' + step.main[0].san);
      await userEvent.click(screen.getByRole('radio', { name: step.choices.find((choice) => choice.id === step.candidates[0].reasonIds[0])!.label }));
      await userEvent.type(screen.getByRole('textbox', { name: 'Continuation predicted reply' }), step.candidates[0].replies[0].move);
      await click('Check my connection'); await click(index === 5 ? 'See continuation recap' : step.candidates[0].replies[0].move !== step.main[1].san ? 'Return to main line & continue' : 'Continue the main line');
    }
    expect(screen.getByText(/6\/6 independently correct/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('Replay every move from the opening')); await click('27…bxc6');
    expect(screen.getByText(/The b7 pawn recaptures the queen/)).toBeInTheDocument();
    await click('Return to active decision'); await click('Back to the opening');
    await click('Continue the endgame connection');
    expect(screen.getByRole('heading', { name: lesson.endgame!.steps[2].title })).toBeInTheDocument();
    expect(view.latest().continuation!.finished).toBe(true);
    expect(Object.keys(view.latest().answers).filter((key) => key.startsWith('continuation:'))).toHaveLength(6);
  });

  it('opens the new journey from the structure guide and restores it after leaving Today', async () => {
    const view = render(<App />);
    await click('Start learning'); await click('Repertoire');
    const guide = screen.getByRole('navigation', { name: /Caro-Kann: Classical Active Structure learning connections/ });
    await userEvent.click(within(guide).getByRole('button', { name: 'Follow this position into an ending', hidden: true }));
    await click('Continue from …c5'); await click('Play cxd4');
    await click('Save & leave');
    await waitFor(async () => expect((await new GuidedLearnerRepository(null).loadLessonSessions('local')).some((session) => session.continuation?.candidate === 'cxd4')).toBe(true));
    view.unmount(); render(<App />);
    await click('Repertoire');
    const reopened = screen.getByRole('navigation', { name: /Caro-Kann: Classical Active Structure learning connections/ });
    await userEvent.click(within(reopened).getByRole('button', { name: 'Follow this position into an ending', hidden: true }));
    expect(screen.getByText('Your candidate: cxd4')).toBeInTheDocument();
  });
});
