export type RepertoireSide = 'white' | 'black';

export type RepertoireDifficulty = 'beginner' | 'theory';

export type RepertoireMiddlegameIdea = {
  title: string;
  summary: string;
  planMoves?: string[];
  themes: string[];
  warning?: string;
};

export type RepertoireLine = {
  id: string;
  side: RepertoireSide;
  name: string;
  eco?: string;
  movesSan: string[];
  tags: string[];
  themeTags?: string[];
  difficulty?: RepertoireDifficulty;
  parentLineId?: string;
  middlegameIdeas?: RepertoireMiddlegameIdea[];
  modelPositionPly?: number;
  explanation?: string;
  moveExplanations?: RepertoireMoveExplanation[];
  commonMistakes?: RepertoireMoveExplanation[];
  practicalAssessment?: 'practical' | 'playable' | 'equal' | 'inferior';
  branchPurpose?: string;
  criticalPositions?: CriticalPosition[];
  deviationPolicies?: RepertoireDeviationPolicy[];
};

export type RepertoireDeviationPolicy = {
  ply: number;
  moveUci?: string;
  category: 'harmless' | 'direct-threat' | 'central-challenge' | 'tactical-opportunity' | 'new-branch';
  guidance: string;
};

export type CriticalPosition = {
  id: string;
  lineId: string;
  ply: number;
  fen: string;
  prompt: string;
  expectedMoves: string[];
  acceptableMoves?: string[];
  themes: string[];
  hint?: string;
  teachingPoint?: string;
};

export type RepertoireMoveExplanation = {
  moveIndex: number;
  summary: string;
  principle: string;
};

export type MoveTrainingStatus = 'correct' | 'incorrect' | 'hint-used' | 'completed' | 'needs-review';

export type LineLearningStatus = 'new' | 'learning' | 'due' | 'mastered' | 'needs-review';

export type MoveTrainingResult = {
  status: 'correct' | 'incorrect';
  expectedMove: string | null;
  nextMoveIndex: number;
  completed: boolean;
};

export type TrainingProgress = {
  userId: string;
  lineId: string;
  side: RepertoireSide;
  status: LineLearningStatus | 'in-progress' | 'completed';
  correctCount: number;
  incorrectCount: number;
  nextMoveIndex: number;
  dueAt?: string;
  lastReviewedAt?: string;
  streak?: number;
  mistakeCount?: number;
  themeWeaknesses?: string[];
  updatedAt: string;
};

export type CriticalMoveResult = MoveTrainingResult & {
  positionId: string;
  themes: string[];
  hintUsed?: boolean;
};

export type PositionProgress = {
  userId: string;
  openingId: string;
  positionId: string;
  side: RepertoireSide;
  attempts: number;
  correctCount: number;
  hintCount: number;
  mistakeThemes: string[];
  masteryScore: number;
  dueAt: string;
  lastReviewedAt?: string;
};
