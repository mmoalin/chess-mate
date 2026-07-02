import type { RepertoireLine } from '../features/openings/types';

export const starterRepertoires: RepertoireLine[] = [
  {
    id: 'white-vienna-main',
    side: 'white',
    name: 'Vienna Game: Main Development',
    eco: 'C26',
    movesSan: ['e4', 'e5', 'Nc3', 'Nf6', 'f4'],
    tags: ['vienna', 'king-pawn', 'attacking'],
    themeTags: ['center-control', 'initiative', 'minor-piece-quality'],
    explanation: 'Develop the queen knight early and prepare f4 pressure against Black center.',
    moveExplanations: [
      { moveIndex: 0, principle: 'contest center', summary: 'Claim central space so both bishops and the queen knight can develop naturally.' },
      { moveIndex: 2, principle: 'develop', summary: 'The knight supports e4, watches d5, and keeps the f-pawn free for active play.' },
      { moveIndex: 4, principle: 'create threat', summary: 'The f-pawn challenges Black before the position settles into quiet symmetry.' }
    ],
    commonMistakes: [
      { moveIndex: 2, principle: 'avoid drift', summary: 'Early queen moves usually give Black easy developing tempi.' },
      { moveIndex: 4, principle: 'prepare breaks', summary: 'Pushing without enough piece support can leave e4 and the king exposed.' }
    ]
  },
  {
    id: 'white-london-solid',
    side: 'white',
    name: 'London System: Solid Setup',
    eco: 'D02',
    movesSan: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3'],
    tags: ['london', 'queen-pawn', 'structure'],
    themeTags: ['pawn-chain', 'minor-piece-quality', 'weak-squares'],
    explanation: 'Build the light-square bishop setup before locking in the e-pawn structure.',
    moveExplanations: [
      { moveIndex: 0, principle: 'contest center', summary: 'The d-pawn takes space and prepares a reliable development pattern.' },
      { moveIndex: 2, principle: 'improve worst piece', summary: 'The bishop leaves the pawn chain before e3 closes its natural diagonal.' },
      { moveIndex: 4, principle: 'build structure', summary: 'The e-pawn supports d4 and gives the king a calm route to safety.' }
    ],
    commonMistakes: [
      { moveIndex: 2, principle: 'piece quality', summary: 'Locking the bishop inside the chain makes later plans feel cramped.' },
      { moveIndex: 6, principle: 'finish development', summary: 'Starting flank attacks before the kingside pieces are out weakens the setup.' }
    ]
  },
  {
    id: 'black-sicilian-basic',
    side: 'black',
    name: 'Sicilian Defense: Open Sicilian Start',
    eco: 'B20',
    movesSan: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4'],
    tags: ['sicilian', 'king-pawn', 'counterplay'],
    themeTags: ['center-control', 'open-files', 'dynamic-advantage'],
    explanation: 'Challenge White from the flank and trade the c-pawn for central influence.',
    moveExplanations: [
      { moveIndex: 1, principle: 'contest center', summary: 'The c-pawn fights d4 from the side and keeps Black from mirroring White.' },
      { moveIndex: 3, principle: 'stabilize center', summary: 'The d-pawn supports c5 and prepares development without surrendering central squares.' },
      { moveIndex: 5, principle: 'open file', summary: 'Trading on d4 gives Black a half-open c-file for later rook activity.' }
    ],
    commonMistakes: [
      { moveIndex: 3, principle: 'king safety', summary: 'Chasing pawns before developing can leave Black behind in a sharp open game.' },
      { moveIndex: 5, principle: 'file play', summary: 'Recapturing too slowly lets White keep a space edge without pressure.' }
    ]
  },
  {
    id: 'black-caro-kann-main',
    side: 'black',
    name: 'Caro-Kann: Classical Development',
    eco: 'B12',
    movesSan: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],
    tags: ['caro-kann', 'king-pawn', 'solid'],
    themeTags: ['pawn-chain', 'exchanges', 'minor-piece-quality'],
    explanation: 'Use the c6-d5 structure to contest the center while keeping the position stable.',
    moveExplanations: [
      { moveIndex: 1, principle: 'prepare break', summary: 'The c-pawn supports d5 so Black can challenge the center with a firm base.' },
      { moveIndex: 5, principle: 'exchange', summary: 'Trading in the center clarifies the structure and gives Black simple development.' },
      { moveIndex: 7, principle: 'develop outside chain', summary: 'The bishop becomes active before e6 builds the compact pawn shell.' }
    ],
    commonMistakes: [
      { moveIndex: 5, principle: 'timing', summary: 'Ignoring the central tension can let White choose a more comfortable structure.' },
      { moveIndex: 7, principle: 'piece quality', summary: 'Trapping the bishop behind e6 too early reduces Black light-square control.' }
    ]
  }
];
