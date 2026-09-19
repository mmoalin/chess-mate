import { starterRepertoires } from './repertoires';
import { caroEndgame, viennaEndgame } from './endgameJourneys';
import { createCaroContinuation } from './caroContinuation';
import { whiteCourseLessons } from './whiteOpeningCourses';
import { alienCourseLessons } from './alienOpeningCourses';
import { createAlienContinuation } from './alienContinuation';
import { createQueensGambitContinuation, createViennaContinuation } from './whiteContinuations';
import type { ConnectedLesson, LessonDecision, LessonQuestion } from '../features/connected/types';

const line = (key: string) => starterRepertoires.find((item) => item.id === key)!;
const question = (id: string, prompt: string, hint: string, choices: [string, boolean, string][]): LessonQuestion => ({
  id, prompt, hint, choices: choices.map(([label, correct, feedback], index) => ({ id: String(index), label, correct, feedback })).sort((a, b) => (Number(a.id) + 2) % 3 - (Number(b.id) + 2) % 3)
});
function path(prefix: string[], items: { id: string; move: string; reply?: string[]; prompt: string; change: string; hint: string; feedback: string; tactical?: boolean; mistakes?: Record<string, string> }[]) {
  let moves = [...prefix];
  return Object.fromEntries(items.map((item, index) => {
    const decision: LessonDecision = {
      id: item.id, movesBefore: [...moves], prompt: item.prompt, change: item.change, hint: item.hint,
      dimension: item.tactical ? 'tactics' : 'understanding', mistakes: item.mistakes ?? {},
      answers: [{ moveSan: item.move, repliesSan: item.reply ?? [], nextId: items[index + 1]?.id ?? null, feedback: item.feedback }]
    };
    moves = [...moves, item.move, ...(item.reply ?? [])];
    return [item.id, decision];
  }));
}
const vienna = line('white-vienna-main');
const caro = line('black-caro-kann-main');
const viennaMoves = vienna.movesSan.slice(0, vienna.modelPositionPly);
const caroMoves = caro.movesSan.slice(0, caro.modelPositionPly);

