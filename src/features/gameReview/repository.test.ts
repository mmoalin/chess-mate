import { beforeEach, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GameReviewRepository } from './repository';
import { GuidedBrowserStore, resetGuidedMemoryStoreForTests } from '../../services/guidedStorage';
import { importGame } from './import';
import type { PositionResult, PracticeSession } from './types';

class DeviceStore extends GuidedBrowserStore {
  data = new Map<string, unknown>();
  async get<T>(key: string) { return structuredClone(this.data.get(key) ?? null) as T | null; }
  async put<T>(key: string, value: T) { this.data.set(key, structuredClone(value)); }
  async list<T>(prefix: string) { return [...this.data].filter(([key]) => key.startsWith(prefix)).map(([,value]) => structuredClone(value) as T); }
}
function server() {
  const rows = new Map<string, any>(); // Test transport mirrors the separately SQL-verified RPC contract.
  const rpc = vi.fn(async (_: string, p: any) => {
    const key = p.p_kind + ':' + p.p_id, existing = rows.get(key);
    if (existing?.deleted || existing?.mutation_id === p.p_mutation || (existing && existing.revision !== p.p_revision && !p.p_deleted)) return { data: existing };
    const row = { kind: p.p_kind, id: p.p_id, value: p.p_value, revision: (existing?.revision ?? 0) + 1, mutation_id: p.p_mutation, deleted: p.p_deleted };
    rows.set(key, row); return { data: row };
  });
  const query: any = { select: () => query, eq: () => query, order: () => query, range: async (a: number,b: number) => ({ data: [...rows.values()].slice(a,b+1) }) };
  return { client: { rpc, from: () => query } as unknown as SupabaseClient, rpc, rows };
}
beforeEach(resetGuidedMemoryStoreForTests);
it('retains pending writes through unavailable migration and retries idempotently', async () => {
  const remote = server(), repo = new GameReviewRepository(remote.client), game = await importGame('1. e4 *','white');
  await repo.save('account','game',game);
  remote.rpc.mockResolvedValueOnce({ error: { message:'Migration unavailable' } } as never);
  expect(await repo.sync('account')).toContain('Saved locally; sync pending'); expect(await repo.pending('account')).toBe(1);
  expect(await repo.sync('account')).toBe('Games and practice synced.'); expect(await repo.pending('account')).toBe(0);
  await repo.sync('account'); expect(remote.rows.size).toBe(1);
});
it('accepts a PostgREST one-row array and never acknowledges malformed responses', async () => {
  const remote = server(), repo = new GameReviewRepository(remote.client), game = await importGame('1. e4 *','white');
  await repo.save('account','game',game);
  remote.rpc.mockResolvedValueOnce({data:[]} as never);
  expect(await repo.sync('account')).toContain('Invalid sync acknowledgement'); expect(await repo.pending('account')).toBe(1);
  remote.rpc.mockImplementationOnce(async (_name,p) => ({data:[{revision:1,value:p.p_value,deleted:false,mutation_id:p.p_mutation}]} as never));
  expect(await repo.sync('account')).toBe('Games and practice synced.'); expect(await repo.pending('account')).toBe(0);
});
it('merges partial analysis from two devices and upgrades a conflicting timeout to complete evidence', async () => {
  const remote = server(), a = new GameReviewRepository(remote.client,new DeviceStore()), b = new GameReviewRepository(remote.client,new DeviceStore());
  const result: PositionResult = { schema:1,id:'p1',runId:'run',fen:'fen',depth:16,error:'timeout' };
  await a.save('account','position',result); await a.sync('account');
  const complete = { ...result, error:undefined, evidence:{ fen:'fen',version:'v1',depth:16,requestedDepth:16,score:{type:'cp' as const,value:30},pv:['e2e4'] } };
  await b.save('account','position',complete); await b.save('account','position',{...complete,id:'p2'}); await b.sync('account'); await a.sync('account');
  expect((await a.load('account')).positions).toHaveLength(2); expect((await a.load('account')).positions.every((p)=>p.evidence)).toBe(true);
});
it('forks conflicting offline drafts and carries tombstones to the other device', async () => {
  const remote = server(), a = new GameReviewRepository(remote.client,new DeviceStore()), b = new GameReviewRepository(remote.client,new DeviceStore());
  const draft: PracticeSession = {schema:1,id:'attempt',cardId:'card',createdAt:'2026-01-01',updatedAt:'2026-01-01',move:'e4',plan:'',assisted:false};
  await a.save('account','session',draft); await a.sync('account');
  await b.save('account','session',{...draft,move:'d4'}); expect(await b.sync('account')).toContain('preserved offline');
  const attempts = (await b.load('account')).sessions; expect(attempts).toHaveLength(2); expect(attempts.map((s)=>s.move).sort()).toEqual(['d4','e4']);
  await b.sync('account'); expect(remote.rows.size).toBe(2);
  const game=await importGame('1. e4 *','white'); await a.save('account','game',game); await a.sync('account'); await b.sync('account');
  await a.save('account','game',game,true); await a.sync('account'); await b.sync('account'); expect((await b.load('account')).games).toEqual([]);
});
