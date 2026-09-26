import { canonicalContent } from '../../domain/repertoire/contentFingerprint';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GuidedBrowserStore } from '../../services/guidedStorage';
import type { Envelope, GameRecord, Library, PracticeSession, RecordKind } from './types';

const prefix = (owner: string) => `game-review:v1:${owner}:`;
type RemoteRecord = { revision: number; value: GameRecord; deleted: boolean; mutation_id: string };
function remoteRecord(data: unknown): RemoteRecord {
  // PostgREST can represent a table-valued RPC as a one-row JSON array.
  const row = (Array.isArray(data) && data.length === 1 ? data[0] : data) as RemoteRecord | null;
  if (!row || !Number.isInteger(row.revision) || !row.value?.id || typeof row.mutation_id !== 'string' || typeof row.deleted !== 'boolean') throw new Error('Invalid sync acknowledgement; local work is retained.');
  return row;
}
export class GameReviewRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private client: SupabaseClient | null, private store = new GuidedBrowserStore()) {}
  private exclusive<T>(work: () => Promise<T>): Promise<T> { const next = this.queue.then(work); this.queue = next.catch(() => {}); return next; }
  async load(owner: string): Promise<Library> {
    await this.queue;
    const records = (await this.store.list<Envelope>(prefix(owner))).filter((r) => !r.deleted);
    const values = (kind: RecordKind) => records.filter((r) => r.kind === kind).map((r) => r.value);
    return { games: values('game'), runs: values('run'), positions: values('position'), cards: values('card'), sessions: values('session') } as Library;
  }
  save(owner: string, kind: RecordKind, value: GameRecord, deleted = false) {
    return this.exclusive(async () => {
      const key = prefix(owner) + kind + ':' + value.id;
      const previous = await this.store.get<Envelope>(key);
      if (previous?.deleted && !deleted) throw new Error('This game was removed. Its deletion is retained across devices.');
      if (previous && canonicalContent(previous.value) === canonicalContent(value) && previous.deleted === deleted) return;
      if (previous && !deleted && (['game', 'run', 'card'].includes(kind) || (kind === 'session' && 'submittedAt' in previous.value && previous.value.submittedAt))) return;
      if (previous && kind === 'position' && (('evidence' in previous.value && previous.value.evidence) || ('assessment' in previous.value && previous.value.assessment))) return;
      await this.store.put(key, { kind, id: value.id, value, revision: previous?.revision ?? 0, mutationId: crypto.randomUUID(), pending: true, deleted } satisfies Envelope);
    });
  }
  async pending(owner: string) { return (await this.store.list<Envelope>(prefix(owner))).filter((r) => r.pending).length; }
  async copyGuest(owner: string) {
    if (owner === 'local') return;
    await this.queue;
    const guest = await this.store.list<Envelope>(prefix('local')), existing = await this.store.list<Envelope>(prefix(owner));
    // Include tombstoned parent games so their surviving cards retain owned provenance.
    for (const record of guest) if (!existing.some((old) => old.kind === record.kind && old.id === record.id)) await this.save(owner, record.kind, record.value, record.deleted);
  }
  sync(owner: string): Promise<string> {
    return this.exclusive(async () => {
      if (!this.client || owner === 'local') return 'Saved on this device.';
      try {
        // Push dependency records first. An outbox entry is acknowledged only for its exact mutation ID.
        const order: Record<RecordKind, number> = { game: 0, run: 1, position: 2, card: 3, session: 4 };
        const local = (await this.store.list<Envelope>(prefix(owner))).sort((a, b) => order[a.kind] - order[b.kind]);
        for (const row of local.filter((r) => r.pending)) {
          const response = await this.client.rpc('write_game_review_record', { p_owner: owner, p_kind: row.kind, p_id: row.id, p_value: row.value, p_revision: row.revision, p_mutation: row.mutationId, p_deleted: row.deleted });
          if (response.error) throw response.error;
          let remote = remoteRecord(response.data);
          if (row.kind === 'position' && 'evidence' in row.value && row.value.evidence && !('evidence' in remote.value && remote.value.evidence) && !remote.deleted) {
            const upgrade = await this.client.rpc('write_game_review_record', { p_owner: owner, p_kind: row.kind, p_id: row.id, p_value: row.value, p_revision: remote.revision, p_mutation: row.mutationId, p_deleted: false });
            if (upgrade.error) throw upgrade.error;
            remote = remoteRecord(upgrade.data);
            if (!remote.deleted && !('evidence' in remote.value && remote.value.evidence)) throw new Error('Analysis conflict: completed local evidence is retained for retry.');
          }
          const key = prefix(owner) + row.kind + ':' + row.id;
          if (remote.mutation_id !== row.mutationId && row.kind === 'session' && !remote.deleted && canonicalContent(remote.value) !== canonicalContent(row.value)) {
            // Retain offline work as another attempt; never rewrite an authoritative submitted answer.
            const fork = { ...row.value, id: crypto.randomUUID(), originAttemptId: row.id, practiceOnly: true } as PracticeSession;
            await this.store.put(prefix(owner) + 'session:' + fork.id, { ...row, id: fork.id, value: fork, revision: 0, mutationId: crypto.randomUUID(), pending: true });
          }
          await this.store.put(key, { ...row, value: remote.value, revision: remote.revision, deleted: remote.deleted, mutationId: remote.mutation_id, pending: false });
        }
        // Page all records; Supabase otherwise silently truncates a long game library.
        for (let offset = 0; ; offset += 500) {
          const response = await this.client.from('game_review_records').select('*').eq('user_id', owner).order('kind').order('id').range(offset, offset + 499);
          if (response.error) throw response.error;
          for (const remote of response.data ?? []) {
            const key = prefix(owner) + remote.kind + ':' + remote.id;
            const current = await this.store.get<Envelope>(key);
            if (!current?.pending) await this.store.put(key, { kind: remote.kind, id: remote.id, value: remote.value, revision: remote.revision, mutationId: remote.mutation_id, deleted: remote.deleted, pending: false });
          }
          if ((response.data?.length ?? 0) < 500) break;
        }
        const pending = await this.pending(owner);
        return pending ? `${pending} preserved offline attempt(s) awaiting retry.` : 'Games and practice synced.';
      } catch (error) { return `Saved locally; sync pending. ${error instanceof Error ? error.message : (error as { message?: string }).message ?? 'The game-review migration or connection is unavailable.'}`; }
    });
  }
}
