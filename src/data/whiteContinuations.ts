import type { ConnectedLesson } from '../features/connected/types';
import type { AnnotatedMove, ContinuationJourney, ContinuationStep } from '../features/connected/continuationJourney';

const annotated = (pairs: [string, string][]): AnnotatedMove[] => pairs.map(([san, note]) => ({ san, note }));
type Decision = { id: string; title: string; hint: string; takeaway: string; bridge: [string, string][]; main: [string, string][]; alternative: [move: string, reason: string, reply: string, feedback: string]; mainReason: string };
export function journey(lesson: ConnectedLesson, sourceCheckpointId: string, id: string, title: string, decisions: Decision[]): ContinuationJourney {
  const source = lesson.decisions[sourceCheckpointId];
  return {
    id, title, sourceCheckpointId,
    openingPrefix: [...source.movesBefore, source.answers[0].moveSan, ...source.answers[0].repliesSan],
    introduction: 'An original illustrative continuation of this lesson’s main branch, not a historical game, forced sequence, or claim that every move is best. Replay connects every position without a jump. Compare alternatives and stronger replies before returning explicitly to the example. The ending is a position to play, not a claimed win.',
    steps: decisions.map((decision): ContinuationStep => ({
      id: decision.id, title: decision.title, prompt: decision.title + '. Compare the two plans in the position before choosing.', hint: decision.hint, takeaway: decision.takeaway,
      bridge: annotated(decision.bridge), main: annotated(decision.main),
      choices: [
        { id: 'main-plan', label: decision.mainReason, correct: true, feedback: decision.main[0][1] },
        { id: 'alternative-plan', label: decision.alternative[1], correct: true, feedback: decision.alternative[1] },
        { id: 'automatic', label: 'Copy the example because this opening always leads to a winning ending.', correct: false, feedback: 'These moves are an illustration. Check the opponent’s reply and the resulting piece activity; the opening name guarantees neither this position nor a win.' }
      ],
      candidates: [
        { move: decision.main[0][0], assessment: 'accepted', explanation: decision.main[0][1], reasonIds: ['main-plan'], replies: [{ move: decision.main[1][0], sound: true, explanation: decision.main[1][1] }] },
        { move: decision.alternative[0], assessment: 'accepted', explanation: decision.alternative[1], reasonIds: ['alternative-plan'], replies: [{ move: decision.alternative[2], sound: true, explanation: decision.alternative[3] }] }
      ]
    }))
  };
}

