import { Chess } from 'chess.js';
import { starterRepertoires } from '../../data/repertoires';

export type StudyPosition = { fen: string; moves: string[]; prompt: string; explanation: string; side: 'white' | 'black' };
function opening(moves: string[]) { const chess = new Chess(); moves.forEach((move) => chess.move(move)); return chess.fen(); }
function position(fen: string, moves: string[], prompt: string, explanation: string): StudyPosition {
  return { fen, moves, prompt, explanation, side: new Chess(fen).turn() === 'w' ? 'white' : 'black' };
}
const development = position(opening(['e4', 'e5']), ['Nf3', 'Nc3', 'Bc4'], 'Develop a knight or bishop toward the centre.', 'A new piece joins the game. Nf3 attacks e5, Nc3 supports e4, and Bc4 develops toward f7.');
const castle = position(opening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']), ['O-O'], 'Castle White’s king to connect safety with development.', 'Castling puts the king on g1 and brings the rook toward the centre.');
const chain = position(opening(['e4', 'e6', 'd4', 'd5', 'e5']), ['c5'], 'You play Black. Challenge the base of White’s d4–e5 pawn chain.', '…c5 attacks d4, the base supporting e5. The structure determines the target.');
const file = position('r4rk1/pp3ppp/2p5/8/8/2P5/PP3PPP/R4RK1 w - - 0 1', ['Rad1', 'Rfd1'], 'Bring a rook to the open d-file.', 'The d-file has no pawns. A rook on d1 can use it to contest entry squares.');
const entry = position('5rk1/pp3ppp/2p5/8/8/2P5/PP3PPP/3R2K1 w - - 0 1', ['Rd7'], 'Use the open file to put the rook on the seventh rank.', 'Rd7 attacks the pawns on b7 and f7. File control matters when it creates targets.');
const imbalance = position('6k1/pp3ppp/3n4/3p4/3P4/2B5/PP3PPP/6K1 w - - 0 1', ['Bb4'], 'Improve the bishop with Bb4, attacking the knight on d6.', 'The bishop now works along b4–c5–d6. Black can respond; this demonstrates a useful diagonal, not a forced win.');

export const studyPositions: Record<string, StudyPosition> = {
  'opening-principles-explain-development': development,
  'opening-principles-find-center': development,
  'opening-principles-choose-plan': castle,
  'pawn-chains-find-base': chain,
  'pawn-chains-choose-break': chain,
  'pawn-chains-model-structure': chain,
  'open-files-find-file': file,
  'open-files-choose-entry': entry,
  'open-files-calculate-trade': file,
  'imbalances-compare-pieces': imbalance,
  'imbalances-choose-trade': imbalance,
  'imbalances-calculate-plan': imbalance,
  'basic-endgames-opposition': position('8/8/4k3/8/8/4K3/4P3/8 w - - 0 1', ['Ke4'], 'Move the king to e4 to take the opposition. Keep the pawn back for this exercise.', 'The kings face each other on e4 and e6 with one square between them. Black must move; the king cannot step onto d5, e5, or f5.'),
  'basic-endgames-passed-pawn': position('8/6k1/8/3p4/4P3/4K3/8/8 w - - 0 1', ['exd5'], 'Capture on d5 to create a passed pawn.', 'The new d-pawn has no opposing pawn ahead of it on the c-, d-, or e-files. Bring the king forward to support it before racing.'),
  'basic-endgames-rook-activity': position('6k1/5p1p/8/8/8/8/6PP/R5K1 w - - 0 1', ['Ra7'], 'Activate the rook on the seventh rank with Ra7.', 'The rook pressures f7 and h7 from the side, giving Black something concrete to defend.')
};
for (const [taskId, lineId, index] of [
  ['alien-recognize', 'white-alien-gambit-main', 0],
  ['alien-white-plan', 'white-alien-gambit-main', 1],
  ['alien-black-plan', 'black-alien-gambit-defense', 0]
] as const) {
  const line = starterRepertoires.find((item) => item.id === lineId)!;
  const exercise = line.criticalPositions?.[index] ?? line.criticalPositions![0];
  studyPositions[taskId] = position(exercise.fen, exercise.expectedMoves, exercise.prompt, exercise.teachingPoint ?? exercise.hint ?? 'Connect the move to the plan.');
}