export const starterConnectedLessons: ConnectedLesson[] = [
  {
    key: 'lesson:vienna-development', version: 1, title: 'Vienna: turn initiative into a plan',
    endgame: viennaEndgame,
    openingFamilyKey: vienna.id, lineKey: vienna.id, side: 'white', openingMoves: viennaMoves,
    modelPositionPly: viennaMoves.length,
    openingExplanations: ['Claim central space.', 'Black also occupies the centre.', 'Develop while keeping the f-pawn free.', 'Black puts pressure on e4.', 'Challenge e5; this makes king safety more urgent.', 'Black responds in the centre.', 'Resolve the pawn contact before making another attacking move.', 'Black captures e4 and centralizes the knight.', 'Develop a defender and improve coordination.', 'Black prepares to castle; White must complete development too.'],
    introduction: 'The pawn exchange has changed the centre. Your e5 pawn gives space, but the king and bishop still need attention. Build a position that can support an attack.',
    takeaway: 'Use the initiative to develop and secure the king. When a forcing exchange arrives, resolve it before continuing your plan.',
    questions: [
      question('structure', 'What is the most useful feature to recognize here?', 'Compare the e5 pawn, the missing f-pawn, and the undeveloped bishop.', [
        ['White has central space, but the open lines also make king safety urgent.', true, 'The e5 pawn restricts Black, while the missing f-pawn makes a king left on e1 more vulnerable.'],
        ['White should recover the e4 pawn before making a developing move.', false, 'The bishop and king still need attention before the open lines become an asset.'],
        ['White should advance e5 again before Black can blockade it.', false, 'The central exchange and Black knight on e4 make concrete moves important.']
      ]),
      question('plan', 'Which plan makes your initiative sustainable?', 'Bring another piece into play and connect the rooks.', [
        ['Develop the bishop, castle, then support the centre with d4.', true, 'This connects king safety, development, and a defended central presence.'],
        ['Prepare g4 to dislodge the central knight before developing.', false, 'More pawn moves do not solve the undeveloped bishop or exposed king.'],
        ['Bring the queen to e2 and postpone castling to defend e5.', false, 'Queen moves give Black time while your own pieces remain uncoordinated.']
      ])
    ],
    mainStartId: 'develop', transferStartId: 'transfer-recapture',
    transferCheckpointMoves: [...viennaMoves, 'Be2'],
    transferExplanation: 'Rewind to just after Be2. Instead of developing with ...Nc6, Black exchanges on c3 immediately. Respond to the capture before returning to king safety.',
    decisions: {
      ...path(viennaMoves, [
        { id: 'develop', move: 'Be2', reply: ['Nc6'], prompt: 'Prepare king safety by developing the remaining kingside piece.', change: 'Black has just developed the bishop to e7.', hint: 'Move the bishop off f1 so castling becomes possible.', feedback: 'Be2 clears f1. Black develops with ...Nc6; now secure the king.' },
        { id: 'castle', move: 'O-O', reply: ['O-O'], prompt: 'Make the king safe before opening the centre further.', change: 'Black has developed another piece; your castling path is clear.', hint: 'Both squares between king and rook are empty.', feedback: 'Castling connects king safety to rook activity. Black also castles.' },
        { id: 'centre', move: 'd4', reply: ['Nxc3'], prompt: 'Support your advanced e5 pawn and release the queenside bishop.', change: 'Both kings are safe. You can now reinforce the centre.', hint: 'Use the d-pawn to support e5.', feedback: 'd4 supports e5, but ...Nxc3 is a forcing interruption. Deal with it before developing again.' },
        { id: 'recapture', move: 'bxc3', tactical: true, prompt: 'Black captured your knight. Remove the attacker before it takes another piece.', change: 'The black knight on c3 attacks the bishop on e2 with check available.', hint: 'Your b-pawn can capture the knight on c3.', feedback: 'bxc3 restores material balance and reinforces d4. Ignoring the knight permits ...Nxe2+.', mistakes: { Qd3: 'After Qd3, ...Nxe2+ wins your bishop with check. Recapture the knight first.' } }
      ]),
      ...path([...viennaMoves, 'Be2', 'Nxc3'], [
        { id: 'transfer-recapture', move: 'dxc3', tactical: true, reply: ['Nc6'], prompt: 'The exchange happened before d4. Recapture while opening the c1 bishop.', change: 'The d-pawn is still on d2, so it can now take on c3.', hint: 'Use the d-pawn rather than copying the earlier b-pawn recapture.', feedback: 'dxc3 restores material and opens the bishop diagonal. The different timing changed the useful recapture.' },
        { id: 'transfer-castle', move: 'O-O', prompt: 'With the forcing capture resolved, return to the original priority.', change: 'Black has developed with ...Nc6. Your king is still on e1.', hint: 'Finish king safety.', feedback: 'The exact pawn structure changed, but developing and securing the king remain useful priorities.' }
      ])
    }
  },
  {
    key: 'lesson:caro-active', version: 1, title: 'Caro-Kann: stay solid and active',
    endgame: caroEndgame,
    openingFamilyKey: caro.id, lineKey: caro.id, side: 'black', openingMoves: caroMoves,
    modelPositionPly: caroMoves.length,
    openingExplanations: ['White occupies e4.', 'Support a central challenge with ...c6.', 'White takes more central space.', 'Contest the centre with ...d5.', 'White develops a defender.', 'Clarify the centre.', 'White recaptures with a piece.', 'Develop the bishop before closing its diagonal with ...e6.', 'White challenges the bishop.', 'Retreat while keeping the bishop outside the pawn chain.', 'White threatens h5 to chase the bishop.', 'Give the bishop a retreat on h7.'],
    introduction: 'Your light-squared bishop is active, but White is gaining space with the h-pawn. Respond to that pressure, finish development, and prepare to challenge d4.',
    takeaway: 'Protect useful piece activity, exchange an attacking bishop when appropriate, then use development to support central counterplay.',
    questions: [
      question('structure', 'What distinguishes this Caro-Kann position?', 'Where is the light-squared bishop compared with your e-pawn?', [
        ['The light bishop is outside the pawn shell, but White can chase it with h5.', true, 'Its active placement is valuable, and ...h6 has prepared h7 as a retreat.'],
        ['The centre is fixed, so the bishop can stay on g6 without a retreat.', false, 'Your e-pawn is still on e7 and the bishop is already on g6.'],
        ['The bishop exchange should be postponed until after Black castles.', false, 'h5 attacks the bishop directly; concrete threats interrupt long-term plans.']
      ]),
      question('plan', 'How should Black connect defence to counterplay?', 'Solve the bishop threat, then ask what development prepares.', [
        ['Keep the bishop safe, finish development, and challenge d4 with ...c5.', true, 'Each step prepares the next: piece safety, coordination, king safety, then central play.'],
        ['Prepare a queenside pawn expansion before committing the knights.', false, 'Pawn moves alone leave your king and minor pieces unready for central play.'],
        ['Keep the c-pawn on c6 and concentrate on defending d5.', false, 'The solid structure should support an active central break.']
      ])
    ],
    mainStartId: 'bishop-retreat', transferStartId: 'transfer-exchange', transferCheckpointMoves: caroMoves,
    transferExplanation: 'Rewind to the model position after ...h6. White plays Bd3 instead of h5. You can exchange the bishop directly, without copying the retreat to h7.',
    decisions: {
      ...path([...caroMoves, 'h5'], [
        { id: 'bishop-retreat', move: 'Bh7', reply: ['Nf3'], prompt: 'White attacks your bishop. Use the retreat you prepared.', change: 'h5 has attacked the bishop on g6.', hint: 'The h7 square is available because your pawn moved to h6.', feedback: 'Bh7 preserves the bishop. White develops, so now build your central shell.' },
        { id: 'shell', move: 'e6', reply: ['Bd3'], prompt: 'Support the centre and open the dark-squared bishop.', change: 'Your light bishop is safely outside the pawn chain.', hint: 'Advance the e-pawn one square.', feedback: '...e6 supports d5 and releases f8. White now offers a bishop exchange.' },
        { id: 'exchange', move: 'Bxd3', reply: ['Qxd3'], tactical: true, prompt: 'Resolve the bishop contact while preserving kingside castling.', change: 'Bd3 attacks your bishop along d3–h7.', hint: 'Exchange on d3 before White captures on h7.', feedback: '...Bxd3 removes the attacking bishop. After a waiting move, Bxh7 followed by ...Rxh7 would move the rook and forfeit kingside castling.', mistakes: { a6: 'This ignores the bishop contact. Bxh7 followed by ...Rxh7 would give up kingside castling. Exchange on d3 first in this plan.' } },
        { id: 'queen-knight', move: 'Nd7', reply: ['O-O'], prompt: 'Develop a knight to support future central play.', change: 'The bishops have been exchanged and White prepares king safety.', hint: 'Bring the b8 knight to d7.', feedback: '...Nd7 develops without obstructing the c-pawn break.' },
        { id: 'king-knight', move: 'Ngf6', reply: ['Re1'], prompt: 'Develop the remaining knight toward the centre.', change: 'White has castled and can soon bring a rook to the centre.', hint: 'Move the g8 knight, keeping the d7 knight in support.', feedback: '...Ngf6 brings the last knight into play.' },
        { id: 'king-bishop', move: 'Be7', reply: ['Bf4'], prompt: 'Clear the last square needed for castling.', change: 'White has placed a rook on e1.', hint: 'Develop the f8 bishop.', feedback: '...Be7 finishes the preparation for king safety.' },
        { id: 'safe-king', move: 'O-O', reply: ['Rad1'], prompt: 'Secure the king before challenging the centre.', change: 'White has completed development and is bringing pressure to the d-file.', hint: 'The kingside castling route is clear.', feedback: 'Your king is safe. The next step is active central counterplay.' },
        { id: 'break', move: 'c5', prompt: 'Challenge the base of White’s central space.', change: 'Both sides have developed; your pieces can support the pawn break.', hint: 'The c-pawn can challenge d4.', feedback: '...c5 challenges d4. Reassess the captures instead of following a fixed sequence after the break.' }
      ]),
      ...path([...caroMoves, 'Bd3'], [
        { id: 'transfer-exchange', move: 'Bxd3', reply: ['Qxd3'], tactical: true, prompt: 'White developed the bishop instead of chasing yours. Resolve this new contact.', change: 'The bishop on d3 now faces your bishop on g6.', hint: 'You can exchange immediately on d3.', feedback: 'You do not need ...Bh7: White chose a different move, so exchange directly.' },
        { id: 'transfer-shell', move: 'e6', reply: ['Nf3'], prompt: 'Return to the development plan after the exchange.', change: 'White recaptured with the queen; your light bishop no longer needs a retreat.', hint: 'Open the f8 bishop and support the centre.', feedback: '...e6 returns to the same development goal through a different move order.' },
        { id: 'transfer-knight', move: 'Nd7', prompt: 'Prepare active central play with a developing move.', change: 'White has developed the kingside knight.', hint: 'Bring the b8 knight into play without blocking the c-pawn.', feedback: '...Nd7 supports the central plan. Finish development and check the timing of ...c5 during practical play.' }
      ])
    }
  }
];

