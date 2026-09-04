import type { SupabaseClient } from '@supabase/supabase-js';
import type { LearnerRepository } from '../domain/repertoire/repositories';
import type { LearnerProfile, LearningAttempt, MasteryState, RepertoireBacklogItem, RepertoireSelection } from '../domain/repertoire/types';
import { GuidedBrowserStore } from './guidedStorage';

export const LOCAL_LEARNER_ID = 'local';

export class GuidedLearnerRepository implements LearnerRepository {
  constructor(private readonly client: SupabaseClient | null, private readonly store = new GuidedBrowserStore()) {}

  async loadProfile(learnerId: string): Promise<LearnerProfile | null> {
    const local = await this.store.get<LearnerProfile>(`profile:${learnerId}`);
    if (!this.canSync(learnerId)) return local;
    const { data, error } = await this.client!.from('learner_profiles').select('*').eq('user_id', learnerId).maybeSingle();
    if (error) throw error;
    const remote = data ? profileFromRow(data) : null;
    if (remote && (!local || remote.updatedAt >= local.updatedAt)) await this.store.put(`profile:${learnerId}`, remote);
    return remote && (!local || remote.updatedAt >= local.updatedAt) ? remote : local;
  }

  async saveProfile(profile: LearnerProfile): Promise<void> {
    await this.store.put(`profile:${profile.learnerId}`, profile);
    if (this.canSync(profile.learnerId)) await upsert(this.client!, 'learner_profiles', profileToRow(profile));
  }

  async loadSelections(learnerId: string): Promise<RepertoireSelection[]> {
    const local = await this.store.list<RepertoireSelection>(`selection:${learnerId}:`);
    if (!this.canSync(learnerId)) return local;
    const { data, error } = await this.client!.from('repertoire_selections').select('*').eq('user_id', learnerId);
    if (error) throw error;
    const merged = mergeLatest(local, (data ?? []).map(selectionFromRow), (item) => item.openingFamilyKey);
    await Promise.all(merged.map((item) => this.store.put(`selection:${learnerId}:${item.openingFamilyKey}`, item)));
    return merged;
  }

  async saveSelection(selection: RepertoireSelection): Promise<void> {
    await this.store.put(`selection:${selection.learnerId}:${selection.openingFamilyKey}`, selection);
    if (this.canSync(selection.learnerId)) await upsert(this.client!, 'repertoire_selections', selectionToRow(selection), 'user_id,opening_family_key');
  }

  async loadMastery(learnerId: string): Promise<MasteryState[]> {
    const local = await this.store.list<MasteryState>(`mastery:${learnerId}:`);
    if (!this.canSync(learnerId)) return local;
    const { data, error } = await this.client!.from('guided_mastery').select('*').eq('user_id', learnerId);
    if (error) throw error;
    const merged = mergeLatest(local, (data ?? []).map(masteryFromRow), (item) => item.itemKey);
    await Promise.all(merged.map((item) => this.store.put(`mastery:${learnerId}:${item.itemKey}`, item)));
    return merged;
  }

  async saveMastery(mastery: MasteryState): Promise<void> {
    await this.store.put(`mastery:${mastery.learnerId}:${mastery.itemKey}`, mastery);
    if (this.canSync(mastery.learnerId)) await upsert(this.client!, 'guided_mastery', masteryToRow(mastery));
  }

  async appendAttempt(attempt: LearningAttempt): Promise<void> {
    await this.store.put(`attempt:${attempt.learnerId}:${attempt.id}`, attempt);
    if (this.canSync(attempt.learnerId)) await upsert(this.client!, 'learning_attempts', attemptToRow(attempt));
  }

  async loadAttempts(learnerId: string): Promise<LearningAttempt[]> {
    const local = await this.store.list<LearningAttempt>(`attempt:${learnerId}:`);
    if (!this.canSync(learnerId)) return local;
    const { data, error } = await this.client!.from('learning_attempts').select('*').eq('user_id', learnerId);
    if (error) throw error;
    const merged = mergeById(local, (data ?? []).map(attemptFromRow));
    await Promise.all(merged.map((item) => this.store.put(`attempt:${learnerId}:${item.id}`, item)));
    return merged;
  }

  async loadBacklog(learnerId: string): Promise<RepertoireBacklogItem[]> {
    const local = await this.store.list<RepertoireBacklogItem>(`backlog:${learnerId}:`);
    if (!this.canSync(learnerId)) return local;
    const { data, error } = await this.client!.from('repertoire_backlog').select('*').eq('user_id', learnerId);
    if (error) throw error;
    const merged = mergeById(local, (data ?? []).map(backlogFromRow));
    await Promise.all(merged.map((item) => this.store.put(`backlog:${learnerId}:${item.id}`, item)));
    return merged;
  }

  async saveBacklogItem(item: RepertoireBacklogItem): Promise<void> {
    await this.store.put(`backlog:${item.learnerId}:${item.id}`, item);
    if (this.canSync(item.learnerId)) await upsert(this.client!, 'repertoire_backlog', backlogToRow(item), 'user_id,position_key,reason');
  }

