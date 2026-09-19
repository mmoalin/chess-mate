import type { ConceptDrill } from '../domain/repertoire/types';
import { whiteCourseDrills, whiteRecognitionDrills } from './whiteOpeningCourses';
import { alienCourseDrills } from './alienOpeningCourses';

const choice = (id: string, label: string, correct: boolean, feedback: string) => ({ id, label, correct, feedback });

export const legacyStarterConceptDrills: ConceptDrill[] = [
  {
    key: 'concept:vienna-f4-timing', openingFamilyKey: 'white-vienna-main', title: 'Time the f-pawn break',
    principle: 'Challenge e5 when the centre is stable',
    summary: 'The Vienna f-pawn is a lever, not an automatic move. Use it when e4 is supported and Black has not created a forcing central problem.',
    themes: ['initiative', 'center-control', 'king-safety'], depth: 'foundation', order: 0,
    planPrompt: 'What must be true before f4 becomes a useful Vienna move?',
    planChoices: [
      choice('stable-centre', 'e4 is supported and the move challenges Black before the position settles.', true, 'Exactly: f4 works because it questions e5 while your centre can absorb the tension.'),
      choice('automatic', 'The opening is called the Vienna, so f4 should be played regardless of Black’s setup.', false, 'Opening ideas are conditional. Check the centre and development before using the lever.'),
      choice('pawn-race', 'You should already be ready to push every kingside pawn.', false, 'The goal is central pressure, not a pawn race with an unsafe king.')
    ],
    scenarios: [
      { id: 'natural-development', setupFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2', opponentMoveUci: 'g8f6', prompt: 'Black develops naturally. Choose how to create or prepare the Vienna initiative.', change: 'Black attacks e4 and has not challenged the centre with ...d5.', preferredMovesUci: ['f2f4'], acceptableMovesUci: ['g1f3'], hint: 'Ask whether e5 can be challenged before Black castles.', teachingPoint: 'f4 is the thematic break; Nf3 is also sound when you prefer to prepare it.', watchFor: 'If Black strikes with ...d5, resolve the centre before continuing the attack.' },
      { id: 'nc6-setup', setupFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2', opponentMoveUci: 'b8c6', prompt: 'Black supports e5 with ...Nc6. Choose a useful continuation without forcing a memorized line.', change: 'The e5 pawn has another defender, so preparation is more valuable.', preferredMovesUci: ['f2f4', 'g1f3'], acceptableMovesUci: ['f1c4'], hint: 'Develop or challenge the centre; both can serve the same attacking plan.', teachingPoint: 'A plan can survive different move orders: f4, Nf3, and Bc4 all contribute to central pressure and development.', watchFor: 'Do not allow a quick ...d5 to hit an unsupported centre.' }
    ]
  },
  {
    key: 'concept:vienna-centre-first', openingFamilyKey: 'white-vienna-main', title: 'Resolve the centre first',
    principle: 'Answer central contact before attacking', summary: 'When Black plays ...d5, the position becomes concrete. Decide the central tension before adding more attackers.',
    themes: ['center-control', 'calculation', 'initiative'], depth: 'foundation', order: 1,
    planPrompt: 'Black challenges your Vienna centre with ...d5. What takes priority?',
    planChoices: [
      choice('resolve', 'Calculate the central captures and decide what happens to e4 and e5.', true, 'Right: a forcing central break outranks a slow attacking move.'),
      choice('ignore', 'Ignore the centre and bring the queen toward the kingside.', false, 'The attack has no foundation if Black can remove or win the central pawns.'),
      choice('flank', 'Start another pawn push on the wing.', false, 'First respond where the position has changed: in the centre.')
    ],
    scenarios: [
      { id: 'direct-d5', setupFen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4PP2/2N5/PPPP2PP/R1BQKBNR b KQkq - 0 3', opponentMoveUci: 'd7d5', prompt: 'Black has played the forcing central break. Choose your response.', change: 'The e5 pawn is now the anchor of Black’s centre and your f-pawn is already committed.', preferredMovesUci: ['f4e5'], acceptableMovesUci: ['d2d3'], hint: 'Look at the pawn that holds Black’s centre together.', teachingPoint: 'fxe5 resolves the tension and keeps the initiative concrete; d3 is quieter but defensible.', watchFor: 'After exchanges, develop quickly instead of trying to recreate the original attack.' },
      { id: 'developing-reply', setupFen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4PP2/2N5/PPPP2PP/R1BQKBNR b KQkq - 0 3', opponentMoveUci: 'b8c6', prompt: 'Black develops instead of breaking immediately. Improve the position while keeping the central plan alive.', change: 'There is no forcing contact yet, but ...d5 remains Black’s thematic reply.', preferredMovesUci: ['g1f3'], acceptableMovesUci: ['f1c4', 'd2d3'], hint: 'Improve a piece and make the centre easier to defend.', teachingPoint: 'Nf3 develops, protects key squares, and makes the coming central break easier to meet.', watchFor: 'Recalculate if ...d5 arrives; do not continue on autopilot.' }
    ]
  },
  {
    key: 'concept:vienna-convert-initiative', openingFamilyKey: 'white-vienna-main', title: 'Convert initiative into development',
    principle: 'Bring pieces before forcing tactics', summary: 'Once the centre changes, use the open lines by developing and castling rather than moving the same attackers repeatedly.',
    themes: ['development', 'king-safety', 'initiative'], depth: 'standard', order: 2,
    planPrompt: 'After the Vienna centre opens, how should you preserve the initiative?',
    planChoices: [
      choice('develop', 'Develop a new piece, secure the king, and only then use the open lines.', true, 'Yes: development turns temporary activity into a sustainable attack.'),
      choice('queen', 'Move the queen repeatedly to search for an immediate threat.', false, 'Queen moves often give Black free developing tempi.'),
      choice('sacrifice', 'Sacrifice material simply because the position is open.', false, 'Open lines help developed pieces; they do not justify an unsupported sacrifice.')
    ],
    scenarios: [
      { id: 'knight-centralizes', setupFen: 'rnbqkb1r/ppp2ppp/5n2/3pP3/4P3/2N5/PPPP2PP/R1BQKBNR b KQkq - 0 4', opponentMoveUci: 'f6e4', prompt: 'Black’s knight centralizes. Find a move that develops while questioning it.', change: 'The centre has opened and Black’s knight occupies e4.', preferredMovesUci: ['g1f3'], acceptableMovesUci: ['d2d3'], hint: 'Bring a new piece into play with tempo.', teachingPoint: 'Nf3 develops and attacks the centralized knight; the move serves both time and coordination.', watchFor: 'Do not chase the knight with pawns if that further weakens your king.' },
      { id: 'black-develops', setupFen: 'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N2N2/PPPP2PP/R1BQKB1R b KQkq - 1 5', opponentMoveUci: 'f8e7', prompt: 'Black prepares to castle. Choose a move that makes your initiative sustainable.', change: 'Black is one move from king safety, so undeveloped pieces must join now.', preferredMovesUci: ['f1e2', 'f1c4'], acceptableMovesUci: ['d2d4'], hint: 'Develop the bishop or use the centre to open it.', teachingPoint: 'Be2 or Bc4 prepares castling and adds a real piece to the position; d4 is a principled central alternative.', watchFor: 'If the attack disappears, finish development instead of manufacturing tactics.' }
    ]
  },
  {
    key: 'concept:caro-resolve-centre', openingFamilyKey: 'black-caro-kann-main', title: 'Choose the Caro-Kann structure',
    principle: 'Clarify the centre with a purpose', summary: 'The central exchange is valuable because it frees the light-squared bishop before ...e6 builds the pawn shell.',
    themes: ['center-control', 'pawn-structure', 'development'], depth: 'foundation', order: 0,
    planPrompt: 'Why does Black often resolve the e4–d5 tension in the Classical Caro-Kann?',
    planChoices: [
      choice('free-bishop', 'It clarifies the structure and creates time to develop the light bishop actively.', true, 'Exactly: the exchange and bishop development are one connected plan.'),
      choice('trade-anything', 'Exchanges are always good for Black regardless of the resulting pieces.', false, 'The point is the resulting structure and bishop activity, not exchanging for its own sake.'),
      choice('win-pawn', 'Black expects to keep the e4 pawn permanently.', false, 'White normally recaptures; Black gains a clear development scheme, not a free pawn.')
    ],
    scenarios: [
      { id: 'nc3-support', setupFen: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3', opponentMoveUci: 'b1c3', prompt: 'White reinforces e4. Choose the structural decision that enables active development.', change: 'White can no longer be pressured by a simple central attack; the tension should be resolved deliberately.', preferredMovesUci: ['d5e4'], acceptableMovesUci: ['g8f6'], hint: 'Ask how the light bishop will get outside the pawn chain.', teachingPoint: '...dxe4 clears the diagonal for ...Bf5; ...Nf6 is playable but can lead to a different structure.', watchFor: 'After White recaptures, develop the bishop before playing ...e6.' },
      { id: 'advance-choice', setupFen: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3', opponentMoveUci: 'e4e5', prompt: 'White advances and closes the centre. Choose active development for the new structure.', change: 'The centre is now a pawn chain, so the plan changes from exchange to attacking its base.', preferredMovesUci: ['c8f5'], acceptableMovesUci: ['c8g4'], hint: 'Develop the light bishop before ...e6 and then challenge d4.', teachingPoint: '...Bf5 preserves the Caro-Kann’s good bishop and prepares pressure on the pawn chain.', watchFor: 'Prepare ...c5 rather than defending passively behind the chain.' }
    ]
  },
  {
    key: 'concept:caro-bishop-first', openingFamilyKey: 'black-caro-kann-main', title: 'Free the good bishop',
    principle: 'Develop outside the chain before ...e6', summary: 'The Caro-Kann is solid because the light bishop becomes active before the compact structure is completed.',
    themes: ['minor-piece-quality', 'development', 'pawn-chain'], depth: 'foundation', order: 1,
    planPrompt: 'Which piece-placement rule keeps the Classical Caro-Kann active?',
    planChoices: [
      choice('bishop-first', 'Develop the light bishop before closing its diagonal with ...e6.', true, 'Correct: this is the structural detail that prevents a passive position.'),
      choice('e6-first', 'Play ...e6 immediately and solve the bishop later.', false, 'That locks the bishop behind its own pawns without gaining anything concrete.'),
      choice('queen-first', 'Move the queen early so the bishop can remain at home.', false, 'The queen does not solve the bishop’s diagonal or improve minor-piece quality.')
    ],
    scenarios: [
      { id: 'recapture-complete', setupFen: 'rnbqkbnr/pp2pppp/2p5/8/3Pp3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 4', opponentMoveUci: 'c3e4', prompt: 'White recaptures in the centre. Develop the piece that defines Black’s setup.', change: 'The e4 pawn is gone and the light bishop has a clear diagonal.', preferredMovesUci: ['c8f5'], acceptableMovesUci: ['g8f6'], hint: 'Use the diagonal before a pawn blocks it.', teachingPoint: '...Bf5 is the active Caro-Kann move; ...Nf6 is sound but postpones the key structural task.', watchFor: 'Meet h4 with a retreat that preserves the bishop rather than trapping it.' },
      { id: 'bishop-questioned', setupFen: 'rn1qkbnr/pp2pppp/2p5/5b2/3PN3/8/PPP2PPP/R1BQKBNR w KQkq - 1 5', opponentMoveUci: 'e4g3', prompt: 'White questions the active bishop. Preserve it without abandoning the structure.', change: 'The bishop is being challenged, but it remains the piece you worked to activate.', preferredMovesUci: ['f5g6'], acceptableMovesUci: ['f5c8'], hint: 'Keep the bishop safe and useful; material is not under threat elsewhere.', teachingPoint: '...Bg6 keeps the bishop active and supports the compact setup that follows.', watchFor: 'If h4–h5 arrives, choose the retreat before the bishop runs out of squares.' }
    ]
  },
  {
    key: 'concept:caro-active-break', openingFamilyKey: 'black-caro-kann-main', title: 'Challenge the pawn chain',
    principle: 'Use ...c5 when development supports it', summary: 'Against the Advance structure, Black must challenge d4 instead of accepting a permanent space disadvantage.',
    themes: ['pawn-break', 'pawn-chain', 'counterplay'], depth: 'standard', order: 2,
    planPrompt: 'What turns the Caro-Kann from solid-but-passive into active counterplay?',
    planChoices: [
      choice('break-base', 'Prepare ...c5 to attack the base of White’s pawn chain.', true, 'Right: the break questions d4 and opens useful lines for Black’s pieces.'),
      choice('wait', 'Keep every pawn fixed and wait for White to attack.', false, 'Without a break, White keeps the space advantage for free.'),
      choice('wing', 'Push kingside pawns before developing.', false, 'The relevant target is the central chain, and king safety still matters.')
    ],
    scenarios: [
      { id: 'be2-development', setupFen: 'rn1qkbnr/pp3ppp/2p1p3/3pPb2/3P4/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 5', opponentMoveUci: 'f1e2', prompt: 'White develops quietly. Strike at the base of the pawn chain.', change: 'White is close to castling and the d4 chain is stable unless Black challenges it.', preferredMovesUci: ['c6c5'], acceptableMovesUci: ['b8d7', 'g8e7'], hint: 'Attack d4 with the pawn that was prepared on move one.', teachingPoint: '...c5 is the thematic equalizing break; development is acceptable when it directly supports that break.', watchFor: 'Do not open the centre before your king and pieces can use the new lines.' },
      { id: 'c3-support', setupFen: 'rn1qkbnr/pp3ppp/4p3/2ppPb2/3P4/5N2/PPP1BPPP/RNBQK2R w KQkq - 0 6', opponentMoveUci: 'c2c3', prompt: 'White reinforces d4 after ...c5. Increase pressure with development.', change: 'The base is defended, so Black needs another attacker rather than a premature exchange.', preferredMovesUci: ['b8c6', 'd8b6'], acceptableMovesUci: ['g8e7'], hint: 'Develop toward d4 or attack it with the queen.', teachingPoint: '...Nc6 and ...Qb6 add pressure while improving Black’s pieces; the break is a plan, not a one-move trick.', watchFor: 'Check b2 tactics, but do not pawn-hunt while your king remains in the centre.' }
    ]
  }
];
export const starterConceptDrills: ConceptDrill[] = [...structuredClone(legacyStarterConceptDrills), ...whiteCourseDrills, ...whiteRecognitionDrills];
// Correct older assessments exposed by the branch verification. Keep the legacy
// snapshot intact so a published starter release can be recognized conservatively.
const centreReply = starterConceptDrills[1].scenarios[1];
Object.assign(centreReply, {
  prompt: 'Black develops with …Nc6. Resolve the central contact before continuing development.',
  change: 'The f-pawn can capture e5 with an attack on the f6 knight.',
  preferredMovesUci: ['f4e5'], acceptableMovesUci: [],
  hint: 'Remove e5 and inspect the knight recapture.',
  teachingPoint: 'fxe5 uses the central contact. After …Nxe5, d4 attacks the knight and prepares e5.'
});
const bishopDevelopment = starterConceptDrills[2].scenarios[1];
bishopDevelopment.preferredMovesUci = ['f1e2'];
bishopDevelopment.teachingPoint = 'Be2 develops safely and prepares castling. Bc4? would place the bishop where …dxc4 can capture it.';
starterConceptDrills[2].scenarios[0].teachingPoint = 'Nf3 develops and reinforces e5. It does not attack the knight on e4; development and central control are the point.';
starterConceptDrills[2].scenarios[0].prompt = 'Black’s knight centralizes. Develop a piece that reinforces your advanced e5 pawn.';
starterConceptDrills[2].scenarios[0].hint = 'The king knight can develop toward the centre and support e5.';
export const preAlienStarterConceptDrills = structuredClone(starterConceptDrills);
starterConceptDrills.push(...alienCourseDrills);
