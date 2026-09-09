import type { SupabaseClient } from '@supabase/supabase-js';
import { starterRepertoires } from '../data/repertoires';
import { starterConceptDrills } from '../data/conceptDrills';
import { starterConnectedLessons } from '../data/connectedLessons';
import { compileLegacyLines } from '../domain/repertoire/graph';
import type { ContentRepository } from '../domain/repertoire/repositories';
import type { RepertoireGraph } from '../domain/repertoire/types';
import { validateRepertoireGraph } from '../domain/repertoire/validation';
import { GuidedBrowserStore } from './guidedStorage';

type ReleaseRow = { id: string; version: number; status: 'draft' | 'published' | 'archived'; title: string; schema_version: number; published_at?: string | null };

export const embeddedRepertoireGraph = compileLegacyLines(starterRepertoires);
embeddedRepertoireGraph.conceptDrills = Object.fromEntries(starterConceptDrills.map((drill) => [drill.key, drill]));
embeddedRepertoireGraph.connectedLessons = Object.fromEntries(starterConnectedLessons.map((lesson) => [lesson.key, lesson]));
embeddedRepertoireGraph.release.schemaVersion = 3;

export class GuidedContentRepository implements ContentRepository {
  constructor(private readonly client: SupabaseClient | null, private readonly store = new GuidedBrowserStore()) {}

  async loadPublished(): Promise<RepertoireGraph> {
    if (this.client) {
      try {
        const { data, error } = await this.client.from('content_releases').select('*').eq('status', 'published').maybeSingle();
        if (error) throw error;
        if (data) {
          const graph = withStarterConcepts(await this.loadRelease(data as ReleaseRow));
          if (validateRepertoireGraph(graph).length === 0) {
            await this.store.put('content:published', graph);
            return graph;
          }
        }
      } catch {
        // The last valid cache is the intentional network/schema fallback.
      }
    }
    return withStarterConcepts((await this.store.get<RepertoireGraph>('content:published')) ?? embeddedRepertoireGraph);
  }

  async loadDraft(): Promise<RepertoireGraph | null> {
    if (!this.client || !(await this.isEditor())) return null;
    const { data, error } = await this.client.from('content_releases').select('*').eq('status', 'draft').maybeSingle();
    if (error) throw error;
    return data ? withStarterConcepts(await this.loadRelease(data as ReleaseRow)) : null;
  }

  async saveDraft(graph: RepertoireGraph): Promise<void> {
    if (!this.client) throw new Error('Supabase is required to save a shared content draft.');
    const issues = validateRepertoireGraph(graph);
    if (issues.length) throw new Error(issues.map((issue) => issue.message).join(' '));
    const releaseId = graph.release.id;
    await checked(this.client.from('content_releases').update({ schema_version: Math.max(3, graph.release.schemaVersion) }).eq('id', releaseId));
    await this.clearDraftContent(releaseId);

    await checked(this.client.from('repertoire_positions').insert(Object.values(graph.positions).map((node) => ({
      release_id: releaseId, stable_key: node.key, fen: node.fen, side_to_move: node.sideToMove,
      opening_family_keys: node.openingFamilyKeys, legacy_position_ids: node.legacyPositionIds
    }))));
    await checked(this.client.from('opening_families').insert(Object.values(graph.openings).map((opening) => ({
      release_id: releaseId, stable_key: opening.key, name: opening.name, side: opening.side, context: opening.context,
      root_position_key: opening.rootPositionKey, eco: opening.eco ?? null, summary: opening.summary, tags: opening.tags,
      recommended_depths: opening.recommendedDepths, line_keys: opening.lineKeys
    }))));
    await checked(this.client.from('repertoire_edges').insert(Object.values(graph.edges).map((edge) => ({
      release_id: releaseId, stable_key: edge.key, from_position_key: edge.from, to_position_key: edge.to, san: edge.san,
      uci: edge.uci, sort_order: edge.order, classification: edge.classification, opening_family_keys: edge.openingFamilyKeys,
      legacy_line_ids: edge.legacyLineIds
    }))));
    await checked(this.client.from('learning_units').insert(Object.values(graph.learningUnits).map((unit) => ({
      release_id: releaseId, stable_key: unit.key, opening_family_key: unit.openingFamilyKey, line_key: unit.lineKey,
      title: unit.title, start_position_key: unit.startPositionKey, end_position_key: unit.endPositionKey,
      sort_order: unit.order, depth: unit.depth
    }))));
    await checked(this.client.from('learning_unit_steps').insert(Object.values(graph.learningUnits).flatMap((unit) =>
      unit.edgeKeys.map((edgeKey, stepOrder) => ({ release_id: releaseId, learning_unit_key: unit.key, edge_key: edgeKey, step_order: stepOrder }))
    )));
    await checked(this.client.from('position_guidance').insert(Object.values(graph.guidance).map((item) => ({
      release_id: releaseId, stable_key: item.key, position_key: item.positionKey, edge_key: item.edgeKey ?? null,
      kind: item.kind, title: item.title, body: item.text
    }))));
    const deviationRows = Object.values(graph.deviationPolicies).map((item) => ({
      release_id: releaseId, stable_key: item.key, position_key: item.positionKey, move_uci: item.moveUci ?? null,
      category: item.category, guidance: item.guidance
    }));
    if (deviationRows.length) await checked(this.client.from('deviation_policies').insert(deviationRows));
    await checked(this.client.from('tactical_motifs').insert(Object.values(graph.motifs).map((item) => ({
      release_id: releaseId, stable_key: item.key, title: item.title, pattern: item.pattern, trigger_text: item.trigger,
      execution: item.execution, prerequisites: item.prerequisites, limitation: item.limitation, difficulty: item.difficulty
    }))));
    await checked(this.client.from('tactical_motif_positions').insert(Object.values(graph.motifs).flatMap((motif) =>
      motif.positionKeys.map((positionKey) => ({ release_id: releaseId, motif_key: motif.key, position_key: positionKey }))
    )));
    const conceptRows = Object.values(graph.conceptDrills ?? {}).map((drill) => ({
      release_id: releaseId, stable_key: drill.key, opening_family_key: drill.openingFamilyKey, title: drill.title,
      principle: drill.principle, summary: drill.summary, themes: drill.themes, depth: drill.depth, sort_order: drill.order,
      plan_prompt: drill.planPrompt, plan_choices: drill.planChoices, scenarios: drill.scenarios
    }));
    if (conceptRows.length) await checked(this.client.from('concept_drills').insert(conceptRows));
    const lessonRows = Object.values(graph.connectedLessons ?? {}).map((lesson) => ({ release_id: releaseId, stable_key: lesson.key, opening_family_key: lesson.openingFamilyKey, content: lesson }));
    if (lessonRows.length) await checked(this.client.from('connected_lessons').insert(lessonRows));
  }

