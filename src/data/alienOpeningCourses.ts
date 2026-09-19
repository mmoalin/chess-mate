import { buildChapter, moves, scenario, type CourseChapter } from './courseBuilder';
import type { ConceptDrill } from '../domain/repertoire/types';

const base: CourseChapter['opening'] = [
  ['e4', 'Occupy the centre and open the king bishop.'], ['c6', 'Black prepares the Caro-Kann centre with …d5.'],
  ['d4', 'Build a broad pawn centre.'], ['d5', 'Black challenges e4 with a supported pawn.'],
  ['Nc3', 'Develop while defending e4. The Nd2 move order can transpose after the knight recaptures e4.'], ['dxe4', 'Black exchanges the d-pawn for your e-pawn.'],
  ['Nxe4', 'Recover the pawn and centralise the knight.'], ['Nf6', 'Black develops with an attack on the e4 knight.'],
  ['Ng5', 'Keep the knight and aim at f7. This move alone does not justify sacrificing it.']
];
const risk = 'Nxf7 is an objectively unsound practical sacrifice: accurate defense leaves Black better. This chapter teaches the chosen gambit, not a forced win or the engine’s best repertoire.';
const accepted: CourseChapter['opening'] = [...base, ['h6', 'Black attacks the knight. A retreat keeps material; the Alien sacrifice deliberately accepts a disadvantage.'], ['Nxf7', risk], ['Kxf7', 'Black accepts a knight for a pawn and loses castling rights.'], ['Nf3', 'Develop the remaining knight; there is no immediate forced mate.']];
const attack = {
  title: 'A piece deficit against an exposed king',
  breaks: risk + ' Develop quickly, calculate checks, and reassess when Black closes the lines.',
  pieces: 'The remaining knight and both bishops must join the queen. Castle when it brings the king to safety and a rook into play.',
  counterplay: 'Black can consolidate with …e6 and …Kg8 or undermine d4 with …c5. Loss of castling rights does not mean the king must be mated.',
  exchanges: 'Trading attackers usually helps the extra piece. An exchange is justified only by a concrete gain or a more defensible position.',
  ending: 'The sacrifice can leave an inferior ending. Seek active pieces and pawn targets; never assume the sacrificed knight returns.'
};

