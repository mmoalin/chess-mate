import { describe, expect, it } from 'vitest';
import type { CurriculumTask } from '../curriculum/types';
import type { RepertoireLine } from '../openings/types';
import {
  buildReviewItemFromMistake,
  createLearnerSetup,
  detectOpeningFromHistory,
  recommendNextActivity,
  scoreCurriculumAttempt,
  summarizeLearningProgress
} from './journey';

const whiteLine: RepertoireLine = {
  id: 'white-vienna-main',
  side: 'white',
  name: 'Vienna Game: Main Development',
  movesSan: ['e4', 'e5', 'Nc3', 'Nf6', 'f4'],
  tags: ['vienna'],
  themeTags: ['center-control', 'initiative'],
  explanation: 'Develop the queen knight early and prepare f4 pressure.'
};

const blackLine: RepertoireLine = {
  id: 'black-sicilian-basic',
  side: 'black',
  name: 'Sicilian Defense: Open Sicilian Start',
  movesSan: ['e4', 'c5', 'Nf3', 'd6'],
  tags: ['sicilian'],
  themeTags: ['center-control', 'open-files'],
  explanation: 'Challenge White from the flank.'
};

const task: CurriculumTask = {
  id: 'opening-principles-explain-development',
  type: 'explain-move',
  title: 'Explain a Developing Move',
  prompt: 'Describe why a knight or bishop move helps fight for central squares.',
  themes: ['development', 'center-control'],
  maxScore: 10
};

