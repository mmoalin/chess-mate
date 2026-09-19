import { useEffect, useRef, type ReactNode } from 'react';
import { Chess } from 'chess.js';
import { ChessBoardUI } from '../../components/ChessBoardUI';
import { ChoiceGroup } from '../../components/ChoiceGroup';
import { moveLabel } from '../../core/notation';
import { CandidateExplorer } from './CandidateExplorer';
import { PawnStructure } from './PawnStructure';
import type { ConnectedLesson, LessonSession } from './types';
import { advanceContinuation, continuationBoard, continuationKey, continuationMoves, continuationResultLabel, submitContinuation, type ContinuationProgress } from './continuationJourney';

export function ContinuationJourneyWorkspace({ lesson, session, saveFeedback, onUpdate, onReturn, onLeave }: {
  lesson: ConnectedLesson; session: LessonSession; saveFeedback?: ReactNode;
  onUpdate: (session: LessonSession) => void; onReturn: () => void; onLeave?: () => void;
}) {
  const journey = lesson.continuation!;
  const progress = session.continuation!;
  const index = Math.min(progress.step, journey.steps.length - 1);
  const step = journey.steps[index];
  const key = continuationKey(step.id);
  const before = continuationBoard(journey, index);
  const history = continuationMoves(journey, index, Boolean(progress.submitted || progress.finished));
  const inspection = progress.inspectionPly !== undefined;
  const board = new Chess();
  const viewingIntro = !progress.started && index === 0;
  const showingMain = progress.finished || viewingIntro;
  if (inspection) for (const item of history.slice(0, progress.inspectionPly)) board.move(item.san);
  else if (showingMain) for (const san of viewingIntro ? journey.openingPrefix : history.map((item) => item.san)) board.move(san);
  else {
    for (const item of continuationMoves(journey, index)) board.move(item.san);
    if (progress.candidate) board.move(progress.candidate);
    if (progress.submitted && progress.prediction) board.move(progress.prediction);
  }
  const change = (patch: Partial<ContinuationProgress>) => onUpdate({ ...session, continuation: { ...progress, ...patch }, updatedAt: new Date().toISOString() });
  const help = session.assistance[key];
  const assist = (analysis = false) => onUpdate({ ...session, assistance: { ...session.assistance, [key]: {
    hint: Boolean(help?.hint || !analysis), revealed: help?.revealed ?? false, analysis: Boolean(help?.analysis || analysis)
  } }, updatedAt: new Date().toISOString() });
  const heading = useRef<HTMLHeadingElement>(null);
  const response = useRef<HTMLElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.closest<HTMLElement>('.dock-panel')?.scrollTo?.({ top: 0 });
  }, [index, progress.started, progress.finished, progress.exploring]);
  useEffect(() => {
    if (!progress.result && !progress.error) return;
    const element = response.current;
    const panel = element?.closest<HTMLElement>('.dock-panel');
    element?.focus({ preventScroll: true });
    if (element && panel) panel.scrollTo?.({ top: panel.scrollTop + element.getBoundingClientRect().top - panel.getBoundingClientRect().top - 16 });
  }, [progress.result, progress.error]);
  const targets: Record<string, string[]> = {};
  if (progress.started && !inspection && !progress.candidate && !progress.submitted && !progress.finished) {
    for (const move of board.moves({ verbose: true })) (targets[move.from] ??= []).push(move.to);
  }
  if (progress.exploring) return <CandidateExplorer fen={before.fen()} side={lesson.side} candidate={progress.candidate}
    lessonMove={step.main[0].san} explanation={step.candidates[0].explanation}
    comparisons={Object.fromEntries(step.candidates.map((candidate) => [candidate.move, candidate.explanation]))}
    saveFeedback={saveFeedback} onReturn={() => change({ exploring: false })} onAssistance={() => assist(true)} />;
  const result = progress.result;
  const departed = progress.submitted && (progress.candidate !== step.main[0].san || progress.prediction !== step.main[1]?.san);
  const retry = () => change({ candidate: undefined, choice: undefined, prediction: undefined, reflection: undefined,
    submitted: false, result: undefined, error: undefined, inspectionPly: undefined });

  return <section className="workspace connected-workspace" aria-label={`Continuous journey: ${journey.title}`}>
    <div className="board-column"><ChessBoardUI fen={board.fen()} orientation={lesson.side} legalTargets={targets} onMoveAttempt={(from, to, promotion) => {
      if (!progress.started || inspection || progress.candidate || progress.submitted || progress.finished) return false;
      try {
        const candidate = board.move({ from, to, promotion }).san;
        const unknown = !step.candidates.some((item) => item.move === candidate);
        change({ candidate, exploring: unknown, error: undefined });
        return { accepted: true, message: unknown ? `${candidate} is legal and unassessed. Explore it without a grade.` : `${candidate} selected. Choose a reason and predict a reply.` };
      } catch { return false; }
    }} /></div>
    <aside className="task-dock"><section className={`dock-panel journey-panel continuation-panel ${progress.started ? 'continuation-active' : ''}`}>
      {saveFeedback}
      <div className="button-row"><button className="secondary-button" onClick={onReturn}>Return to opening lesson</button>{onLeave && <button className="link-button" onClick={onLeave}>Save & leave</button>}</div>
      <p className="eyebrow">One game · opening to rook ending</p>
      <h2>{journey.title}</h2>
      <p className="training-example-note">Original illustrative continuation · every position is replayable.</p>
      {!progress.started && !inspection ? <>
        <h3 ref={heading} tabIndex={-1}>Continue from the main line after {journey.openingPrefix.length % 2 === 0 ? '…' : ''}{journey.openingPrefix.at(-1)}</h3>
        <p>{journey.introduction}</p>
        <p>{index ? `This review opens decision ${index + 1}. Replay the earlier moves below to see how it was reached.` : `${journey.steps.length} decisions · about ${journey.steps.length * 2} minutes. Save at any point; daily reviews use one two-minute checkpoint.`}</p>
        <button className="primary-button" onClick={() => change({ started: true })}>{index ? 'Open this decision' : `Continue from ${journey.openingPrefix.length % 2 === 0 ? '…' : ''}${journey.openingPrefix.at(-1)}`}</button>
      </> : inspection ? <>
        <h3 ref={heading} tabIndex={-1}>Replay · {progress.inspectionPly === 0 ? 'Starting position' : moveLabel(progress.inspectionPly!, history[progress.inspectionPly! - 1].san)}</h3>
        <p>{progress.inspectionPly ? history[progress.inspectionPly - 1].note : 'Every move starts from the normal chess starting position.'}</p>
        <p>Read-only inspection. Your decision and recorded answers are preserved.</p>
        <button className="primary-button" onClick={() => change({ inspectionPly: undefined })}>Return to active decision</button>
      </> : progress.finished ? <>
        <h3 ref={heading} tabIndex={-1}>Continuous journey recap</h3>
        <p>{Object.values(progress.firstResults).filter((item) => continuationResultLabel(item) === 'Independently correct').length}/{Object.keys(progress.firstResults).length} independently correct. First submissions are preserved; unassessed replies earn no mastery credit.</p>
        <ol className="lesson-results">{journey.steps.filter((item) => progress.firstResults[item.id]).map((item) => <li key={item.id}>
          <strong>{item.title}</strong><span>{continuationResultLabel(progress.firstResults[item.id])}</span><p>{item.takeaway}</p>
          <p>Your first move: {progress.firstResults[item.id].candidate} · Predicted reply: {progress.firstResults[item.id].prediction}</p>
          {progress.firstResults[item.id].reflection && <p>Your reflection: {progress.firstResults[item.id].reflection}</p>}
          <button className="secondary-button" onClick={() => change({ step: journey.steps.indexOf(item), finished: false, started: true,
            candidate: progress.latestResults[item.id].candidate, choice: progress.latestResults[item.id].choice, prediction: progress.latestResults[item.id].prediction,
            reflection: progress.latestResults[item.id].reflection, result: progress.latestResults[item.id], submitted: true, inspectionPly: undefined })}>Review decision: {item.title}</button>
        </li>)}</ol>
        <p>{journey.steps.at(-1)?.takeaway}</p>
        <button className="primary-button" onClick={onReturn}>Back to the opening</button>
      </> : <>
        <p className="step-caption">Decision {index + 1} of {journey.steps.length} · You play {lesson.side === 'white' ? 'White' : 'Black'} · about 2 minutes</p>
        <h3 ref={heading} tabIndex={-1}>{step.title}</h3>
        {step.bridge.length > 0 && <details className="journey-context"><summary>How we reached this decision · {step.bridge.length} connecting moves</summary><p>The main example continues with these moves. Select any move in the replay below to inspect its position.</p><ol>{step.bridge.map((item, i) => <li key={i}>{item.san}: {item.note}</li>)}</ol></details>}
        <p>{step.prompt}</p>
        {!progress.candidate && <p className="lesson-card">Choose your move on the board. The answer stays hidden until you submit or request a hint.</p>}
        {progress.candidate && <div className="reasoning-card">
          <strong>Your candidate: {progress.candidate}</strong>
          <h4>What does this move achieve?</h4>
          <ChoiceGroup label="Continuation structural reason" choices={step.choices} value={progress.choice ?? ''} disabled={progress.submitted} onChange={(choice) => change({ choice })} />
          <label>Predict a strong opponent reply<input aria-label="Continuation predicted reply" disabled={progress.submitted} value={progress.prediction ?? ''} onChange={(event) => change({ prediction: event.target.value, error: undefined })} placeholder="Move notation" /></label>
          <label>Your reflection (optional)<textarea aria-label="Continuation reflection" disabled={progress.submitted} value={progress.reflection ?? ''} onChange={(event) => change({ reflection: event.target.value })} /></label>
          <p className="analysis">Authored moves, reasons and replies are assessed separately. Reflections are saved for self-review.</p>
          {!progress.submitted && <div className="button-row"><button className="primary-button" disabled={!progress.choice || !progress.prediction?.trim()} onClick={() => onUpdate(submitContinuation(session, journey))}>Check my connection</button><button className="secondary-button" onClick={() => change({ candidate: undefined, choice: undefined, prediction: undefined, error: undefined })}>Change candidate</button></div>}
        </div>}
        {(result || progress.error) && <section ref={response} tabIndex={-1} className="lesson-response" aria-label="Decision feedback" role="status">
          {progress.error && <p>{progress.error}</p>}
          {result && <>
            <h4>First submission: {continuationResultLabel(progress.firstResults[step.id])}</h4>
            {(['move', 'reason', 'reply'] as const).map((component) => <p key={component}><strong>{component === 'move' ? 'Move' : component === 'reason' ? 'Reason' : 'Opponent reply'} · {result[component].status === 'correct' ? 'supported' : result[component].status === 'incorrect' ? 'needs review' : 'unassessed'}:</strong> {result[component].text}</p>)}
            {progress.firstResults[step.id] !== result && <p>First submission: {continuationResultLabel(progress.firstResults[step.id])}. This retry does not replace it.</p>}
            <p><strong>Main example:</strong> {step.main.map((item) => item.san).join(' ')}.</p>
            {departed && <p>Your board shows your candidate and predicted reply. Continuing explicitly returns to the main example before the next connecting moves.</p>}
            <div className="button-row"><button className="primary-button" onClick={() => onUpdate(advanceContinuation(session, journey))}>{session.reviewCheckpointId?.startsWith('continuation:') || index === journey.steps.length - 1 ? 'See continuation recap' : departed ? 'Return to main line & continue' : 'Continue the main line'}</button><button className="secondary-button" onClick={retry}>Try this decision again</button></div>
          </>}
        </section>}
        {!progress.submitted && <><button className="secondary-button" onClick={() => assist()}>Hint for this decision</button>{help?.hint && <p className="study-hint">{step.hint}</p>}</>}
        {progress.submitted && <>
          <div className="structure-comparison"><PawnStructure fen={before.fen()} label="Before this decision" side={lesson.side} /><PawnStructure fen={board.fen()} label="After your candidate and reply" side={lesson.side} /></div>
          <button className="secondary-button" onClick={() => change({ exploring: true })}>Explore & compare this decision</button>
        </>}
      </>}
      <details className="continuation-replay"><summary>Replay every move from the opening</summary>
        <div className="move-strip"><button onClick={() => change({ inspectionPly: 0 })}>Start position</button>{history.map((item, i) => <button key={i} aria-current={progress.inspectionPly === i + 1 ? 'step' : undefined} onClick={() => change({ inspectionPly: i + 1 })}>{moveLabel(i + 1, item.san)}</button>)}</div>
        <p>Only moves up to this decision are shown. Submit before inspecting its example continuation.</p>
      </details>
    </section></aside>
  </section>;
}