export const alienCourseChapters: CourseChapter[] = [
  {
    family: 'alien-gambit', slug: 'main', lineKey: 'white-alien-gambit-main', order: 0, eco: 'B15', title: 'Alien Gambit: the sacrifice and its real cost',
    opening: [...base, ['h6', 'The knight is attacked. The course now explores the risky f7 sacrifice; a retreat avoids the material investment.']],
    main: [
      ['Nxf7', 'Enter the thematic gambit with its cost understood. ' + risk], ['Kxf7', 'Black accepts the knight and must defend without castling.'],
      ['Nf3', 'Develop the remaining knight before searching for a combination. Nf3 supports d4 and brings a piece toward e5.'], ['e6', 'Black closes the bishop diagonal and prepares to shelter the king.'],
      ['Be3', 'Develop while reinforcing d4. The dark bishop supports the centre against …c5; not every useful attacking move gives check.'], ['Kg8', 'Black moves behind the kingside pawns. The attack needs more pieces, not another unsupported sacrifice.'],
      ['Bd3', 'Develop the king bishop toward h7. Bd3 clears f1 and coordinates with the remaining knight.']
    ], transferAfter: 3,
    transfer: [['c5', 'Black challenges d4 immediately instead of closing the centre.'], ['Bc4+', 'Develop with check while the e6 square is still empty. The check gains a developing tempo, not a forced win.'], ['e6', 'Black blocks the diagonal and prepares to complete development.'], ['Qe2', 'Coordinate the queen with the bishops. Qe2 clears d1 for possible long castling; assess the queenside before committing.']],
    structure: attack, plan: 'Understand the piece deficit, develop the remaining pieces, and check whether the initiative survives Black’s consolidation.',
    misconception: 'The king cannot castle, so White has a forced win.', correction: 'Black can walk the king to safety and keep the extra piece. The attack must be calculated in each position.',
    mistake: { decision: 0, san: 'Qh5', explanation: 'Qh5? puts the queen on a square attacked by the f6 knight: …Nxh5 wins the queen. It does not solve the attack on g5.' }
  },
  {
    family: 'alien-gambit', slug: 'central-counterattack', order: 1, eco: 'B15', title: 'Alien Gambit: meet the immediate …c5 counterattack',
    opening: [...accepted, ['c5', 'Black attacks d4 before White finishes development. This is a strong antidote to the gambit.']],
    main: [
      ['Bc4+', 'Use the open diagonal to develop with check. Make Black answer the bishop before moving the queen.'], ['e6', 'Black blocks the diagonal and keeps the material advantage.'],
      ['Qe2', 'Coordinate the queen and clear d1. Qe2 supports development and keeps both castling choices under consideration.'], ['cxd4', 'Black captures the central pawn. Count material before chasing threats.'],
      ['Bd2', 'Develop the last bishop and clear the queenside for castling. Bd2 prioritises piece activity over an immediate pawn recapture.'], ['Nc6', 'Black develops another piece and reinforces d4.'],
      ['O-O-O', 'Bring the rook to the open d-file. Long castling connects development to pressure on d4, though Black remains better.']
    ], transferAfter: 3,
    transfer: [['Nc6', 'Black develops before capturing d4; the central tension remains.'], ['Be3', 'Develop while defending the central pawn. Be3 adds support to d4 rather than allowing a capture without compensation.'], ['cxd4', 'Black releases the tension and takes d4.'], ['O-O-O', 'Castle into active rook pressure on the d-file. Check Black’s queenside threats before using this plan in a different position.']],
    structure: { ...attack, title: 'The central pawn is a target, not a shield', pieces: 'Bc4+, Qe2 and bishop development clear the way for a rook on d1.', exchanges: 'An immediate central capture can open the d-file; do not assume you can recover d4 without checking its defenders.' },
    plan: 'Develop with the available check, coordinate the queen and bishops, then use the d-file while respecting Black’s extra piece.',
    misconception: 'Ignore …c5 because all Black’s moves must defend f7.', correction: 'Black can counterattack the centre while defending the king. d4 is under real pressure.',
    mistake: { decision: 0, san: 'Ba6', explanation: 'Ba6? leaves the bishop undefended where …bxa6 can capture it. Develop with Bc4+ instead of losing another piece.' }
  },
  {
    family: 'alien-gambit', slug: 'active-bishop', order: 2, eco: 'B15', title: 'Alien Gambit: checks against …Bf5',
    opening: [...accepted, ['Bf5', 'Black develops the bishop without first blocking the c4–f7 diagonal. Check the available forcing moves.']],
    main: [
      ['Ne5+', 'Centralise the remaining knight with check. Ne5+ makes the king choose a square before you develop the bishop.'], ['Kg8', 'Black retreats to g8; the a2–g8 diagonal is now open.'],
      ['Bc4+', 'Develop the bishop with another check. c4 connects a new attacker to the king.'], ['Nd5', 'Black blocks with the knight. A blocked check is not checkmate.'],
      ['Qh5', 'Bring the queen into the attack now that the f6 knight has moved. Qh5 threatens entry on f7; this square was unsafe earlier.'], ['e6', 'Black supports the knight on d5 and blocks the bishop’s diagonal.'],
      ['Qf7+', 'Use the knight’s protection of f7 to enter with check. Calculate the king’s escape rather than announcing mate.']
    ], transferAfter: 1,
    transfer: [['Ke8', 'The king goes back to e8 instead of g8. Bc4 will develop without check in this position.'], ['Bc4', 'Bring the bishop into play without pretending it gives check. The king’s changed square changes the forcing sequence.'], ['e6', 'Black closes the diagonal and supports the centre.'], ['g4', 'Attack the bishop on f5 with a pawn. Here the tempo targets a piece; do not copy this pawn push when the bishop stands elsewhere.']],
    structure: { ...attack, title: 'Checks depend on the king’s actual square', breaks: 'Use forcing development when it exists. The …Ke8 and …Kg8 retreats require different continuations.', pieces: 'Ne5 supports f7; Bc4 uses the diagonal, and Qh5 becomes possible only after the f6 knight leaves.' },
    plan: 'Use checks to develop, then adapt the queen and pawn moves to the king’s retreat and the defenders’ squares.',
    misconception: 'A move that was check in one branch must also be check after another king retreat.', correction: 'Trace the diagonal to the actual king square before naming a check or a threat.',
    mistake: { decision: 0, san: 'Ba6', explanation: 'Ba6? allows …bxa6, losing the bishop without a forcing follow-up. Use Ne5+ to bring the knight into play with check.' }
  },
  {
    family: 'alien-gambit', slug: 'decline', lineKey: 'white-alien-gambit-decline', order: 3, eco: 'B15', title: 'Alien Gambit: keep the knight against …Bf5',
    opening: [...base, ['Bf5', 'Black develops instead of chasing the knight. There is no reason to force a sacrifice.']],
    main: [
      ['Bd3', 'Challenge the active bishop with development. Bd3 offers an exchange while clearing f1.'], ['Bxd3', 'Black exchanges the bishop rather than taking the d4 pawn.'],
      ['Qxd3', 'Recapture with an active queen. Qxd3 restores material and connects the queen to the centre.'], ['h6', 'Only now does Black attack the g5 knight.'],
      ['N5f3', 'Retreat the attacked knight and keep the material. Specify the knight from g5: the other knight can also reach f3.'], ['e6', 'Black prepares the king bishop and supports the central squares.'],
      ['Ne2', 'Develop the remaining knight. Ne2 clears g1 and prepares castling without repeating the f7 sacrifice.']
    ], transferAfter: 1,
    transfer: [['Qxd4', 'Black takes the central pawn instead of exchanging bishops. The f5 bishop is now available.'], ['Bxf5', 'Capture the exposed bishop before trying to save the pawn. Bxf5 changes the material balance with tempo-sensitive tactics.'], ['Qe5+', 'Black checks and attacks the bishop on f5 along the diagonal.'], ['Be4', 'Block the check on e4. This invites …Nxe4, after which the queen and f7 fork require concrete calculation; do not judge the capture in isolation.']],
    structure: { title: 'Normal development when Black avoids the sacrifice', breaks: 'Keep the knight when Black develops. Challenge the centre only after completing development.', pieces: 'Bd3 exchanges an active bishop; after Qxd3 and N5f3, Ne2 develops the remaining knight.', counterplay: '…Qxd4 can take the central pawn, but exposes the f5 bishop to a capture. Calculate checks on e5.', exchanges: 'Bxd3 Qxd3 preserves material and activates the queen. This is a different game from being a piece down.', ending: 'With material intact, active pieces and the central pawn structure guide exchanges; there is no need to manufacture an attack.' },
    plan: 'Challenge the bishop, recapture actively, and retreat the attacked knight instead of sacrificing automatically.',
    misconception: 'Every position after Ng5 requires Nxf7.', correction: 'The opening name is not a tactical justification. Develop and keep the piece in this branch.',
    mistake: { decision: 0, san: 'Nxf7', explanation: 'Nxf7?! gives a knight for a pawn without the …h6 concession. …Kxf7 leaves White trying to justify a piece deficit; Bd3 keeps material and develops.' }
  },
  {
    family: 'alien-gambit', slug: 'nbd7', order: 4, eco: 'B15', title: 'Alien Gambit: develop against …Nbd7',
    opening: [...base, ['Nbd7', 'Black develops without …h6. The extra central defender changes the attacking prospects.']],
    main: [
      ['Bd3', 'Develop the bishop toward the kingside. Keep the g5 knight while bringing other pieces into play.'], ['e6', 'Black closes the diagonal and prepares the king bishop.'],
      ['N1f3', 'Develop the knight from g1. Both knights can reach f3, so identify the one that has not yet developed.'], ['Bd6', 'Black develops toward h2 and prepares castling.'],
      ['Qe2', 'Coordinate the queen and bishop against the centre. Qe2 connects pieces before a pawn break.'], ['h6', 'Black now attacks g5 after building a compact defence.'],
      ['Ne4', 'Retreat to the centre while challenging the d6 bishop. Ne4 preserves material and offers a useful exchange.']
    ], transferAfter: 3,
    transfer: [['Bb4+', 'Black checks instead of developing to d6. Answer the check before following your plan.'], ['c3', 'Block the diagonal with a pawn while supporting d4. c3 makes the bishop choose another square.'], ['Bd6', 'Black retreats to the active diagonal.'], ['O-O', 'Secure the king after answering the check. Castling completes the immediate development plan.']],
    structure: { title: 'Development against a compact defence', breaks: 'Support d4 and complete development before choosing a central break.', pieces: 'Bd3, N1f3 and Qe2 coordinate. The g5 knight can return to e4 when chased.', counterplay: '…Bb4+ interrupts development; …h6 becomes more useful once Black has coordinated the pieces.', exchanges: 'Ne4 can exchange a knight for a bishop or meet …Nxe4 with a recapture. Inspect the pieces that remain.', ending: 'Preserving material leaves a normal middlegame; activate pieces before deciding whether simplification helps.' },
    plan: 'Develop the unused pieces, answer checks, and reroute the g5 knight when Black finally attacks it.',
    misconception: 'The knight on g5 must stay there forever to justify the opening.', correction: 'A central retreat can improve the knight while preserving material. The attack is a possibility, not an obligation.',
    mistake: { decision: 0, san: 'Nxf7', explanation: 'Nxf7?! gives up the knight against a developed defender. …Kxf7 leaves Black the extra piece; develop Bd3 instead of importing the sacrifice automatically.' }
  }
];

