export type PositionKey = string;

export type ContentReleaseStatus = 'draft' | 'published' | 'archived';
export type OpeningContext = 'white' | 'black-vs-e4' | 'black-vs-d4' | 'black-other';
export type LearnerDepth = 'foundation' | 'standard' | 'deep';
export type MoveEdgeClassification = 'main' | 'alternative' | 'transposition' | 'deviation';
export type GuidanceKind = 'idea' | 'cue' | 'fallback' | 'mistake';
export type MasteryDimension = 'recall' | 'understanding' | 'tactics';
export type MasteryStatus = 'unseen' | 'learning' | 'due' | 'reliable';

export type ContentRelease = {
  id: string;
  version: number;
  status: ContentReleaseStatus;
  title: string;
  schemaVersion: number;
  publishedAt?: string;
};

export type PositionNode = {
  key: PositionKey;
  fen: string;
  sideToMove: 'white' | 'black';
  openingFamilyKeys: string[];
  legacyPositionIds: string[];
};

export type MoveEdge = {
  key: string;
  from: PositionKey;
  to: PositionKey;
  san: string;
  uci: string;
  order: number;
  classification: MoveEdgeClassification;
  openingFamilyKeys: string[];
  legacyLineIds: string[];
};

export type OpeningFamily = {
  key: string;
  name: string;
  side: 'white' | 'black';
  context: OpeningContext;
  rootPositionKey: PositionKey;
  eco?: string;
  summary: string;
  tags: string[];
  recommendedDepths: LearnerDepth[];
  lineKeys: string[];
};

export type LearningUnit = {
  key: string;
  openingFamilyKey: string;
  lineKey: string;
  title: string;
  startPositionKey: PositionKey;
  endPositionKey: PositionKey;
  edgeKeys: string[];
  order: number;
  depth: LearnerDepth;
};

export type PositionGuidance = {
  key: string;
  positionKey: PositionKey;
  edgeKey?: string;
  kind: GuidanceKind;
  title: string;
  text: string;
};

export type TacticalMotif = {
  key: string;
  title: string;
  pattern: string;
  trigger: string;
  execution: string;
  prerequisites: string;
  limitation: string;
  positionKeys: PositionKey[];
  difficulty: LearnerDepth;
};

export type DeviationPolicy = {
  key: string;
  positionKey: PositionKey;
  moveUci?: string;
  category: 'harmless' | 'direct-threat' | 'central-challenge' | 'tactical-opportunity' | 'new-branch';
  guidance: string;
};

export type RepertoireGraph = {
  release: ContentRelease;
  positions: Record<PositionKey, PositionNode>;
  edges: Record<string, MoveEdge>;
  openings: Record<string, OpeningFamily>;
  learningUnits: Record<string, LearningUnit>;
  guidance: Record<string, PositionGuidance>;
  motifs: Record<string, TacticalMotif>;
  deviationPolicies: Record<string, DeviationPolicy>;
};

export type RepertoireSelection = {
  id: string;
  learnerId: string;
  openingFamilyKey: string;
  preferredEdges: Record<PositionKey, string>;
  updatedAt: string;
};

export type LearningAttempt = {
  id: string;
  learnerId: string;
  itemKey: string;
  positionKey: PositionKey;
  dimension: MasteryDimension;
  response: string;
  correct: boolean;
  hintUsed: boolean;
  revealed: boolean;
  createdAt: string;
};

export type DimensionMastery = {
  score: number;
  streak: number;
  intervalDays: number;
  status: MasteryStatus;
  dueAt: string;
  lastReviewedAt?: string;
};

export type MasteryState = {
  learnerId: string;
  itemKey: string;
  positionKey: PositionKey;
  recall: DimensionMastery;
  understanding: DimensionMastery;
  tactics: DimensionMastery;
  updatedAt: string;
};

export type LearnerProfile = {
  learnerId: string;
  ratingSource?: 'chess.com' | 'lichess' | 'otb' | 'unsure';
  ratingValue?: number;
  depth: LearnerDepth;
  goal: 'basic-plans' | 'tactical-danger' | 'sharp-gambits' | 'deep-repertoire';
  onboardingCompleted: boolean;
  updatedAt: string;
};

export type RepertoireBacklogItem = {
  id: string;
  learnerId: string;
  positionKey: PositionKey;
  reason: 'opponent-deviation' | 'forgotten-move' | 'missed-tactic';
  title: string;
  status: 'new' | 'scheduled' | 'resolved';
  createdAt: string;
};
