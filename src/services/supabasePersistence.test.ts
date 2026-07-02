import { describe, expect, it } from 'vitest';
import {
  mapCurriculumProgressFromRow,
  mapCurriculumProgressToRow,
  mapProgressFromRow,
  mapProgressToRow
} from './supabasePersistence';

describe('Supabase progress mappers', () => {
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
