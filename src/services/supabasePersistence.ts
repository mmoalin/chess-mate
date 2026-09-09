import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PositionProgress, TrainingProgress } from '../features/openings/types';
import { GuidedBrowserStore } from './guidedStorage';

export type CurriculumProgress = {
  userId: string;
  moduleId: string;
  taskId: string;
  score: number;
  attempts: number;
  status: 'not-started' | 'in-progress' | 'passed' | 'needs-review';
  lastReviewedAt: string;
};

export type TrainingProgressRow = {
  user_id: string;
  line_id: string;
  side: TrainingProgress['side'];
  status: TrainingProgress['status'];
  correct_count: number;
  incorrect_count: number;
  next_move_index: number;
  due_at?: string | null;
  last_reviewed_at?: string | null;
  streak: number;
  mistake_count: number;
  theme_weaknesses: string[];
  updated_at: string;
};

export type CurriculumProgressRow = {
  user_id: string;
  module_id: string;
  task_id: string;
  score: number;
  attempts: number;
  status: CurriculumProgress['status'];
  last_reviewed_at: string;
};

export type PositionProgressRow = {
  user_id: string;
  opening_id: string;
  position_id: string;
  side: PositionProgress['side'];
  attempts: number;
  correct_count: number;
  hint_count: number;
  mistake_themes: string[];
  mastery_score: number;
  due_at: string;
  last_reviewed_at?: string | null;
};

export function mapPositionProgressToRow(progress: PositionProgress): PositionProgressRow {
  return { user_id: progress.userId, opening_id: progress.openingId, position_id: progress.positionId, side: progress.side, attempts: progress.attempts, correct_count: progress.correctCount, hint_count: progress.hintCount, mistake_themes: progress.mistakeThemes, mastery_score: progress.masteryScore, due_at: progress.dueAt, last_reviewed_at: progress.lastReviewedAt ?? null };
}

export function mapPositionProgressFromRow(row: PositionProgressRow): PositionProgress {
  return { userId: row.user_id, openingId: row.opening_id, positionId: row.position_id, side: row.side, attempts: row.attempts, correctCount: row.correct_count, hintCount: row.hint_count, mistakeThemes: row.mistake_themes ?? [], masteryScore: row.mastery_score, dueAt: row.due_at, lastReviewedAt: row.last_reviewed_at ?? undefined };
}

export function mapProgressToRow(progress: TrainingProgress): TrainingProgressRow {
  return {
    user_id: progress.userId,
    line_id: progress.lineId,
    side: progress.side,
    status: progress.status,
    correct_count: progress.correctCount,
    incorrect_count: progress.incorrectCount,
    next_move_index: progress.nextMoveIndex,
    due_at: progress.dueAt ?? null,
    last_reviewed_at: progress.lastReviewedAt ?? null,
    streak: progress.streak ?? 0,
    mistake_count: progress.mistakeCount ?? 0,
    theme_weaknesses: progress.themeWeaknesses ?? [],
    updated_at: progress.updatedAt
  };
}

export function mapProgressFromRow(row: TrainingProgressRow): TrainingProgress {
  return {
    userId: row.user_id,
    lineId: row.line_id,
    side: row.side,
    status: row.status,
    correctCount: row.correct_count,
    incorrectCount: row.incorrect_count,
    nextMoveIndex: row.next_move_index,
    dueAt: row.due_at ?? undefined,
    lastReviewedAt: row.last_reviewed_at ?? undefined,
    streak: row.streak ?? undefined,
    mistakeCount: row.mistake_count ?? undefined,
    themeWeaknesses: row.theme_weaknesses ?? undefined,
    updatedAt: row.updated_at
  };
}

export function mapCurriculumProgressToRow(progress: CurriculumProgress): CurriculumProgressRow {
  return {
    user_id: progress.userId,
    module_id: progress.moduleId,
    task_id: progress.taskId,
    score: progress.score,
    attempts: progress.attempts,
    status: progress.status,
    last_reviewed_at: progress.lastReviewedAt
  };
}

export function mapCurriculumProgressFromRow(row: CurriculumProgressRow): CurriculumProgress {
  return {
    userId: row.user_id,
    moduleId: row.module_id,
    taskId: row.task_id,
    score: row.score,
    attempts: row.attempts,
    status: row.status,
    lastReviewedAt: row.last_reviewed_at
  };
}

export function createSupabaseBrowserClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

export function getSupabaseUnavailableReason(): string | undefined {
  const missingVars = [
    !import.meta.env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL' : null,
    !import.meta.env.VITE_SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : null
  ].filter((value): value is string => Boolean(value));

  if (missingVars.length === 0) {
    return undefined;
  }

  return `Missing ${missingVars.join(' and ')} in the deployed build. Add the variable${missingVars.length === 1 ? '' : 's'} and redeploy.`;
}

export class SupabasePersistence {
  constructor(private readonly client: SupabaseClient | null, private readonly store = new GuidedBrowserStore()) {}

  private canSync(userId: string) { return Boolean(this.client && userId !== 'local'); }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async upsertProgress(progress: TrainingProgress): Promise<void> {
    await this.store.put(`line-progress:${progress.userId}:${progress.lineId}`, progress);
    if (!this.canSync(progress.userId)) return;

    const { error } = await this.client!.from('training_progress').upsert(mapProgressToRow(progress));
    if (error) throw error;
  }

  async loadProgress(userId: string): Promise<TrainingProgress[]> {
    if (!this.canSync(userId)) return this.store.list(`line-progress:${userId}:`);

    const { data, error } = await this.client!.from('training_progress').select('*').eq('user_id', userId);
    if (error) throw error;

    return (data ?? []).map((row) => mapProgressFromRow(row as TrainingProgressRow));
  }

  async upsertCurriculumProgress(progress: CurriculumProgress): Promise<void> {
    await this.store.put(`curriculum-progress:${progress.userId}:${progress.taskId}`, progress);
    if (!this.canSync(progress.userId)) return;

    const { error } = await this.client!.from('curriculum_progress').upsert(mapCurriculumProgressToRow(progress));
    if (error) throw error;
  }

  async loadCurriculumProgress(userId: string): Promise<CurriculumProgress[]> {
    if (!this.canSync(userId)) return this.store.list(`curriculum-progress:${userId}:`);

    const { data, error } = await this.client!.from('curriculum_progress').select('*').eq('user_id', userId);
    if (error) throw error;

    return (data ?? []).map((row) => mapCurriculumProgressFromRow(row as CurriculumProgressRow));
  }

  async upsertPositionProgress(progress: PositionProgress): Promise<void> {
    await this.store.put(`position-progress:${progress.userId}:${progress.positionId}`, progress);
    if (!this.canSync(progress.userId)) return;
    const { error } = await this.client!.from('position_progress').upsert(mapPositionProgressToRow(progress));
    if (error) throw error;
  }

  async loadPositionProgress(userId: string): Promise<PositionProgress[]> {
    if (!this.canSync(userId)) return this.store.list(`position-progress:${userId}:`);
    const { data, error } = await this.client!.from('position_progress').select('*').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map((row) => mapPositionProgressFromRow(row as PositionProgressRow));
  }
}
