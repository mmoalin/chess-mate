import type { RepertoireLine } from '../openings/types';
import type {
  CreateLearnerSetupInput,
  CurriculumAttempt,
  LearnerSetup,
  LearningProgressInput,
  LearningProgressSummary,
  NextActivity,
  OpeningDetection,
  ReviewItem,
  ScoreCurriculumAttemptInput
} from './types';

export type {
  CurriculumAttempt,
  LearnerSetup,
  LearningProgressSummary,
  NextActivity,
  OpeningDetection,
  ReviewItem
} from './types';

export function createLearnerSetup(input: CreateLearnerSetupInput): LearnerSetup {
  const recommendedWhiteLineId = chooseLine(input.lines, 'white', input.openingStyle)?.id ?? '';
  const recommendedBlackLineId = chooseLine(input.lines, 'black', input.openingStyle)?.id ?? '';

  return {
    sidePreference: input.sidePreference,
    experienceLevel: input.experienceLevel,
    studyTimeMinutes: input.studyTimeMinutes,
    openingStyle: input.openingStyle,
    recommendedWhiteLineId,
    recommendedBlackLineId,
    completed: true
  };
}

export function recommendNextActivity(input: {
  setup: LearnerSetup;
  lines: RepertoireLine[];
  reviewItems: ReviewItem[];
  now: string;
}): NextActivity {
  const dueItems = input.reviewItems.filter((item) => item.status === 'due' && item.dueAt <= input.now);
  if (dueItems.length > 0) {
    const first = dueItems[0];
    return {
      kind: 'review',
      title: first.title,
      targetId: first.id,
      reason: `${dueItems.length} review ${dueItems.length === 1 ? 'is' : 'are'} due today.`
    };
  }

  const preferredLineId =
    input.setup.sidePreference === 'black' ? input.setup.recommendedBlackLineId : input.setup.recommendedWhiteLineId;
  const line = input.lines.find((item) => item.id === preferredLineId) ?? input.lines[0];

  if (line) {
    return {
      kind: 'opening-lesson',
      title: line.name,
      targetId: line.id,
      reason: 'Start with one clear beginner line before adding variety.'
    };
  }

  return {
    kind: 'study',
    title: 'Opening Principles',
    targetId: 'opening-principles',
    reason: 'Learn the core ideas before drilling moves.'
  };
}

export function buildReviewItemFromMistake(input: {
  line: RepertoireLine;
  moveIndex: number;
  expectedMove: string;
  playedMove: string;
  now: string;
}): ReviewItem {
  const dueAt = new Date(input.now);
  dueAt.setUTCDate(dueAt.getUTCDate() + 1);

  return {
    id: `review-${input.line.id}-${input.moveIndex}`,
    sourceType: 'opening-move',
    sourceId: input.line.id,
    title: `Review ${input.line.name} move ${input.moveIndex + 1}`,
    prompt: `You played ${input.playedMove}. Try the repertoire move ${input.expectedMove} and name the idea.`,
    themeTags: input.line.themeTags ?? [],
    dueAt: dueAt.toISOString(),
    status: 'due'
  };
}

export function scoreCurriculumAttempt(input: ScoreCurriculumAttemptInput): CurriculumAttempt {
  const normalized = input.answer.toLowerCase();
  const matchedThemes = (input.task.themes ?? []).filter((theme) =>
    themeKeywords(theme).some((keyword) => normalized.includes(keyword))
  );
  const developmentCredit = /develop|knight|bishop|castle|center|centre/.test(normalized) ? 1 : 0;
  const score = Math.min(input.task.maxScore, Math.round(((matchedThemes.length + developmentCredit) / 2) * input.task.maxScore));
  const completed = score >= Math.ceil(input.task.maxScore * 0.7);

  return {
    taskId: input.task.id,
    answer: input.answer,
    score,
    attempts: input.previousAttempts + 1,
    completed,
    feedback: completed
      ? 'Good work: you connected the answer to development and center control.'
      : 'Try again: name the opening idea and connect it to a concrete board goal.',
    lastReviewedAt: input.now
  };
}

export function detectOpeningFromHistory(history: string[], lines: RepertoireLine[]): OpeningDetection | null {
  let best: OpeningDetection | null = null;

  for (const line of lines) {
    let matchedPlyCount = 0;
    for (let index = 0; index < history.length; index += 1) {
      if (normalizeSan(history[index]) !== normalizeSan(line.movesSan[index])) {
        break;
      }
      matchedPlyCount += 1;
    }

    if (!best || matchedPlyCount > best.matchedPlyCount) {
      best = {
        lineId: line.id,
        matchedPlyCount,
        leftBookAtPly: matchedPlyCount < history.length ? matchedPlyCount + 1 : null
      };
    }
  }

  return best && best.matchedPlyCount > 0 ? best : null;
}

export function summarizeLearningProgress(input: LearningProgressInput): LearningProgressSummary {
  const dueReviewCount = input.reviewItems.filter((item) => item.status === 'due' && item.dueAt <= input.now).length;
  const masteredLineCount = input.progress.filter((item) => item.status === 'mastered' || item.status === 'completed').length;
  const weakThemes = Array.from(new Set(input.progress.flatMap((item) => item.themeWeaknesses ?? []))).map(formatThemeLabel);
  const nextNeedsReview = input.progress.find((item) => item.status === 'needs-review' || item.status === 'due');
  const nextLine = input.lines.find((line) => line.id === nextNeedsReview?.lineId) ?? input.lines[0];

  return {
    dueReviewCount,
    masteredLineCount,
    weakThemes,
    todayTarget: dueReviewCount
      ? `Review ${dueReviewCount} due item, then study ${nextLine?.name ?? 'Opening Principles'}.`
      : `Study ${nextLine?.name ?? 'Opening Principles'} for one focused session.`
  };
}

function chooseLine(lines: RepertoireLine[], side: 'white' | 'black', style: LearnerSetup['openingStyle']) {
  const sideLines = lines.filter((line) => line.side === side && line.difficulty !== 'theory');
  if (style === 'solid') {
    return sideLines.find((line) => line.tags.includes('solid') || line.tags.includes('structure')) ?? sideLines[0];
  }

  if (style === 'active') {
    return sideLines.find((line) => line.tags.includes('attacking') || line.tags.includes('counterplay')) ?? sideLines[0];
  }

  return sideLines[0];
}

function normalizeSan(san: string): string {
  return san.replace(/[+#]/g, '').trim();
}

function themeKeywords(theme: string): string[] {
  const words = theme.split('-');
  return [theme.replace(/-/g, ' '), ...words];
}

function formatThemeLabel(theme: string): string {
  return theme
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