describe('learner journey helpers', () => {
  it('creates beginner setup defaults with recommended first white and black lines', () => {
    const setup = createLearnerSetup({
      sidePreference: 'both',
      experienceLevel: 'beginner',
      studyTimeMinutes: 10,
      openingStyle: 'active',
      lines: [whiteLine, blackLine]
    });

    expect(setup).toEqual({
      sidePreference: 'both',
      experienceLevel: 'beginner',
      studyTimeMinutes: 10,
      openingStyle: 'active',
      recommendedWhiteLineId: 'white-vienna-main',
      recommendedBlackLineId: 'black-sicilian-basic',
      completed: true
    });
  });

  it('does not recommend theory branches as the beginner setup default', () => {
    const theoryLine: RepertoireLine = {
      ...whiteLine,
      id: 'white-vienna-gambit-theory',
      name: 'Vienna Gambit: Theory Branch',
      difficulty: 'theory',
      parentLineId: 'white-vienna-main',
      tags: ['vienna', 'attacking']
    };
    const beginnerLine: RepertoireLine = {
      ...whiteLine,
      difficulty: 'beginner',
      tags: ['vienna', 'attacking']
    };

    const setup = createLearnerSetup({
      sidePreference: 'both',
      experienceLevel: 'beginner',
      studyTimeMinutes: 10,
      openingStyle: 'active',
      lines: [theoryLine, beginnerLine, blackLine]
    });

    expect(setup.recommendedWhiteLineId).toBe('white-vienna-main');
  });

  it('recommends due review before new study and falls back to the first setup line', () => {
    const setup = createLearnerSetup({
      sidePreference: 'both',
      experienceLevel: 'beginner',
      studyTimeMinutes: 10,
      openingStyle: 'active',
      lines: [whiteLine, blackLine]
    });
    const dueRecommendation = recommendNextActivity({
      setup,
      lines: [whiteLine, blackLine],
      reviewItems: [
        {
          id: 'review-white-vienna-main-2',
          sourceType: 'opening-move',
          sourceId: 'white-vienna-main',
          title: 'Review Vienna move 3',
          prompt: 'Try the move again.',
          themeTags: ['initiative'],
          dueAt: '2026-07-02T09:00:00.000Z',
          status: 'due'
        }
      ],
      now: '2026-07-02T10:00:00.000Z'
    });

    expect(dueRecommendation).toEqual({
      kind: 'review',
      title: 'Review Vienna move 3',
      targetId: 'review-white-vienna-main-2',
      reason: '1 review is due today.'
    });

    expect(
      recommendNextActivity({
        setup,
        lines: [whiteLine, blackLine],
        reviewItems: [],
        now: '2026-07-02T10:00:00.000Z'
      }).targetId
    ).toBe('white-vienna-main');
  });

  it('creates a review item from an incorrect opening move with weak themes', () => {
    const item = buildReviewItemFromMistake({
      line: whiteLine,
      moveIndex: 2,
      expectedMove: 'Nc3',
      playedMove: 'Nf3',
      now: '2026-07-02T10:00:00.000Z'
    });

    expect(item).toMatchObject({
      id: 'review-white-vienna-main-2',
      sourceType: 'opening-move',
      sourceId: 'white-vienna-main',
      title: 'Review Vienna Game: Main Development move 3',
      prompt: 'You played Nf3. Try the repertoire move Nc3 and name the idea.',
      themeTags: ['center-control', 'initiative'],
      status: 'due'
    });
    expect(item.dueAt).toBe('2026-07-03T10:00:00.000Z');
  });

  it('scores curriculum attempts from useful beginner explanations', () => {
    const attempt = scoreCurriculumAttempt({
      task,
      answer: 'A developing move brings a knight toward the center and helps castle safely.',
      previousAttempts: 1,
      now: '2026-07-02T10:00:00.000Z'
    });

    expect(attempt).toEqual({
      taskId: 'opening-principles-explain-development',
      answer: 'A developing move brings a knight toward the center and helps castle safely.',
      score: 10,
      attempts: 2,
      completed: true,
      feedback: 'Good work: you connected the answer to development and center control.',
      lastReviewedAt: '2026-07-02T10:00:00.000Z'
    });
  });

  it('detects a matching opening prefix from PGN move history', () => {
    expect(detectOpeningFromHistory(['e4', 'e5', 'Nc3'], [whiteLine, blackLine])).toEqual({
      lineId: 'white-vienna-main',
      matchedPlyCount: 3,
      leftBookAtPly: null
    });

    expect(detectOpeningFromHistory(['e4', 'e5', 'Nf3'], [whiteLine])).toEqual({
      lineId: 'white-vienna-main',
      matchedPlyCount: 2,
      leftBookAtPly: 3
    });
  });

  it('summarizes due reviews, mastered lines, and weak themes for the dashboard', () => {
    const summary = summarizeLearningProgress({
      lines: [whiteLine, blackLine],
      progress: [
        {
          userId: 'local',
          lineId: 'white-vienna-main',
          side: 'white',
          status: 'mastered',
          correctCount: 6,
          incorrectCount: 0,
          nextMoveIndex: 5,
          streak: 5,
          mistakeCount: 0,
          themeWeaknesses: [],
          updatedAt: '2026-07-01T10:00:00.000Z'
        },
        {
          userId: 'local',
          lineId: 'black-sicilian-basic',
          side: 'black',
          status: 'needs-review',
          correctCount: 1,
          incorrectCount: 2,
          nextMoveIndex: 1,
          streak: 0,
          mistakeCount: 2,
          themeWeaknesses: ['open-files'],
          updatedAt: '2026-07-01T10:00:00.000Z'
        }
      ],
      reviewItems: [
        {
          id: 'review-black-sicilian-basic-1',
          sourceType: 'opening-move',
          sourceId: 'black-sicilian-basic',
          title: 'Review Sicilian move 2',
          prompt: 'Try c5 again.',
          themeTags: ['open-files'],
          dueAt: '2026-07-02T08:00:00.000Z',
          status: 'due'
        }
      ],
      now: '2026-07-02T10:00:00.000Z'
    });

    expect(summary).toEqual({
      dueReviewCount: 1,
      masteredLineCount: 1,
      weakThemes: ['Open Files'],
      todayTarget: 'Review 1 due item, then study Sicilian Defense: Open Sicilian Start.'
    });
  });
});
