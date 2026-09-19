import { describe, expect, it } from 'vitest';
import { GuidedContentRepository } from './guidedContentRepository';
import { embeddedRepertoireGraph } from './guidedContentRepository';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GuidedBrowserStore } from './guidedStorage';

describe('GuidedContentRepository', () => {
  it('supplements an unchanged cached Caro-Kann while preserving remote edits and authored journeys', async () => {
    const store = new GuidedBrowserStore();
    const key = 'lesson:caro-active';
    const graph = structuredClone(embeddedRepertoireGraph);
    delete graph.connectedLessons![key].continuation;
    await store.put('content:published', graph);
    expect((await new GuidedContentRepository(null, store).loadPublished()).connectedLessons![key].continuation).toEqual(embeddedRepertoireGraph.connectedLessons![key].continuation);
    graph.connectedLessons![key].decisions.break.prompt = 'A custom remotely authored prompt.';
    await store.put('content:published', graph);
    expect((await new GuidedContentRepository(null, store).loadPublished()).connectedLessons![key].continuation).toBeUndefined();
    graph.connectedLessons![key].continuation = structuredClone(embeddedRepertoireGraph.connectedLessons![key].continuation!);
    graph.connectedLessons![key].continuation!.title = 'An editor’s journey';
    await store.put('content:published', graph);
    expect((await new GuidedContentRepository(null, store).loadPublished()).connectedLessons![key].continuation!.title).toBe('An editor’s journey');
  });
  it('serves a validated embedded published release when Supabase is unavailable', async () => {
    const graph = await new GuidedContentRepository(null).loadPublished();
    expect(graph.release.status).toBe('published');
    expect(graph.openings['white-vienna-main']).toBeDefined();
    expect(graph.openings['black-caro-kann-main']).toBeDefined();
    expect(Object.keys(graph.deviationPolicies).length).toBeGreaterThan(0);
    expect(Object.values(graph.motifs).some((motif) => motif.key.includes('vienna'))).toBe(true);
    expect(Object.keys(graph.conceptDrills)).toHaveLength(24);
    expect(graph.release.schemaVersion).toBe(3);
    expect(Object.keys(graph.connectedLessons ?? {})).toHaveLength(17);
  });

  it('requires Supabase for shared draft creation', async () => {
    await expect(new GuidedContentRepository(null).clonePublishedToDraft()).rejects.toThrow(/Supabase/i);
  });

  it('round-trips connected lesson branches through a content release', async () => {
    const tables = new Map<string, any[]>();
    const graph = structuredClone(embeddedRepertoireGraph);
    const release = { id: graph.release.id, version: 3, status: 'published', title: 'Test release', schema_version: 3 };
    const client = { from: (table: string) => ({
      update: (row: any) => ({ eq: async () => { Object.assign(release, row); return { error: null }; } }),
      delete: () => ({ eq: async () => { tables.set(table, []); return { error: null }; } }),
      insert: async (rows: any[]) => { tables.set(table, structuredClone(rows)); return { error: null }; },
      select: () => ({ eq: () => ({ data: tables.get(table) ?? [], error: null, maybeSingle: async () => ({ data: release, error: null }) }) })
    }) } as unknown as SupabaseClient;
    const repository = new GuidedContentRepository(client);
    await repository.saveDraft(graph);
    expect(tables.get('connected_lessons')).toHaveLength(17);
    expect((await repository.loadPublished()).connectedLessons).toEqual(graph.connectedLessons);
  });
});
