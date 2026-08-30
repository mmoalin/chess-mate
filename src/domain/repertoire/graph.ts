import { Chess } from 'chess.js';
import type { RepertoireLine } from '../../features/openings/types';
import { buildPositionKey } from './positionKey';
import type {
  LearnerDepth,
  LearningUnit,
  MoveEdge,
  OpeningFamily,
  PositionGuidance,
  PositionNode,
  RepertoireGraph,
  TacticalMotif
} from './types';

const EMPTY_GRAPH: Omit<RepertoireGraph, 'release'> = {
  positions: {},
  edges: {},
  openings: {},
  learningUnits: {},
  guidance: {},
  motifs: {},
  deviationPolicies: {},
  conceptDrills: {}
};

export function compileLegacyLines(lines: RepertoireLine[]): RepertoireGraph {
  const graph: RepertoireGraph = {
    release: {
      id: 'embedded-starter-v1',
      version: 1,
      status: 'published',
      title: 'Embedded starter repertoire',
      schemaVersion: 2
    },
    ...structuredClone(EMPTY_GRAPH)
  };
  const byId = new Map(lines.map((line) => [line.id, line]));
  const rootFor = (line: RepertoireLine): RepertoireLine => {
    let current = line;
    const seen = new Set<string>();
    while (current.parentLineId && !seen.has(current.id)) {
      seen.add(current.id);
      current = byId.get(current.parentLineId) ?? current;
      if (!current.parentLineId) break;
    }
    return current;
  };

  for (const line of lines) {
    const root = rootFor(line);
    const familyKey = root.id;
    const chess = new Chess();
    const rootKey = buildPositionKey(chess.fen());
    graph.openings[familyKey] ??= createOpeningFamily(root, rootKey);
    if (!graph.openings[familyKey].lineKeys.includes(line.id)) graph.openings[familyKey].lineKeys.push(line.id);
    ensureNode(graph, chess.fen(), familyKey);

    const edgeKeys: string[] = [];
    for (let index = 0; index < line.movesSan.length; index += 1) {
      const beforeFen = chess.fen();
      const from = buildPositionKey(beforeFen);
      const move = chess.move(line.movesSan[index]);
      if (!move) throw new Error(`Illegal SAN ${line.movesSan[index]} in ${line.id} at ply ${index + 1}.`);
      const to = buildPositionKey(chess.fen());
      const edgeKey = stableKey('edge', `${from}|${move.from}${move.to}${move.promotion ?? ''}|${to}`);
      const destinationAlreadyReached = Object.values(graph.edges).some((edge) => edge.to === to && edge.from !== from);
      const existing = graph.edges[edgeKey];
      if (existing) {
        addUnique(existing.openingFamilyKeys, familyKey);
        addUnique(existing.legacyLineIds, line.id);
      } else {
        graph.edges[edgeKey] = {
          key: edgeKey,
          from,
          to,
          san: move.san,
          uci: `${move.from}${move.to}${move.promotion ?? ''}`,
          order: index,
          classification: destinationAlreadyReached ? 'transposition' : line.parentLineId ? 'alternative' : 'main',
          openingFamilyKeys: [familyKey],
          legacyLineIds: [line.id]
        };
      }
      edgeKeys.push(edgeKey);
      ensureNode(graph, beforeFen, familyKey);
      ensureNode(graph, chess.fen(), familyKey);
    }

    addLineGuidance(graph, line, edgeKeys);
    addLineMotifs(graph, line);
    addDeviationPolicies(graph, line, familyKey);
  }

  graph.learningUnits = buildLearningUnits(graph, 'standard');
  return graph;
}

export function buildLearningUnits(graph: RepertoireGraph, depth: LearnerDepth): Record<string, LearningUnit> {
  const units: Record<string, LearningUnit> = {};
  const chunkSize = depth === 'foundation' ? 4 : depth === 'deep' ? 8 : 6;

  for (const opening of Object.values(graph.openings)) {
    for (const lineKey of opening.lineKeys) {
      const path = Object.values(graph.edges)
        .filter((edge) => edge.legacyLineIds.includes(lineKey))
        .sort((a, b) => a.order - b.order);
      for (let offset = 0; offset < path.length; offset += chunkSize) {
        const chunk = path.slice(offset, offset + chunkSize);
        if (!chunk.length) continue;
        const order = Math.floor(offset / chunkSize);
        const key = `unit:${lineKey}:${depth}:${order}`;
        units[key] = {
          key,
          openingFamilyKey: opening.key,
          lineKey,
          title: `${opening.name} · Part ${order + 1}`,
          startPositionKey: chunk[0].from,
          endPositionKey: chunk.at(-1)!.to,
          edgeKeys: chunk.map((edge) => edge.key),
          order,
          depth
        };
      }
    }
  }
  return units;
}

