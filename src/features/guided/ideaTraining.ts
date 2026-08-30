import type { ConceptDrill } from '../../domain/repertoire/types';

export type IdeaMoveOutcome = 'idea-aligned' | 'playable' | 'needs-work' | 'mistake' | 'unrated';

export type IdeaMoveResult = {
  outcome: IdeaMoveOutcome;
  correct: boolean | null;
  feedback: string;
};

export type IdeaTrainingSession = {
  drillKey: string;
  stage: 'plan' | 'scenario' | 'summary';
  selectedChoiceId: string;
  planSubmitted: boolean;
  planCorrect: boolean | null;
  planFeedback: string;
  scenarioIndex: number;
  scenarioResults: IdeaMoveResult[];
  hintUsed: boolean;
  revealed: boolean;
  evaluating: boolean;
  currentResult: IdeaMoveResult | null;
};

export function createIdeaTrainingSession(drill: ConceptDrill): IdeaTrainingSession {
  return {
    drillKey: drill.key,
    stage: 'plan',
    selectedChoiceId: '',
    planSubmitted: false,
    planCorrect: null,
    planFeedback: '',
    scenarioIndex: 0,
    scenarioResults: [],
    hintUsed: false,
    revealed: false,
    evaluating: false,
    currentResult: null
  };
}

export function submitPlanChoice(session: IdeaTrainingSession, drill: ConceptDrill): IdeaTrainingSession {
  const choice = drill.planChoices.find((item) => item.id === session.selectedChoiceId);
  if (!choice) return session;
  return { ...session, planSubmitted: true, planCorrect: choice.correct, planFeedback: choice.feedback };
}

export function beginScenarios(session: IdeaTrainingSession): IdeaTrainingSession {
  return { ...session, stage: 'scenario', scenarioIndex: 0, hintUsed: false, revealed: false, currentResult: null };
}

export function completeScenario(session: IdeaTrainingSession, result: IdeaMoveResult): IdeaTrainingSession {
  return { ...session, evaluating: false, currentResult: result, scenarioResults: [...session.scenarioResults, result] };
}

export function advanceScenario(session: IdeaTrainingSession, drill: ConceptDrill): IdeaTrainingSession {
  if (session.scenarioIndex >= drill.scenarios.length - 1) return { ...session, stage: 'summary', currentResult: null };
  return { ...session, scenarioIndex: session.scenarioIndex + 1, hintUsed: false, revealed: false, currentResult: null };
}

export function evaluateAuthoredMove(playedUci: string, preferred: string[], acceptable: string[]): IdeaMoveResult | null {
  if (preferred.includes(playedUci)) return { outcome: 'idea-aligned', correct: true, feedback: 'Idea-aligned move.' };
  if (acceptable.includes(playedUci)) return { outcome: 'playable', correct: true, feedback: 'A sound alternative that supports the position.' };
  return null;
}

export function evaluateEngineLoss(loss: number | null): IdeaMoveResult {
  if (loss === null || !Number.isFinite(loss)) {
    return { outcome: 'unrated', correct: null, feedback: 'This move is not authored and could not be checked. It will not affect mastery.' };
  }
  if (loss <= 50) return { outcome: 'playable', correct: true, feedback: 'Stockfish confirms this is a sound alternative, even though it follows a different plan.' };
  if (loss < 120) return { outcome: 'needs-work', correct: false, feedback: 'This is playable but concedes too much. Revisit the positional cue and try the decision again later.' };
  return { outcome: 'mistake', correct: false, feedback: 'This move creates a concrete chess problem. Revisit the positional cue before trying again.' };
}

export function sessionScore(session: IdeaTrainingSession): { successful: number; total: number } {
  const results = [session.planCorrect, ...session.scenarioResults.map((item) => item.correct)].filter((value) => value !== null);
  return { successful: results.filter(Boolean).length, total: results.length };
}

