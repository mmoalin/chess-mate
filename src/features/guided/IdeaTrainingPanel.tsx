import { ChoiceGroup } from '../../components/ChoiceGroup';
import { useEffect, useRef, type ReactNode } from 'react';
import type { ConceptDrill } from '../../domain/repertoire/types';
import { sessionScore, type IdeaTrainingSession } from './ideaTraining';

type Props = {
  openingName?: string;
  depth?: 'foundation' | 'standard' | 'deep';
  drill: ConceptDrill;
  session: IdeaTrainingSession;
  onSelectPlan: (choiceId: string) => void;
  onCheckPlan: () => void;
  onStartScenarios: () => void;
  onHint: () => void;
  onReveal: () => void;
  onNext: () => void;
  onRetryScenario: () => void;
  onRestart: () => void;
  onLinePractice: () => void;
  boardTools?: ReactNode;
  notice?: string;
};

export function IdeaTrainingPanel(props: Props) {
  const { drill, session } = props;
  const scenario = drill.scenarios[session.scenarioIndex];
  const panelRef = useRef<HTMLElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
    promptRef.current?.focus({ preventScroll: true });
  }, [session.stage, session.scenarioIndex]);
  useEffect(() => {
    if (session.currentResult || session.planSubmitted) resultRef.current?.focus();
  }, [session.currentResult, session.planSubmitted]);

  return (
    <section ref={panelRef} className="dock-panel idea-training" aria-label="Idea training">
      {props.notice && <p role="status">{props.notice}</p>}
      <div className="study-kicker-row"><p className="eyebrow">Plan Lab + Adaptive Sparring</p><span className="study-session-badge">5 min</span></div>
      <p className="analysis">{props.openingName} → Plan → Board decisions</p><h2>{drill.title}</h2>
      <div className="tag-cloud" aria-label="Idea themes">{drill.themes.map((theme) => <span key={theme}>{formatTheme(theme)}</span>)}</div>

      {session.stage === 'plan' && <>
        <div className="idea-step"><span>1 of 3 · Recognize the plan</span><h3 ref={promptRef} tabIndex={-1}>{drill.planPrompt}</h3></div>
        {(!props.depth || props.depth === 'foundation' || session.planSubmitted) ? <details className="plan-reminder"><summary>Plan reminder</summary><article className="lesson-card"><strong>{drill.principle}</strong><p>{drill.summary}</p></article></details> : <p className="analysis">Choose from the position first. The plan explanation appears after your answer.</p>}
        <ChoiceGroup label="Plan choices" choices={drill.planChoices} value={session.selectedChoiceId} disabled={session.planSubmitted} onChange={props.onSelectPlan} />
        {!session.planSubmitted
          ? <button className="primary-button" type="button" disabled={!session.selectedChoiceId} onClick={props.onCheckPlan}>Check plan</button>
          : <div ref={resultRef} tabIndex={-1} className={`study-feedback ${session.planCorrect ? 'correct' : 'try-again'}`}><strong>{session.planCorrect ? 'Plan recognized' : 'A useful correction'}</strong><p>{session.planFeedback}</p><button className="primary-button" type="button" onClick={props.onStartScenarios}>Test it on the board</button></div>}
      </>}

      {session.stage === 'scenario' && scenario && <>
        <div className="idea-step"><span>{session.scenarioIndex + 2} of {drill.scenarios.length + 1} · Decision point</span><h3 ref={promptRef} tabIndex={-1}>{scenario.prompt}</h3></div>
        <article className="position-change-card"><span>What changed?</span><p>{scenario.change}</p></article>
        <p className="analysis">Play a move on the board. More than one sound answer may be accepted.</p>
        <div className="button-row">
          <button className="secondary-button" type="button" disabled={Boolean(session.currentResult) || session.evaluating} onClick={props.onHint}>Conceptual hint</button>
          <button className="secondary-button" type="button" disabled={Boolean(session.currentResult) || session.evaluating} onClick={props.onReveal}>Reveal candidate</button>
        </div>
        {session.hintUsed && <p className="study-hint">Cue: {scenario.hint}</p>}
        {session.revealed && <p className="study-hint">Candidate: {formatUci(scenario.preferredMovesUci[0])}. Find it on the board when ready.</p>}
        {session.evaluating && <p role="status" className="analysis">Checking how the move fits the idea…</p>}
        {session.currentResult && <div ref={resultRef} tabIndex={-1} className={`study-feedback ${session.currentResult.correct ? 'correct' : 'try-again'}`}>
          <strong>{formatOutcome(session.currentResult.outcome)}</strong>
          <p>{session.currentResult.feedback} {scenario.teachingPoint}</p>
          <p><b>Watch for:</b> {scenario.watchFor}</p>
          <div className="button-row">
            {!session.currentResult.correct && <button className="secondary-button" type="button" onClick={props.onRetryScenario}>Try this decision again</button>}
            <button className="primary-button" type="button" onClick={props.onNext}>{session.scenarioIndex < drill.scenarios.length - 1 ? 'Next decision' : 'Finish session'}</button>
          </div>
        </div>}
      </>}

      {session.stage === 'summary' && <Summary drill={drill} session={session} onRestart={props.onRestart} onLinePractice={props.onLinePractice} />}
      {props.boardTools && <details className="position-tools"><summary>Position tools</summary>{props.boardTools}</details>}
    </section>
  );
}

function Summary(props: { drill: ConceptDrill; session: IdeaTrainingSession; onRestart: () => void; onLinePractice: () => void }) {
  const score = sessionScore(props.session);
  const weak = props.session.scenarioResults.find((result) => !result.correct);
  return <div className="idea-summary">
    <span className="idea-summary-mark">{score.successful === score.total ? '✓' : '↻'}</span>
    <p className="eyebrow">Session complete</p><h3>{score.successful}/{score.total} decisions supported the idea</h3>
    <p><strong>Takeaway:</strong> {props.drill.principle}.</p>
    <p className="analysis">{weak ? 'This position will return sooner so the idea becomes reliable.' : 'Strong work. The idea will return on a longer review interval.'}</p>
    <div className="button-row"><button className="secondary-button" type="button" onClick={props.onRestart}>Practise again</button><button className="secondary-button" type="button" onClick={props.onLinePractice}>Optional line practice</button></div>
  </div>;
}

function formatTheme(value: string) { return value.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' '); }
function formatOutcome(value: string) { return value.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' '); }
function formatUci(value: string) { return value ? `${value.slice(0, 2)}–${value.slice(2, 4)}${value.slice(4) ? `=${value.slice(4).toUpperCase()}` : ''}` : 'the thematic move'; }
