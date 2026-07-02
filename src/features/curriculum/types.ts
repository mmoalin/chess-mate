export type CurriculumLevel = 'beginner' | 'intermediate' | 'advanced';

export type CurriculumTaskType =
  | 'explain-move'
  | 'find-theme'
  | 'choose-plan'
  | 'calculate-line'
  | 'endgame-drill'
  | 'model-game';

export type CurriculumTask = {
  id: string;
  type: CurriculumTaskType;
  title: string;
  prompt: string;
  themes?: string[];
  maxScore: number;
};

export type CurriculumCompletionCriteria = {
  minimumScorePercent: number;
  requiredTaskIds: string[];
};

export type CurriculumModule = {
  id: string;
  title: string;
  level: CurriculumLevel;
  sourceInspiration: string[];
  themes: string[];
  lessonSummary: string;
  tasks: CurriculumTask[];
  completionCriteria: CurriculumCompletionCriteria;
};

export type CurriculumValidationResult = {
  ok: boolean;
  errors: string[];
};

export type CurriculumTaskProgress = {
  taskId: string;
  completed: boolean;
  score: number;
  attempts: number;
  lastReviewedAt?: string;
};

export type CurriculumModuleProgress = {
  moduleId: string;
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  earnedScore: number;
  possibleScore: number;
  scorePercent: number;
  requiredTasksMet: boolean;
  minimumScoreMet: boolean;
  completed: boolean;
  missingRequiredTaskIds: string[];
};
