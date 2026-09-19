import type { ConnectedLesson } from '../features/connected/types';
import { journey } from './whiteContinuations';

// Original illustrative play, checked from the source opening without FEN jumps.
const play: [string, string][] = [
  ['Qe2', 'Connect the queen to the bishops and clear d1 for castling.'], ['Be8', 'Black reroutes the bishop toward f7 to help the king.'],
  ['Bd2', 'Move the dark bishop out of the e-file and keep the queenside clear.'], ['Bf7', 'Black completes the bishop manoeuvre and adds a defender.'],
  ['O-O-O', 'Secure the king and activate the a1 rook on d1. The material deficit remains.'], ['c5', 'Black counterattacks the central pawn instead of waiting passively.'],
  ['Ne5', 'Centralise the remaining knight with pressure on f7.'], ['Nc6', 'Black develops and challenges the central knight.'],
  ['Nxf7', 'Exchange the knight for the bishop on f7. Unlike the original sacrifice, this capture takes a piece of equal value.'], ['Kxf7', 'The king recaptures the knight, preserving Black’s extra piece.'],
  ['dxc5', 'Clarify the central tension and open the d-file.'], ['Bxc5', 'Black develops the f8 bishop with a recapture.'],
  ['Rhe1', 'Bring the unused rook onto the open e-file.'], ['Re8', 'Black moves the h8 rook to defend e6 and contest the file.'],
  ['Bc3', 'Activate the dark bishop on the long diagonal.'], ['Nd4', 'Black centralises the knight with threats against the queen and bishop.'],
  ['Bxd4', 'Remove the active knight before it disrupts the rooks.'], ['Bxd4', 'Black recaptures with the bishop and keeps the extra minor piece.'],
  ['c3', 'Attack the bishop while sheltering the king from the diagonal.'], ['Bc5', 'Black keeps the bishop on an active square.'],
  ['Bb5', 'Attack the rook on e8 and prepare to exchange a bishop for it.'], ['Qc7', 'Black activates the queen and allows the exchange on e8.'],
  ['Bxe8+', 'Trade the bishop for a rook with check. Count the new imbalance: two rooks against rook, bishop and knight.'], ['Rxe8', 'The a8 rook recaptures. Black retains two minor pieces for White’s extra rook.'],
  ['g3', 'Support a future f4 advance and control f4 and h4.'], ['Qc6', 'Black centralises the queen and keeps pressure on the long diagonal.'],
  ['f4', 'Gain space and restrict the e5 square; the pawn also needs protection.'], ['Bd6', 'Black brings the bishop to bear on f4.'],
  ['Kb1', 'Step off the c-file and improve king shelter.'], ['b5', 'Black gains queenside space near White’s king.'],
  ['Qd3', 'Coordinate the queen with the d-file rook and keep central contact.'], ['Bc7', 'Black preserves the bishop while keeping the diagonal toward h2.'],
  ['h3', 'Support the kingside pawn formation and control g4.'], ['h5', 'Black starts a pawn lever against g3.'],
  ['Ka1', 'Tuck the king behind the a-pawn in this illustrative line.'], ['a6', 'Black supports b5 and prepares further queenside play.'],
  ['Qe2', 'Keep the queen connected to the e-file and avoid drifting away from the rooks.'], ['h4', 'Black attacks g3 to change the kingside structure.'],
  ['Qf2', 'Protect the kingside while keeping queen and rooks coordinated.'], ['Bb6', 'Black gains a tempo against the queen on f2.'],
  ['Qh2', 'Step away from the bishop’s diagonal while defending the h-pawns.'], ['Nd5', 'Black improves the knight with control of c3, e3 and f4.'],
  ['gxh4', 'Resolve the pawn contact. White gains a pawn but accepts doubled h-pawns.'], ['b4', 'Black opens a second front against c3.'],
  ['cxb4', 'Capture the advancing pawn and clarify the queenside.'], ['Nxb4', 'The knight recaptures and threatens entry near the king.'],
  ['Kb1', 'Bring the king off the corner and avoid remaining on the long diagonal.'], ['Qc4', 'Black centralises the queen with pressure on a2.'],
  ['b3', 'Attack the queen and give the king more shelter.'], ['Qb5', 'Black retreats while keeping the diagonal toward f1.'],
  ['Qe2', 'Return the queen to the central files.'], ['Qf5+', 'Black checks on the diagonal to b1. White must answer the check.'],
  ['Qe4', 'Block the check and offer a queen exchange. This reduces king threats while keeping the rooks active.'], ['Qxe4+', 'Black accepts with check; recapturing is essential.'],
  ['Rxe4', 'Recover the queen with the e1 rook. The game reaches an imbalanced ending, not a forced win.'], ['Nd5', 'Black centralises the knight and attacks f4.'],
  ['Rc1', 'Use the open c-file to seek entry squares and queenside pawn targets.'], ['Kf6', 'Black activates the king and supports the centre. The ending still favours Black in the engine analysis.']
];