  async clonePublishedToDraft(): Promise<RepertoireGraph> {
    if (!this.client) throw new Error('Supabase is required to create a shared draft.');
    const { data, error } = await this.client.rpc('clone_published_content_release', { new_title: 'Working draft' });
    if (error) throw error;
    const releaseId = data as string;
    const draft = await this.loadDraft();
    if (draft && Object.keys(draft.positions).length) return draft;
    const seeded = structuredClone(embeddedRepertoireGraph);
    seeded.release = { ...seeded.release, id: releaseId, version: Date.now(), status: 'draft', title: 'Working draft' };
    await this.saveDraft(seeded);
    return seeded;
  }

  async publishDraft(): Promise<RepertoireGraph> {
    const draft = await this.loadDraft();
    if (!draft || !this.client) throw new Error('No content draft is available.');
    const issues = validateRepertoireGraph(draft);
    if (issues.length) throw new Error(issues.map((issue) => issue.message).join(' '));
    await this.saveDraft(draft);
    const { error } = await this.client.rpc('publish_content_release', { target_release_id: draft.release.id });
    if (error) throw error;
    return this.loadPublished();
  }

  async isEditor(): Promise<boolean> {
    if (!this.client) return false;
    const { data, error } = await this.client.from('content_editors').select('user_id').limit(1);
    return !error && Boolean(data?.length);
  }

  private async loadRelease(release: ReleaseRow): Promise<RepertoireGraph> {
    if (!this.client) return embeddedRepertoireGraph;
    const [positions, openings, edges, units, steps, guidance, policies, motifs, motifPositions, conceptDrills, connectedLessons] = await Promise.all([
      selectRows(this.client, 'repertoire_positions', release.id), selectRows(this.client, 'opening_families', release.id),
      selectRows(this.client, 'repertoire_edges', release.id), selectRows(this.client, 'learning_units', release.id),
      selectRows(this.client, 'learning_unit_steps', release.id), selectRows(this.client, 'position_guidance', release.id),
      selectRows(this.client, 'deviation_policies', release.id), selectRows(this.client, 'tactical_motifs', release.id),
      selectRows(this.client, 'tactical_motif_positions', release.id), selectRows(this.client, 'concept_drills', release.id),
      release.schema_version >= 3 ? selectRows(this.client, 'connected_lessons', release.id) : Promise.resolve([])
    ]);
    return rowsToGraph(release, { positions, openings, edges, units, steps, guidance, policies, motifs, motifPositions, conceptDrills, connectedLessons });
  }

