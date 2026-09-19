import { buildChapter, moves, scenario, type CourseChapter } from './courseBuilder';
import type { ConceptDrill } from '../domain/repertoire/types';

const e4: CourseChapter['opening'] = [['e4', 'Occupy the centre and open both queen and bishop lines.'], ['e5', 'Black takes equal central space.'], ['Nc3', 'Defend e4 while keeping the f-pawn free.']];
const gambit: CourseChapter['opening'] = [...e4, ['Nf6', 'Black develops and attacks e4.'], ['f4', 'Challenge e5; the open lines make development and king safety urgent.']];
const d4: CourseChapter['opening'] = [['d4', 'Claim space and open the c1 bishop.'], ['d5', 'Black establishes a central foothold.'], ['c4', 'Challenge d5 with the c-pawn rather than surrendering the central d-pawn.']];

export const whiteCourseChapters: CourseChapter[] = [
  {
    slug: 'accepted', family: 'vienna', title: 'Vienna: meet the accepted gambit', eco: 'C26', order: 1,
    opening: [...gambit, ['exf4', 'Black accepts the f-pawn, leaving e5 available for a tempo against the knight.']],
    main: [
      ['e5', 'Attack the f6 knight with central space. e5 gains a tempo; calculate its retreat before collecting the pawn.'], ['Ng8', 'Black retreats the attacked knight and keeps the extra f4 pawn for now.'],
      ['Nf3', 'Develop toward the centre and control e5. Nf3 prepares king safety instead of chasing f4 with the queen.'], ['d6', 'Black challenges the advanced pawn and opens the c8 bishop.'],
      ['d4', 'Support the advanced pawn and open your bishop. d4 reinforces e5 while gaining central space.'], ['dxe5', 'Black exchanges the advanced pawn; the d-pawn must now account for the capture.'],
      ['dxe5', 'Recapture to retain central space. dxe5 keeps space on e5 and opens the d-file; Black still holds the extra pawn on f4.']
    ], transferAfter: 3,
    transfer: [['d5', 'Black advances beside e5. Compare supporting your space with releasing the tension en passant.'], ['d4', 'Support the advanced e5 pawn and open your dark bishop. d4 keeps central space instead of releasing it with an en passant capture.'], ['Be7', 'Black prepares castling while leaving the f4 pawn exposed.'], ['Bxf4', 'Recover the pawn with development. The c1 bishop reaches f4 through the newly opened diagonal.']],
    structure: { title: 'Space in return for a pawn', breaks: 'Use the tempo on f6 to build a centre, then develop before recovering f4.', pieces: 'Nf3, d4 and bishop development bring pieces behind the advanced centre.', counterplay: 'Black can challenge e5 with …d6 and exchange the c3 knight.', exchanges: 'A d-pawn recapture on e5 opens the d-file; dxc3 opens the c1 bishop instead.', ending: 'Count the pawns again before trading queens. An initiative alone does not guarantee compensation in an ending.' },
    plan: 'Gain time with e5, develop Nf3, and support the centre before trying to recover f4.', misconception: 'Recover f4 immediately with the queen regardless of the knight on f6.', correction: 'The immediate opportunity is a tempo against the knight. Repeated queen moves delay development.',
    mistake: { decision: 0, san: 'Qh5', explanation: 'Qh5? permits …Nxh5: the f6 knight attacks h5. Gain time against the knight with e5 instead.' }
  },
  {
    slug: 'd6', family: 'vienna', title: 'Vienna: build against …d6', eco: 'C26', order: 2,
    opening: [...gambit, ['d6', 'Black supports e5 and opens the c8 bishop instead of striking with …d5.']],
    main: [['Nf3', 'Develop a defender of the centre. Nf3 also prepares castling.'], ['Nc6', 'Black adds a defender to e5.'], ['Bc4', 'Develop the bishop toward f7. Bc4 clears f1 while the centre stays closed.'], ['Be7', 'Black prepares kingside castling.'], ['d3', 'Support e4 and release the c1 bishop. d3 completes a stable base for your pieces.'], ['O-O', 'Black secures the king.'], ['O-O', 'Secure your king before choosing another pawn break. Castling brings the rook to the half-open or potentially opening f-file.']],
    transferAfter: 1,
    transfer: [['exf4', 'Black changes the structure by accepting the pawn after you develop.'], ['d4', 'Build central space while Black spends time collecting a wing pawn. d4 opens the dark bishop.'], ['Be7', 'Black prepares castling rather than holding f4 with another pawn move.'], ['Bxf4', 'Recover the pawn with development. The c1 bishop can now reach f4 through d2 and e3.']],
    structure: { title: 'A supported centre before another pawn push', breaks: 'Prepare d4 or fxe5 with development; neither break is automatic.', pieces: 'Nf3, Bc4 and d3 coordinate the centre while preparing castling.', counterplay: 'Black may capture f4, challenge with …d5 later, or develop the bishop with a pin.', exchanges: 'If Black captures f4 after Nf3, d4 can open the c1 bishop to recover it.', ending: 'Central control and king activity matter after queens leave; assess the actual pawn count.' },
    plan: 'Develop, support e4, and castle before expanding further on the kingside.', misconception: 'A closed centre makes the king permanently safe on e1.', correction: 'Black can open the centre later. Prepare king safety while there is time.',
    mistake: { decision: 0, san: 'Qh5', explanation: 'Qh5? places the queen on a square attacked by the f6 knight: …Nxh5 wins it.' }
  },
  {
    slug: 'premature-nc6', family: 'vienna', title: 'Vienna: resolve the centre after …Nc6', eco: 'C26', order: 3,
    opening: [...gambit, ['Nc6', 'Black develops another knight without resolving the f4–e5 tension.']],
    main: [['fxe5', 'Resolve the pawn contact before building the centre. fxe5 removes e5 and attacks the f6 knight.'], ['Nxe5', 'The c6 knight recaptures and centralises.'], ['d4', 'Gain space while attacking the central knight. d4 opens the c1 bishop with tempo.'], ['Ng6', 'Black withdraws the attacked knight.'], ['e5', 'Gain another tempo against the f6 knight. e5 is supported by d4.'], ['Ng8', 'Black retreats the f6 knight.'], ['Nf3', 'Convert the gained time into development. Nf3 prepares king safety behind the central space.']],
    transferAfter: 1,
    transfer: [['Ng8', 'Black retreats f6 immediately, leaving the e5 pawn rather than recapturing it.'], ['Nf3', 'Develop and defend the advanced pawn. Nf3 reinforces e5.'], ['d6', 'Black challenges your advanced pawn.'], ['exd6', 'Resolve the central contact. exd6 removes the pawn that attacks e5; Black can recapture and you must continue developing.']],
    structure: { title: 'Central expansion with developing tempi', breaks: 'After fxe5 Nxe5, d4 attacks the central knight and prepares e5.', pieces: 'Use the time won from knight attacks to develop Nf3 and the bishops.', counterplay: 'Black will seek …d6 or …d5 against the extended central pawns.', exchanges: 'An immediate knight retreat leaves a different pawn balance from …Nxe5.', ending: 'Advanced pawns need support. Space is useful only if your pieces can defend it.' },
    plan: 'Resolve the centre, build space with tempo, then develop instead of making endless pawn moves.', misconception: 'Winning tempi means development can be postponed indefinitely.', correction: 'The extra space becomes a target if the pieces remain at home.',
    mistake: { decision: 0, san: 'Qh5', explanation: 'Qh5? ignores that the f6 knight attacks h5. …Nxh5 wins the queen.' }
  },
  {
    slug: 'nc6', family: 'vienna', title: 'Vienna: develop with Bc4 against …Nc6', eco: 'C25', order: 4,
    opening: [...e4, ['Nc6', 'Black supports e5 before developing the king knight.'], ['Bc4', 'Develop toward f7 while keeping the choice of d3 and f4.'], ['Nf6', 'Black attacks e4; support it before expanding.']],
    main: [['d3', 'Support e4 and open the c1 bishop. d3 makes development safer before f4.'], ['Bc5', 'Black develops toward your f2 square.'], ['Nf3', 'Develop the king knight and prepare castling. Nf3 adds control of d4 and e5.'], ['d6', 'Black supports e5 and frees the light bishop.'], ['O-O', 'Move your king away from the centre. Castling also places the rook behind f2.'], ['O-O', 'Black also completes king safety.'], ['Be3', 'Develop the remaining bishop toward the active c5 bishop. Be3 offers an exchange while connecting the pieces.']],
    transferAfter: 1,
    transfer: [['Na5', 'Black attacks the c4 bishop with the c6 knight.'], ['Bb3', 'Move the attacked bishop to a safe supported diagonal. Bb3 allows axb3 if Black exchanges it.'], ['Nxb3', 'Black exchanges the knight for your bishop.'], ['axb3', 'Recapture and open the a-file. axb3 restores material while changing the queenside pawn structure.']],
    structure: { title: 'Develop before committing the f-pawn', breaks: 'Prepare f4 only after checking e4, king safety, and Black’s central replies.', pieces: 'Bc4, d3 and Nf3 develop harmoniously; Be3 can challenge Black’s active bishop.', counterplay: '…Na5 attacks Bc4, and …d5 may open the centre with tempo.', exchanges: 'After Bb3 Nxb3, axb3 opens the a-file and doubles the b-pawns; inspect activity as well as structure.', ending: 'The bishop pair or doubled pawns only matter together with open files and active kings.' },
    plan: 'Support e4, develop and castle; respond to attacks on Bc4 before starting a pawn expansion.', misconception: 'Play f4 automatically whenever the opening is called Vienna.', correction: 'Here e4 and the bishop need attention. Choose the break from the actual position.',
    mistake: { decision: 0, san: 'Qh5', explanation: 'Qh5? walks into …Nxh5 because the knight on f6 controls h5.' }
  },
  {
    slug: 'qgd', family: 'queens-gambit', title: 'Queen’s Gambit Declined: the Exchange structure', eco: 'D35', order: 0,
    opening: [...d4, ['e6', 'Black supports d5 but closes the c8 bishop.'], ['Nc3', 'Develop and increase pressure on d5.'], ['Nf6', 'Black develops another defender.'], ['cxd5', 'Clarify the centre while retaining your d-pawn.'], ['exd5', 'The e-pawn recaptures: Black has c- and d-pawns against your central d- and e-pawns.'], ['Bg5', 'Develop outside the future e3 pawn chain.'], ['Be7', 'Black prepares to break the pin and castle.'], ['e3', 'Support d4 and release the f1 bishop.'], ['O-O', 'Black secures the king.']],
    main: [['Bd3', 'Develop the remaining kingside bishop. Bd3 clears f1 and points toward the kingside.'], ['c6', 'Black supports d5, producing the familiar Carlsbad pawn structure.'], ['Nf3', 'Develop the last kingside piece. Nf3 prepares castling and supports central squares.'], ['Nbd7', 'Black develops while supporting f6 and the e5 break.'], ['O-O', 'Secure the king before beginning a queenside plan. Castling connects the rooks.'], ['Re8', 'Black places a rook on the semi-open e-file.'], ['Qc2', 'Coordinate the queen and bishop before choosing a pawn break. Qc2 connects the rooks and supports central play.']],
    transferAfter: 1,
    transfer: [['h6', 'Black questions the bishop before reinforcing d5 with …c6.'], ['Bh4', 'Preserve the bishop outside the pawn chain. Bh4 keeps the diagonal while leaving room for development.'], ['b6', 'Black prepares to develop the c8 bishop to b7.'], ['Nf3', 'Complete kingside development before choosing a wing plan. Nf3 prepares castling.']],
    structure: { title: 'The Carlsbad structure and its pawn breaks', breaks: 'Prepare b4–b5 against c6, but check whether Black can counter with …Ne4 or …c5. A central e4 break requires its own preparation.', pieces: 'Bd3, Nf3 and Qc2 coordinate the centre; a rook on b1 can support b4.', counterplay: 'Black can seek active pieces on e4, kingside threats, or the freeing …c5 break.', exchanges: 'After b5 cxb5, a pawn recapture can leave d5 isolated. After bxc6 bxc6, c6 may become a target instead.', ending: 'A weak pawn is useful only if rooks can attack it. Compare activity before exchanging queens.' },
    plan: 'Develop and castle, prepare b4–b5, and reassess Black’s central counterplay before exchanging.', misconception: 'The minority attack wins a pawn regardless of Black’s replies.', correction: 'The break can create a target, but Black may trade it away or gain active counterplay.',
    mistake: { decision: 0, san: 'Nxd5', explanation: 'Nxd5? takes a defended pawn: …Nxd5 removes your knight. Develop the bishop before seeking a central capture.' }
  },
  {
    slug: 'accepted', family: 'queens-gambit', title: 'Queen’s Gambit Accepted: recover through development', eco: 'D27', order: 1,
    opening: [...d4, ['dxc4', 'Black accepts the c-pawn and gives up the central d5 foothold.'], ['Nf3', 'Develop and discourage an immediate …e5.'], ['Nf6', 'Black also develops toward the centre.']],
    main: [['e3', 'Open the f1 bishop to recover c4. e3 supports d4 while preparing a developing recapture.'], ['e6', 'Black prepares development and a later …c5.'], ['Bxc4', 'Recover the pawn while developing. Bxc4 restores material without an early queen excursion.'], ['c5', 'Black challenges d4 rather than defending the captured pawn.'], ['O-O', 'Secure your king before resolving the centre. Castling brings the rook closer to the e-file.'], ['a6', 'Black prepares …b5 to gain space against the bishop.'], ['Qe2', 'Support central play and clear d1 for a rook. Qe2 helps prepare e4 when the position permits.']],
    transferAfter: 1,
    transfer: [['b5', 'Black tries to hold the extra pawn rather than developing with …e6.'], ['a4', 'Challenge the pawn chain at its base. a4 puts pressure on the b5 pawn that supports c4.'], ['c6', 'Black reinforces b5 and closes the queen’s diagonal for now.'], ['axb5', 'Remove the supporting pawn before recovering c4. axb5 changes the a-file and forces Black to consider the recapture.']],
    structure: { title: 'Development before recovering the gambit pawn', breaks: 'Use e3 and Bxc4 to recover c4. If Black holds it with …b5, challenge the support with a4.', pieces: 'Nf3, Bxc4 and castling develop while recovering material; Qe2 and Rd1 support the centre.', counterplay: '…c5 attacks d4 and …b5 gains time against Bc4.', exchanges: 'After …cxd4 exd4, White can have an isolated d-pawn. Use active pieces and consider d5 before simplifying.', ending: 'An isolated d-pawn may become harder to defend after minor pieces leave; count activity before exchanges.' },
    plan: 'Recover c4 through e3 and bishop development, castle, then respond to …c5 in the centre.', misconception: 'Black can keep c4 forever merely by pushing …b5.', correction: 'The supporting pawns can be challenged with a4; calculate rather than assuming the pawn is lost.',
    mistake: { decision: 0, san: 'd5', explanation: 'd5? advances onto a square that the queen can capture: …Qxd5. Open the bishop with e3 to recover c4 first.' }
  },
  {
    slug: 'slav', family: 'queens-gambit', title: 'Queen’s Gambit: active play in the Exchange Slav', eco: 'D10', order: 2,
    opening: [...d4, ['c6', 'Black supports d5 while keeping the light bishop’s diagonal open.'], ['cxd5', 'Choose the Exchange Slav before Black builds a Semi-Slav centre.'], ['cxd5', 'Black recaptures with the c-pawn; the c-file is now open.']],
    main: [['Nc3', 'Develop toward d5 and e4. Nc3 begins building useful pressure despite the symmetrical pawns.'], ['Nf6', 'Black develops a central defender.'], ['Bf4', 'Develop the dark bishop before e3. Bf4 uses the open diagonal outside the pawn chain.'], ['Nc6', 'Black develops and increases central control.'], ['e3', 'Support d4 and release the f1 bishop. e3 completes a stable centre.'], ['Bf5', 'Black also develops the light bishop actively.'], ['Nf3', 'Develop before committing to a pawn break. Nf3 prepares castling while keeping e4 as a future plan.']],
    transferAfter: 1,
    transfer: [['Nc6', 'Black develops the queen knight first; the pawn structure is unchanged.'], ['Bf4', 'Keep the bishop outside the future e3 chain. Bf4 remains useful in this move order.'], ['Nf6', 'Black transposes back to the main development setup.'], ['e3', 'Support the centre and open the remaining bishop. The familiar structure now returns through a different move order.']],
    structure: { title: 'Symmetry does not remove active plans', breaks: 'Prepare e4 with pieces before opening the centre; use the open c-file when it is available.', pieces: 'Nc3, Bf4, e3 and Nf3 develop without trapping the dark bishop.', counterplay: 'Black can occupy c4, challenge with …e5, or exchange active pieces.', exchanges: 'A bishop or knight exchange may change control of e4 even when the pawn structure stays symmetrical.', ending: 'Open-file control and king activity can matter more than the identical pawn counts.' },
    plan: 'Develop Bf4 before e3, complete king safety, and prepare central or c-file activity.', misconception: 'Symmetrical pawns mean there is no useful plan and the game is already drawn.', correction: 'Development, open files, and control of central entry squares still create decisions.',
    mistake: { decision: 0, san: 'e4', explanation: 'e4? offers a central pawn before development: …dxe4 removes it. Prepare the break with pieces first.' }
  },
  {
    slug: 'tarrasch', family: 'queens-gambit', title: 'Queen’s Gambit: blockade the Tarrasch pawn', eco: 'D32', order: 3,
    opening: [...d4, ['e6', 'Black supports d5.'], ['Nc3', 'Develop and increase pressure on d5.'], ['c5', 'Black challenges d4 immediately.'], ['cxd5', 'Clarify d5 before choosing the bishop setup.'], ['exd5', 'Black accepts the possibility of an isolated d-pawn.']],
    main: [['Nf3', 'Develop before committing the central pawns. Nf3 supports d4 and prepares the kingside.'], ['Nc6', 'Black develops with pressure on d4.'], ['g3', 'Prepare a bishop on the long diagonal. g3 makes Bg2 possible against the central pawns.'], ['Nf6', 'Black completes knight development.'], ['Bg2', 'Develop the bishop behind the centre. Bg2 increases pressure along the long diagonal.'], ['Be7', 'Black prepares castling.'], ['O-O', 'Secure your king before taking on a blockade. Castling allows the rooks to join the central battle.']],
    transferAfter: 1,
    transfer: [['cxd4', 'Black exchanges the c-pawn immediately, changing the central tension.'], ['Nxd4', 'Recapture with a piece and preserve the e-pawn. Nxd4 leaves Black with an isolated d5 pawn.'], ['Nf6', 'Black develops to support the isolated pawn’s active play.'], ['g3', 'Prepare the long-diagonal bishop against d5. g3 keeps the fianchetto plan despite the earlier exchange.']],
    structure: { title: 'An isolated pawn trades long-term support for activity', breaks: 'After …cxd4 Nxd4, control d4 in front of Black’s isolated d5 pawn and watch the …d4 break.', pieces: 'Bg2 pressures d5; knights and rooks should blockade and attack without giving Black active tempi.', counterplay: 'Black gets open lines and may advance …d4 or create kingside threats.', exchanges: 'Trading active attackers can make d5 harder to defend, but do not abandon the blockade to force exchanges.', ending: 'An isolated pawn may be a target; it is not automatically lost when queens come off.' },
    plan: 'Fianchetto, castle, and restrain the isolated pawn while respecting Black’s piece activity.', misconception: 'The isolated pawn is already won, so Black’s activity can be ignored.', correction: 'Black has central space and open lines. Establish a blockade before counting a pawn gain.',
    mistake: { decision: 0, san: 'Nxd5', explanation: 'Nxd5? takes a pawn defended by the queen: …Qxd5 removes your knight. Develop before seeking a central capture.' }
  },
  {
    slug: 'chigorin', family: 'queens-gambit', title: 'Queen’s Gambit: meet the Chigorin’s piece activity', eco: 'D07', order: 4,
    opening: [...d4, ['Nc6', 'Black develops a piece instead of supporting d5 with a pawn.'], ['Nc3', 'Develop and add pressure on the centre.'], ['Nf6', 'Black continues active piece development.']],
    main: [['Nf3', 'Develop and protect the central pawn. Nf3 supports d4 and prepares king safety.'], ['dxc4', 'Black accepts the c-pawn and releases central tension.'], ['e4', 'Build a broad centre with development behind it. e4 opens the bishop and claims space.'], ['Bg4', 'Black pins the f3 knight and puts pressure on d4.'], ['Be3', 'Develop a defender of d4. Be3 reinforces the centre before chasing the pinning bishop.'], ['e6', 'Black prepares the f8 bishop.'], ['Bxc4', 'Recover the pawn with development. Bxc4 clears the route to kingside castling.']],
    transferAfter: 1,
    transfer: [['Bg4', 'Black pins the knight before exchanging on c4.'], ['cxd5', 'Clarify the centre before expanding. cxd5 asks how Black will recover the d5 pawn.'], ['Nxd5', 'Black’s f6 knight recaptures and centralises.'], ['e4', 'Gain central space with tempo against the knight. e4 opens the f1 bishop while attacking d5.']],
    structure: { title: 'Central space against rapid piece activity', breaks: 'Use e4 when the central exchanges and piece support allow it.', pieces: 'Nc3, Nf3 and Be3 support the central pawns; recover c4 with the bishop when safe.', counterplay: 'Black uses pins and knight activity to attack d4 before White castles.', exchanges: 'A knight recapture on d5 creates different tactical chances from a pawn recapture.', ending: 'A broad centre may become a target if pieces disappear without resolving its weaknesses.' },
    plan: 'Develop both knights, support the centre against pins, and recover material without neglecting king safety.', misconception: 'Black’s unusual move order means you can expand without calculating pins.', correction: 'The Chigorin relies on piece activity; central pawn moves must account for pinned defenders.',
    mistake: { decision: 0, san: 'e4', explanation: 'Immediate e4? permits …dxe4 with pressure on the centre before Nf3 supports it. Use Nf3 first in this repertoire.' }
  },
  {
    slug: 'albin', family: 'queens-gambit', title: 'Queen’s Gambit: contain the Albin wedge', eco: 'D08', order: 5,
    opening: [...d4, ['e5', 'Black counterattacks in the centre by offering the e-pawn.'], ['dxe5', 'Accept the pawn while watching Black’s central advance.'], ['d4', 'Black gains space with a pawn wedge on d4.']],
    main: [['Nf3', 'Develop while watching the advanced pawn. Nf3 controls d4 and prepares king safety.'], ['Nc6', 'Black develops and attacks e5.'], ['a3', 'Prevent a bishop check on b4 before developing further. a3 also prepares a possible queenside expansion.'], ['Be6', 'Black develops with pressure on c4.'], ['Nbd2', 'Develop a defender of e4 and c4. Nbd2 coordinates the queenside without dislodging the d4 pawn prematurely.'], ['Qd7', 'Black connects queen and bishop while considering long castling.'], ['g3', 'Prepare king safety with a fianchetto. g3 makes Bg2 possible against the centre.']],
    transferAfter: 1,
    transfer: [['Bg4', 'Black pins the knight before defending d4 with …Nc6. The d4 pawn is now available.'], ['Qxd4', 'Remove the undefended pawn wedge. Qxd4 exploits the changed move order rather than copying the main setup.'], ['Nc6', 'Black develops with an attack on your queen, but leaves the g4 bishop undefended.'], ['Qxg4', 'Answer the queen attack by capturing the undefended bishop. Qxg4 saves the queen and wins material; an automatic queen trade would miss it.']],
    structure: { title: 'Contain d4 before trying to remove it', breaks: 'Blockade and undermine the advanced d4 pawn after development; an early e3 can allow tactical checks.', pieces: 'Nf3, Nbd2 and a kingside fianchetto coordinate without rushing the central recapture.', counterplay: 'Black seeks development with tempo, pins, and a dangerous …d3 advance.', exchanges: 'Returning the extra pawn can be sensible if it eliminates the wedge and completes development.', ending: 'Only count an extra pawn as an asset after the central wedge and king safety are resolved.' },
    plan: 'Develop, prevent forcing checks, and contain d4 before trying to remove the advanced pawn.', misconception: 'Play e3 immediately and assume the d4 pawn must disappear.', correction: 'The Albin contains …Bb4+ and …dxe3 ideas. Calculate the checks before challenging the wedge.',
    mistake: { decision: 0, san: 'e3', explanation: 'e3? allows …Bb4+: after Bd2, …dxe3 creates the Lasker-trap complications. Develop Nf3 before challenging d4.' }
  }
];

