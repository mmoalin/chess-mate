import { describe, expect, it } from 'vitest';
import { starterConceptDrills } from '../../data/conceptDrills';
import { embeddedRepertoireGraph } from '../../services/guidedContentRepository';
import { validateRepertoireGraph } from '../../domain/repertoire/validation';
import { advanceScenario, beginScenarios, completeScenario, createIdeaTrainingSession, evaluateAuthoredMove, evaluateEngineLoss, sessionScore, submitPlanChoice } from './ideaTraining';

describe('idea-first training', () => {
  it('ships valid decision drills across Alien Gambit, Vienna, Queen’s Gambit and Caro-Kann', () => {
    expect(starterConceptDrills).toHaveLength(82);
    expect(new Set(starterConceptDrills.map((drill) => drill.openingFamilyKey))).toEqual(new Set(['white-vienna-main', 'black-caro-kann-main', 'white-queens-gambit-main', 'white-alien-gambit-main', 'black-sicilian-basic', 'black-alien-gambit-defense', 'black-vienna-main', 'black-queens-gambit-main', 'black-london-main', 'white-sicilian-alapin', 'white-french-advance', 'white-caro-exchange']));
    expect(validateRepertoireGraph(embeddedRepertoireGraph).filter((issue) => issue.code.startsWith('concept-'))).toEqual([]);
  });

  it('moves through plan, two decisions, and summary', () => {
    const drill = starterConceptDrills[0];
    let session = createIdeaTrainingSession(drill);
    session = { ...session, selectedChoiceId: 'stable-centre' };
    session = submitPlanChoice(session, drill);
    expect(session.planCorrect).toBe(true);
    session = beginScenarios(session);
    session = completeScenario(session, evaluateAuthoredMove('f2f4', ['f2f4'], [])!);
    session = advanceScenario(session, drill);
    session = completeScenario(session, evaluateAuthoredMove('g1f3', ['f2f4'], ['g1f3'])!);
    session = advanceScenario(session, drill);
    expect(session.stage).toBe('summary');
    expect(sessionScore(session)).toEqual({ successful: 3, total: 3 });
  });

  it('accepts authored alternatives and applies the engine thresholds', () => {
    expect(evaluateAuthoredMove('g1f3', ['f2f4'], ['g1f3'])?.outcome).toBe('playable');
    expect(evaluateEngineLoss(50)).toMatchObject({ outcome: 'playable', correct: true });
    expect(evaluateEngineLoss(51)).toMatchObject({ outcome: 'needs-work', correct: false });
    expect(evaluateEngineLoss(120)).toMatchObject({ outcome: 'mistake', correct: false });
    expect(evaluateEngineLoss(null)).toMatchObject({ outcome: 'unrated', correct: null });
  });
});
