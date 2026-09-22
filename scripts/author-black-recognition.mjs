import { Chess } from 'chess.js';
import { writeFileSync } from 'node:fs';
import { createEngine } from './chess-engine.mjs';
const drills = [
  ['black-caro-kann-main', 'early-attacks', 'Caro-Kann: recognise early attacks', 'Develop while meeting the actual threat; an early bishop or queen sortie does not replace central control.', [
    ['e4 c6 Bc4 d5 Bb3', null, 'White retreats the bishop after the central challenge. Reassess the centre.'], ['e4 c6 Qh5', null, 'White develops the queen early. Check its threats and whether development can gain time.']]],
  ['black-caro-kann-main', 'nd2', 'Caro-Kann: recognise the knight move order', 'Nc3 and Nd2 can reach the same position after Nxe4. Once the bishop is attacked, respond to that contact.', [
    ['e4 c6 d4 d5 Nd2 dxe4 Nxe4', 'Bf5', 'The knight arrived via d2; it now stands on e4 just as in the Classical Nc3 line.'], ['e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3', 'Bg6', 'White attacks the developed bishop. The next task has changed.']]],
  ['black-sicilian-basic', 'morra', 'Sicilian: decline the Morra and recognise the Alapin', 'Use …Nf6 against the Morra offer. After e5, …Nd5 and cxd4 can reach an Alapin structure.', [
    ['e4 c5 d4 cxd4 c3', 'Nf6', 'White offers a pawn for development; this repertoire declines with a developing attack on e4.'], ['e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4', null, 'White has built the Alapin centre. Check the pawn chain and the knight’s support.']]],
  ['black-sicilian-basic', 'wing', 'Sicilian: recognise the wing pawn offer', 'Calculate the offered pawn and central reply before responding to a flank gambit.', [
    ['e4 c5 b4', null, 'White offers the b-pawn to divert c5. Check the centre after accepting.'], ['e4 c5 Nf3 d6 b4', null, 'The same wing idea arrives after development. Reassess the changed piece placement.']]],
  ['black-vienna-main', 'four-knights', 'Vienna: recognise a Four Knights transposition', 'A covered position can be reached in another move order. Other 1…e5 systems still need their own courses.', [
    ['e4 e5 Nc3 Nf6 Nf3', 'Nc6', 'White has developed Nf3 instead of playing the Vienna Gambit. Develop the other knight.'], ['e4 e5 Nf3 Nc6 Nc3', 'Nf6', 'The knights developed in another order; the same Four Knights position is available.']]],
  ['black-queens-gambit-main', 'queen', 'QGD: recognise early queen pressure', 'An early queen move changes concrete threats; meet checks and pressure while developing.', [
    ['d4 d5 c4 e6 Nc3 Nf6 Qb3', null, 'White puts pressure on b7 and d5. Count defenders before chasing the queen.'], ['d4 d5 c4 e6 Qa4+', null, 'White checks along a diagonal. Resolve the check before carrying on with the normal setup.']]],
  ['black-london-main', 'c4', 'London: recognise the switch to c4', 'A London bishop move followed by c4 can reach a QGD Bf4 position; without c4 the London triangle has different central tension.', [
    ['d4 d5 Bf4 Nf6 c4 e6 Nc3', null, 'White has reached the QGD Bf4 structure through a London move order.'], ['d4 d5 Bf4 Nf6 e3 e6 Nf3', 'c5', 'White keeps the London centre. Challenge d4 with the c-pawn.']]],
  ['black-alien-gambit-defense', 'boundaries', 'Alien defense: recognise the Classical boundary', 'The Ng5 module follows …Nf6. A Classical …Bf5 position calls for the Caro-Kann bishop plan instead.', [
    ['e4 c6 d4 d5 Nd2 dxe4 Nxe4 Nf6 Ng5', 'Nbd7', 'The knight came from d2, but the Alien entry position is unchanged.'], ['e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3', 'Bg6', 'This is the Classical Caro-Kann, not the Alien entry. Respond to the attacked bishop.']]]
];
const engine = await createEngine(); const evidence = []; const result = [];
try {
  for (const [family, slug, title, principle, scenarios] of drills) {
    const compiled = [];
    for (const [index, [moves, prescribed, prompt]] of scenarios.entries()) {
      const board = new Chess(); const path = moves.split(' '); path.slice(0, -1).forEach(move => board.move(move)); const setupFen = board.fen(); const opponent = board.move(path.at(-1));
      const before = await engine.analyse(board.fen()); const san = prescribed ?? before.best;
      const move = board.move(san); const after = await engine.analyse(board.fen()); const lossCp = after.whiteCp - before.whiteCp;
      if (lossCp > 100 || before.whiteCp === null || after.whiteCp === null) throw new Error(title + ': unsupported answer ' + san);
      evidence.push({ id: family + '/' + slug + '/' + index, before, move: san, after, lossCp });
      compiled.push({ id: 'scenario-' + (index + 1), setupFen, opponentMoveUci: opponent.from + opponent.to, prompt, change: prompt, preferredMovesUci: [move.from + move.to + (move.promotion ?? '')], acceptableMovesUci: [], hint: principle, teachingPoint: `${san}: ${principle} One illustrative reply is ${after.best}; reassess rather than copying the old move order.`, watchFor: 'Checks and captures take priority over the name of the opening.' });
    }
    result.push({ key: `concept:${family}:recognition-${slug}`, openingFamilyKey: family, title, principle, summary: principle, themes: ['development', 'move-order'], depth: 'foundation', order: 200 + result.length,
      planPrompt: 'What should guide your response?', planChoices: [{ id: 'position', label: principle, correct: true, feedback: principle }, { id: 'routine', label: 'Play the memorised move even when the position differs.', correct: false, feedback: 'Identify the threat and the actual pawn structure before choosing the move.' }], scenarios: compiled });
    console.log(title);
  }
  writeFileSync('src/data/blackRecognitionContent.json', JSON.stringify(result, null, 2) + '\n');
  writeFileSync('outputs/black-courses/recognition-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
} finally { engine.close(); }