  async sync(learnerId: string): Promise<void> {
    if (!this.canSync(learnerId)) return;
    const localProfile = await this.store.get<LearnerProfile>(`profile:${LOCAL_LEARNER_ID}`);
    if (localProfile) await this.saveProfile({ ...localProfile, learnerId, updatedAt: new Date().toISOString() });
    for (const selection of await this.store.list<RepertoireSelection>(`selection:${LOCAL_LEARNER_ID}:`)) {
      await this.saveSelection({ ...selection, id: crypto.randomUUID(), learnerId, updatedAt: new Date().toISOString() });
    }
    for (const attempt of await this.store.list<LearningAttempt>(`attempt:${LOCAL_LEARNER_ID}:`)) {
      await this.appendAttempt({ ...attempt, learnerId });
    }
    for (const mastery of await this.store.list<MasteryState>(`mastery:${LOCAL_LEARNER_ID}:`)) {
      await this.saveMastery({ ...mastery, learnerId, updatedAt: new Date().toISOString() });
    }
    for (const backlog of await this.store.list<RepertoireBacklogItem>(`backlog:${LOCAL_LEARNER_ID}:`)) {
      await this.saveBacklogItem({ ...backlog, id: crypto.randomUUID(), learnerId });
    }
  }

  private canSync(learnerId: string): boolean {
    return Boolean(this.client && learnerId !== LOCAL_LEARNER_ID);
  }
}

async function upsert(client: SupabaseClient, table: string, row: Record<string, unknown>, onConflict?: string): Promise<void> {
  const { error } = await client.from(table).upsert(row, onConflict ? { onConflict } : undefined);
  if (error) throw error;
}

function profileToRow(item: LearnerProfile) { return { user_id: item.learnerId, rating_source: item.ratingSource ?? null, rating_value: item.ratingValue ?? null, depth: item.depth, goal: item.goal, onboarding_completed: item.onboardingCompleted, updated_at: item.updatedAt }; }
function profileFromRow(row: any): LearnerProfile { return { learnerId: row.user_id, ratingSource: row.rating_source ?? undefined, ratingValue: row.rating_value ?? undefined, depth: row.depth, goal: row.goal, onboardingCompleted: row.onboarding_completed, updatedAt: row.updated_at }; }
function selectionToRow(item: RepertoireSelection) { return { id: item.id, user_id: item.learnerId, opening_family_key: item.openingFamilyKey, preferred_edges: item.preferredEdges, updated_at: item.updatedAt }; }
function selectionFromRow(row: any): RepertoireSelection { return { id: row.id, learnerId: row.user_id, openingFamilyKey: row.opening_family_key, preferredEdges: row.preferred_edges ?? {}, updatedAt: row.updated_at }; }
function masteryToRow(item: MasteryState) { return { user_id: item.learnerId, item_key: item.itemKey, position_key: item.positionKey, recall: item.recall, understanding: item.understanding, tactics: item.tactics, updated_at: item.updatedAt }; }
function masteryFromRow(row: any): MasteryState { return { learnerId: row.user_id, itemKey: row.item_key, positionKey: row.position_key, recall: row.recall, understanding: row.understanding, tactics: row.tactics, updatedAt: row.updated_at }; }
function attemptToRow(item: LearningAttempt) { return { id: item.id, user_id: item.learnerId, item_key: item.itemKey, position_key: item.positionKey, dimension: item.dimension, response: item.response, correct: item.correct, hint_used: item.hintUsed, revealed: item.revealed, created_at: item.createdAt }; }
function attemptFromRow(row: any): LearningAttempt { return { id: row.id, learnerId: row.user_id, itemKey: row.item_key, positionKey: row.position_key, dimension: row.dimension, response: row.response, correct: row.correct, hintUsed: row.hint_used, revealed: row.revealed, createdAt: row.created_at }; }
function backlogToRow(item: RepertoireBacklogItem) { return { id: item.id, user_id: item.learnerId, position_key: item.positionKey, reason: item.reason, title: item.title, status: item.status, created_at: item.createdAt }; }
function backlogFromRow(row: any): RepertoireBacklogItem { return { id: row.id, learnerId: row.user_id, positionKey: row.position_key, reason: row.reason, title: row.title, status: row.status, createdAt: row.created_at }; }

function mergeById<T extends { id: string }>(a: T[], b: T[]): T[] { return Array.from(new Map([...a, ...b].map((item) => [item.id, item])).values()); }
function mergeLatest<T extends { updatedAt: string }>(a: T[], b: T[], key: (item: T) => string): T[] {
  const merged = new Map<string, T>();
  for (const item of [...b, ...a]) {
    const previous = merged.get(key(item));
    if (!previous || item.updatedAt >= previous.updatedAt) merged.set(key(item), item);
  }
  return Array.from(merged.values());
}
