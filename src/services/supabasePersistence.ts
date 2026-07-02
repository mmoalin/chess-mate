import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TrainingProgress } from '../features/openings/types';

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
  streak?: number | null;
  mistake_count?: number | null;
  theme_weaknesses?: string[] | null;
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
    streak: progress.streak ?? null,
    mistake_count: progress.mistakeCount ?? null,
    theme_weaknesses: progress.themeWeaknesses ?? null,
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

export class SupabasePersistence {
  constructor(private readonly client: SupabaseClient | null) {}

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async upsertProgress(progress: TrainingProgress): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client.from('training_progress').upsert(mapProgressToRow(progress));
    if (error) throw error;
  }

  async loadProgress(userId: string): Promise<TrainingProgress[]> {
    if (!this.client) return [];

    const { data, error } = await this.client.from('training_progress').select('*').eq('user_id', userId);
    if (error) throw error;

    return (data ?? []).map((row) => mapProgressFromRow(row as TrainingProgressRow));
  }

  async upsertCurriculumProgress(progress: CurriculumProgress): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client.from('curriculum_progress').upsert(mapCurriculumProgressToRow(progress));
    if (error) throw error;
  }

  async loadCurriculumProgress(userId: string): Promise<CurriculumProgress[]> {
    if (!this.client) return [];

    const { data, error } = await this.client.from('curriculum_progress').select('*').eq('user_id', userId);
    if (error) throw error;

    return (data ?? []).map((row) => mapCurriculumProgressFromRow(row as CurriculumProgressRow));
  }
}