export function createAlienContinuation(lesson: ConnectedLesson) {
  const chapters = [
    { index: 0, id: 'coordinate', title: 'Coordinate before attacking again', hint: 'Compare clearing d1 with supporting d4 using the c-pawn.', reason: 'Connect the queen and bishops while preparing castling.', alternative: ['c3', 'Reinforce d4 and create a stable central base.', 'Be8', 'Black still reroutes the bishop toward f7.'] },
    { index: 4, id: 'king-safety', title: 'Secure the king as Black prepares counterplay', hint: 'Both king safety and the centre need attention. Which move also activates a rook?', reason: 'Castle long to secure the king and place a rook on d1.', alternative: ['c3', 'Support d4 before committing the king.', 'Nbd7', 'Black develops the remaining knight and keeps the central break available.'] },
    { index: 8, id: 'exchange-defender', title: 'Distinguish an exchange from another sacrifice', hint: 'There is now a bishop on f7. Compare removing it with supporting d4.', reason: 'Exchange the knight for a bishop of equal value on f7.', alternative: ['c3', 'Support the central pawn and retain the knight for now.', 'cxd4', 'Black opens the centre before White exchanges the f7 bishop.'] },
    { index: 20, id: 'material-imbalance', title: 'Change the material balance with an active bishop', hint: 'Trace the b5–e8 diagonal and count the pieces after the exchange.', reason: 'Attack the e8 rook and prepare a bishop-for-rook exchange.', alternative: ['Qc2', 'Keep the bishop on d3 while coordinating the queen toward the queenside.', 'Qb6', 'Black targets b2 with the queen and keeps the rook defended.'] },
    { index: 50, id: 'queen-exchange', title: 'Prepare simplification while keeping the queen active', hint: 'Compare the e-file with the g-file. After …Qf5+, Qe4 can block the check and offer a trade.', reason: 'Centralise the queen so it can meet a diagonal check with a queen exchange.', alternative: ['Qg2', 'Keep the queen on the g-file and support active rook play with queens still on.', 'Nd5', 'Black centralises the knight with pressure on f4 while keeping the queens on the board.'] },
    { index: 56, id: 'active-rooks', title: 'Play actively in the resulting ending', hint: 'Two rooks face a rook, bishop and knight. Compare an open-file move with a rook lift.', reason: 'Use the c-file for rook entry and attacks on queenside pawns.', alternative: ['Rd3', 'Lift the rook along the third rank while supporting the kingside.', 'Rd8', 'Black contests the d-file and seeks exchanges that reduce White’s rook activity.'] }
  ] as const;
  const takeaways = [
    'Bring the queen into coordination before launching another attack. Supporting d4 with c3 is a different useful priority.',
    'Castling can improve both king safety and rook activity, but it does not stop Black from counterattacking with …c5.',
    'Count the piece on the destination square: the later Nxf7 exchanges a knight for a bishop, unlike the original knight-for-pawn sacrifice.',
    'A bishop-for-rook exchange changes the imbalance to two rooks against rook, bishop and knight. Count activity as well as points.',
    'Centralising the queen makes a defensive queen exchange possible after …Qf5+. Keeping queens with Qg2 requires continued attention to king safety.',
    'Activity offers practical resistance, but Black still has the better ending. This line does not vindicate the original sacrifice.'
  ];
  let previous = 0;
  const decisions = chapters.map((chapter, index) => {
    const bridge = [...(index === 0 ? [['Bd7', 'Black develops the remaining bishop and prepares to reroute it toward the king.'] as [string, string]] : []), ...play.slice(previous, chapter.index)];
    previous = chapter.index + (index === 4 ? 4 : 2);
    return { id: chapter.id, title: chapter.title, hint: chapter.hint, takeaway: takeaways[index], bridge, main: play.slice(chapter.index, previous), mainReason: chapter.reason, alternative: [...chapter.alternative] as [string, string, string, string] };
  });
  const result = journey(lesson, 'decision-4', 'alien-gambit-main-continuation-v1', 'Alien Gambit: from initiative to an imbalanced ending', decisions);
  result.introduction += ' Black is better after the original unsound sacrifice. The lesson practises resourceful resistance and honest material assessment.';
  return result;
}