  private async clearDraftContent(releaseId: string): Promise<void> {
    if (!this.client) return;
    for (const table of ['connected_lessons', 'concept_drills', 'tactical_motif_positions', 'position_guidance', 'deviation_policies', 'learning_unit_steps', 'tactical_motifs', 'learning_units', 'repertoire_edges', 'opening_families', 'repertoire_positions']) {
      await checked(this.client.from(table).delete().eq('release_id', releaseId));
    }
  }
}

async function selectRows(client: SupabaseClient, table: string, releaseId: string): Promise<any[]> {
  const { data, error } = await client.from(table).select('*').eq('release_id', releaseId);
  if (error) throw error;
  return data ?? [];
}

async function checked(promise: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await promise;
  if (error) throw error;
}

function rowsToGraph(release: ReleaseRow, rows: Record<string, any[]>): RepertoireGraph {
  const graph: RepertoireGraph = {
    release: { id: release.id, version: release.version, status: release.status, title: release.title, schemaVersion: release.schema_version, publishedAt: release.published_at ?? undefined },
    positions: {}, edges: {}, openings: {}, learningUnits: {}, guidance: {}, motifs: {}, deviationPolicies: {}, conceptDrills: {}
  };
  for (const row of rows.positions) graph.positions[row.stable_key] = { key: row.stable_key, fen: row.fen, sideToMove: row.side_to_move, openingFamilyKeys: row.opening_family_keys ?? [], legacyPositionIds: row.legacy_position_ids ?? [] };
  for (const row of rows.openings) graph.openings[row.stable_key] = { key: row.stable_key, name: row.name, side: row.side, context: row.context, rootPositionKey: row.root_position_key, eco: row.eco ?? undefined, summary: row.summary, tags: row.tags ?? [], recommendedDepths: row.recommended_depths ?? [], lineKeys: row.line_keys ?? [] };
  for (const row of rows.edges) graph.edges[row.stable_key] = { key: row.stable_key, from: row.from_position_key, to: row.to_position_key, san: row.san, uci: row.uci, order: row.sort_order, classification: row.classification, openingFamilyKeys: row.opening_family_keys ?? [], legacyLineIds: row.legacy_line_ids ?? [] };
  for (const row of rows.units) graph.learningUnits[row.stable_key] = { key: row.stable_key, openingFamilyKey: row.opening_family_key, lineKey: row.line_key, title: row.title, startPositionKey: row.start_position_key, endPositionKey: row.end_position_key, edgeKeys: rows.steps.filter((step) => step.learning_unit_key === row.stable_key).sort((a, b) => a.step_order - b.step_order).map((step) => step.edge_key), order: row.sort_order, depth: row.depth };
  for (const row of rows.guidance) graph.guidance[row.stable_key] = { key: row.stable_key, positionKey: row.position_key, edgeKey: row.edge_key ?? undefined, kind: row.kind, title: row.title, text: row.body };
  for (const row of rows.policies) graph.deviationPolicies[row.stable_key] = { key: row.stable_key, positionKey: row.position_key, moveUci: row.move_uci ?? undefined, category: row.category, guidance: row.guidance };
  for (const row of rows.motifs) graph.motifs[row.stable_key] = { key: row.stable_key, title: row.title, pattern: row.pattern, trigger: row.trigger_text, execution: row.execution, prerequisites: row.prerequisites, limitation: row.limitation, difficulty: row.difficulty, positionKeys: rows.motifPositions.filter((link) => link.motif_key === row.stable_key).map((link) => link.position_key) };
  for (const row of rows.conceptDrills ?? []) graph.conceptDrills[row.stable_key] = { key: row.stable_key, openingFamilyKey: row.opening_family_key, title: row.title, principle: row.principle, summary: row.summary, themes: row.themes ?? [], depth: row.depth, order: row.sort_order, planPrompt: row.plan_prompt, planChoices: row.plan_choices ?? [], scenarios: row.scenarios ?? [] };
  graph.connectedLessons = Object.fromEntries((rows.connectedLessons ?? []).map((row) => [row.stable_key, row.content]));
  return graph;
}

function withStarterConcepts(graph: RepertoireGraph): RepertoireGraph {
  if (graph.release.schemaVersion < 3 && !Object.keys(graph.connectedLessons ?? {}).length) {
    graph = { ...graph, connectedLessons: Object.fromEntries(starterConnectedLessons.filter((lesson) => graph.openings[lesson.openingFamilyKey]?.lineKeys.includes(lesson.lineKey)).map((lesson) => [lesson.key, lesson])) };
  }
  if (Object.keys(graph.conceptDrills ?? {}).length) return graph;
  const compatible = starterConceptDrills.filter((drill) => Boolean(graph.openings[drill.openingFamilyKey]));
  return { ...graph, conceptDrills: Object.fromEntries(compatible.map((drill) => [drill.key, drill])) };
}
