import manifestData from '../data/bundledContentManifest.json' with { type: 'json' };
import { canonicalContent, contentFingerprint } from '../domain/repertoire/contentFingerprint';
import type { RepertoireGraph } from '../domain/repertoire/types';
import { validateRepertoireGraph } from '../domain/repertoire/validation';
import type { ConnectedLesson } from '../features/connected/types';

const manifest = manifestData as Record<string, Record<string, string[]>>;
const diagnostics = new WeakMap<RepertoireGraph, string[]>();
export const bundledUpgradeDiagnostics = (graph: RepertoireGraph): string[] => diagnostics.get(graph) ?? [];
const union = (left: string[], right: string[]) => [...new Set([...left, ...right])];
const known = (collection: string, key: string, record: unknown, current: unknown) => canonicalContent(record) === canonicalContent(current) || Boolean(manifest[collection]?.[key]?.includes(contentFingerprint(record)));

/** Install each family's full dependency closure or leave that family untouched. */
export function upgradeBundledCourses(original: RepertoireGraph, bundled: RepertoireGraph): RepertoireGraph {
  if (original === bundled) return original;
  let graph = original;
  const messages: string[] = [];
  const recognised = Object.entries(original.openings).some(([key, opening]) => known('openings', key, opening, bundled.openings[key]));
  if (!recognised) return original;
  for (const family of Object.values(bundled.openings)) {
    const existingFamily = original.openings[family.key];
    if (existingFamily && !known('openings', family.key, existingFamily, family)) { messages.push(`${family.name}: preserved edited family metadata; package skipped.`); continue; }
    const lines = new Set(family.lineKeys);
    const oldLines = new Set(existingFamily?.lineKeys ?? []);
    const ownedKey = (key: string) => [...lines].some(line => key.startsWith(`guidance:${line}:`) || key.startsWith(`deviation:${line}:`));
    const edges = Object.values(bundled.edges).filter(edge => edge.openingFamilyKeys.includes(family.key));
    const sourceEdges = edges.filter(edge => edge.legacyLineIds.some(line => oldLines.has(line)));
    let conflict = sourceEdges.some(edge => {
      const existing = original.edges[edge.key];
      return !existing || ['from', 'to', 'san', 'uci', 'order', 'classification'].some(field => existing[field as keyof typeof existing] !== edge[field as keyof typeof edge]) || edge.legacyLineIds.some(line => oldLines.has(line) && !existing.legacyLineIds.includes(line));
    });
    for (const collection of ['guidance', 'deviationPolicies'] as const) for (const [key, record] of Object.entries(bundled[collection])) {
      if (![...oldLines].some(line => key.startsWith(`guidance:${line}:`) || key.startsWith(`deviation:${line}:`))) continue;
      const existing = original[collection][key];
      if (!existing || !known(collection, key, existing, record)) conflict = true;
    }
    if (conflict) { messages.push(`${family.name}: source lines are absent or edited; package skipped.`); continue; }
    const next = structuredClone(graph); next.connectedLessons ??= {}; next.conceptDrills ??= {};
    next.openings[family.key] = structuredClone(family);
    const positionKeys = new Set([family.rootPositionKey, ...edges.flatMap(edge => [edge.from, edge.to])]);
    for (const key of positionKeys) {
      const node = bundled.positions[key]; const existing = next.positions[key];
      if (existing && (existing.key !== node.key || existing.sideToMove !== node.sideToMove)) { conflict = true; break; }
      next.positions[key] = existing ? { ...existing, openingFamilyKeys: union(existing.openingFamilyKeys, [family.key]), legacyPositionIds: union(existing.legacyPositionIds, node.legacyPositionIds) }
        : { ...structuredClone(node), openingFamilyKeys: [family.key] };
    }
    for (const edge of edges) {
      const existing = next.edges[edge.key];
      if (existing && ['from', 'to', 'san', 'uci', 'order', 'classification'].some(field => existing[field as keyof typeof existing] !== edge[field as keyof typeof edge])) { conflict = true; break; }
      const memberships = edge.legacyLineIds.filter(line => lines.has(line));
      next.edges[edge.key] = existing ? { ...existing, openingFamilyKeys: union(existing.openingFamilyKeys, [family.key]), legacyLineIds: union(existing.legacyLineIds, memberships) }
        : { ...structuredClone(edge), openingFamilyKeys: [family.key], legacyLineIds: memberships };
    }
    for (const unit of Object.values(bundled.learningUnits).filter(unit => unit.openingFamilyKey === family.key)) {
      const existing = next.learningUnits[unit.key];
      if (existing && !known('learningUnits', unit.key, existing, unit)) { conflict = true; break; }
      next.learningUnits[unit.key] = structuredClone(unit);
    }
    for (const collection of ['guidance', 'deviationPolicies'] as const) for (const [key, record] of Object.entries(bundled[collection]).filter(([key]) => ownedKey(key))) {
      const existing = next[collection][key];
      if (existing && !known(collection, key, existing, record)) { conflict = true; break; }
      // Both collections retain their exact persisted record types.
      Object.assign(next[collection], { [key]: structuredClone(record) });
    }
    for (const motif of Object.values(bundled.motifs).filter(motif => motif.positionKeys.every(key => positionKeys.has(key)))) {
      next.motifs[motif.key] ??= structuredClone(motif);
    }
    for (const lesson of Object.values(bundled.connectedLessons ?? {}).filter(lesson => lesson.openingFamilyKey === family.key)) {
      const existing = next.connectedLessons[lesson.key];
      if (!existing) next.connectedLessons[lesson.key] = structuredClone(lesson);
      else if (lessonBase(existing) === lessonBase(lesson)) next.connectedLessons[lesson.key] = {
        ...existing, endgame: existing.endgame ?? lesson.endgame, continuation: existing.continuation ?? lesson.continuation,
        courseOrder: existing.courseOrder ?? lesson.courseOrder, structureGuide: existing.structureGuide ?? lesson.structureGuide,
        course: existing.course ?? lesson.course, optional: existing.optional ?? lesson.optional
      };
    }
    for (const drill of Object.values(bundled.conceptDrills).filter(drill => drill.openingFamilyKey === family.key)) {
      const existing = next.conceptDrills[drill.key];
      if (!existing || known('conceptDrills', drill.key, existing, drill)) next.conceptDrills[drill.key] = structuredClone(drill);
    }
    if (conflict) { messages.push(`${family.name}: dependency collision; package skipped.`); continue; }
    if (canonicalContent(next) === canonicalContent(graph)) continue;
    const issues = validateRepertoireGraph(next);
    if (issues.length) { messages.push(`${family.name}: package validation failed (${issues[0].message}); original records retained.`); continue; }
    graph = next;
  }
  diagnostics.set(graph, messages);
  return graph;
}

function lessonBase(lesson: ConnectedLesson) {
  const { endgame: _e, continuation: _c, courseOrder: _o, structureGuide: _s, course: _course, optional: _optional, ...base } = lesson;
  return canonicalContent(base);
}
