import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabasePersistence } from './supabasePersistence';
import {
  mapCurriculumProgressFromRow,
  mapCurriculumProgressToRow,
  mapPositionProgressFromRow,
  mapPositionProgressToRow,
  mapProgressFromRow,
  mapProgressToRow
} from './supabasePersistence';

describe('Supabase progress mappers', () => {
  it('persists guest attempts across repository instances without remote writes', async () => {
    const from = vi.fn();
    const repository = new SupabasePersistence({ from } as unknown as SupabaseClient);
    const progress = { userId: 'local', openingId: 'vienna', positionId: 'decision', side: 'white' as const, attempts: 2, correctCount: 1, hintCount: 1, mistakeThemes: ['initiative'], masteryScore: 0, dueAt: '2026-09-10T00:00:00.000Z' };
    await repository.upsertPositionProgress(progress);
    expect(await new SupabasePersistence(null).loadPositionProgress('local')).toEqual([progress]);
    expect(await new SupabasePersistence(null).loadPositionProgress('someone-else')).toEqual([]);
    await repository.loadPositionProgress('local');
    await repository.upsertPositionProgress({ ...progress, attempts: 3 });
    expect(from).not.toHaveBeenCalled();
  });
  it('still writes authenticated progress to the configured backend', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const repository = new SupabasePersistence({ from: () => ({ upsert }) } as unknown as SupabaseClient);
    await repository.upsertProgress({ userId: 'user-1', lineId: 'vienna', side: 'white', status: 'learning', correctCount: 2, incorrectCount: 1, nextMoveIndex: 3, updatedAt: '2026-09-09T00:00:00Z' });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', correct_count: 2 }));
  });
  it('round-trips position progress rows', () => {
    const progress = { userId: 'user-1', openingId: 'alien', positionId: 'trigger', side: 'white' as const, attempts: 3, correctCount: 2, hintCount: 1, mistakeThemes: ['initiative'], masteryScore: 60, dueAt: '2026-07-12T00:00:00.000Z', lastReviewedAt: '2026-07-11T00:00:00.000Z' };
    expect(mapPositionProgressFromRow(mapPositionProgressToRow(progress))).toEqual(progress);
  });
  it('round-trips training progress rows', () => {
    const progress = {
      userId: 'user-1',
      lineId: 'vienna-main',
      side: 'white' as const,
      status: 'needs-review' as const,
      correctCount: 3,
      incorrectCount: 1,
      nextMoveIndex: 4,
      dueAt: '2026-06-18T10:00:00.000Z',
      lastReviewedAt: '2026-06-17T10:00:00.000Z',
      streak: 2,
      mistakeCount: 1,
      themeWeaknesses: ['center-control', 'initiative'],
      updatedAt: '2026-06-17T10:00:00.000Z'
    };

    const row = mapProgressToRow(progress);

    expect(row).toEqual({
      user_id: 'user-1',
      line_id: 'vienna-main',
      side: 'white',
      status: 'needs-review',
      correct_count: 3,
      incorrect_count: 1,
      next_move_index: 4,
      due_at: '2026-06-18T10:00:00.000Z',
      last_reviewed_at: '2026-06-17T10:00:00.000Z',
      streak: 2,
      mistake_count: 1,
      theme_weaknesses: ['center-control', 'initiative'],
      updated_at: '2026-06-17T10:00:00.000Z'
    });
    expect(mapProgressFromRow(row)).toEqual(progress);
  });

  it('uses non-null adaptive defaults for a basic opening progress save', () => {
    expect(mapProgressToRow({
      userId: 'user-1',
      lineId: 'vienna-main',
      side: 'white',
      status: 'needs-review',
      correctCount: 0,
      incorrectCount: 1,
      nextMoveIndex: 0,
      updatedAt: '2026-08-30T20:00:00.000Z'
    })).toMatchObject({
      streak: 0,
      mistake_count: 0,
      theme_weaknesses: []
    });
  });

  it('round-trips curriculum progress rows', () => {
    const progress = {
      userId: 'user-1',
      moduleId: 'open-files',
      taskId: 'open-files-test',
      score: 80,
      attempts: 2,
      status: 'passed' as const,
      lastReviewedAt: '2026-06-17T11:00:00.000Z'
    };

    const row = mapCurriculumProgressToRow(progress);

    expect(row).toEqual({
      user_id: 'user-1',
      module_id: 'open-files',
      task_id: 'open-files-test',
      score: 80,
      attempts: 2,
      status: 'passed',
      last_reviewed_at: '2026-06-17T11:00:00.000Z'
    });
    expect(mapCurriculumProgressFromRow(row)).toEqual(progress);
  });
});