// Positional comparisons describe concrete features; engine results remain separate.
const caroBreak = starterConnectedLessons[1].decisions.break;
starterConnectedLessons[1].continuation = createCaroContinuation([...caroBreak.movesBefore, caroBreak.answers[0].moveSan, ...caroBreak.answers[0].repliesSan]);
starterConnectedLessons[0].decisions.develop.comparisons = {
  Bc4: 'Bc4 develops toward f7, but c4 is attacked by the d5 pawn. Calculate …dxc4 before treating this as interchangeable with Be2.',
  Be2: 'Be2 clears f1 for castling without placing the bishop on a square attacked by d5.',
  d4: 'd4 supports e5 and opens the c1 bishop. The f1 bishop and king still need attention; compare Black’s forcing replies.'
};
// Snapshot the pre-expansion bundle for conservative cached/remote upgrades.
export const legacyStarterConnectedLessons = structuredClone(starterConnectedLessons);
starterConnectedLessons[0].courseOrder = 0;
starterConnectedLessons[0].continuation = createViennaContinuation(starterConnectedLessons[0]);
starterConnectedLessons.push(...whiteCourseLessons);
const queenMain = starterConnectedLessons.find((lesson) => lesson.key === 'lesson:queens-gambit-qgd')!;
queenMain.continuation = createQueensGambitContinuation(queenMain);
export const preAlienStarterConnectedLessons = structuredClone(starterConnectedLessons);
starterConnectedLessons.push(...alienCourseLessons);
alienCourseLessons[0].continuation = createAlienContinuation(alienCourseLessons[0]);
