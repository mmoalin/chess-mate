import { EndgameJourneyWorkspace } from './EndgameJourneyWorkspace';
import { CandidateExplorer } from './CandidateExplorer';
import { CHECKPOINT_MINUTES, FULL_LESSON_MINUTES, answerTitle, independentAnswers } from './learningPresentation';
import { ChoiceGroup } from '../../components/ChoiceGroup';
import { useEffect, useRef, useState } from 'react';
import { ChessBoardUI } from '../../components/ChessBoardUI';
import { EngineService } from '../../services/engineService';
import { usePositionAnalysis } from '../../services/usePositionAnalysis';
import type { LearnerRepository } from '../../domain/repertoire/repositories';
import type { ConnectedLesson, LessonSession } from './types';
import { answerQuestion, assist, analyseAssist, beginTransfer, createLessonSession, enableRecall, nextQuestion, playLessonMove, positionAfter, replayOpening, restoredQuestionChoice, startQuestions } from './session';

type Props = {
  lesson: ConnectedLesson;
  depth?: 'foundation' | 'standard' | 'deep';
  initialSession: LessonSession;
  repository: LearnerRepository;
  onSessionChange: (session: LessonSession) => void;
  onPersisted: () => void;
  onExit: (destination: LessonSession['returnDestination']) => void;
};
export function ConnectedLessonWorkspace(props: Props) {
  const { lesson, repository } = props;
  const [session, setSession] = useState(props.initialSession);
  const current = useRef(session);
  const callbacks = useRef(props);
  callbacks.current = props;
  const [feedback, setFeedback] = useState(() => {
    const choice = restoredQuestionChoice(props.initialSession, lesson);
    return lesson.questions.find((question) => question.id === props.initialSession.checkpointId)?.choices.find((item) => item.id === choice)?.feedback
      ?? (props.initialSession.stage === 'summary' ? '' : props.initialSession.stage === 'opening' ? 'Follow the opening, then connect the position to a plan.' : 'Consider the position, then choose your answer.');
  });
  const [syncError, setSyncError] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [engineError, setEngineError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(() => restoredQuestionChoice(props.initialSession, lesson));
  const [exploration, setExploration] = useState<{ candidate?: string } | null>(null);
  const [pending, setPending] = useState<{ from: string; to: string; promotion?: string; san: string } | null>(null);
  const [plan, setPlan] = useState('');
  const [prediction, setPrediction] = useState('');
  const independent = (session.learningMode ?? (props.depth && props.depth !== 'foundation' ? 'independent' : 'guided')) === 'independent';

  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTop = 0;
    if (!document.activeElement?.closest('.board-shell')) {
      const heading = panel.querySelector<HTMLElement>('h3') ?? panel.querySelector<HTMLElement>('h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
  }, [session.stage, session.checkpointId]);
  const responseRef = useRef<HTMLElement>(null);
  const focusResponse = useRef(false);
  useEffect(() => { if (focusResponse.current) { responseRef.current?.focus(); focusResponse.current = false; } }, [feedback]);
  const [inspectPly, setInspectPly] = useState<number | null>(null);
  const engine = useRef(new EngineService());
  const generation = useRef(0);
  const mounted = useRef(true);
  const latestSave = useRef(0);
  const changed = session.contentVersion !== lesson.version;
  const chess = positionAfter(session.moves);
  const practiceMoves = chess.history({ verbose: true }).slice(session.practiceStartMoves?.length ?? session.moves.length).filter((move) => move.color === lesson.side[0]).length;
  const practiceFinished = Boolean(session.practiceLimit && practiceMoves >= session.practiceLimit && chess.turn() === lesson.side[0]);
  const board = inspectPly === null ? pending ? positionAfter([...session.moves, pending.san]) : chess : positionAfter(session.moves.slice(0, inspectPly));
  const positionAnalysis = usePositionAnalysis(board.fen(), session.id + ':' + session.stage + ':' + session.checkpointId + ':' + inspectPly);
  const question = lesson.questions.find((q) => q.id === session.checkpointId);
  const decision = lesson.decisions[session.checkpointId];
  const help = session.assistance[session.checkpointId];

  function save(next: LessonSession) {
    const revision = ++latestSave.current;
    void repository.saveLessonSession(next).then(() => {
      if (!mounted.current) return;
      if (revision === latestSave.current) setSyncError('');
      callbacks.current.onPersisted();
    }).catch((error) => {
      if (mounted.current && revision === latestSave.current) setSyncError('Progress sync needs attention: ' + (error instanceof Error ? error.message : String(error)) + '. Retry to save any pending progress.');
      if (mounted.current) callbacks.current.onPersisted();
    });
  }
  function update(next: LessonSession) {
    if (next.moves !== current.current.moves || next.stage !== current.current.stage || next.checkpointId !== current.current.checkpointId) cancelEngine();
    current.current = next;
    setSession(next);
    callbacks.current.onSessionChange(next);
    save(next);
  }
  function cancelEngine() {
    generation.current += 1;
    engine.current.stop();
    setBusy(false);
    setAnalysis('');
  }
  useEffect(() => {
    mounted.current = true;
    save(current.current);
    const retry = () => save(current.current);
    window.addEventListener('online', retry);
    return () => { mounted.current = false; generation.current += 1; engine.current.stop(); window.removeEventListener('online', retry); };
  }, [repository]);
  useEffect(() => {
    const choice = restoredQuestionChoice(current.current, lesson);
    setSelected(choice);
    if (current.current.stage === 'question') {
      const question = lesson.questions.find((item) => item.id === current.current.checkpointId);
      setFeedback(question?.choices.find((item) => item.id === choice)?.feedback ?? 'Consider the position, then choose your answer.');
    }
  }, [session.checkpointId, session.stage, lesson]);

  async function requestEngineReply() {
    if (busy || inspectPly !== null) return;
    const before = current.current;
    const position = positionAfter(before.moves);
    if (position.isGameOver() || position.turn() === lesson.side[0]) return;
    const request = ++generation.current;
    setBusy(true); setEngineError(''); setAnalysis('Stockfish is thinking…');
    try {
      const move = await engine.current.bestMove(position.fen(), { depth: 6 });
      if (!mounted.current || request !== generation.current || current.current.stage !== 'sparring' || positionAfter(current.current.moves).fen() !== position.fen()) return;
      if (!move) throw new Error('Stockfish returned no move.');
      const played = position.move(move);
      update({ ...current.current, moves: [...current.current.moves, played.san], updatedAt: new Date().toISOString() });
      setAnalysis('Stockfish played ' + played.san + '.');
    } catch (error) {
      if (mounted.current && request === generation.current) { setEngineError(error instanceof Error ? error.message : 'Stockfish is unavailable.'); setAnalysis('Your lesson and position are preserved.'); }
    } finally { if (mounted.current && request === generation.current) setBusy(false); }
  }
  useEffect(() => {
    if (!changed && session.stage === 'sparring' && !busy && !engineError && inspectPly === null && !practiceFinished && !chess.isGameOver() && chess.turn() !== lesson.side[0]) void requestEngineReply();
  }, [session.stage, session.moves, busy, engineError, inspectPly, changed]);

  function commitMove(from: string, to: string, promotion?: string) {
    const result = playLessonMove(current.current, lesson, from, to, promotion);
    setFeedback(result.feedback);
    if (result.session !== current.current) update(result.session);
    if (result.ungraded) {
      const candidate = positionAfter(current.current.moves).move({ from, to, promotion }).san;
      setExploration({ candidate });
    }
    return { accepted: result.accepted, message: result.feedback };
  }
  function submitReasoning() {
    if (!pending || !plan.trim() || !prediction.trim()) return;
    try { positionAfter([...session.moves, pending.san]).move(prediction.trim()); }
    catch { setFeedback('Enter a legal opponent reply in notation, such as Nc6. You can change your candidate or use a hint.'); return; }
    update({ ...current.current, reflections: { ...current.current.reflections, [session.checkpointId]: { move: pending.san, plan: plan.trim(), reply: prediction.trim() } } });
    const move = pending; setPending(null); setPlan(''); setPrediction('');
    commitMove(move.from, move.to, move.promotion);
  }
  function play(from: string, to: string, promotion?: string) {
    if (changed || inspectPly !== null || busy || pending || practiceFinished) return false;
    if (current.current.stage === 'sparring') {
      const position = positionAfter(current.current.moves);
      if (position.isGameOver() || position.turn() !== lesson.side[0]) return false;
      try {
        const move = position.move({ from, to, promotion });
        update({ ...current.current, moves: [...current.current.moves, move.san], updatedAt: new Date().toISOString() });
        setFeedback('You played ' + move.san + '.'); setEngineError('');
        return true;
      } catch { return false; }
    }
    if (independent && ['main', 'transfer'].includes(session.stage)) {
      try {
        const san = positionAfter(session.moves).move({ from, to, promotion }).san;
        setPending({ from, to, promotion, san }); setFeedback('Candidate placed. Explain your plan and predict a legal reply before checking.');
        return { accepted: true, message: `${san} is your candidate. Explain the plan and predict the reply.` };
      } catch { return false; }
    }
    return commitMove(from, to, promotion);
  }
  async function analyse() {
    if (busy || (session.stage === 'sparring' && !practiceFinished && !chess.isGameOver())) return;
    await positionAnalysis.run();
  }
  function beginPractice(limit?: number, alternative = false) {
    cancelEngine(); setInspectPly(null); setEngineError(''); setAnalysis('');
    let start = [...current.current.moves];
    if (alternative) { let decision = lesson.decisions[lesson.mainStartId]; while (decision.answers[0].nextId) decision = lesson.decisions[decision.answers[0].nextId!]; start = [...decision.movesBefore, decision.answers[0].moveSan, ...decision.answers[0].repliesSan]; }
    update({ ...current.current, stage: 'sparring', practiceLimit: limit, practiceReflection: '', practiceReturnMoves: [...current.current.moves], practiceStartMoves: start, moves: start, updatedAt: new Date().toISOString() });
  }
  function restartLesson() {
    cancelEngine(); setInspectPly(null);
    update({ ...current.current, supersededAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    update(createLessonSession(lesson, session.learnerId, session.returnDestination));
  }
  function returnToLesson() {
    cancelEngine(); setInspectPly(null); setEngineError(''); setAnalysis('');
    update({ ...current.current, stage: 'summary', practiceReview: { moves: [...current.current.moves], startMoves: [...(current.current.practiceStartMoves ?? [])], limit: current.current.practiceLimit, reflection: current.current.practiceReflection }, moves: [...(current.current.practiceReturnMoves ?? current.current.practiceStartMoves ?? current.current.moves)], updatedAt: new Date().toISOString() });
  }
  const legalTargets: Record<string, string[]> = {};
  const interactive = !pending && !practiceFinished && !changed && inspectPly === null && !busy && (['main', 'transfer', 'sparring'].includes(session.stage) || (session.stage === 'opening' && session.openingRecall)) && board.turn() === lesson.side[0];
  if (interactive) for (const move of board.moves({ verbose: true })) (legalTargets[move.from] ??= []).push(move.to);
  const last = board.history({ verbose: true }).at(-1);
  const stages = ['Opening', 'Position & plan', 'Linked decisions', 'Different reply', 'Summary'];
  const stageIndex = session.stage === 'opening' ? 0 : session.stage === 'question' ? 1 : session.stage === 'main' ? 2 : ['transfer', 'transfer-intro'].includes(session.stage) ? 3 : 4;
  const attempts = Object.values(session.answers);
  const saveFeedback = syncError && <div role="alert"><p>{syncError}</p><button className="secondary-button" onClick={() => save(current.current)}>Retry progress sync</button></div>;

  const response = <section ref={responseRef} tabIndex={-1} className="lesson-response" aria-label="Lesson feedback" aria-live="polite">{inspectPly !== null && <strong>History inspection · read only</strong>}{feedback && <p>{feedback}</p>}{positionAnalysis.text && <p>{positionAnalysis.text}</p>}{session.stage === 'sparring' && analysis && <p>{analysis}</p>}</section>;
  if (!changed && session.journey?.active && lesson.endgame) return <EndgameJourneyWorkspace lesson={lesson} session={session} saveFeedback={saveFeedback} onUpdate={update} onReturn={() => update({ ...current.current, journey: { ...current.current.journey!, active: false } })} />;
  if (!changed && exploration) return <CandidateExplorer fen={chess.fen()} side={lesson.side} candidate={exploration.candidate} lessonMove={session.stage === 'opening' ? lesson.openingMoves[session.moves.length] : decision?.answers[0].moveSan} explanation={decision?.answers[0].feedback} comparisons={decision?.comparisons} saveFeedback={saveFeedback} onReturn={() => { setExploration(null); setFeedback('Returned to your checkpoint. Choose your move when ready.'); }} onAssistance={() => update(analyseAssist(current.current))} />;
  return <section className="workspace connected-workspace" aria-label="Connected lesson workspace">
    <div className="board-column">
      <ChessBoardUI fen={board.fen()} orientation={lesson.side} legalTargets={legalTargets} lastMove={last ? { from: last.from, to: last.to } : null} onMoveAttempt={play} />

    </div>
    <aside className="task-dock" aria-label="Connected lesson">
      <nav className="mode-tabs" aria-label="Lesson navigation"><button onClick={() => props.onExit('today')}>Today</button><button onClick={() => props.onExit('repertoire')}>Repertoire</button><button onClick={() => props.onExit(session.returnDestination)}>Save & leave lesson</button></nav>
      <section ref={panelRef} className={`dock-panel connected-panel ${session.reviewCheckpointId ? 'focused-lesson' : ''}`}>
        <p className="eyebrow">{lesson.side === 'white' ? 'Vienna · White' : 'Caro-Kann · Black'} · about {session.reviewCheckpointId ? CHECKPOINT_MINUTES : FULL_LESSON_MINUTES} min</p><h2>{lesson.title}</h2>
        <p className="lesson-stage-current">Step {stageIndex + 1} of 5 · {stages[stageIndex]}</p><ol className="lesson-stages" aria-label="Lesson stages">{stages.map((label, index) => <li key={label} aria-current={index === stageIndex ? 'step' : undefined}>{label}</li>)}</ol>
        {syncError && <div className="lesson-sync-status" role="status"><p>{syncError}</p><button className="secondary-button" onClick={() => save(current.current)}>Retry progress sync</button></div>}
        {session.stage !== 'question' && <label className="challenge-toggle"><input type="checkbox" checked={independent} disabled={Boolean(pending)} onChange={(e) => update({ ...current.current, learningMode: e.target.checked ? 'independent' : 'guided' })} /> Independent challenge: move, explain, predict</label>}
        {changed ? <article className="lesson-card"><h3>This lesson has been updated</h3><p>Your recorded answers are preserved. Restart to follow the new content safely.</p><button className="primary-button" onClick={restartLesson}>Restart updated lesson</button></article> : <>
          {inspectPly !== null && <button className="primary-button" onClick={() => setInspectPly(null)}>Resume active position</button>}
          {session.stage === 'opening' && <>
            <h3>Follow the opening</h3>{independent && <p>Already know this opening? <button className="link-button" onClick={() => update({ ...createLessonSession(lesson, session.learnerId, session.returnDestination, lesson.mainStartId), learningMode: 'independent' })}>Check what I know</button> Try one plan decision before choosing the full lesson.</p>}<p>Replay the opening or recall the {lesson.side} moves. Then explore the resulting position and its plan.</p><p className="lesson-card">{session.moves.length ? lesson.openingExplanations[session.moves.length - 1] : 'Replay the moves or recall your own side. Opponent moves are played for you during recall.'}</p>
            <p>Opening progress: {session.moves.length} of {lesson.openingMoves.length} half-moves. Replay and skipping earn no recall credit.</p>
            <div className="button-row"><button className="secondary-button" disabled={session.openingRecall || inspectPly !== null} onClick={() => update(replayOpening(current.current, lesson))}>Next opening move</button><button className="secondary-button" disabled={session.openingRecall || inspectPly !== null} onClick={() => update(enableRecall(current.current, lesson))}>Recall my moves</button><button className="primary-button" onClick={() => { setInspectPly(null); update(startQuestions(current.current, lesson)); }}>Go to model position</button></div>
          </>}
          {session.stage === 'question' && question && <>
            <h3>{question.prompt}</h3>{(!independent || session.completedCheckpoints.includes(question.id)) && <p>{lesson.introduction}</p>}
            <ChoiceGroup label="Lesson choices" choices={question.choices} value={selected} disabled={session.completedCheckpoints.includes(question.id) || inspectPly !== null} onChange={setSelected} />
            {response}
            {session.completedCheckpoints.includes(question.id) ? <button className="primary-button" disabled={inspectPly !== null} onClick={() => { update(nextQuestion(current.current, lesson)); setFeedback(''); }}>{session.reviewCheckpointId ? 'Finish checkpoint' : 'Continue lesson'}</button> : <button className="primary-button" disabled={!selected || inspectPly !== null} onClick={() => { const result = answerQuestion(current.current, lesson, selected); focusResponse.current = true; setFeedback(result.feedback); update(result.session); }}>Check answer</button>}
          </>}
          {['main', 'transfer'].includes(session.stage) && decision && <><h3>{independent ? 'Choose a move and anticipate the reply' : decision.prompt}</h3><article className="position-change-card"><strong>What changed?</strong><p>{decision.change}</p></article>{pending && <div className="reasoning-card"><h3>Your candidate: {pending.san}</h3><label>What does your move improve?<textarea aria-label="Your plan" value={plan} onChange={(e) => setPlan(e.target.value)} /></label><label>What would your opponent play?<input aria-label="Predicted reply" placeholder="Move notation, e.g. Nc6" value={prediction} onChange={(e) => setPrediction(e.target.value)} /></label><p className="analysis">Your explanation is saved for reflection; the move is graded against the authored lesson. A legal predicted reply is not necessarily the best reply.</p><div className="button-row"><button className="primary-button" disabled={!plan.trim() || !prediction.trim()} onClick={submitReasoning}>Check my decision</button><button className="secondary-button" onClick={() => { setPending(null); setPlan(''); setPrediction(''); }}>Change candidate</button></div></div>}<p>Play your move. The position continues through your move and the opponent’s reply.</p><p className="analysis">Unlisted legal moves are ungraded; the lesson does not call every alternative a mistake.</p></>}
          {session.stage === 'transfer-intro' && <article className="lesson-card"><h3>Test a different opponent reply</h3><p>{lesson.transferExplanation}</p><button className="primary-button" onClick={() => { cancelEngine(); setInspectPly(null); update(beginTransfer(current.current, lesson)); setFeedback(lesson.transferExplanation); }}>Rewind and test the different reply</button></article>}
          {session.stage !== 'question' && response}
          {['opening', 'question', 'main', 'transfer'].includes(session.stage) && <>
            <div className="button-row"><button className="secondary-button" disabled={inspectPly !== null} onClick={() => update(assist(current.current))}>Hint</button><button className="secondary-button" disabled={inspectPly !== null} onClick={() => update(assist(current.current, true))}>Reveal candidate</button></div>
            {help?.hint && <p className="study-hint">{session.stage === 'opening' ? 'Think about development and central control.' : question && session.stage === 'question' ? question.hint : decision?.hint}</p>}
            {help?.revealed && <p className="study-hint">Candidate: {session.stage === 'opening' ? lesson.openingMoves[session.moves.length] : session.stage === 'question' ? question?.choices.find((c) => c.correct)?.label : decision?.answers[0].moveSan}. Revealed answers do not earn mastery credit.</p>}
          </>}
          {session.stage === 'summary' && <>
            <h3>{session.reviewCheckpointId ? 'Checkpoint complete' : 'Lesson complete'}</h3><p><strong>Takeaway:</strong> {lesson.takeaway}</p>
            <p>{independentAnswers(session)}/{attempts.length} independently correct. {Object.values(session.assistance).filter((a) => a.hint || a.revealed || a.analysis).length} checkpoints used assistance.</p><p className="analysis">Completion records the work you did. Mastery grows through spaced reviews; retries do not replace the first answer.</p>
            {lesson.endgame && <article className="next-connection"><p className="eyebrow">Next connection · about {lesson.endgame.steps.length * 2} min</p><h3>{lesson.endgame.title}</h3><p>Follow the pawn structure through an exchange and into an ending. Includes a separate, clearly labelled training position.</p><button className="primary-button" onClick={() => update({ ...current.current, journey: { ...(current.current.journey ?? { step: 0 }), active: true } })}>{session.journey?.finished ? 'View endgame recap' : session.journey ? 'Continue the endgame connection' : 'Connect this opening to an endgame'}</button></article>}
            <ul className="lesson-results">{Object.entries(session.answers).map(([key, answer]) => <li key={key}><strong>{answerTitle(lesson, key)}</strong><span>{!answer.correct ? 'Needs review' : answer.hintUsed || answer.revealed ? 'Completed with assistance' : 'Independently correct'}{session.assistance[key]?.analysis ? ' · analysis' : answer.revealed ? ' · revealed' : answer.hintUsed ? ' · hint' : ''}{session.reflections?.[key] && <small>Your plan: {session.reflections[key].plan} · Predicted reply: {session.reflections[key].reply}. {lesson.decisions[key]?.answers[0]?.repliesSan.length ? 'Lesson reply: ' + lesson.decisions[key].answers[0].repliesSan.join(' ') : ''}</small>}</span></li>)}</ul>
            {session.practiceReview && <details><summary>Review your last practice</summary><p>{session.practiceReview.reflection || 'Reopen your continuation and compare it with the lesson’s plan.'}</p><button className="secondary-button" onClick={() => update({ ...current.current, stage: 'sparring', practiceReturnMoves: [...current.current.moves], practiceStartMoves: [...session.practiceReview!.startMoves], moves: [...session.practiceReview!.moves], practiceLimit: session.practiceReview!.limit, practiceReflection: session.practiceReview!.reflection })}>Reopen practice position</button></details>}<div className="button-row"><button className="primary-button" onClick={() => beginPractice()}>Play from here</button><button className="secondary-button" onClick={() => beginPractice(4)}>Practise a 4-move plan</button><button className="secondary-button" onClick={() => beginPractice(4, true)}>Practise the other lesson ending</button><button className="secondary-button" onClick={restartLesson}>Practise lesson again</button></div>
          </>}
          {session.stage === 'sparring' && <><h3>{practiceFinished ? 'Plan practice complete' : session.practiceLimit ? 'Apply your plan in four moves' : 'Play the position'}</h3>{session.practiceLimit && <p>Goal: {lesson.takeaway} · {Math.min(practiceMoves, session.practiceLimit)}/{session.practiceLimit} moves practised.</p>}{practiceFinished && <article className="lesson-card"><p>Review your continuation below. Which opponent threat changed your plan? Which pawn break or piece improvement did you prepare?</p><label className="saved-notes">What changed your plan?<textarea aria-label="Practice reflection" value={session.practiceReflection ?? ''} onChange={(e) => update({ ...current.current, practiceReflection: e.target.value, updatedAt: new Date().toISOString() })} /></label><p>Your moves and reflection are saved. Analyse the final position below to investigate a critical decision.</p><button className="secondary-button" onClick={() => { cancelEngine(); setEngineError(''); update({ ...current.current, moves: [...(session.practiceStartMoves ?? [])] }); }}>Retry the scenario</button></article>}<p>You play {lesson.side}. This practice is ungraded; your lesson is already saved.</p>{chess.isGameOver() && <p role="status">Game over: {chess.isCheckmate() ? 'checkmate' : 'draw'}.</p>}<button className="primary-button" onClick={returnToLesson}>Return to lesson</button></>}
        </>}
        {engineError && <div role="status"><p>{engineError}</p>{session.stage === 'sparring' && <button className="secondary-button" onClick={() => setEngineError('')}>Retry engine</button>}</div>}
        {['opening', 'question', 'main', 'transfer'].includes(session.stage) && <p className="assistance-note">Analysis marks this checkpoint as assisted. Hints and candidate reveals are separate choices.</p>}
        {['opening', 'main', 'transfer'].includes(session.stage) && <button className="secondary-button" disabled={Boolean(pending) || inspectPly !== null} onClick={() => { cancelEngine(); setExploration({}); }}>Explore a candidate</button>}
        <div className="button-row"><button className="secondary-button" disabled={Boolean(pending) || busy || positionAnalysis.busy || (session.stage === 'sparring' && !practiceFinished && !chess.isGameOver())} onClick={() => { if (inspectPly === null && ['opening', 'question', 'main', 'transfer'].includes(session.stage)) update(analyseAssist(current.current)); void analyse(); }}>Analyse position</button><button className="secondary-button" onClick={() => { void navigator.clipboard.writeText(board.pgn()).then(() => setFeedback('PGN copied.'), () => setFeedback('Could not copy PGN.')); }}>Copy PGN</button>{positionAnalysis.busy && <button className="secondary-button" onClick={positionAnalysis.stop}>Stop analysis</button>}{busy && <button className="secondary-button" onClick={() => { cancelEngine(); setEngineError('Engine stopped. Retry when ready.'); }}>Stop engine</button>}</div>
        <details className="lesson-history"><summary>Inspect move history</summary><div className="move-strip">{session.moves.map((move, i) => <button key={i} onClick={() => { cancelEngine(); setInspectPly(i + 1); }}>{Math.floor(i / 2) + 1}{i % 2 ? '…' : '.'} {move}</button>)}</div></details>
      </section>
    </aside>
  </section>;
}
