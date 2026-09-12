import { describe, expect, it } from 'vitest';
import { buildDailySession, finishDailyActivity } from './dailySessions';
import { embeddedRepertoireGraph } from '../../services/guidedContentRepository';
import { createInitialMastery } from './training';

describe('daily learning sessions', () => {
  it('builds a review, learn and apply sequence with the chosen time budget', () => {
    const mastery = createInitialMastery({ learnerId: 'local', itemKey: 'concept:vienna-f4-timing', positionKey: Object.keys(embeddedRepertoireGraph.positions)[0], now: '2026-09-01T00:00:00.000Z' });
    mastery.understanding.status = 'learning'; mastery.understanding.dueAt = '2026-09-02T00:00:00.000Z';
    const session = buildDailySession({ learnerId: 'local', durationMinutes: 10, graph: embeddedRepertoireGraph, selectedOpeningKeys: ['white-vienna-main', 'black-caro-kann-main'], mastery: [mastery], backlog: [], lessonSessions: [], profile: { learnerId: 'local', depth: 'foundation', goal: 'basic-plans', dailyDurationMinutes: 10, onboardingCompleted: true, updatedAt: '2026-09-01T00:00:00.000Z' }, now: '2026-09-12T10:00:00.000Z' });
    expect(session.targets.map((target) => target.phase)).toEqual(['review', 'learn', 'apply']);
    expect(session.targets.map((target) => target.estimatedMinutes)).toEqual([3, 4, 3]);
    expect(session.targets[0]).toMatchObject({ kind: 'concept-drill', contentKey: 'concept:vienna-f4-timing' });
  });

  it('keeps outcomes idempotent and ends after the final target', () => {
    let session = buildDailySession({ learnerId: 'local', durationMinutes: 5, graph: embeddedRepertoireGraph, selectedOpeningKeys: ['white-vienna-main'], mastery: [], backlog: [], lessonSessions: [], now: '2026-09-12T10:00:00.000Z' });
    while (session.status === 'active') session = finishDailyActivity(session, { status: 'completed', correct: 1, total: 1, assistanceUsed: 0 }, '2026-09-12T10:05:00.000Z');
    expect(session.status).toBe('completed'); expect(session.outcomes).toHaveLength(session.targets.length);
    expect(finishDailyActivity(session, { status: 'completed', correct: 1, total: 1, assistanceUsed: 0 }, '2026-09-12T10:06:00.000Z')).toEqual(session);
  });
});
