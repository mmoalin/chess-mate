import type {
  CurriculumModule,
  CurriculumModuleProgress,
  CurriculumTaskProgress,
  CurriculumTaskType,
  CurriculumValidationResult
} from './types';

const validTaskTypes = new Set<CurriculumTaskType>([
  'explain-move',
  'find-theme',
  'choose-plan',
  'calculate-line',
  'endgame-drill',
  'model-game'
  , 'find-move', 'position-choice'
]);

export const starterCurriculumModules: CurriculumModule[] = [
  {
    id: 'opening-principles',
    title: 'Opening Principles',
    level: 'beginner',
    sourceInspiration: ['move-by-move explanations', 'lesson-drill-test progression'],
    themes: ['development', 'center-control', 'king-safety', 'tempo'],
    lessonSummary:
      'Build a playable opening by developing toward the center, preparing castling, and making threats that improve your pieces.',
    tasks: [
      {
        id: 'opening-principles-explain-development',
        type: 'explain-move',
        title: 'Explain a Developing Move',
        prompt: 'Describe why a knight or bishop move helps fight for central squares.',
        themes: ['development', 'center-control'],
        maxScore: 10
      },
      {
        id: 'opening-principles-find-center',
        type: 'find-theme',
        title: 'Find the Center Clue',
        prompt: 'Identify which move improves central influence without losing time.',
        themes: ['center-control', 'tempo'],
        maxScore: 10
      },
      {
        id: 'opening-principles-choose-plan',
        type: 'choose-plan',
        title: 'Choose the Safe Plan',
        prompt: 'Choose whether to castle, develop a final minor piece, or start a pawn break.',
        themes: ['king-safety', 'development'],
        maxScore: 10
      }
    ],
    completionCriteria: {
      minimumScorePercent: 75,
      requiredTaskIds: [
        'opening-principles-explain-development',
        'opening-principles-find-center',
        'opening-principles-choose-plan'
      ]
    }
  },
  {
    id: 'pawn-chains',
    title: 'Pawn Chains',
    level: 'beginner',
    sourceInspiration: ['strategic theme diagnosis', 'structured drills'],
    themes: ['pawn-chain', 'pawn-break', 'space', 'structure'],
    lessonSummary:
      'Read a pawn chain by locating its base, noticing the direction it points, and choosing a break that challenges the structure.',
    tasks: [
      {
        id: 'pawn-chains-find-base',
        type: 'find-theme',
        title: 'Locate the Base',
        prompt: 'Name the pawn that anchors the chain and explain why it can become a target.',
        themes: ['pawn-chain', 'structure'],
        maxScore: 10
      },
      {
        id: 'pawn-chains-choose-break',
        type: 'choose-plan',
        title: 'Choose the Break',
        prompt: 'Choose the pawn break that challenges the opposing chain at the right moment.',
        themes: ['pawn-break', 'space'],
        maxScore: 10
      },
      {
        id: 'pawn-chains-model-structure',
        type: 'model-game',
        title: 'Follow a Structure Plan',
        prompt: 'Step through an original sample line and pause where the pawn break changes the plan.',
        themes: ['pawn-chain', 'pawn-break'],
        maxScore: 10
      }
    ],
    completionCriteria: {
      minimumScorePercent: 70,
      requiredTaskIds: ['pawn-chains-find-base', 'pawn-chains-choose-break']
    }
  },
  {
    id: 'open-files',
    title: 'Open Files',
    level: 'beginner',
    sourceInspiration: ['strategic file control', 'practical plan selection'],
    themes: ['open-file', 'rook-activity', 'seventh-rank', 'invasion-square'],
    lessonSummary:
      'Turn an open or half-open file into activity by placing heavy pieces on useful squares and looking for entry points.',
    tasks: [
      {
        id: 'open-files-find-file',
        type: 'find-theme',
        title: 'Spot the Useful File',
        prompt: 'Identify the file most likely to become a path for rook activity.',
        themes: ['open-file', 'rook-activity'],
        maxScore: 10
      },
      {
        id: 'open-files-choose-entry',
        type: 'choose-plan',
        title: 'Choose the Entry Square',
        prompt: 'Choose a plan for doubling, contesting, or entering on the seventh rank.',
        themes: ['invasion-square', 'seventh-rank'],
        maxScore: 10
      },
      {
        id: 'open-files-calculate-trade',
        type: 'calculate-line',
        title: 'Calculate the File Trade',
        prompt: 'Calculate whether trading rooks leaves a useful invasion square or only simplifies.',
        themes: ['open-file', 'rook-activity'],
        maxScore: 10
      }
    ],
    completionCriteria: {
      minimumScorePercent: 70,
      requiredTaskIds: ['open-files-find-file', 'open-files-choose-entry']
    }
  },
  {
    id: 'imbalances',
    title: 'Imbalances',
    level: 'intermediate',
    sourceInspiration: ['imbalance-based planning', 'candidate-plan comparison'],
    themes: ['minor-piece-quality', 'weak-squares', 'initiative', 'trades'],
    lessonSummary:
      "Compare the position features that are not equal, then choose a plan that improves your best asset or reduces the opponent's.",
    tasks: [
      {
        id: 'imbalances-compare-pieces',
        type: 'find-theme',
        title: 'Compare Minor Pieces',
        prompt: 'Identify which minor piece has better prospects and which pawn structure explains it.',
        themes: ['minor-piece-quality', 'structure'],
        maxScore: 10
      },
      {
        id: 'imbalances-choose-trade',
        type: 'choose-plan',
        title: 'Trade or Preserve',
        prompt: 'Choose whether a trade improves your main imbalance or helps the opponent solve it.',
        themes: ['trades', 'weak-squares'],
        maxScore: 10
      },
      {
        id: 'imbalances-calculate-plan',
        type: 'calculate-line',
        title: 'Calculate the Plan',
        prompt: 'List candidate moves, calculate the forcing reply, and evaluate the resulting imbalance.',
        themes: ['initiative', 'candidate-moves'],
        maxScore: 10
      }
    ],
    completionCriteria: {
      minimumScorePercent: 75,
      requiredTaskIds: ['imbalances-compare-pieces', 'imbalances-choose-trade', 'imbalances-calculate-plan']
    }
  },
  {
    id: 'basic-endgames',
    title: 'Basic Endgames',
    level: 'beginner',
    sourceInspiration: ['level-based endgame practice', 'drill and review loop'],
    themes: ['opposition', 'king-activity', 'passed-pawn', 'rook-activity'],
    lessonSummary:
      'Practice the endgame ideas most likely to decide club games: active kings, opposition, passed pawns, and active rooks.',
    tasks: [
      {
        id: 'basic-endgames-opposition',
        type: 'endgame-drill',
        title: 'Win the Opposition',
        prompt: 'Use kings only to take or yield the opposition at the right moment.',
        themes: ['opposition', 'king-activity'],
        maxScore: 10
      },
      {
        id: 'basic-endgames-passed-pawn',
        type: 'endgame-drill',
        title: 'Create a Passed Pawn',
        prompt: 'Choose the pawn move that creates a passer without allowing an immediate blockade.',
        themes: ['passed-pawn', 'king-activity'],
        maxScore: 10
      },
      {
        id: 'basic-endgames-rook-activity',
        type: 'choose-plan',
        title: 'Activate the Rook',
        prompt: 'Choose the rook placement that checks, attacks pawns, or cuts off the king.',
        themes: ['rook-activity'],
        maxScore: 10
      }
    ],
    completionCriteria: {
      minimumScorePercent: 70,
      requiredTaskIds: ['basic-endgames-opposition', 'basic-endgames-passed-pawn']
    }
  },
  {
    id: 'alien-gambit-mastery',
    title: 'Alien Gambit Mastery',
    level: 'beginner',
    sourceInspiration: ['critical-position training', 'practical attack and defense'],
    themes: ['initiative', 'king-safety', 'forcing-moves', 'development', 'counterplay'],
    lessonSummary: 'Learn the f7 idea as White, neutralize it as Black, and recognize when the attack is practical rather than forced.',
    tasks: [
      { id: 'alien-recognize', type: 'choose-plan', title: 'Recognize the Trigger', prompt: 'What makes the Alien Gambit sacrifice on f7 available?', themes: ['initiative', 'forcing-moves'], maxScore: 10, choices: [{ id: 'hook', label: 'Black has played ...h6 and the knight can take f7 with tempo' }, { id: 'random', label: 'Any time the knight reaches g5' }], correctChoiceId: 'hook', hint: 'Look for the pawn move that chases the knight.', teachingPoint: 'The ...h6 hook is the practical trigger; without it, White should usually develop instead.' },
      { id: 'alien-white-plan', type: 'choose-plan', title: 'Continue the Attack', prompt: 'After the sacrifice, what is White’s priority?', themes: ['initiative', 'king-safety'], maxScore: 10, choices: [{ id: 'checks', label: 'Use forcing checks and develop with tempo' }, { id: 'queenless', label: 'Trade queens immediately and simplify' }], correctChoiceId: 'checks', hint: 'White is down material and needs activity.', teachingPoint: 'The compensation is initiative; drifting or simplifying usually ends the attack.' },
      { id: 'alien-black-plan', type: 'choose-plan', title: 'Defend the Alien', prompt: 'What should Black do before chasing the knight?', themes: ['king-safety', 'development'], maxScore: 10, choices: [{ id: 'develop', label: 'Develop, cover f7, and avoid creating the ...h6 hook' }, { id: 'pawnhunt', label: 'Chase the knight with every available pawn move' }], correctChoiceId: 'develop', hint: 'Coordination matters more than winning a tempo.', teachingPoint: 'Calm development and f7 control reduce the attack without opening more lines.' }
    ],
    completionCriteria: { minimumScorePercent: 70, requiredTaskIds: ['alien-recognize', 'alien-white-plan', 'alien-black-plan'] }
  }
];