export function createViennaContinuation(lesson: ConnectedLesson) {
  return journey(lesson, 'recapture', 'vienna-main-continuation-v1', 'Vienna: follow central space into a rook ending', [
    {
      id: 'consolidate', title: 'Support the central chain with a developing piece', hint: 'Compare Be3, which supports d4, with using the open b-file immediately.',
      takeaway: 'Central space needs piece support; the open b-file is another source of activity.',
      bridge: [['Bf5', 'Black develops the c8 bishop and controls e4.']],
      main: [['Be3', 'Be3 develops the last bishop and reinforces d4. Rb1 is a more active alternative in the engine comparison; the example chooses consolidation.'], ['Qd7', 'Black connects the rooks and coordinates the queen with the f5 bishop.']],
      mainReason: 'Develop the c1 bishop and support d4.', alternative: ['Rb1', 'Use the open b-file to create queenside pressure.', 'b6', 'Black supports the b7 square by moving the pawn and prepares a compact queenside.']
    },
    {
      id: 'coordinate', title: 'Connect the rooks and prepare a bishop exchange', hint: 'Compare a queen move that connects the rooks with a knight move that attacks the f5 bishop.',
      takeaway: 'Improvement can mean coordination or a forcing challenge; choose what your actual move accomplishes.', bridge: [],
      main: [['Qd2', 'Qd2 connects the rooks and protects the bishop on e3. It is a quiet coordinating choice rather than the most forcing move.'], ['Na5', 'Black clears c6 for possible …c5 and eyes c4. The central …f6 break is another important response.']],
      mainReason: 'Connect the rooks while protecting the bishop on e3.', alternative: ['Ng5', 'Attack the f5 bishop and invite a bishop-for-knight exchange.', 'Bxg5', 'Black can exchange the e7 bishop for the knight; Bxg5 would then recapture with development.']
    },
    {
      id: 'counterplay', title: 'Challenge the active bishop before Black opens the centre', hint: 'Compare offering the e2 bishop on d3 with developing pressure from e3 to g5.',
      takeaway: 'An exchange can reduce pressure but changes your pawns or queen placement after the recapture.', bridge: [],
      main: [['Bd3', 'Bd3 offers a bishop exchange on d3. This is a quieter illustrative choice; Bg5 is more active.'], ['Bxd3', 'Black accepts the offer. White must recapture before returning to a long-term plan.']],
      mainReason: 'Offer to exchange Black’s active f5 bishop on d3.', alternative: ['Bg5', 'Activate the e3 bishop against e7 without inviting doubled d-pawns.', 'Bxg5', 'Black exchanges the e7 bishop; White can recapture Qxg5 with an active queen.']
    },
    {
      id: 'structural-exchange', title: 'Choose what the bishop recapture changes', hint: 'Both the c2 pawn and queen can capture d3. Trace the files each choice opens.',
      takeaway: 'cxd3 opens the c-file and supports e4, but leaves doubled d-pawns; Qxd3 keeps the pawn structure and activates the queen.', bridge: [],
      main: [['cxd3', 'The c2 pawn recaptures on d3. It supports e4, opens the c-file and leaves pawns on d3 and d4. The other c-pawn remains on c3.'], ['Nc6', 'Black returns the knight to central control and keeps …f6 available against e5.']],
      mainReason: 'Recapture with the c2 pawn, opening a file while accepting doubled d-pawns.', alternative: ['Qxd3', 'Recapture with the queen and preserve the c2 pawn.', 'Rae8', 'Black activates the a8 rook on the e-file, increasing pressure on the central space.']
    },
    {
      id: 'simplify', title: 'Recover the central pawn and consider a queen exchange', hint: 'The queen on e3 and pawn on c3 can both capture d4; only one offers the direct queen exchange.',
      takeaway: 'Queen exchanges reduce king threats, but the rook ending still demands active play.',
      bridge: [
        ['Rae1', 'White brings the a1 rook to the e-file behind the advanced e-pawn.'], ['f6', 'Black challenges e5 directly.'],
        ['Bf2', 'White withdraws the bishop while retaining pressure along the e-file.'], ['fxe5', 'Black captures the advanced e-pawn.'],
        ['dxe5', 'The d4 pawn recaptures on e5, leaving d3 behind.'], ['Nd8', 'Black reroutes the c6 knight toward e6.'],
        ['e6', 'White advances the pawn as an illustrative activity sacrifice.'], ['Nxe6', 'Black accepts it with the knight.'],
        ['Qe2', 'White coordinates the queen and rook along the e-file.'], ['Rf6', 'Black lifts the rook to defend and coordinate the kingside.'],
        ['Bh4', 'White pins pressure to the rook on f6 through the e7 bishop.'], ['Rh6', 'Black activates the rook on the h-file.'],
        ['Bxe7', 'White exchanges the final bishop pair.'], ['Qxe7', 'Black recaptures with the queen.'],
        ['Nd4', 'White centralises the remaining knight.'], ['Qd6', 'Black places the queen behind the central pawns.'],
        ['h4', 'White gains kingside space; this is an illustrative choice, not a forced attack.'], ['Nf4', 'Black activates the knight with pressure on e2 and h3.'],
        ['Qe3', 'White moves the queen away from the knight’s attack.'], ['Rf6', 'Black returns the rook to support f4.'],
        ['g3', 'White attacks the f4 knight with a pawn.'], ['c5', 'Black counterattacks the d4 knight while its own knight is attacked.'],
        ['Rxf4', 'White gives up a rook for the active knight in this simplifying sequence.'], ['cxd4', 'Black captures White’s knight with the c-pawn.'],
        ['Rxf6', 'White’s rook exchanges Black’s active rook.'], ['Qxf6', 'Black recaptures. One rook each remains and White can recover d4.']
      ],
      main: [['Qxd4', 'The queen captures d4 and offers a queen exchange along the f6–d4 diagonal.'], ['Qxd4+', 'Black accepts with check. White must recapture before activating the rook.']],
      mainReason: 'Recover d4 with the queen and offer to simplify the king threats.', alternative: ['cxd4', 'Recover d4 with the c3 pawn and retain both queens.', 'Rc8', 'Black uses the open c-file while queens remain; king safety is still part of the calculation.']
    },
    {
      id: 'rook-activity', title: 'Activate the rook in the resulting ending', hint: 'Compare a rook on the fifth rank with bringing the king closer to the centre.',
      takeaway: 'The rook needs active targets and the king needs useful squares. This roughly balanced ending is still a game to play.',
      bridge: [['cxd4', 'The c3 pawn recaptures the queen. The original game has now reached a rook ending.'], ['b5', 'Black gains queenside space and fixes targets.']],
      main: [['Re5', 'The rook attacks d5 from the fifth rank while remaining active across the board.'], ['Rd8', 'Black defends d5 with a rook and keeps the pawn structure intact.']],
      mainReason: 'Activate the rook against d5 instead of defending passively.', alternative: ['Kf2', 'Bring the king toward the centre while keeping the rook on e1.', 'Rf8+', 'Black checks along the f-file. White must answer the check before continuing the king walk.']
    }
  ]);
}

