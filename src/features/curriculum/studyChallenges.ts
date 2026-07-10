import type { CurriculumTask } from './types';

type StudyChallenge = {
  choices: Array<{ id: string; label: string }>;
  correctChoiceId: string;
  hint: string;
  teachingPoint: string;
};

const challenges: Record<string, StudyChallenge> = {
  'alien-recognize': { choices: [{ id: 'hook', label: 'Black has played ...h6 and the knight can take f7 with tempo' }, { id: 'random', label: 'Any time the knight reaches g5' }], correctChoiceId: 'hook', hint: 'Look for the pawn move that chases the knight.', teachingPoint: 'The ...h6 hook is the practical trigger; without it, White should usually develop instead.' },
  'alien-white-plan': { choices: [{ id: 'checks', label: 'Use forcing checks and develop with tempo' }, { id: 'queenless', label: 'Trade queens immediately and simplify' }], correctChoiceId: 'checks', hint: 'White is down material and needs activity.', teachingPoint: 'The compensation is initiative; drifting or simplifying usually ends the attack.' },
  'alien-black-plan': { choices: [{ id: 'develop', label: 'Develop, cover f7, and avoid creating the ...h6 hook' }, { id: 'pawnhunt', label: 'Chase the knight with every available pawn move' }], correctChoiceId: 'develop', hint: 'Coordination matters more than winning a tempo.', teachingPoint: 'Calm development and f7 control reduce the attack without opening more lines.' },
  'opening-principles-explain-development': {
    choices: [
      { id: 'center', label: 'Develop a knight toward the centre and support castling.' },
      { id: 'repeat', label: 'Move the same piece several times to attack immediately.' },
      { id: 'edge', label: 'Push a flank pawn before developing any pieces.' }
    ],
    correctChoiceId: 'center',
    hint: 'Look for the choice that improves a piece and helps your king.',
    teachingPoint: 'Good development controls central squares, brings a new piece into play, and usually makes castling easier.'
  },
  'opening-principles-find-center': {
    choices: [
      { id: 'develop', label: 'Develop a minor piece to an active square.' },
      { id: 'queen', label: 'Bring the queen out early to chase pawns.' },
      { id: 'pawn', label: 'Make a second pawn move without a concrete reason.' }
    ],
    correctChoiceId: 'develop',
    hint: 'Prefer one move that solves more than one opening problem.',
    teachingPoint: 'The best developing moves often influence the centre while preparing king safety.'
  },
  'opening-principles-choose-plan': {
    choices: [
      { id: 'castle', label: 'Castle when the path is safe and development is ready.' },
      { id: 'attack', label: 'Launch a pawn attack while your king is still in the centre.' },
      { id: 'tempo', label: 'Move a developed piece again without a tactical reason.' }
    ],
    correctChoiceId: 'castle',
    hint: 'Ask which plan makes your position safer before starting complications.',
    teachingPoint: 'King safety is a strategic resource. Castling connects the rooks and gets the king out of the centre.'
  },
  'pawn-chains-find-base': {
    choices: [
      { id: 'base', label: 'Target the pawn at the back of the chain.' },
      { id: 'head', label: 'Only attack the most advanced pawn.' },
      { id: 'side', label: 'Ignore the chain and trade your best piece.' }
    ],
    correctChoiceId: 'base',
    hint: 'A chain is often strongest at its head and weakest at its foundation.',
    teachingPoint: 'The base supports the rest of the chain, so attacking it can undermine several pawns at once.'
  },
  'pawn-chains-choose-break': {
    choices: [
      { id: 'break', label: 'Challenge the chain at its base with a timely pawn break.' },
      { id: 'wait', label: 'Close the position permanently and give the opponent space.' },
      { id: 'trade', label: 'Trade your active pawn for no structural gain.' }
    ],
    correctChoiceId: 'break',
    hint: 'The best break questions the structure before it becomes fixed.',
    teachingPoint: 'Pawn breaks are the main way to change a locked structure and create useful targets or open lines.'
  },
  'pawn-chains-model-structure': {
    choices: [
      { id: 'break', label: 'Pause when the break changes which side has space and targets.' },
      { id: 'pieces', label: 'Treat the pawn structure as irrelevant once pieces develop.' },
      { id: 'checks', label: 'Only look for checks, regardless of the structure.' }
    ],
    correctChoiceId: 'break',
    hint: 'The pawn structure tells you which plans will remain available.',
    teachingPoint: 'A pawn break is often the moment the position changes from a manoeuvring game into a concrete one.'
  },
  'open-files-find-file': {
    choices: [
      { id: 'open', label: 'Place a rook on the open or half-open file.' },
      { id: 'closed', label: 'Place the rook behind a blocked pawn chain.' },
      { id: 'edge', label: 'Keep the rook on the edge without an entry square.' }
    ],
    correctChoiceId: 'open',
    hint: 'Heavy pieces want lines they can use.',
    teachingPoint: 'An open file gives a rook access to targets, invasion squares, and sometimes the seventh rank.'
  },
  'open-files-choose-entry': {
    choices: [
      { id: 'seventh', label: 'Double or invade where the rook can attack pawns from behind.' },
      { id: 'corner', label: 'Move the rook to a corner away from targets.' },
      { id: 'trade', label: 'Trade the rook before using the open file.' }
    ],
    correctChoiceId: 'seventh',
    hint: 'Look for an entry square that creates a concrete weakness.',
    teachingPoint: 'Rook activity matters when it attacks something or forces the opponent to defend passively.'
  },
  'open-files-calculate-trade': {
    choices: [
      { id: 'invasion', label: 'Trade only if the resulting position preserves a useful invasion square.' },
      { id: 'automatic', label: 'Trade rooks automatically because simplification is always best.' },
      { id: 'avoid', label: 'Never trade a rook, even when the endgame is clearly better.' }
    ],
    correctChoiceId: 'invasion',
    hint: 'Compare the activity you gain or lose after the exchange.',
    teachingPoint: 'A rook trade is good when it improves the resulting position, not simply because fewer pieces remain.'
  },
  'imbalances-compare-pieces': {
    choices: [
      { id: 'quality', label: 'Identify the minor piece helped by the pawn structure.' },
      { id: 'value', label: 'Assume both minor pieces are equally good in every position.' },
      { id: 'trade', label: 'Trade a piece before identifying the position’s main feature.' }
    ],
    correctChoiceId: 'quality',
    hint: 'Piece value depends on the pawn structure and available squares.',
    teachingPoint: 'The strongest plan usually improves your best piece or removes the opponent’s best asset.'
  },
  'imbalances-choose-trade': {
    choices: [
      { id: 'favour', label: 'Trade when it improves your imbalance or removes their best piece.' },
      { id: 'equal', label: 'Trade whenever the material count is equal.' },
      { id: 'avoid', label: 'Avoid every exchange to keep more pieces on the board.' }
    ],
    correctChoiceId: 'favour',
    hint: 'Exchanges should be judged by whose plan they help.',
    teachingPoint: 'A good trade is strategic: it makes your advantage easier to use or your opponent’s advantage less dangerous.'
  },
  'imbalances-calculate-plan': {
    choices: [
      { id: 'forcing', label: 'Compare candidate moves, starting with forcing replies.' },
      { id: 'first', label: 'Play the first attractive move without checking the reply.' },
      { id: 'random', label: 'Choose a move based only on material count.' }
    ],
    correctChoiceId: 'forcing',
    hint: 'Candidate moves become useful only after you test the opponent’s best response.',
    teachingPoint: 'Calculation and strategic planning work together: first find the forcing line, then evaluate the resulting imbalance.'
  },
  'basic-endgames-opposition': {
    choices: [
      { id: 'opposition', label: 'Take the opposition to force the enemy king to yield ground.' },
      { id: 'rush', label: 'Rush the king forward without considering the move order.' },
      { id: 'edge', label: 'Keep the king away from the action.' }
    ],
    correctChoiceId: 'opposition',
    hint: 'King positions and whose turn it is are the key clues.',
    teachingPoint: 'Opposition is a move-order tool: it lets your king make progress while restricting the other king.'
  },
  'basic-endgames-passed-pawn': {
    choices: [
      { id: 'passer', label: 'Create a passed pawn while keeping it supported and mobile.' },
      { id: 'blockade', label: 'Advance a pawn into a square where it can be blockaded immediately.' },
      { id: 'wait', label: 'Wait indefinitely and let the opponent activate their king.' }
    ],
    correctChoiceId: 'passer',
    hint: 'A passed pawn is strongest when it creates a second problem for the defender.',
    teachingPoint: 'Passed pawns distract the enemy king and can decide an endgame when supported by the king or another pawn.'
  },
  'basic-endgames-rook-activity': {
    choices: [
      { id: 'active', label: 'Put the rook where it gives checks, attacks pawns, or cuts off the king.' },
      { id: 'passive', label: 'Keep the rook behind your own pawns at all costs.' },
      { id: 'trade', label: 'Trade the rook without checking whether the pawn ending is won.' }
    ],
    correctChoiceId: 'active',
    hint: 'Rooks are strongest when they act from a distance.',
    teachingPoint: 'Active rook play often matters more than pawn protection: checks, targets, and king restriction create progress.'
  }
};

export function getStudyChallenge(task: CurriculumTask): StudyChallenge {
  return challenges[task.id] ?? {
    choices: [
      { id: 'learn', label: 'Choose the plan that follows the lesson idea.' },
      { id: 'ignore', label: 'Ignore the position’s main strategic feature.' }
    ],
    correctChoiceId: 'learn',
    hint: 'Look back at the lesson summary and identify the main theme.',
    teachingPoint: 'Strong chess decisions connect a concrete move to a positional goal.'
  };
}
