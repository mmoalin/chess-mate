import type { CurriculumTask } from '../curriculum/types';
import type { RepertoireLine, RepertoireSide, TrainingProgress } from '../openings/types';

export type LearnerExperienceLevel = 'beginner' | 'improver';
export type OpeningStylePreference = 'active' | 'solid' | 'balanced';
export type LearnerSidePreference = RepertoireSide | 'both';

export type LearnerSetup = {
  sidePreference: LearnerSidePreference;
  experienceLevel: LearnerExperienceLevel;
  studyTimeMinutes: number;
  openingStyle: OpeningStylePreference;
  recommendedWhiteLineId: string;
  recommendedBlackLineId: string;
  completed: boolean;
};

export type CreateLearnerSetupInput = {
  sidePreference: LearnerSidePreference;
  experienceLevel: LearnerExperienceLevel;
  studyTimeMinutes: number;
  openingStyle: OpeningStylePreference;
  lines: RepertoireLine[];
};

export type ReviewItemSourceType = 'opening-move' | 'curriculum-task' | 'pgn-position' | 'theme';
export type ReviewItemStatus = 'new' | 'due' | 'mastered' | 'needs-review';

export type ReviewItem = {
  id: string;
  sourceType: ReviewItemSourceType;
  sourceId: string;
  title: string;
  prompt: string;
  themeTags: string[];
  dueAt: string;
  status: ReviewItemStatus;
};

export type NextActivity =
  | { kind: 'review'; title: string; targetId: string; reason: string }
  | { kind: 'opening-lesson'; title: string; targetId: string; reason: string }
  | { kind: 'study'; title: string; targetId: string; reason: string };

export type CurriculumAttempt = {
  taskId: string;
  answer: string;
  score: number;
  attempts: number;
  completed: boolean;
  feedback: string;
  lastReviewedAt: string;
};

export type ScoreCurriculumAttemptInput = {
  task: CurriculumTask;
  answer: string;
  previousAttempts: number;
  now: string;
};

export type OpeningDetection = {
  lineId: string;
  matchedPlyCount: number;
  leftBookAtPly: number | null;
};

export type LearningProgressSummary = {
  dueReviewCount: number;
  masteredLineCount: number;
  weakThemes: string[];
  todayTarget: string;
};

export type LearningProgressInput = {
  lines: RepertoireLine[];
  progress: TrainingProgress[];
  reviewItems: ReviewItem[];
  now: string;
};
