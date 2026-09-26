import { describe, expect, it } from 'vitest';
import { buildDailySession, finishDailyActivity } from './dailySessions';
import { embeddedRepertoireGraph } from '../../services/guidedContentRepository';
import { createInitialMastery } from './training';

describe('daily learning sessions', () => {
  it('fits game-position practice into the review slot without extending the budget', () => {
    const session = buildDailySession({ learnerId:'local', durationMinutes:5, graph:embeddedRepertoireGraph, selectedOpeningKeys:['white-vienna-main'], mastery:[], backlog:[], lessonSessions:[], gameReviews:[{id:'card',side:'white',fen:'position'}], now:'2026-09-26T00:00:00Z' });
    expect(session.targets[0]).toMatchObject({kind:'game-position',phase:'review',contentKey:'game-position:card',estimatedMinutes:2});
    expect(session.targets.reduce((sum,t)=>sum+t.estimatedMinutes,0)).toBeLessThanOrEqual(5);
    expect(session.targets.filter(t=>t.phase==='review')).toHaveLength(1);
  });
  it('fits real review and focused-learning estimates into the chosen time budget', () => {
    const mastery = createInitialMastery({ learnerId: 'local', itemKey: 'concept:vienna-f4-timing', positionKey: Object.keys(embeddedRepertoireGraph.positions)[0], now: '2026-09-01T00:00:00.000Z' });
    mastery.understanding.status = 'learning'; mastery.understanding.dueAt = '2026-09-02T00:00:00.000Z';
    const session = buildDailySession({ learnerId: 'local', durationMinutes: 10, graph: embeddedRepertoireGraph, selectedOpeningKeys: ['white-vienna-main', 'black-caro-kann-main'], mastery: [mastery], backlog: [], lessonSessions: [], profile: { learnerId: 'local', depth: 'foundation', goal: 'basic-plans', dailyDurationMinutes: 10, onboardingCompleted: true, updatedAt: '2026-09-01T00:00:00.000Z' }, now: '2026-09-12T10:00:00.000Z' });
    expect(session.targets.map((target) => target.phase)).toEqual(['review', 'learn']);
    expect(session.targets.map((target) => target.estimatedMinutes)).toEqual([5, 3]);
    expect(session.targets[0]).toMatchObject({ kind: 'concept-drill', contentKey: 'concept:vienna-f4-timing' });
  });

  it('keeps outcomes idempotent and ends after the final target', () => {
    let session = buildDailySession({ learnerId: 'local', durationMinutes: 5, graph: embeddedRepertoireGraph, selectedOpeningKeys: ['white-vienna-main'], mastery: [], backlog: [], lessonSessions: [], now: '2026-09-12T10:00:00.000Z' });
    while (session.status === 'active') session = finishDailyActivity(session, { status: 'completed', correct: 1, total: 1, assistanceUsed: 0 }, '2026-09-12T10:05:00.000Z');
    expect(session.status).toBe('completed'); expect(session.outcomes).toHaveLength(session.targets.length);
    expect(finishDailyActivity(session, { status: 'completed', correct: 1, total: 1, assistanceUsed: 0 }, '2026-09-12T10:06:00.000Z')).toEqual(session);
  });
});
