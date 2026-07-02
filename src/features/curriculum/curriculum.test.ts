import { describe, expect, it } from 'vitest';
import {
  calculateModuleProgress,
  starterCurriculumModules,
  validateCurriculumModule
} from './curriculum';
import type { CurriculumModule } from './types';

describe('curriculum module validation', () => {
  it('accepts each original starter module', () => {
    expect(starterCurriculumModules.map((module) => module.id)).toEqual([
      'opening-principles',
      'pawn-chains',
      'open-files',
      'imbalances',
      'basic-endgames'
    ]);

    for (const module of starterCurriculumModules) {
      expect(validateCurriculumModule(module)).toEqual({ ok: true, errors: [] });
    }
  });

  it('reports missing required fields, duplicate task ids, and invalid completion references', () => {
    const invalidModule: CurriculumModule = {
      id: '',
      title: 'Incomplete Module',
      level: 'beginner',
      sourceInspiration: [],
      themes: [],
      lessonSummary: '',
      tasks: [
        {
          id: 'task-1',
          type: 'find-theme',
          title: 'Find a theme',
          prompt: 'Name the strategic clue in the position.',
          maxScore: 10
        },
        {
          id: 'task-1',
          type: 'choose-plan',
          title: 'Choose a plan',
          prompt: 'Pick the most useful plan.',
          maxScore: 10
        }
      ],
      completionCriteria: {
        minimumScorePercent: 80,
        requiredTaskIds: ['task-1', 'missing-task']
      }
    };

    expect(validateCurriculumModule(invalidModule)).toEqual({
      ok: false,
      errors: [
        'Module id is required.',
        'At least one source inspiration is required.',
        'At least one theme is required.',
        'Lesson summary is required.',
        'Task ids must be unique.',
        'Completion criteria references unknown task id: missing-task.'
      ]
    });
  });
});

describe('curriculum progress calculations', () => {
  const module = starterCurriculumModules[0];

  it('calculates completion percentage, score percentage, and unmet criteria', () => {
    const progress = calculateModuleProgress(module, [
      { taskId: 'opening-principles-explain-development', completed: true, score: 8, attempts: 1 },
      { taskId: 'opening-principles-find-center', completed: false, score: 3, attempts: 2 }
    ]);

    expect(progress).toEqual({
      moduleId: 'opening-principles',
      totalTasks: 3,
      completedTasks: 1,
      completionPercent: 33,
      earnedScore: 11,
      possibleScore: 30,
      scorePercent: 37,
      requiredTasksMet: false,
      minimumScoreMet: false,
      completed: false,
      missingRequiredTaskIds: ['opening-principles-find-center', 'opening-principles-choose-plan']
    });
  });

  it('marks a module complete when required tasks and minimum score are met', () => {
    const progress = calculateModuleProgress(module, [
      { taskId: 'opening-principles-explain-development', completed: true, score: 9, attempts: 1 },
      { taskId: 'opening-principles-find-center', completed: true, score: 8, attempts: 1 },
      { taskId: 'opening-principles-choose-plan', completed: true, score: 8, attempts: 1 }
    ]);

    expect(progress.completed).toBe(true);
    expect(progress.completionPercent).toBe(100);
    expect(progress.scorePercent).toBe(83);
    expect(progress.missingRequiredTaskIds).toEqual([]);
  });
});
