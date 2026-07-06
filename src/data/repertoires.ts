import type { RepertoireLine } from '../features/openings/types';

export const starterRepertoires: RepertoireLine[] = [
  {
    id: 'white-vienna-main',
    side: 'white',
    name: 'Vienna Game: Main Development Plan',
    eco: 'C26',
    movesSan: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Nf3', 'Be7'],
    tags: ['vienna', 'king-pawn', 'attacking'],
    themeTags: ['development', 'king-safety', 'open-files', 'initiative'],
    difficulty: 'beginner',
    modelPositionPly: 10,
    explanation: 'Develop the queen knight early, use f4 to create initiative, then catch up on development before attacking.',
    middlegameIdeas: [
      {
        title: 'Build the attack after development',
        summary: 'Use the open f-file and central lead to improve pieces before looking for kingside pressure.',
        planMoves: ['O-O', 'd3', 'Qe1'],
        themes: ['development', 'king-safety', 'open-files', 'initiative'],
        warning: 'The f-pawn push is only useful if e4 stays defended and the king gets safe quickly.'
      }
    ],
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
    id: 'white-vienna-gambit-theory',
    side: 'white',
    name: 'Vienna Gambit: Queen Pressure Branch',
    eco: 'C29',
    movesSan: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Qf3', 'Nxc3'],
    tags: ['vienna', 'king-pawn', 'gambit'],
    themeTags: ['development', 'king-safety', 'open-files', 'initiative'],
    difficulty: 'theory',
    parentLineId: 'white-vienna-main',
    modelPositionPly: 10,
    explanation: 'This sharper Vienna branch asks White to prove compensation with quick queen pressure and fast development.',
    middlegameIdeas: [
      {
        title: 'Turn queen pressure into development',
        summary: 'Use Qf3 to question the knight, then regain time by developing pieces toward the center and king.',
        planMoves: ['bxc3', 'd4', 'Bd3'],
        themes: ['development', 'open-files', 'initiative'],
        warning: 'Do not keep moving the queen while the kingside pieces are still asleep.'
      }
    ]
  },
  {
    id: 'white-london-solid',
    side: 'white',
    name: 'London System: Solid Middlegame Setup',
    eco: 'D02',
    movesSan: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'Bd6', 'Bg3', 'O-O', 'Bd3', 'b6'],
    tags: ['london', 'queen-pawn', 'structure'],
    themeTags: ['pawn-chain', 'pawn-break', 'weak-squares', 'minor-piece-quality'],
    difficulty: 'beginner',
    modelPositionPly: 12,
    explanation: 'Build the light-square bishop setup before locking in the e-pawn structure, then prepare a steady central break.',
    middlegameIdeas: [
      {
        title: 'Keep the chain flexible',
        summary: 'Finish development, castle, and prepare c3 or e4 only when the pieces can support the pawn break.',
        planMoves: ['O-O', 'Nbd2', 'c3'],
        themes: ['pawn-chain', 'pawn-break', 'weak-squares', 'minor-piece-quality'],
        warning: 'An early e4 can leave d4 weak, and Black ideas with ...Qb6 can pressure b2.'
      }
    ],
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
    id: 'white-london-qb6-theory',
    side: 'white',
    name: 'London System: Meet ...Qb6',
    eco: 'D02',
    movesSan: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Qb6', 'Qb3', 'c4'],
    tags: ['london', 'queen-pawn', 'structure'],
    themeTags: ['pawn-chain', 'pawn-break', 'weak-squares', 'minor-piece-quality'],
    difficulty: 'theory',
    parentLineId: 'white-london-solid',
    modelPositionPly: 10,
    explanation: 'Black attacks b2 early, so White learns to answer the queen pressure without abandoning the London structure.',
    middlegameIdeas: [
      {
        title: 'Answer pressure without panic',
        summary: 'Trade queens if offered or support b3, then keep building toward Nbd2 and e4 when the center is ready.',
        planMoves: ['Qxb6', 'axb6', 'Nbd2'],
        themes: ['pawn-chain', 'weak-squares', 'minor-piece-quality'],
        warning: 'Ignoring b2 can lose material, but chasing the queen too much can delay development.'
      }
    ]
  },
  {
    id: 'black-sicilian-basic',
    side: 'black',
    name: 'Sicilian Defense: Open Sicilian Development Plan',
    eco: 'B20',
    movesSan: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e6'],
    tags: ['sicilian', 'king-pawn', 'counterplay'],
    themeTags: ['open-files', 'dynamic-advantage', 'development', 'king-safety'],
    difficulty: 'beginner',
    modelPositionPly: 12,
    explanation: 'Challenge White from the flank, trade the c-pawn for central influence, and develop before using the c-file.',
    middlegameIdeas: [
      {
        title: 'Use the c-file after castling',
        summary: 'Complete development with ...Be7 and ...O-O, then place a rook on c8 and look for queenside counterplay.',
        planMoves: ['Be7', 'O-O', 'Qc7'],
        themes: ['open-files', 'dynamic-advantage', 'development', 'king-safety'],
        warning: 'Pawn hunting before castling can leave Black behind in a sharp open Sicilian.'
      }
    ],
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
    id: 'black-sicilian-dragon-theory',
    side: 'black',
    name: 'Sicilian Dragon: Bishop on g7',
    eco: 'B70',
    movesSan: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7'],
    tags: ['sicilian', 'king-pawn', 'dragon'],
    themeTags: ['open-files', 'dynamic-advantage', 'development', 'king-safety'],
    difficulty: 'theory',
    parentLineId: 'black-sicilian-basic',
    modelPositionPly: 12,
    explanation: 'The Dragon setup puts the bishop on the long diagonal and asks Black to balance speed, safety, and counterplay.',
    middlegameIdeas: [
      {
        title: 'Counter through the long diagonal',
        summary: 'Castle, connect rooks, and use the c-file and g7 bishop to pressure White central and queenside squares.',
        planMoves: ['O-O', 'Nc6', 'Rc8'],
        themes: ['open-files', 'dynamic-advantage', 'king-safety'],
        warning: 'The Dragon can become dangerous for both sides if Black delays castling.'
      }
    ]
  },
  {
    id: 'black-caro-kann-main',
    side: 'black',
    name: 'Caro-Kann: Classical Active Structure',
    eco: 'B12',
    movesSan: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6'],
    tags: ['caro-kann', 'king-pawn', 'solid'],
    themeTags: ['pawn-break', 'minor-piece-quality', 'development', 'pawn-chain'],
    difficulty: 'beginner',
    modelPositionPly: 12,
    explanation: 'Use the c6-d5 structure to contest the center while developing the light-square bishop actively.',
    middlegameIdeas: [
      {
        title: 'Stay solid but active',
        summary: 'Develop the kingside, support the bishop, and prepare ...c5 or ...e5 when your pieces are ready.',
        planMoves: ['e6', 'Nd7', 'Ngf6'],
        themes: ['pawn-break', 'minor-piece-quality', 'development', 'pawn-chain'],
        warning: 'Passive development lets White build space without being challenged.'
      }
    ],
    moveExplanations: [
      { moveIndex: 1, principle: 'prepare break', summary: 'The c-pawn supports d5 so Black can challenge the center with a firm base.' },
      { moveIndex: 5, principle: 'exchange', summary: 'Trading in the center clarifies the structure and gives Black simple development.' },
      { moveIndex: 7, principle: 'develop outside chain', summary: 'The bishop becomes active before e6 builds the compact pawn shell.' }
    ],
    commonMistakes: [
      { moveIndex: 5, principle: 'timing', summary: 'Ignoring the central tension can let White choose a more comfortable structure.' },
      { moveIndex: 7, principle: 'piece quality', summary: 'Trapping the bishop behind e6 too early reduces Black light-square control.' }
    ]
  },
  {
    id: 'black-caro-advance-theory',
    side: 'black',
    name: 'Caro-Kann Advance: Challenge the Chain',
    eco: 'B12',
    movesSan: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5'],
    tags: ['caro-kann', 'king-pawn', 'advance'],
    themeTags: ['pawn-break', 'minor-piece-quality', 'development', 'pawn-chain'],
    difficulty: 'theory',
    parentLineId: 'black-caro-kann-main',
    modelPositionPly: 10,
    explanation: 'Against the Advance, Black develops the bishop first and then attacks the d4 base of White pawn chain.',
    middlegameIdeas: [
      {
        title: 'Attack the base of the chain',
        summary: 'Use ...c5 to pressure d4, develop smoothly, and trade when it improves the minor pieces.',
        planMoves: ['Nc6', 'Qb6', 'Nge7'],
        themes: ['pawn-break', 'minor-piece-quality', 'development', 'pawn-chain'],
        warning: 'If Black only defends passively, White keeps the space advantage for free.'
      }
    ]
  }
];
