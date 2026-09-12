import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createInitialMastery } from '../domain/repertoire/training';
import type { DailySession, LearnerProfile, LearningAttempt, RepertoireBacklogItem, RepertoireSelection } from '../domain/repertoire/types';
import type { GuidedBrowserStore } from './guidedStorage';
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
    const daily: DailySession = { id: 'daily-1', learnerId: LOCAL_LEARNER_ID, durationMinutes: 10, contentVersion: 1, targets: [], outcomes: [], currentIndex: 0, status: 'completed', createdAt: now, updatedAt: now, completedAt: now };

    await repository.saveProfile(profile); await repository.saveSelection(selection); await repository.appendAttempt(attempt); await repository.appendAttempt(attempt); await repository.saveMastery(mastery); await repository.saveBacklogItem(backlog); await repository.saveDailySession(daily);

    expect(await repository.loadProfile(LOCAL_LEARNER_ID)).toEqual(profile);
    expect(await repository.loadSelections(LOCAL_LEARNER_ID)).toEqual([selection]);
    expect(await repository.loadAttempts(LOCAL_LEARNER_ID)).toEqual([attempt]);
    expect(await repository.loadMastery(LOCAL_LEARNER_ID)).toEqual([mastery]);
    expect(await repository.loadBacklog(LOCAL_LEARNER_ID)).toEqual([backlog]);
    expect(await repository.loadDailySessions(LOCAL_LEARNER_ID)).toEqual([daily]);
  });

  it('surfaces Supabase read errors instead of treating them as empty data', async () => {
    const databaseError = { message: 'guided mastery is unavailable', code: 'PGRST205' };
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: databaseError }) }))
      }))
    } as unknown as SupabaseClient;
    const store = {
      list: vi.fn().mockResolvedValue([])
    } as unknown as GuidedBrowserStore;

    const repository = new GuidedLearnerRepository(client, store);

    await expect(repository.loadMastery('user-1')).rejects.toBe(databaseError);
  });

  it('upserts repertoire selections on their user and opening identity', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ upsert })) } as unknown as SupabaseClient;
    const store = { put: vi.fn().mockResolvedValue(undefined) } as unknown as GuidedBrowserStore;
    const repository = new GuidedLearnerRepository(client, store);
    const selection: RepertoireSelection = {
      id: 'selection-1', learnerId: 'user-1', openingFamilyKey: 'white-vienna-main', preferredEdges: {}, updatedAt: '2026-09-04T10:00:00.000Z'
    };

    await repository.saveSelection(selection);

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1', opening_family_key: 'white-vienna-main'
    }), { onConflict: 'user_id,opening_family_key' });
  });
});