const built = alienCourseChapters.map(buildChapter);
// The two existing source records and all their stable checkpoints stay intact.
export const alienCourseLines = built.filter((item) => !['white-alien-gambit-main', 'white-alien-gambit-decline'].includes(item.line.id)).map((item) => item.line);
export const alienCourseLessons = built.map((item) => item.lesson);
export const alienCourseDrills: ConceptDrill[] = built.map((item) => item.drill);
alienCourseDrills.push({
  key: 'concept:alien-gambit-recognition', openingFamilyKey: 'white-alien-gambit-main', title: 'Alien Gambit: recognise the setup before sacrificing',
  principle: 'Only the actual position can justify a sacrifice.', summary: 'The Nd2 move order can transpose, but another Caro-Kann fourth move can lead outside this course.',
  themes: ['move-order', 'development'], depth: 'foundation', order: 30,
  planPrompt: 'How do you handle a changed Caro-Kann move order?',
  planChoices: [{ id: 'position', label: 'Compare the pieces and threats before choosing the Alien plan.', correct: true, feedback: 'Nd2 and Nc3 both transpose when that knight reaches e4; …Bf5 before …Nf6 is a different branch.' }, { id: 'name', label: 'Sacrifice on f7 whenever Black plays the Caro-Kann.', correct: false, feedback: 'Most Caro-Kann positions are not Alien Gambit positions.' }],
  scenarios: [
    scenario('transposition', moves('e4 c6 d4 d5 Nd2 dxe4 Nxe4 Nf6 Ng5 Nbd7'), 'Bd3', 'The knight from d2 reached the same e4 and g5 squares. Develop as in the …Nbd7 chapter.', 'Recognise the identical position despite a different third move.'),
    scenario('outside-course', moves('e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5'), 'Ng3', 'Black developed the bishop before …Nf6. Gain a tempo on it with a knight attack; this is the Classical Caro-Kann, outside the Alien chapters.', 'An opening boundary is not an opponent mistake. Choose a normal developing plan when the required setup has not appeared.')
  ]
});