export function validateCurriculumModule(module: CurriculumModule): CurriculumValidationResult {
  const errors: string[] = [];

  if (!module.id.trim()) {
    errors.push('Module id is required.');
  }

  if (!module.title.trim()) {
    errors.push('Module title is required.');
  }

  if (module.sourceInspiration.length === 0) {
    errors.push('At least one source inspiration is required.');
  }

  if (module.themes.length === 0) {
    errors.push('At least one theme is required.');
  }

  if (!module.lessonSummary.trim()) {
    errors.push('Lesson summary is required.');
  }

  if (module.tasks.length === 0) {
    errors.push('At least one task is required.');
  }

  const taskIds = module.tasks.map((task) => task.id);
  const taskIdSet = new Set(taskIds);

  if (taskIdSet.size !== taskIds.length) {
    errors.push('Task ids must be unique.');
  }

  for (const task of module.tasks) {
    if (!task.id.trim()) {
      errors.push('Task id is required.');
    }

    if (!validTaskTypes.has(task.type)) {
      errors.push(`Unsupported task type: ${task.type}.`);
    }

    if (!task.title.trim()) {
      errors.push(`Task ${task.id || '(missing id)'} title is required.`);
    }

    if (!task.prompt.trim()) {
      errors.push(`Task ${task.id || '(missing id)'} prompt is required.`);
    }

    if (task.maxScore <= 0) {
      errors.push(`Task ${task.id || '(missing id)'} maxScore must be greater than 0.`);
    }
  }

  if (
    module.completionCriteria.minimumScorePercent < 0 ||
    module.completionCriteria.minimumScorePercent > 100
  ) {
    errors.push('Completion minimum score percent must be between 0 and 100.');
  }

  for (const requiredTaskId of module.completionCriteria.requiredTaskIds) {
    if (!taskIdSet.has(requiredTaskId)) {
      errors.push(`Completion criteria references unknown task id: ${requiredTaskId}.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function calculateModuleProgress(
  module: CurriculumModule,
  taskProgress: CurriculumTaskProgress[]
): CurriculumModuleProgress {
  const progressByTaskId = new Map(taskProgress.map((progress) => [progress.taskId, progress]));
  const totalTasks = module.tasks.length;
  const completedTasks = module.tasks.filter((task) => progressByTaskId.get(task.id)?.completed).length;
  const possibleScore = module.tasks.reduce((sum, task) => sum + task.maxScore, 0);
  const earnedScore = module.tasks.reduce((sum, task) => {
    const progress = progressByTaskId.get(task.id);
    return sum + Math.min(Math.max(progress?.score ?? 0, 0), task.maxScore);
  }, 0);
  const missingRequiredTaskIds = module.completionCriteria.requiredTaskIds.filter(
    (taskId) => !progressByTaskId.get(taskId)?.completed
  );
  const completionPercent = percentage(completedTasks, totalTasks);
  const scorePercent = percentage(earnedScore, possibleScore);
  const requiredTasksMet = missingRequiredTaskIds.length === 0;
  const minimumScoreMet = scorePercent >= module.completionCriteria.minimumScorePercent;

  return {
    moduleId: module.id,
    totalTasks,
    completedTasks,
    completionPercent,
    earnedScore,
    possibleScore,
    scorePercent,
    requiredTasksMet,
    minimumScoreMet,
    completed: requiredTasksMet && minimumScoreMet,
    missingRequiredTaskIds
  };
}

function percentage(value: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
