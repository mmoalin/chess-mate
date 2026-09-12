import type { EndgameJourney } from '../features/connected/endgameJourney';
import type { PlanChoice } from '../domain/repertoire/types';

const reasons = (good: string, other: string, third: string, feedback: string): PlanChoice[] => [
  { id: 'other', label: other, correct: false, feedback: 'That may describe another position. Check the pawn contacts and protected squares on this board.' },
  { id: 'plan', label: good, correct: true, feedback },
  { id: 'third', label: third, correct: false, feedback: 'Check what remains after the exchange rather than assuming that simplification is automatically helpful.' }
];

export const caroEndgame: EndgameJourney = {
  title: 'Caro-Kann: from the central break to an active rook', side: 'black',
  introduction: 'A separate, authored training position with reduced material. This is not the next position in your opening line or a historical game. White’s e-pawn is gone and the c-pawn has advanced to c3. It isolates the same …c5 idea: challenge d4, inspect the new pawn structure, then decide what the exchanges give your rook. Replay every move below. The continuation is illustrative, not forced.',
  setupFen: '2r3k1/pp3ppp/2p1p3/8/3Pq3/2PQ3P/PP3PP1/3R2K1 b - - 0 20',
  steps: [
    { id: 'break', title: 'Prepare the structural change', prompt: 'Black to move. Find a pawn move that challenges White’s central support.', move: 'c5', replies: ['b3'], hint: 'Which pawn can attack d4 without moving your e6 pawn?',
      choices: reasons('Challenge d4 and open possibilities on the c-file.', 'Keep c6 fixed and organize a kingside pawn advance.', 'Trade the e6 pawn first to make d5 an outpost.', 'The c-pawn is the lever against d4.'),
      explanation: '…c5 attacks d4. In this example White plays b3, leaving the central tension unresolved. White could choose a different response; assess that before following the plan.' },
    { id: 'transform', title: 'Calculate the central exchange', prompt: 'White has played b3. Resolve the central contact and anticipate the recapture.', move: 'cxd4', replies: ['cxd4'], hint: 'Capture the d4 pawn. Which white pawn can recapture?',
      choices: reasons('After cxd4, d4 is isolated; the c-file has no pawns.', 'After cxd4, White retains pawns on both c3 and d4.', 'After cxd4, Black has a half-open c-file against c3.', 'White has no c- or e-pawn beside the new d4 pawn.'),
      explanation: '…cxd4 cxd4 leaves an isolated d-pawn. The pawn offers space, but it must be defended by pieces. The open c-file is a route for your rook, not a guarantee of a winning position.' },
    { id: 'exchange', title: 'Choose an exchange deliberately', prompt: 'The queens face each other. Investigate a simplification that keeps your rook active. Which structural feature survives?', move: 'Qxd3', replies: ['Rxd3'], hint: 'Exchange on d3; look at the file your own rook can use afterwards.',
      choices: reasons('Reduce queen threats while retaining the open c-file and d4 target.', 'Remove the d4 target because the white rook’s recapture repairs the pawn structure.', 'Trade queens to prevent White from defending d4 with an active rook.', 'The isolated pawn stays on d4 and both rooks remain.'),
      explanation: '…Qxd3 Rxd3 is a rook ending. Compare the active white rook with your own access to c1 before choosing this trade in a real game. This exercise does not claim that every queen trade favors Black.' },
    { id: 'activate', title: 'Turn the open file into activity', prompt: 'Use the open file with a forcing move. Predict how White can answer the check.', move: 'Rc1+', replies: ['Kh2'], hint: 'Look for a rook check on White’s back rank. The h2 square is available.',
      choices: reasons('Use a check to enter the back rank before attacking the second rank.', 'Use a rook check that immediately wins White’s rook on d3.', 'Exchange rooks immediately and race the kingside pawns.', 'The check gains access; it does not itself win material.'),
      explanation: '…Rc1+ Kh2 activates the rook. The next question is which second-rank targets are actually vulnerable. White’s rook remains active, so keep checking threats.' },
    { id: 'transfer-target', title: 'Transfer: activity still needs calculation', prompt: 'The defender has changed. Which second-rank pawn can Black safely take?', move: 'Rxa2', replies: ['Rd1'],
      transferFen: '6k1/pp3ppp/4p3/8/3P4/1P5P/P1r2PP1/5RK1 b - - 0 30',
      transferContext: 'New transfer exercise: the white rook is on f1, defending f2, while Black’s rook has reached c2. This is a separate training position. Apply the open-file idea without copying a capture blindly.',
      hint: 'Compare a2 with f2. Trace the white rook’s line of defence.',
      choices: reasons('a2 is undefended; f2 is protected by the rook on f1.', 'f2 can be taken with check before White can recapture.', 'a2 is defended along the first rank by the rook on f1.', 'Activity creates choices; counting defenders determines the capture.'),
      explanation: '…Rxa2 wins the undefended pawn. …Rxf2? would allow Rxf2, losing your rook for a pawn. The opening’s open-file plan becomes an endgame calculation about defenders.' }
  ]
};