export function createQueensGambitContinuation(lesson: ConnectedLesson) {
  const result = journey(lesson, 'decision-4', 'queens-gambit-main-continuation-v1', 'Queen’s Gambit: follow the minority attack into a rook ending', [
    {
      id: 'prepare-b4', title: 'Prepare the queenside pawn advance', hint: 'Compare a rook behind the b-pawn with preventing a kingside bishop pin first.', takeaway: 'The minority attack needs preparation; a useful waiting move can also restrict counterplay.',
      bridge: [['Nf8', 'Black reroutes the d7 knight toward g6 or e6.']],
      main: [['Rab1', 'The a1 rook supports the b-pawn advance. White prepares b4 rather than expecting an immediate breakthrough.'], ['Ng6', 'Black centralises the knight and eyes e5, f4 and h4.']],
      mainReason: 'Place a rook behind the b-pawn before advancing it.', alternative: ['h3', 'Prevent …Bg4 and make a retreat square for the g5 bishop.', 'g6', 'Black prepares a bishop fianchetto or king space while retaining the central structure.']
    },
    {
      id: 'counterplay', title: 'Weigh a piece exchange against starting the pawn advance', hint: 'Compare removing the f6 knight with keeping the bishop and advancing b4.', takeaway: 'Giving up a bishop changes Black’s active pieces; starting b4 retains that bishop but allows more counterplay.', bridge: [],
      main: [['Bxf6', 'White removes the f6 knight, giving up the dark bishop. This reduces one source of central pressure but grants Black the bishop pair.'], ['Bxf6', 'Black recaptures with the bishop and preserves the pawn structure.']],
      mainReason: 'Remove the f6 knight while accepting that Black keeps two bishops.', alternative: ['b4', 'Keep the bishop and begin the queenside pawn advance immediately.', 'a6', 'Black prepares to meet b5 by capturing with the a-pawn or restraining White’s expansion.']
    },
    {
      id: 'create-target', title: 'Challenge the pawn supporting d5', hint: 'The b-pawn can attack c6. Compare that break with restricting Black’s bishop first.', takeaway: 'The recapture determines the target: …cxb5 leaves d5 isolated, whereas bxc6 bxc6 can leave a c6 target.',
      bridge: [['b4', 'White starts the minority attack with the rook behind the pawn.'], ['Be7', 'Black withdraws the bishop; this permits the illustrative b5 break.']],
      main: [['b5', 'The b-pawn attacks c6, the support of d5. Calculate the actual captures before naming a weakness.'], ['cxb5', 'Black chooses to capture b5. After Rxb5, d5 has no neighbouring c- or e-pawn; …Bg4 is a more active alternative.']],
      mainReason: 'Challenge c6 so that exchanges can leave a central target.', alternative: ['h3', 'Restrict …Bg4 before committing to the queenside exchange.', 'a6', 'Black adds queenside control while White postpones the break.']
    },
    {
      id: 'improve-rooks', title: 'Coordinate the rooks before attacking the isolated pawn', hint: 'Compare doubling on the b-file with making king space before collecting material.', takeaway: 'A structural target is useful when the pieces can reach it without losing coordination.',
      bridge: [['Rxb5', 'The rook recaptures b5. Black’s d5 pawn is now isolated.'], ['Bd6', 'Black develops the bishop actively while the d5 pawn remains a target.']],
      main: [['Rfb1', 'White doubles rooks on the b-file and increases pressure on b7. This illustrates coordination; Rxd5 is also available.'], ['b6', 'Black protects the b-file by advancing the pawn. White can now examine d5.']],
      mainReason: 'Double the rooks and make Black respond to b-file pressure.', alternative: ['h3', 'Give the king space and restrict back-rank problems before committing the rooks.', 'a6', 'Black attacks the rook on b5 and gains a tempo; the rook must respond.']
    },
    {
      id: 'consider-exchange', title: 'Decide whether simplifying is worth the lost pressure', hint: 'Compare capturing the queen on e6 with improving the f5 rook to b5.', takeaway: 'A legal queen exchange can give up part of an advantage. Compare the resulting pawn structure and activity before choosing.',
      bridge: [
        ['Rxd5', 'White’s b5 rook takes the isolated d5 pawn.'], ['Be6', 'Black develops with an attack on the rook.'],
        ['Rdb5', 'The attacked rook returns to b5.'], ['Rc8', 'Black activates the a8 rook on the open c-file.'],
        ['Bf5', 'White offers a bishop exchange, reducing Black’s bishop pair.'], ['Bxf5', 'Black accepts with the e6 bishop.'],
        ['Rxf5', 'White’s b5 rook recaptures and becomes active on the fifth rank.'], ['Qd7', 'Black connects queen and rooks while leaving a possible queen exchange.'],
        ['Qb3', 'White places the queen on the diagonal toward e6.'], ['Qe6', 'Black offers a queen exchange on a defended square.']
      ],
      main: [['Qxe6', 'White accepts simplification but gives up part of the engine’s preferred pressure. Rb5 keeps more winning chances; the example deliberately chooses a playable ending.'], ['Rxe6', 'Black uses the e8 rook to recapture in this illustration. The alternative …fxe6 deserves separate calculation and changes the pawn structure.']],
      mainReason: 'Accept a simpler position while knowingly giving up some pressure.', alternative: ['Rb5', 'Keep queens and increase pressure along the b-file.', 'Qc4', 'Black activates the queen on c4, retaining threats and a possible queen exchange on a different square.']
    },
    {
      id: 'rook-activity', title: 'Use an open file in the rook ending', hint: 'Compare activating the b1 rook on d1 with supporting e5 through f4.', takeaway: 'After the minor pieces disappear, rook activity and the opponent’s threats matter more than remembering the minority attack.',
      bridge: [
        ['Ne4', 'White centralises the c3 knight and offers to exchange the d6 bishop.'], ['h6', 'Black makes a king-side pawn move in this illustrative simplifying line.'],
        ['Nxd6', 'White exchanges the knight for Black’s remaining bishop.'], ['Rxd6', 'Black recaptures with the e6 rook.'],
        ['Ne5', 'White offers the final knight exchange on e5.'], ['Nxe5', 'Black accepts with the g6 knight.'],
        ['dxe5', 'White’s d4 pawn recaptures on e5, opening the d-file. Only rooks and pawns remain with the kings.'], ['Re6', 'Black puts pressure on the advanced e5 pawn.']
      ],
      main: [['Rd1', 'White activates the b1 rook on the newly opened d-file. The other rook supports e5 from f5.'], ['g6', 'Black attacks the f5 rook; rook activity does not remove the need to answer threats.'], ['Rf6', 'White moves the attacked rook to an active sixth-rank square.'], ['Kg7', 'Black brings the king toward the rook and central play. The ending is not a claimed win.']],
      mainReason: 'Use the open d-file while preserving active support for e5.', alternative: ['f4', 'Support e5 with a pawn before repositioning the b1 rook.', 'g6', 'Black still attacks the f5 rook. It must move even though e5 is supported.']
    }
  ]);
  // Strong-reply predictions must distinguish the teaching line from the more
  // testing defence found in the depth-18 verification.
  const breakReplies = result.steps[2].candidates[0].replies;
  breakReplies[0].sound = false;
  breakReplies[0].explanation = '…cxb5 is the illustrative capture, but …Bg4 is stronger active defence. Capturing releases the central support and allows Rxb5 with pressure on d5.';
  breakReplies.push({ move: 'Bg4', sound: true, explanation: '…Bg4 pins the f3 knight and creates active counterplay before resolving b5–c6.' });
  const exchangeReplies = result.steps[4].candidates[0].replies;
  exchangeReplies[0].sound = false;
  exchangeReplies[0].explanation = '…Rxe6 is the illustrative recapture, but …fxe6 is stronger in the checked position. Predict the pawn recapture when testing the exchange against best resistance.';
  exchangeReplies.push({ move: 'fxe6', sound: true, explanation: '…fxe6 strengthens central control and opens the f-file. White must reassess the changed structure rather than copy the rook-recapture example.' });
  return result;
}
