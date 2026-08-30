import { Chess } from 'chess.js';
import { buildPositionKey } from './positionKey';
import type { RepertoireGraph } from './types';

export type ContentValidationIssue = {
  code: string;
  message: string;
  itemKey?: string;
};

export function validateRepertoireGraph(graph: RepertoireGraph): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];
  const seen = new Set<string>();
  if (!Object.keys(graph.openings).length) issues.push(issue('release-openings-missing', 'A release must contain at least one opening family.'));
  if (!Object.keys(graph.positions).length) issues.push(issue('release-positions-missing', 'A release must contain repertoire positions.'));
  if (!Object.keys(graph.edges).length) issues.push(issue('release-edges-missing', 'A release must contain repertoire moves.'));

  for (const [key, node] of Object.entries(graph.positions)) {
    if (seen.has(key)) issues.push(issue('duplicate-position-key', 'Position stable keys must be unique.', key));
    seen.add(key);
    try {
      if (buildPositionKey(node.fen) !== key) issues.push(issue('position-key-mismatch', 'Position FEN does not match its canonical key.', key));
    } catch {
      issues.push(issue('invalid-fen', 'Position contains an invalid FEN.', key));
    }
  }

  const edgeOrders = new Map<string, string>();
  for (const edge of Object.values(graph.edges)) {
    if (!graph.positions[edge.from] || !graph.positions[edge.to]) {
      issues.push(issue('dangling-edge', 'Move edge references a missing position.', edge.key));
      continue;
    }
    for (const lineKey of edge.legacyLineIds) {
      const orderKey = `${edge.from}|${lineKey}|${edge.order}`;
      const priorEdge = edgeOrders.get(orderKey);
      if (priorEdge && priorEdge !== edge.key) issues.push(issue('edge-order-collision', 'Two moves have the same order in this line.', edge.key));
      edgeOrders.set(orderKey, edge.key);
    }
    try {
      const chess = new Chess(graph.positions[edge.from].fen);
      const move = chess.move({ from: edge.uci.slice(0, 2), to: edge.uci.slice(2, 4), promotion: edge.uci.slice(4) || undefined });
      if (!move || normalizeSan(move.san) !== normalizeSan(edge.san)) issues.push(issue('illegal-edge', 'Move SAN/UCI is not legal from the source position.', edge.key));
      else if (buildPositionKey(chess.fen()) !== edge.to) issues.push(issue('edge-destination-mismatch', 'Move does not reach its declared destination.', edge.key));
    } catch {
      issues.push(issue('illegal-edge', 'Move SAN/UCI is not legal from the source position.', edge.key));
    }
  }

  for (const opening of Object.values(graph.openings)) {
    if (!graph.positions[opening.rootPositionKey]) issues.push(issue('opening-root-missing', 'Opening has no valid root position.', opening.key));
    if (!opening.summary.trim()) issues.push(issue('opening-summary-missing', 'Opening needs a learner-facing summary.', opening.key));
    if (!Object.values(graph.learningUnits).some((unit) => unit.openingFamilyKey === opening.key)) {
      issues.push(issue('opening-unit-missing', 'Opening needs at least one learning unit.', opening.key));
    }
    if (!Object.values(graph.edges).some((edge) => edge.openingFamilyKeys.includes(opening.key) && edge.classification === 'main')) {
      issues.push(issue('opening-main-path-missing', 'Opening needs a preferred main path.', opening.key));
    }
  }

  const unitOrders = new Map<string, string>();
  for (const unit of Object.values(graph.learningUnits)) {
    const orderKey = `${unit.openingFamilyKey}|${unit.lineKey}|${unit.depth}|${unit.order}`;
    const priorUnit = unitOrders.get(orderKey);
    if (priorUnit && priorUnit !== unit.key) issues.push(issue('unit-order-collision', 'Two learning units have the same line, depth, and order.', unit.key));
    unitOrders.set(orderKey, unit.key);
    let expected = unit.startPositionKey;
    for (const edgeKey of unit.edgeKeys) {
      const edge = graph.edges[edgeKey];
      if (!edge) {
        issues.push(issue('unit-edge-missing', 'Learning unit references a missing move.', unit.key));
        break;
      }
      if (edge.from !== expected) {
        issues.push(issue('unit-path-discontinuous', 'Learning unit move path is not contiguous.', unit.key));
        break;
      }
      expected = edge.to;
    }
    if (expected !== unit.endPositionKey) issues.push(issue('unit-end-mismatch', 'Learning unit end position does not match its path.', unit.key));
  }

  for (const motif of Object.values(graph.motifs)) {
    if (!motif.trigger.trim() || !motif.execution.trim() || !motif.limitation.trim()) {
      issues.push(issue('motif-incomplete', 'Tactical motif requires a trigger, execution, and limitation.', motif.key));
    }
    if (motif.positionKeys.some((key) => !graph.positions[key])) issues.push(issue('motif-position-missing', 'Tactical motif references a missing position.', motif.key));
  }

  return deduplicate(issues);
}

function normalizeSan(value: string): string {
  return value.replace(/[+#]/g, '').trim();
}

function issue(code: string, message: string, itemKey?: string): ContentValidationIssue {
  return { code, message, itemKey };
}

function deduplicate(issues: ContentValidationIssue[]): ContentValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = `${item.code}|${item.itemKey ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