export function outgoingEdges(graph: RepertoireGraph, positionKey: string, openingFamilyKey?: string): MoveEdge[] {
  return Object.values(graph.edges)
    .filter((edge) => edge.from === positionKey && (!openingFamilyKey || edge.openingFamilyKeys.includes(openingFamilyKey)))
    .sort((a, b) => a.order - b.order || a.san.localeCompare(b.san));
}

function createOpeningFamily(line: RepertoireLine, rootPositionKey: string): OpeningFamily {
  const context = line.side === 'white' ? 'white' : line.movesSan[0] === 'd4' ? 'black-vs-d4' : 'black-vs-e4';
  return {
    key: line.id,
    name: line.name,
    side: line.side,
    context,
    rootPositionKey,
    eco: line.eco,
    summary: line.explanation ?? `Learn the plans and decisions in ${line.name}.`,
    tags: Array.from(new Set([...line.tags, ...(line.themeTags ?? [])])),
    recommendedDepths: line.difficulty === 'theory' ? ['standard', 'deep'] : ['foundation', 'standard', 'deep'],
    lineKeys: []
  };
}

function ensureNode(graph: RepertoireGraph, fen: string, familyKey: string): PositionNode {
  const key = buildPositionKey(fen);
  graph.positions[key] ??= {
    key,
    fen,
    sideToMove: new Chess(fen).turn() === 'w' ? 'white' : 'black',
    openingFamilyKeys: [],
    legacyPositionIds: []
  };
  addUnique(graph.positions[key].openingFamilyKeys, familyKey);
  return graph.positions[key];
}

function addLineGuidance(graph: RepertoireGraph, line: RepertoireLine, edgeKeys: string[]): void {
  for (const explanation of line.moveExplanations ?? []) {
    const edgeKey = edgeKeys[explanation.moveIndex];
    const edge = graph.edges[edgeKey];
    if (!edge) continue;
    const key = `guidance:${line.id}:idea:${explanation.moveIndex}`;
    graph.guidance[key] = {
      key,
      positionKey: edge.from,
      edgeKey,
      kind: 'idea',
      title: explanation.principle,
      text: explanation.summary
    };
  }
  for (const mistake of line.commonMistakes ?? []) {
    const edgeKey = edgeKeys[mistake.moveIndex];
    const edge = graph.edges[edgeKey];
    if (!edge) continue;
    const key = `guidance:${line.id}:mistake:${mistake.moveIndex}`;
    graph.guidance[key] = {
      key,
      positionKey: edge.from,
      edgeKey,
      kind: 'mistake',
      title: mistake.principle,
      text: mistake.summary
    };
  }
}

function addLineMotifs(graph: RepertoireGraph, line: RepertoireLine): void {
  for (const position of line.criticalPositions ?? []) {
    const positionKey = buildPositionKey(position.fen);
    const node = ensureNode(graph, position.fen, line.parentLineId ?? line.id);
    addUnique(node.legacyPositionIds, position.id);
    const key = `motif:${position.id}`;
    const motif: TacticalMotif = {
      key,
      title: position.prompt,
      pattern: position.themes.join(', '),
      trigger: position.prompt,
      execution: position.expectedMoves.join(' or '),
      prerequisites: position.hint ?? 'Recognise the linked repertoire position.',
      limitation: position.teachingPoint ?? 'Confirm the tactic still works before committing.',
      positionKeys: [positionKey],
      difficulty: line.difficulty === 'theory' ? 'deep' : 'foundation'
    };
    graph.motifs[key] = motif;
  }
}

function addDeviationPolicies(graph: RepertoireGraph, line: RepertoireLine, familyKey: string): void {
  for (const [index, policy] of (line.deviationPolicies ?? []).entries()) {
    const chess = new Chess();
    for (const move of line.movesSan.slice(0, policy.ply)) chess.move(move);
    const positionKey = ensureNode(graph, chess.fen(), familyKey).key;
    const key = `deviation:${line.id}:${policy.ply}:${index}`;
    graph.deviationPolicies[key] = { key, positionKey, moveUci: policy.moveUci, category: policy.category, guidance: policy.guidance };
  }
}

function addUnique(items: string[], value: string): void {
  if (!items.includes(value)) items.push(value);
}

function stableKey(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}:${(hash >>> 0).toString(36)}`;
}
