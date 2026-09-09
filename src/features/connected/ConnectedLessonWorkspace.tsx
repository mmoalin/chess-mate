import { useEffect, useRef, useState } from 'react';
import { ChessBoardUI } from '../../components/ChessBoardUI';
import { EngineService } from '../../services/engineService';
import type { LearnerRepository } from '../../domain/repertoire/repositories';
import type { ConnectedLesson, LessonSession } from './types';
import { answerQuestion, assist, beginTransfer, createLessonSession, enableRecall, nextQuestion, playLessonMove, positionAfter, replayOpening, startQuestions } from './session';

type Props = {
  lesson: ConnectedLesson;
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
  const [feedback, setFeedback] = useState(props.initialSession.stage === 'opening' ? 'Follow the opening, then connect the position to a plan.' : 'Resumed your saved position. Continue with the current lesson stage.');
  const [syncError, setSyncError] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [engineError, setEngineError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');
  const [inspectPly, setInspectPly] = useState<number | null>(null);
  const engine = useRef(new EngineService());
  const generation = useRef(0);
  const mounted = useRef(true);
  const latestSave = useRef(0);
  const changed = session.contentVersion !== lesson.version;
  const chess = positionAfter(session.moves);
  const board = inspectPly === null ? chess : positionAfter(session.moves.slice(0, inspectPly));
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
  useEffect(() => { setSelected(''); }, [session.checkpointId]);

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
    if (!changed && session.stage === 'sparring' && !busy && !engineError && inspectPly === null && !chess.isGameOver() && chess.turn() !== lesson.side[0]) void requestEngineReply();
  }, [session.stage, session.moves, busy, engineError, inspectPly, changed]);

  function play(from: string, to: string, promotion?: string) {
    if (changed || inspectPly !== null || busy) return false;
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
    const result = playLessonMove(current.current, lesson, from, to, promotion);
    setFeedback(result.feedback);
    if (result.session !== current.current) update(result.session);
    return result.accepted;
  }
  async function analyse() {
    if (busy || session.stage === 'sparring') return;
    const request = ++generation.current;
    setBusy(true); setEngineError('');
    try {
      const result = await engine.current.analyze(board.fen(), { depth: 8 });
      if (mounted.current && request === generation.current) setAnalysis(result.bestMove ? 'Engine candidate: ' + result.bestMove.from + '–' + result.bestMove.to + '. This does not grade the lesson.' : 'No move: this position is terminal.');
    } catch (error) { if (mounted.current && request === generation.current) setEngineError(error instanceof Error ? error.message : 'Engine unavailable.'); }
    finally { if (mounted.current && request === generation.current) setBusy(false); }
  }
  function beginPractice() {
    cancelEngine(); setInspectPly(null); setEngineError(''); setAnalysis('');
    update({ ...current.current, stage: 'sparring', practiceStartMoves: [...current.current.moves], updatedAt: new Date().toISOString() });
  }
  function restartLesson() {
    cancelEngine(); setInspectPly(null);
    update({ ...current.current, supersededAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    update(createLessonSession(lesson, session.learnerId, session.returnDestination));
  }
  function returnToLesson() {
    cancelEngine(); setInspectPly(null); setEngineError(''); setAnalysis('');
    update({ ...current.current, stage: 'summary', moves: [...(current.current.practiceStartMoves ?? current.current.moves)], updatedAt: new Date().toISOString() });
  }
  const legalTargets: Record<string, string[]> = {};
  const interactive = !changed && inspectPly === null && !busy && (['main', 'transfer', 'sparring'].includes(session.stage) || (session.stage === 'opening' && session.openingRecall)) && board.turn() === lesson.side[0];
  if (interactive) for (const move of board.moves({ verbose: true })) (legalTargets[move.from] ??= []).push(move.to);
  const last = board.history({ verbose: true }).at(-1);
  const stages = ['Opening', 'Position & plan', 'Linked decisions', 'Different reply', 'Summary'];
  const stageIndex = session.stage === 'opening' ? 0 : session.stage === 'question' ? 1 : session.stage === 'main' ? 2 : ['transfer', 'transfer-intro'].includes(session.stage) ? 3 : 4;
  const attempts = Object.values(session.answers);

  return <section className="workspace connected-workspace" aria-label="Connected lesson workspace">
    <div className="board-column">
      <ChessBoardUI fen={board.fen()} orientation={lesson.side} legalTargets={legalTargets} lastMove={last ? { from: last.from, to: last.to } : null} onMoveAttempt={play} />
      <section className="feedback-strip" aria-label="Lesson feedback" aria-live="polite"><div><p className="eyebrow">{inspectPly === null ? 'Feedback' : 'History inspection · read only'}</p><p>{feedback}</p>{analysis && <p className="analysis">{analysis}</p>}</div></section>
    </div>
    <aside className="task-dock" aria-label="Connected lesson">
      <nav className="mode-tabs" aria-label="Lesson navigation"><button onClick={() => props.onExit('today')}>Today</button><button onClick={() => props.onExit('repertoire')}>Repertoire</button><button onClick={() => props.onExit(session.returnDestination)}>Save & leave lesson</button></nav>
      <section className="dock-panel connected-panel">
        <p className="eyebrow">{lesson.side === 'white' ? 'Vienna · White' : 'Caro-Kann · Black'} · 10–15 min</p><h2>{lesson.title}</h2>
        <ol className="lesson-stages" aria-label="Lesson stages">{stages.map((label, index) => <li key={label} aria-current={index === stageIndex ? 'step' : undefined}>{label}</li>)}</ol>
        {syncError && <div className="lesson-sync-status" role="status"><p>{syncError}</p><button className="secondary-button" onClick={() => save(current.current)}>Retry progress sync</button></div>}
        {changed ? <article className="lesson-card"><h3>This lesson has been updated</h3><p>Your recorded answers are preserved. Restart to follow the new content safely.</p><button className="primary-button" onClick={restartLesson}>Restart updated lesson</button></article> : <>
          {inspectPly !== null && <button className="primary-button" onClick={() => setInspectPly(null)}>Resume active position</button>}
          {session.stage === 'opening' && <>
            <h3>Follow the opening</h3><p>{lesson.introduction}</p><p className="lesson-card">{session.moves.length ? lesson.openingExplanations[session.moves.length - 1] : 'Replay the moves or recall your own side. Opponent moves are played for you during recall.'}</p>
            <p>Move {session.moves.length} of {lesson.openingMoves.length}. Replay and skipping earn no recall credit.</p>
            <div className="button-row"><button className="secondary-button" disabled={session.openingRecall || inspectPly !== null} onClick={() => update(replayOpening(current.current, lesson))}>Next opening move</button><button className="secondary-button" disabled={session.openingRecall || inspectPly !== null} onClick={() => update(enableRecall(current.current, lesson))}>Recall my moves</button><button className="primary-button" onClick={() => { setInspectPly(null); update(startQuestions(current.current, lesson)); }}>Go to model position</button></div>
          </>}
          {session.stage === 'question' && question && <>
            <h3>{question.prompt}</h3><p>{lesson.introduction}</p>
            <div className="study-choice-list" role="radiogroup" aria-label="Lesson choices">{question.choices.map((choice) => <button role="radio" aria-checked={selected === choice.id} key={choice.id} className={selected === choice.id ? 'selected' : ''} disabled={session.completedCheckpoints.includes(question.id) || inspectPly !== null} onClick={() => setSelected(choice.id)}>{choice.label}</button>)}</div>
            {session.completedCheckpoints.includes(question.id) ? <button className="primary-button" disabled={inspectPly !== null} onClick={() => update(nextQuestion(current.current, lesson))}>{session.reviewCheckpointId ? 'Finish review' : 'Continue lesson'}</button> : <button className="primary-button" disabled={!selected || inspectPly !== null} onClick={() => { const result = answerQuestion(current.current, lesson, selected); setFeedback(result.feedback); update(result.session); }}>Check answer</button>}
          </>}
          {['main', 'transfer'].includes(session.stage) && decision && <><h3>{decision.prompt}</h3><article className="position-change-card"><strong>What changed?</strong><p>{decision.change}</p></article><p>Play your move. The position continues through your move and the opponent’s reply.</p><p className="analysis">Unlisted legal moves are ungraded; the lesson does not call every alternative a mistake.</p></>}
          {session.stage === 'transfer-intro' && <article className="lesson-card"><h3>Test a different opponent reply</h3><p>{lesson.transferExplanation}</p><button className="primary-button" onClick={() => { cancelEngine(); setInspectPly(null); update(beginTransfer(current.current, lesson)); setFeedback(lesson.transferExplanation); }}>Rewind and test the different reply</button></article>}
          <div className="lesson-inline-feedback" role="status"><p>{feedback}</p>{analysis && <p className="analysis">{analysis}</p>}</div>
          {['opening', 'question', 'main', 'transfer'].includes(session.stage) && <>
            <div className="button-row"><button className="secondary-button" disabled={inspectPly !== null} onClick={() => update(assist(current.current))}>Hint</button><button className="secondary-button" disabled={inspectPly !== null} onClick={() => update(assist(current.current, true))}>Reveal candidate</button></div>
            {help?.hint && <p className="study-hint">{session.stage === 'opening' ? 'Think about development and central control.' : question && session.stage === 'question' ? question.hint : decision?.hint}</p>}
            {help?.revealed && <p className="study-hint">Candidate: {session.stage === 'opening' ? lesson.openingMoves[session.moves.length] : session.stage === 'question' ? question?.choices.find((c) => c.correct)?.label : decision?.answers[0].moveSan}. Revealed answers do not earn mastery credit.</p>}
          </>}
          {session.stage === 'summary' && <>
            <h3>{session.reviewCheckpointId ? 'Checkpoint reviewed' : 'Lesson complete'}</h3><p><strong>Takeaway:</strong> {lesson.takeaway}</p>
            <p>{attempts.filter((a) => a.correct).length}/{attempts.length} first answers correct. {Object.values(session.assistance).filter((a) => a.hint).length} checkpoints used assistance.</p><p className="analysis">Completion records the work you did. Mastery grows through spaced reviews; retries do not replace the first answer.</p>
            <ul className="lesson-results">{Object.entries(session.answers).map(([key, answer]) => <li key={key}><strong>{lesson.questions.find((q) => q.id === key)?.prompt ?? lesson.decisions[key]?.prompt ?? ('Opening move ' + (Number(key.split(':')[1]) + 1))}</strong><span>{answer.correct ? 'Correct first answer' : 'Needs review'}{answer.hintUsed ? ' · hint' : ''}{answer.revealed ? ' · revealed' : ''}</span></li>)}</ul>
            <div className="button-row"><button className="primary-button" onClick={beginPractice}>Play from here</button><button className="secondary-button" onClick={restartLesson}>Practise lesson again</button></div>
          </>}
          {session.stage === 'sparring' && <><h3>Play the position</h3><p>You play {lesson.side}. This practice is ungraded; your lesson is already saved.</p>{chess.isGameOver() && <p role="status">Game over: {chess.isCheckmate() ? 'checkmate' : 'draw'}.</p>}<button className="primary-button" onClick={returnToLesson}>Return to lesson</button></>}
        </>}
        {engineError && <div role="status"><p>{engineError}</p>{session.stage === 'sparring' && <button className="secondary-button" onClick={() => setEngineError('')}>Retry engine</button>}</div>}
        <div className="button-row"><button className="secondary-button" disabled={busy || session.stage === 'sparring'} onClick={() => { if (inspectPly === null && ['opening', 'question', 'main', 'transfer'].includes(session.stage)) update(assist(current.current, true)); void analyse(); }}>Analyse position</button><button className="secondary-button" onClick={() => { void navigator.clipboard.writeText(chess.pgn()).then(() => setFeedback('PGN copied.'), () => setFeedback('Could not copy PGN.')); }}>Copy PGN</button>{busy && <button className="secondary-button" onClick={() => { cancelEngine(); setEngineError('Engine stopped. Retry when ready.'); }}>Stop engine</button>}</div>
        <details className="lesson-history"><summary>Inspect move history</summary><div className="move-strip">{session.moves.map((move, i) => <button key={i} onClick={() => { cancelEngine(); setInspectPly(i + 1); }}>{Math.floor(i / 2) + 1}{i % 2 ? '…' : '.'} {move}</button>)}</div></details>
      </section>
    </aside>
  </section>;
}