const built = whiteCourseChapters.map(buildChapter);
export const whiteCourseLines = built.map((item) => item.line);
export const whiteCourseLessons = built.map((item) => item.lesson);
export const whiteCourseDrills = built.map((item) => item.drill);

const recognition = (family: string, slug: string, title: string, principle: string, positions: [string, string, string][]): ConceptDrill => ({
  key: `concept:${family}-${slug}`, openingFamilyKey: `white-${family}-main`, title, principle, summary: principle,
  themes: ['development', 'move-order'], depth: 'foundation', order: 30,
  planPrompt: 'How should you react to an unfamiliar early setup?',
  planChoices: [{ id: 'adapt', label: principle, correct: true, feedback: 'Identify the changed threat, then develop with a purpose.' }, { id: 'copy', label: 'Copy the main line regardless of the changed position.', correct: false, feedback: 'A different reply can change the useful move order.' }],
  scenarios: positions.map(([sequence, answer, explanation], index) => scenario(`recognize-${index + 1}`, moves(sequence), answer, explanation, principle))
});

export const whiteRecognitionDrills: ConceptDrill[] = [
  recognition('vienna', 'early-setups', 'Vienna: recognize early bishop and pawn setups', 'Develop while checking e4 and f2 before committing to f4.', [
    ['e4 e5 Nc3 Bc5', 'Nf3', 'Black points the bishop toward f2. Develop while attacking e5.'],
    ['e4 e5 Nc3 d6', 'Nf3', 'Black reinforces e5. Develop before deciding the pawn break.'],
    ['e4 e5 Nc3 Nc6 Bc4 Bc5', 'd3', 'Black mirrors bishop development. Support e4 and open the c1 bishop.']
  ]),
  recognition('queens-gambit', 'unusual-replies', 'Queen’s Gambit: recognize unusual second moves', 'Contest the centre and gain development instead of treating every unfamiliar move as a mistake.', [
    ['d4 d5 c4 Bf5', 'cxd5', 'The Baltic bishop has left c8. Clarify the centre and calculate the recapture.'],
    ['d4 d5 c4 c5', 'cxd5', 'Black counterattacks symmetrically. Exchange on d5 and inspect how Black responds.'],
    ['d4 d5 c4 Qd6', 'Nc3', 'Black develops the queen early. Develop a knight toward d5 and useful central squares.']
  ])
];
