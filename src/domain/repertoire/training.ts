import type {
  DeviationPolicy,
  DimensionMastery,
  LearningAttempt,
  MasteryState,
  MoveEdge,
  PositionKey,
  RepertoireGraph
} from './types';
import { outgoingEdges } from './graph';

export type MoveClassification =
  | { kind: 'preferred'; edge: MoveEdge; message: string }
  | { kind: 'alternative'; edge: MoveEdge; message: string }
  | { kind: 'transposition'; edge: MoveEdge; message: string }
  | { kind: 'authored-deviation'; policy: DeviationPolicy; message: string }
  | { kind: 'reasonable'; message: string }
  | { kind: 'mistake'; message: string }
  | { kind: 'uncovered'; message: string };

export function classifyMove(input: {
  graph: RepertoireGraph;
  positionKey: PositionKey;
  playedUci: string;
  openingFamilyKey: string;
  preferredEdgeKey?: string;
  engineCentipawnLoss?: number;
}): MoveClassification {
  const edges = outgoingEdges(input.graph, input.positionKey, input.openingFamilyKey);
  const edge = edges.find((candidate) => candidate.uci === input.playedUci);
  if (edge) {
    if (input.preferredEdgeKey === edge.key || (!input.preferredEdgeKey && edge.classification === 'main')) {
      return { kind: 'preferred', edge, message: 'That is your repertoire move.' };
    }
    if (edge.classification === 'transposition') {
      return { kind: 'transposition', edge, message: 'This reaches another known repertoire position.' };
    }
    return { kind: 'alternative', edge, message: 'This is a playable known alternative, but not your selected continuation.' };
  }

  const policy = Object.values(input.graph.deviationPolicies).find(
    (candidate) => candidate.positionKey === input.positionKey && (!candidate.moveUci || candidate.moveUci === input.playedUci)
  );
  if (policy) return { kind: 'authored-deviation', policy, message: policy.guidance };

  if (typeof input.engineCentipawnLoss === 'number') {
    if (input.engineCentipawnLoss <= 50) {
      return { kind: 'reasonable', message: 'This move is playable, but it is outside your selected repertoire.' };
    }
    if (input.engineCentipawnLoss >= 120) {
      return { kind: 'mistake', message: 'This appears to be a chess mistake rather than only a repertoire difference.' };
    }
  }
  return { kind: 'uncovered', message: 'This move is not covered yet. Use your fallback plan and add it to the repertoire backlog.' };
}

export function createInitialMastery(input: {
  learnerId: string;
  itemKey: string;
  positionKey: PositionKey;
  now: string;
}): MasteryState {
  const dimension = initialDimension(input.now);
  return {
    learnerId: input.learnerId,
    itemKey: input.itemKey,
    positionKey: input.positionKey,
    recall: { ...dimension },
    understanding: { ...dimension },
    tactics: { ...dimension },
    updatedAt: input.now
  };
}

export function scheduleReview(previous: MasteryState, attempt: LearningAttempt): MasteryState {
  const current = previous[attempt.dimension];
  const next = scheduleDimension(current, attempt);
  return { ...previous, [attempt.dimension]: next, updatedAt: attempt.createdAt };
}

function scheduleDimension(previous: DimensionMastery, attempt: LearningAttempt): DimensionMastery {
  const successful = attempt.correct && !attempt.revealed;
  const nextStreak = successful ? previous.streak + 1 : 0;
  let intervalDays: number;
  if (!successful) intervalDays = 1;
  else if (attempt.hintUsed) intervalDays = Math.max(1, Math.round(Math.max(previous.intervalDays, 1) * 1.5));
  else intervalDays = [1, 3, 7, 14, 30, 60][Math.min(nextStreak - 1, 5)];

  const due = new Date(attempt.createdAt);
  due.setUTCDate(due.getUTCDate() + intervalDays);
  const scoreDelta = successful ? (attempt.hintUsed ? 8 : 15) : -20;
  const score = Math.max(0, Math.min(100, previous.score + scoreDelta));
  return {
    score,
    streak: nextStreak,
    intervalDays,
    status: score >= 80 && nextStreak >= 3 ? 'reliable' : 'learning',
    dueAt: due.toISOString(),
    lastReviewedAt: attempt.createdAt
  };
}

function initialDimension(now: string): DimensionMastery {
  return { score: 0, streak: 0, intervalDays: 0, status: 'unseen', dueAt: now };
}
