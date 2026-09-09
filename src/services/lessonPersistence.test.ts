import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GuidedLearnerRepository } from './guidedLearnerRepository';
import { GuidedBrowserStore } from './guidedStorage';
import { starterConnectedLessons } from '../data/connectedLessons';
import { answerQuestion, createLessonSession, startQuestions } from '../features/connected/session';

const lesson = starterConnectedLessons[0];
function answered(learnerId = 'local') {
  return answerQuestion(startQuestions(createLessonSession(lesson, learnerId, 'today'), lesson), lesson, '0').session;
}
describe('lesson persistence', () => {
  it('atomically retains the session, first answer and one mastery increment despite duplicate saves', async () => {
    const repo = new GuidedLearnerRepository(null);
    const session = answered();
    await Promise.all([repo.saveLessonSession(session), repo.saveLessonSession(session)]);
    const reopened = new GuidedLearnerRepository(null);
    expect(await reopened.loadLessonSessions('local')).toEqual([session]);
    expect(await reopened.loadAttempts('local')).toHaveLength(1);
    expect((await reopened.loadMastery('local'))[0].understanding.score).toBe(15);
    expect(await reopened.loadLessonSessions('someone-else')).toEqual([]);
  });
  it('retains pending writes through a network failure and retries with stable IDs', async () => {
    const rows = new Map<string, unknown>();
    let offline = true;
    const upsert = vi.fn(async (table: string, row: any) => {
      if (offline) return { error: new Error('offline') };
      rows.set(table + ':' + (row.id ?? row.item_key), row); return { error: null };
    });
    const client = { from: (table: string) => ({ upsert: (row: unknown) => upsert(table, row) }) } as unknown as SupabaseClient;
    const store = new GuidedBrowserStore();
    const repo = new GuidedLearnerRepository(client, store);
    const session = answered('user-1');
    await expect(repo.saveLessonSession(session)).rejects.toThrow('offline');
    expect(await store.get('lesson-session:user-1:' + session.id)).toEqual(session);
    expect(await store.list('lesson-pending:user-1:')).toHaveLength(1);
    offline = false;
    await new GuidedLearnerRepository(client, store).retryLessonSync('user-1');
    await repo.saveLessonSession(session);
    expect(rows.size).toBe(3);
    expect(await store.list('lesson-pending:user-1:')).toHaveLength(0);
    expect((await new GuidedLearnerRepository(null, store).loadMastery('user-1'))[0].understanding.score).toBe(15);
  });
  it('rejects answers owned by another account', async () => {
    const session = answered('user-1');
    session.learnerId = 'user-2';
    await expect(new GuidedLearnerRepository(null).saveLessonSession(session)).rejects.toThrow('another learner');
    expect(await new GuidedLearnerRepository(null).loadLessonSessions('user-2')).toEqual([]);
  });

  it('does not rescore remotely committed answers when opening a session on another device', async () => {
    const session = answered('user-1');
    const store = new GuidedBrowserStore();
    const from = (table: string) => ({
      select: () => ({ eq: async () => ({ data: table === 'lesson_sessions' ? [{ session }] : [], error: null }) }),
      upsert: async () => ({ error: null })
    });
    const repo = new GuidedLearnerRepository({ from } as unknown as SupabaseClient, store);
    await repo.loadLessonSessions('user-1');
    await repo.saveLessonSession(session);
    expect(await store.list('mastery:user-1:')).toHaveLength(0);
    expect(await store.list('attempt:user-1:')).toHaveLength(1);
  });
});
