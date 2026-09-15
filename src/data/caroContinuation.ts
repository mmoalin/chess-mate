import type { AnnotatedMove, ContinuationCandidate, ContinuationJourney } from '../features/connected/continuationJourney';
import type { PlanChoice } from '../domain/repertoire/types';

const move = (san: string, note: string): AnnotatedMove => ({ san, note });
const reason = (id: string, label: string, feedback: string): PlanChoice => ({ id, label, feedback, correct: id !== 'automatic' });
const candidate = (san: string, explanation: string, reasonId: string, reply: string, replyExplanation: string): ContinuationCandidate => ({
  move: san, assessment: 'accepted', explanation, reasonIds: [reasonId], replies: [{ move: reply, sound: true, explanation: replyExplanation }]
});

/** Original illustrative line; the prefix comes from the existing main branch. */
export function createCaroContinuation(openingPrefix: string[]): ContinuationJourney {
  return {
    id: 'caro-main-continuation-v1', title: 'Caro-Kann: follow the centre into a rook ending', sourceCheckpointId: 'break', openingPrefix,
    introduction: 'An original illustrative continuation of the main lesson after …c5, not a historical game or a forced sequence. We return to that main-line position even if you last played the alternate bishop exchange. White chooses c3 and later cxd4 so we can follow the isolated pawn. Other replies change the plan. Every position below is reached by the replayed moves.',
    steps: [
      {
        id: 'central-tension', title: 'Resolve or maintain the central tension',
        prompt: 'White has reinforced d4 with c3. Choose how to handle the contact between c5 and d4.',
        hint: 'Compare exchanging on d4 with bringing the a8 rook to the c-file before exchanging.',
        takeaway: 'An exchange clarifies the structure; a rook move can increase pressure while keeping the tension.',
        bridge: [move('c3', 'White supports d4 with a pawn; a later c-pawn recapture would leave d4 isolated.')],
        main: [move('cxd4', 'Black resolves the central contact.'), move('cxd4', 'White chooses the pawn recapture: d4 is isolated and the c-file opens. Nxd4 would produce a different structure.')],
        choices: [
          reason('clarify', 'Clarify the pawn structure by exchanging on d4.', 'After …cxd4 cxd4, White has no c- or e-pawn beside d4. White gains open lines as well as a pawn to defend.'),
          reason('pressure', 'Place the rook on the c-file and keep the pawn contact.', '…Rc8 brings a rook behind the c-pawn. It preserves the choice of when to exchange.'),
          reason('automatic', 'Force an isolated pawn regardless of White’s recapture.', 'White can also recapture Nxd4. Isolation follows the example’s cxd4, not every legal reply.')
        ],
        candidates: [
          { ...candidate('cxd4', 'Exchange now, then inspect White’s recapture.', 'clarify', 'cxd4', 'cxd4 keeps a pawn on d4 but leaves it isolated.'), replies: [
            { move: 'cxd4', sound: true, explanation: 'cxd4 keeps a pawn on d4 but leaves it isolated.' },
            { move: 'Nxd4', sound: true, explanation: 'Nxd4 is also sound. White avoids the isolated pawn; reassess the piece activity instead of copying the example’s pawn plan.' }
          ] },
          candidate('Rc8', 'Prepare pressure before deciding whether to exchange. The c-pawn still blocks the file.', 'pressure', 'Qe2', 'Qe2 moves the queen away from d3 and supports central play. The tension remains.')
        ]
      },
      {
        id: 'blockade', title: 'Use the square in front of the isolated pawn',
        prompt: 'White’s pawn is isolated on d4. Choose a piece improvement that addresses this structure.',
        hint: 'Compare placing the f6 knight on d5 with using the newly opened c-file.',
        takeaway: 'The isolated pawn provides space, but d5 is a blockading square and the c-file offers rook activity.',
        bridge: [], main: [move('Nd5', 'The f6 knight blockades d4 and attacks the bishop on f4.'), move('Be5', 'A weaker illustrative reply: White offers the bishop. Bc1 is the stronger retreat; …f6 would test Be5 more severely than our simplifying exchange.')],
        choices: [
          reason('blockade', 'Occupy d5 to restrict the pawn and gain a tempo on the bishop.', '…Nd5 blocks d4’s advance and attacks f4. White must account for the bishop contact.'),
          reason('file', 'Use the open c-file while leaving the knight on f6.', '…Rc8 activates the a8 rook without immediately blockading d4.'),
          reason('automatic', 'Win d4 immediately because isolated pawns cannot be defended.', 'The d4 pawn is defended by pieces. Isolation creates a responsibility, not a forced win.')
        ],
        candidates: [{ ...candidate('Nd5', 'Occupy the square in front of d4 and attack f4.', 'blockade', 'Bc1', 'Bc1 retreats the attacked bishop and preserves it. This is stronger defence than the example’s Be5.'), replies: [
          { move: 'Bc1', sound: true, explanation: 'Bc1 retreats the attacked bishop and preserves it. This is stronger defence than the example’s Be5.' },
          { move: 'Be5', sound: false, explanation: 'Be5 is the illustrative reply, but weaker defence: …f6 attacks the bishop and creates concrete problems. Predict Bc1 when testing Black against stronger resistance. The example deliberately simplifies with …Nxe5 instead.' }
        ] }, candidate('Rc8', 'Use the open file rather than immediately blockading the pawn.', 'file', 'Ne5', 'Ne5 centralises White’s knight. Black must calculate the exchanges.')]
      },
      {
        id: 'piece-improvement', title: 'Challenge the central knight',
        prompt: 'A pair of minor pieces has been exchanged. White now has a knight on e5. Choose how to improve your position.',
        hint: 'The bishop can challenge e5 from d6, or the rook can occupy the open file.',
        takeaway: 'Piece activity determines whether a structural target is useful. Consider what a capture does to the pawns.',
        bridge: [move('Nxe5', 'The d7 knight captures the offered bishop. We illustrate a structural exchange here; …f6 is the more testing response to Be5.'), move('Nxe5', 'White’s f3 knight recaptures and occupies e5.')],
        main: [move('Bd6', 'The bishop challenges e5. This illustrates a plan; it is not the engine’s unique preference.'), move('Qf3', 'White activates the queen, retaining the option to recapture on e5 with the d-pawn.')],
        choices: [
          reason('challenge', 'Challenge e5 and consider how a d-pawn recapture changes the centre.', '…Bd6 attacks the knight. After a later …Bxe5 dxe5, the isolated pawn changes files.'),
          reason('file', 'Activate the rook on c8 without deciding the bishop exchange yet.', '…Rc8 occupies the open file and retains the bishop. Keeping the bishop is a real alternative.'),
          reason('automatic', 'Trade the bishop because bishops are always worse than knights.', 'The exchange depends on activity and the resulting structure, not a universal piece ranking.')
        ],
        candidates: [candidate('Bd6', 'Confront e5 and make a structural exchange possible.', 'challenge', 'Qf3', 'Qf3 brings the queen into play. White can answer …Bxe5 with dxe5.'), candidate('Rc8', 'Rook activity can come first; this keeps the bishop and central tension.', 'file', 'Ne4', 'Ne4 brings White’s other knight into play. Black must still choose how to handle e5.')]
      },
      {
        id: 'exchange', title: 'Choose what the exchange gives up',
        prompt: 'Compare exchanging the bishop for the e5 knight with keeping the bishop and improving a rook.',
        hint: 'After …Bxe5, trace the d4 pawn’s recapture and inspect the newly opened d-file.',
        takeaway: 'Removing the knight gives White an advanced e-pawn and opens the d-file. Simplification has a cost.',
        bridge: [], main: [move('Bxe5', 'Black exchanges the bishop for the central knight.'), move('dxe5', 'The isolated d-pawn becomes an isolated e-pawn. The d-file opens; e5 gains space but needs defence.')],
        choices: [
          reason('transform', 'Remove the central knight while accepting an advanced white e-pawn.', '…Bxe5 dxe5 gives up the bishop. Account for White’s space and the open d-file.'),
          reason('retain', 'Keep the bishop and activate the rook before committing to a trade.', '…Rc8 retains more pieces and uses the open c-file. It postpones the structural decision.'),
          reason('automatic', 'Repair White’s structure by connecting d4 to a neighbouring pawn.', 'dxe5 changes the pawn’s file but does not give it an adjacent friendly pawn. It remains isolated.')
        ],
        candidates: [candidate('Bxe5', 'A playable illustrative exchange, not a claim that trading the bishop is best.', 'transform', 'dxe5', 'dxe5 restores material balance and places a white pawn on e5.'), candidate('Rc8', 'Keep the bishop and increase rook activity, preserving more tension.', 'retain', 'Ne4', 'Ne4 develops a second active knight. The bishop and central knight can remain on the board.')]
      },
      {
        id: 'rook-ending', title: 'Offer a queen trade with the ending in view',
        prompt: 'Replay the intervening exchanges. Queens, one rook each and pawns remain. Choose a queen move with a concrete plan.',
        hint: 'Compare offering a supported exchange on c6 with keeping queens and using e7.',
        takeaway: 'The queen exchange reduces king threats but leaves an isolated c-pawn. Rook activity matters alongside that weakness.',
        bridge: [
          move('Qg5', 'Black targets e5 with the queen.'), move('Ne4', 'White centralises the knight and attacks the queen.'),
          move('Qxe5', 'The queen captures the advanced pawn and leaves g5.'), move('Nc3', 'White challenges the knight on d5.'),
          move('Qc7', 'The queen retreats along the diagonal.'), move('Nxd5', 'White exchanges the final pair of knights.'),
          move('exd5', 'The e-pawn recaptures on d5.'), move('Rxd5', 'White’s d1 rook captures that pawn on the open d-file.'),
          move('Rae8', 'The a8 rook crosses to the open e-file.'), move('Rxe8', 'White’s e1 rook exchanges that rook.'),
          move('Rxe8', 'Black’s f8 rook recaptures; one rook remains per side.'), move('Rd1', 'White returns the remaining rook to d1. The queens can meet along f3–c6.')
        ],
        main: [move('Qc6', 'Offer a queen trade on a square protected by b7.'), move('Qxc6', 'White accepts. Black must recapture before continuing the rook plan.')],
        choices: [
          reason('trade', 'Offer a protected queen exchange, accepting an isolated c-pawn.', 'After …Qc6 Qxc6 bxc6, the b-pawn becomes an isolated c-pawn. Queens disappear, but pawn weaknesses do not.'),
          reason('queens', 'Keep queens and seek active queen play from e7.', '…Qe7 retains queen threats and leaves the b-pawn on its original file. The ending is optional.'),
          reason('automatic', 'Force a winning pawn ending by exchanging the queens.', 'Both rooks remain after the queen exchange. This rook ending is not a forced win.')
        ],
        candidates: [candidate('Qc6', 'A supported offer: b7 can recapture on c6. Check that defence before trading queens.', 'trade', 'Qxc6', 'Qxc6 accepts the trade. …bxc6 reaches the rook ending.'), candidate('Qe7', 'Keep queens and coordinate on the e-file, rather than simplifying now.', 'queens', 'b3', 'b3 secures the queenside while leaving the queen trade undecided.')]
      },
      {
        id: 'rook-activity', title: 'Make the rook active in the resulting ending',
        prompt: 'Queens and minor pieces have gone. Black has an isolated c-pawn. Find an active rook move and anticipate White’s counterplay.',
        hint: 'Compare entering the second rank with a rook lift to e5. Check White’s back-rank checks in both lines.',
        takeaway: 'The c-pawn needs attention, but active rooks create threats for both sides. Keep checking the opponent’s reply.',
        bridge: [move('bxc6', 'The b7 pawn recaptures the queen. This same game has now reached a rook ending.'), move('g3', 'White supports h5 and creates room for the king.')],
        main: [move('Re2', 'Black enters the second rank and attacks a2 and b2.'), move('Rd8+', 'White counters with a back-rank check. Black must answer it; the example does not end in a claimed win.')],
        choices: [
          reason('rank', 'Enter the second rank to create pawn threats while anticipating checks.', '…Re2 attacks a2 and b2. White can check on d8, so activity does not eliminate defensive duties.'),
          reason('lift', 'Lift the rook to e5 for lateral activity and pressure on h5.', '…Re5 provides lateral activity and attacks h5. White can still check on d8.'),
          reason('automatic', 'Give a check on e1 without checking whether White can capture the rook.', '…Re1+? allows Rxe1. White’s rook on d1 guards the checking square.')
        ],
        candidates: [candidate('Re2', 'Second-rank activity creates targets; account for White’s checks.', 'rank', 'Rd8+', 'Rd8+ is active counterplay. Black can answer …Kh7; this illustration does not establish a win.'), candidate('Re5', 'A rook lift is another active plan, keeping lateral access to the kingside.', 'lift', 'Rd8+', 'White keeps the rook active with check. Consider …Kh7 before taking a pawn.'),
          { move: 'Re1+', assessment: 'mistake', explanation: '…Re1+ loses the rook to Rxe1. White’s rook guards the checking square.', reasonIds: [], replies: [{ move: 'Rxe1', sound: true, explanation: 'Rxe1 captures the checking rook. Check the defender on d1 before choosing a rook check.' }] }
        ]
      }
    ]
  };
}