export const viennaEndgame: EndgameJourney = {
  title: 'Vienna: when an initiative becomes a king ending', side: 'white',
  introduction: 'A separate, authored training example. The advanced e5 pawn, missing f-pawn, and doubled c-pawns recall features of the Vienna lesson, but this is not its next position. Follow a legal illustrative sequence to see what survives a queen and rook exchange. No forced win is implied.',
  setupFen: '5rk1/pp3ppp/4q3/3pP3/8/2P4Q/P1P3PP/5RK1 w - - 0 25',
  steps: [
    { id: 'queen-trade', title: 'What survives a queen exchange?', prompt: 'Investigate a queen trade and predict how the recapture changes the pawn structure and files.', move: 'Qxe6', replies: ['fxe6'], hint: 'Exchange on e6. The f7 pawn can recapture.',
      choices: reasons('The e5 space advantage remains, but the attack becomes a structural question.', 'The recapture leaves e5 as a passed pawn with a clear route forward.', 'The recapturing pawn keeps the f-file closed to the rooks.', 'The pawns keep their strengths and weaknesses when queens leave.'),
      explanation: 'Qxe6 fxe6 removes the queens and opens the f-file. Your e5 pawn still restricts squares, while the doubled c-pawns remain. Judge exchanges using the resulting position.' },
    { id: 'rook-trade', title: 'Inspect the pawn ending', prompt: 'Investigate the available rook exchange. What must replace your former attacking plan in the resulting position?', move: 'Rxf8+', replies: ['Kxf8'], hint: 'The f-file is now clear between the rooks.',
      choices: reasons('Activate the king and defend pawn weaknesses before pushing pawns.', 'Continue the same rook attack after exchanging the last rooks.', 'Push e6 immediately because the opponent’s king cannot recapture.', 'With major pieces gone, king routes and pawn targets matter.'),
      explanation: 'Rxf8+ Kxf8 reaches a king-and-pawn ending. This is a position to evaluate before committing to the trade, not proof that simplifying is best.' },
    { id: 'king-route', title: 'Replace the attacking pieces with your king', prompt: 'Take a first step toward the centre while keeping your pawn structure intact.', move: 'Kf2', replies: ['Ke7'], hint: 'Bring the king toward e3 without committing a pawn.',
      choices: reasons('Bring the king toward e3 to support the centre and inspect entry squares.', 'Win the e6 pawn immediately with this single king move.', 'Force Black’s king to stay on f8 for the rest of the ending.', 'The king becomes a working piece in the ending.'),
      explanation: 'Kf2 Ke7 develops both kings. Before advancing e5 or a queenside pawn, examine the opposing king’s route and which pawns need protection. Other king moves require their own calculation.' }
  ]
};
