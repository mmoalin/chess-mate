import { describe, expect, it } from 'vitest';
import { createInitialMastery } from '../domain/repertoire/training';
import type { LearnerProfile, LearningAttempt, RepertoireBacklogItem, RepertoireSelection } from '../domain/repertoire/types';
import { GuidedLearnerRepository, LOCAL_LEARNER_ID } from './guidedLearnerRepository';

describe('GuidedLearnerRepository offline mode', () => {
  it('persists profile, selections, attempts, mastery, and deduplicated backlog without Supabase', async () => {
    const repository = new GuidedLearnerRepository(null);
    const now = '2026-08-28T12:00:00.000Z';
    const profile: LearnerProfile = { learnerId: LOCAL_LEARNER_ID, ratingSource: 'lichess', ratingValue: 1400, depth: 'standard', goal: 'tactical-danger', onboardingCompleted: true, updatedAt: now };
    const selection: RepertoireSelection = { id: 'selection-1', learnerId: LOCAL_LEARNER_ID, openingFamilyKey: 'white-vienna-main', preferredEdges: {}, updatedAt: now };
    const attempt: LearningAttempt = { id: 'attempt-1', learnerId: LOCAL_LEARNER_ID, itemKey: 'unit-1', positionKey: 'position-1', dimension: 'recall', response: 'e4', correct: true, hintUsed: false, revealed: false, createdAt: now };
    const mastery = createInitialMastery({ learnerId: LOCAL_LEARNER_ID, itemKey: 'unit-1', positionKey: 'position-1', now });
    const backlog: RepertoireBacklogItem = { id: 'gap-1', learnerId: LOCAL_LEARNER_ID, positionKey: 'position-1', reason: 'opponent-deviation', title: 'Cover ...a6', status: 'new', createdAt: now };

    await repository.saveProfile(profile); await repository.saveSelection(selection); await repository.appendAttempt(attempt); await repository.appendAttempt(attempt); await repository.saveMastery(mastery); await repository.saveBacklogItem(backlog);

    expect(await repository.loadProfile(LOCAL_LEARNER_ID)).toEqual(profile);
    expect(await repository.loadSelections(LOCAL_LEARNER_ID)).toEqual([selection]);
    expect(await repository.loadAttempts(LOCAL_LEARNER_ID)).toEqual([attempt]);
    expect(await repository.loadMastery(LOCAL_LEARNER_ID)).toEqual([mastery]);
    expect(await repository.loadBacklog(LOCAL_LEARNER_ID)).toEqual([backlog]);
  });
});
