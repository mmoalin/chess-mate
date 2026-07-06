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
