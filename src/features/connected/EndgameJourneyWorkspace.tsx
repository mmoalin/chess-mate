import { ChessBoardUI } from '../../components/ChessBoardUI';
import { ChoiceGroup } from '../../components/ChoiceGroup';
import type { ConnectedLesson, LessonSession } from './types';
import { journeyPosition, submitJourney } from './endgameJourney';
import { PawnStructure } from './PawnStructure';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ContinuationJourneyWorkspace } from './ContinuationJourneyWorkspace';

type JourneyWorkspaceProps = { lesson: ConnectedLesson; session: LessonSession; saveFeedback?: ReactNode; onUpdate: (session: LessonSession) => void; onReturn: () => void; onLeave?: () => void };
export function EndgameJourneyWorkspace(props: JourneyWorkspaceProps) {
  return props.session.continuation?.active && props.lesson.continuation
    ? <ContinuationJourneyWorkspace {...props} /> : <SeparateEndgameWorkspace {...props} />;
}
function SeparateEndgameWorkspace({ lesson, session, saveFeedback, onUpdate, onReturn }: JourneyWorkspaceProps) {
  const journey = lesson.endgame!;
  const progress = session.journey!;
  const index = Math.min(progress.step, journey.steps.length - 1);
  const step = journey.steps[index];
  const [inspection, setInspection] = useState<{ step: number; after: boolean } | null>(null);
  const before = journeyPosition(journey, index);
  const board = journeyPosition(journey, inspection?.step ?? index);
  if (inspection?.after) { const inspected = journey.steps[inspection.step]; for (const move of [inspected.move, ...inspected.replies]) board.move(move); }
  else if (!inspection && (progress.submitted || progress.finished)) for (const move of [step.move, ...step.replies]) board.move(move);
  else if (!inspection && progress.candidate) board.move(progress.candidate);
  const key = 'endgame:' + step.id;
  const hint = session.assistance[key]?.hint;
  const targets: Record<string, string[]> = {};
  if (!inspection && !progress.candidate && !progress.submitted && !progress.finished) for (const move of board.moves({ verbose: true })) (targets[move.from] ??= []).push(move.to);
  const heading = useRef<HTMLHeadingElement>(null);
  const response = useRef<HTMLDivElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); heading.current?.closest<HTMLElement>('.dock-panel')?.scrollTo?.({ top: 0 }); }, [index, progress.finished]);
  useEffect(() => {
    if (!progress.feedback) return;
    const element = response.current;
    const panel = element?.closest<HTMLElement>('.dock-panel');
    element?.focus({ preventScroll: true });
    if (element && panel) panel.scrollTo?.({ top: panel.scrollTop + element.getBoundingClientRect().top - panel.getBoundingClientRect().top - 16 });
  }, [progress.feedback]);
  const change = (patch: Partial<typeof progress>) => onUpdate({ ...session, journey: { ...progress, ...patch }, updatedAt: new Date().toISOString() });
  const answers = Object.entries(session.answers).filter(([id]) => id.startsWith('endgame:'));
  return <section className="workspace connected-workspace" aria-label="Opening to endgame journey">
    <div className="board-column"><ChessBoardUI fen={board.fen()} orientation={journey.side} legalTargets={targets} onMoveAttempt={(from, to, promotion) => {
      if (inspection || progress.candidate || progress.submitted || progress.finished) return false;
      try { const move = board.move({ from, to, promotion }); change({ candidate: move.san, feedback: '' }); return { accepted: true, message: `${move.san} selected. Explain the structural reason and predict a reply.` }; } catch { return false; }
    }} /></div>
    <aside className="task-dock"><section className="dock-panel journey-panel">
      {saveFeedback}
      <div className="button-row"><button className="secondary-button" onClick={onReturn}>Return to opening lesson</button></div>
      <p className="eyebrow">Opening → structure → exchange → endgame</p>
      <h2>{journey.title}</h2>{inspection && <button className="primary-button" onClick={() => setInspection(null)}>Return to active decision</button>}
      <p className="training-example-note">Separate training position · apply the opening’s structural idea.</p><details className="journey-context"><summary>Where this position comes from</summary><p>{journey.introduction}</p></details>
      {inspection ? <article className="lesson-card"><h3>{inspection.after ? 'After' : 'Before'}: {journey.steps[inspection.step].title}</h3><p>History inspection · this board is read only.</p><p>{journey.steps[inspection.step].explanation}</p></article> : progress.finished ? <>
        <h3 tabIndex={-1} ref={heading}>Connected journey complete</h3><p>{answers.filter(([, a]) => a.correct && !a.hintUsed && !a.revealed).length}/{answers.length} independently correct. Your first answers are saved for spaced review.</p>
        <ul className="lesson-results">{answers.map(([id, answer]) => <li key={id}><strong>{journey.steps.find((s) => 'endgame:' + s.id === id)?.title}</strong><span>{!answer.correct ? 'Review the structural reason' : answer.hintUsed || answer.revealed ? 'Completed with assistance' : 'Independently correct'}</span></li>)}</ul>
        <p>You followed a pawn structure into an exchange and an ending. In your next game, ask which pawn targets survive a trade and which piece becomes active.</p>
        <button className="primary-button" onClick={onReturn}>Back to the opening</button>
      </> : <>
        <p className="step-caption">{index + 1} of {journey.steps.length} · You play {journey.side}</p>
        <h3 tabIndex={-1} ref={heading}>{step.title}</h3>
        {step.transferContext && <article className="position-change-card"><strong>A changed position</strong><p>{step.transferContext}</p></article>}
        <p>{step.prompt}</p>
        {!progress.candidate && !progress.submitted && <p className="lesson-card">First, choose your move on the board.</p>}
        {progress.candidate && !progress.submitted && <div className="reasoning-card"><strong>Your candidate: {progress.candidate}</strong><h4>Why does this move fit the structure?</h4>
          <ChoiceGroup label="Structural reason" choices={step.choices} value={progress.choice ?? ''} onChange={(choice) => change({ choice })} />
          <label>Predict a legal opponent reply<input aria-label="Endgame predicted reply" value={progress.prediction ?? ''} onChange={(e) => change({ prediction: e.target.value })} placeholder="Move notation" /></label>
          <p className="analysis">The move and structural reason are assessed. Compare your predicted reply with the example after submitting; other legal replies may also be sound.</p>
          <div className="button-row"><button className="primary-button" disabled={Boolean(inspection) || !progress.choice || !progress.prediction?.trim()} onClick={() => onUpdate(submitJourney(session, journey))}>Check the connection</button><button className="secondary-button" onClick={() => change({ candidate: undefined, feedback: '' })}>Change candidate</button></div>
        </div>}
        {progress.feedback && <div ref={response} tabIndex={-1} className="lesson-response" role="status">{progress.feedback}</div>}
        {!progress.submitted && <><button className="secondary-button" onClick={() => onUpdate({ ...session, assistance: { ...session.assistance, [key]: { hint: true, revealed: false } }, updatedAt: new Date().toISOString() })}>Hint for this connection</button>{hint && <p className="study-hint">{step.hint}</p>}</>}
        {progress.submitted && <>
          <div className="structure-comparison"><PawnStructure fen={before.fen()} label="Before your decision" side={journey.side} /><PawnStructure fen={board.fen()} label="After the example reply" side={journey.side} /></div>
          <button className="secondary-button" onClick={() => { setInspection(null); change({ submitted: false, candidate: undefined, choice: undefined, prediction: undefined, feedback: 'Practice retry. Your first answer is preserved.' }); }}>Try this decision again</button><p><strong>Example continuation:</strong> {step.move} {step.replies.join(' ')}</p>
          <button className="primary-button" onClick={() => { setInspection(null); const finished = Boolean(session.reviewCheckpointId?.startsWith('endgame:')) || index === journey.steps.length - 1; onUpdate({ ...session, journey: { active: true, step: finished ? index : index + 1, finished }, completedAt: session.reviewCheckpointId?.startsWith('endgame:') && finished ? new Date().toISOString() : session.completedAt, updatedAt: new Date().toISOString() }); }}>{session.reviewCheckpointId?.startsWith('endgame:') || index === journey.steps.length - 1 ? 'See journey recap' : 'Continue the connection'}</button>
        </>}
      </>}
      <details><summary>Replayable example moves</summary><ol className="journey-moves">{journey.steps.slice(0, index + 1).map((item, i) => <li key={item.id}>{item.transferFen && <strong>New transfer position · </strong>}{item.title}: {i < index || progress.submitted || progress.finished ? <span className="button-row"><button className="secondary-button" onClick={() => setInspection({ step: i, after: false })}>Before {item.move}</button><button className="secondary-button" onClick={() => setInspection({ step: i, after: true })}>{item.move} {item.replies.join(' ')} · Show result</button></span> : 'Your decision is still hidden.'}</li>)}</ol></details>
    </section></aside>
  </section>;
}
