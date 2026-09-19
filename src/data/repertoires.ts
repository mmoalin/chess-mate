import type { RepertoireLine } from '../features/openings/types';
import { whiteCourseLines } from './whiteOpeningCourses';

export const legacyStarterRepertoires: RepertoireLine[] = [
  {
    id: 'white-alien-gambit-main',
    side: 'white',
    name: 'Alien Gambit: f7 Attack',
    eco: 'B15',
    movesSan: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Ng5', 'h6', 'Nxf7'],
    tags: ['alien-gambit', 'caro-kann', 'gambit', 'attacking'],
    themeTags: ['initiative', 'king-safety', 'forcing-moves', 'development'],
    difficulty: 'beginner',
    modelPositionPly: 10,
    practicalAssessment: 'practical',
    explanation: 'Invite ...h6, then use the knight sacrifice on f7 only when development and forcing checks justify the material investment.',
    middlegameIdeas: [{
      title: 'Attack before the king consolidates',
      summary: 'Bring the bishop to c4, use the open lines, and keep checking before Black can develop and secure the king.',
      planMoves: ['Bc4', 'e6', 'Qe2'],
      themes: ['initiative', 'king-safety', 'forcing-moves'],
      warning: 'The sacrifice is a practical weapon, not a forced win; if the attack disappears, stop sacrificing and seek compensation.'
    }],
    moveExplanations: [
      { moveIndex: 8, principle: 'create a hook', summary: 'Ng5 makes ...h6 uncomfortable and prepares the f7 idea.' },
      { moveIndex: 10, principle: 'force the king', summary: 'Nxf7 is the signature sacrifice: play forcing moves while Black is uncoordinated.' }
    ],
    commonMistakes: [
      { moveIndex: 8, principle: 'do not rush', summary: 'If Black does not weaken f7, develop or reroute the knight instead of sacrificing automatically.' },
      { moveIndex: 10, principle: 'calculate checks', summary: 'After Nxf7, every attacking move must be checked for a real continuation.' }
    ],
    criticalPositions: [{
      id: 'alien-white-sacrifice-trigger', lineId: 'white-alien-gambit-main', ply: 10,
      fen: 'rnbqkb1r/pp2ppp1/2p2n1p/6N1/3P4/8/PPP2PPP/R1BQKBNR w KQkq - 0 6',
      prompt: 'Black has played ...h6. Is the Alien sacrifice ready?', expectedMoves: ['Nxf7'],
      themes: ['initiative', 'forcing-moves'], hint: 'The knight has been chased to the square that attacks f7.',
      teachingPoint: 'Nxf7 is the thematic practical sacrifice, but the compensation depends on continuing with forcing development.'
    }]
  },
  {
    id: 'white-alien-gambit-decline',
    side: 'white',
    name: 'Alien Gambit: No ...h6',
    eco: 'B15',
    movesSan: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Ng5', 'Bf5', 'Bc4'],
    tags: ['alien-gambit', 'caro-kann', 'gambit'],
    themeTags: ['development', 'initiative', 'king-safety'],
    difficulty: 'theory',
    parentLineId: 'white-alien-gambit-main',
    modelPositionPly: 10,
    practicalAssessment: 'playable',
    branchPurpose: 'Shows White how to keep the initiative when Black refuses to create the f7 hook.',
    explanation: 'Without ...h6, keep the knight and develop actively rather than forcing the sacrifice.',
    middlegameIdeas: [{ title: 'Keep the pieces aimed at f7', summary: 'Develop the bishop and queen while preserving the knight as an attacking piece.', planMoves: ['Bc4', 'e6', 'Qe2'], themes: ['development', 'initiative'] }]
  },
  {
    id: 'black-alien-gambit-defense',
    side: 'black',
    name: 'Alien Gambit: Calm Defense',
    eco: 'B15',
    movesSan: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Ng5', 'Nbd7', 'Bc4', 'e6'],
    tags: ['alien-gambit', 'caro-kann', 'defense'],
    themeTags: ['king-safety', 'development', 'counterplay', 'minor-piece-quality'],
    difficulty: 'beginner',
    modelPositionPly: 9,
    practicalAssessment: 'equal',
    explanation: 'Do not help the attack with ...h6. Develop, cover f7, and use ...c5 or ...e6 to challenge White’s center.',
    middlegameIdeas: [{ title: 'Let the attack run out', summary: 'Keep f7 covered, develop the queenside knight, and challenge the center before chasing the knight.', planMoves: ['Nbd7', 'Bc4', 'e6', 'Qe2', 'c5'], themes: ['king-safety', 'development', 'counterplay'], warning: 'Grabbing the knight immediately can open lines for White; prioritize coordination.' }],
    moveExplanations: [{ moveIndex: 9, principle: 'avoid the hook', summary: 'Nbd7 develops and protects key squares without giving White the desired ...h6 tempo.' }],
    commonMistakes: [{ moveIndex: 9, principle: 'do not chase blindly', summary: '...h6 invites Nxf7 and gives White the practical attack.' }],
    criticalPositions: [{
      id: 'alien-black-defense-choice', lineId: 'black-alien-gambit-defense', ply: 9,
      fen: 'rnbqkb1r/pp2pppp/2p2n2/6N1/3P4/8/PPP2PPP/R1BQKBNR b KQkq - 2 5',
      prompt: 'White has played Ng5. Choose a calm defensive plan before the f7 sacrifice is enabled.', expectedMoves: ['Nbd7'],
      themes: ['king-safety', 'development'], hint: 'Develop a piece and keep f7 protected without creating a target.',
      teachingPoint: 'Nbd7 is a practical defensive move: it develops, supports the center, and avoids the ...h6 hook.'
    }]
  },
  {
    id: 'black-alien-gambit-accepted',
    side: 'black',
    name: 'Alien Gambit: After Nxf7',
    eco: 'B15',
    movesSan: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Ng5', 'h6', 'Nxf7', 'Kxf7'],
    tags: ['alien-gambit', 'caro-kann', 'defense', 'tactics'],
    themeTags: ['king-safety', 'counterplay', 'development'],
    difficulty: 'theory',
    parentLineId: 'black-alien-gambit-defense',
    modelPositionPly: 11,
    practicalAssessment: 'playable',
    branchPurpose: 'Teaches Black to accept the material only after checking whether the king can survive the forcing continuation.',
    explanation: 'If you take on f7, expect checks and rapid development; move the king deliberately and return to coordination.',
    middlegameIdeas: [{ title: 'Survive, then consolidate', summary: 'After the king move, develop with tempo and trade attacking pieces whenever safe.', planMoves: ['Kxf7', 'Bc4', 'e6'], themes: ['king-safety', 'development', 'counterplay'], warning: 'Material is not enough if the king remains exposed to checks.' }]
  },
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
        summary: 'Move the bishop first, castle, and use the open f-file and central lead to build kingside pressure.',
        planMoves: ['Be2', 'Nc6', 'O-O'],
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
    ],
    deviationPolicies: [
      { ply: 1, category: 'new-branch', guidance: 'Black declined 1...e5. Keep the e4 center, develop naturally, and treat the result as a new opening branch rather than a failed Vienna.' },
      { ply: 3, category: 'harmless', guidance: 'Black chose a different setup. Protect e4, finish development, and only play f4 when the center is stable.' }
    ],
    criticalPositions: [
      {
        id: 'vienna-f4-trigger', lineId: 'white-vienna-main', ply: 4,
        fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 3',
        prompt: 'Black has developed naturally. Choose the move that creates the Vienna initiative.', expectedMoves: ['f4'], acceptableMoves: ['Nf3'],
        themes: ['initiative', 'center-control'], hint: 'Challenge e5 before the position becomes quiet.',
        teachingPoint: 'f4 is the thematic break, but normal development remains playable when you prefer less risk.'
      },
      {
        id: 'vienna-central-capture', lineId: 'white-vienna-main', ply: 6,
        fen: 'rnbqkb1r/ppp2ppp/5n2/3pp3/4PP2/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 4',
        prompt: 'Black struck with ...d5. Resolve the center before continuing the attack.', expectedMoves: ['fxe5'],
        themes: ['calculation', 'center-control'], hint: 'The e5 pawn is the anchor of Black center.',
        teachingPoint: 'Opening aggression works only when forcing central replies are calculated first.'
      }
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
        summary: 'Use Qf3 to question the knight, then regain time by rebuilding the center and developing pieces.',
        planMoves: ['bxc3', 'Nc6', 'd4'],
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
        planMoves: ['O-O', 'Bb7', 'Nbd2'],
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
        planMoves: ['O-O', 'Be7', 'Be3', 'O-O', 'Qd2', 'Qc7'],
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
        planMoves: ['Be2', 'O-O', 'O-O', 'Nc6', 'Qd2', 'Bd7'],
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
        planMoves: ['h5', 'Bh7', 'Nf3', 'e6'],
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
    ],
    deviationPolicies: [
      { ply: 2, category: 'central-challenge', guidance: 'White did not play d4. Continue with ...d5 when it is sound, develop the light bishop before ...e6, and avoid storing a separate branch for every quiet move.' },
      { ply: 4, category: 'harmless', guidance: 'White chose a different development order. Maintain the c6–d5 center and develop the light bishop actively before closing it in.' }
    ],
    criticalPositions: [
      {
        id: 'caro-center-resolution', lineId: 'black-caro-kann-main', ply: 5,
        fen: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq - 1 3',
        prompt: 'White has defended the center. Choose the Caro-Kann structural decision.', expectedMoves: ['dxe4'], acceptableMoves: ['Nf6'],
        themes: ['center-control', 'pawn-structure'], hint: 'Clarify e4 before developing the bishop outside the chain.',
        teachingPoint: 'The exchange makes the active bishop development possible; ...Nf6 is playable but belongs to a different structure.'
      },
      {
        id: 'caro-bishop-development', lineId: 'black-caro-kann-main', ply: 7,
        fen: 'rnbqkbnr/pp2pppp/2p5/8/3PN3/8/PPP2PPP/R1BQKBNR b KQkq - 0 4',
        prompt: 'Develop the light-squared bishop before building the compact pawn shell.', expectedMoves: ['Bf5'],
        themes: ['development', 'minor-piece-quality'], hint: 'Do not trap the bishop behind ...e6.',
        teachingPoint: 'Active piece placement is what makes the Caro-Kann solid rather than passive.'
      }
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
        planMoves: ['O-O', 'Nc6', 'c3', 'Qb6'],
        themes: ['pawn-break', 'minor-piece-quality', 'development', 'pawn-chain'],
        warning: 'If Black only defends passively, White keeps the space advantage for free.'
      }
    ]
  }
];
export const starterRepertoires: RepertoireLine[] = [...legacyStarterRepertoires, ...whiteCourseLines];
