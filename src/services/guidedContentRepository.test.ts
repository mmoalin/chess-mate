import { describe, expect, it } from 'vitest';
import { GuidedContentRepository } from './guidedContentRepository';

describe('GuidedContentRepository', () => {
  it('serves a validated embedded published release when Supabase is unavailable', async () => {
    const graph = await new GuidedContentRepository(null).loadPublished();
    expect(graph.release.status).toBe('published');
    expect(graph.openings['white-vienna-main']).toBeDefined();
    expect(graph.openings['black-caro-kann-main']).toBeDefined();
    expect(Object.keys(graph.deviationPolicies).length).toBeGreaterThan(0);
    expect(Object.values(graph.motifs).some((motif) => motif.key.includes('vienna'))).toBe(true);
  });

  it('requires Supabase for shared draft creation', async () => {
    await expect(new GuidedContentRepository(null).clonePublishedToDraft()).rejects.toThrow(/Supabase/i);
  });
});
