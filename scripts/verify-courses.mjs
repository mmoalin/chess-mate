import './register-typescript.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { Chess } from 'chess.js';
import { createEngine } from './chess-engine.mjs';
import { isLegacyBaseline, verificationDirectory } from './verification-policy.mjs';
const { contentFingerprint } = await import('../src/domain/repertoire/contentFingerprint.ts');
const { starterConnectedLessons } = await import('../src/data/connectedLessons.ts');
const { starterConceptDrills } = await import('../src/data/conceptDrills.ts');
const { validateConnectedLesson } = await import('../src/features/connected/session.ts');
const { continuationBoard } = await import('../src/features/connected/continuationJourney.ts');
const args = process.argv.slice(2);
const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const side = value('--side') ?? 'white';
const family = value('--course') ?? (args.includes('--alien') ? 'white-alien-gambit-main' : undefined);
const directory = verificationDirectory({ side, family, exclude: value('--exclude-course'), output: value('--output') });
mkdirSync(directory, { recursive: true });
const path = directory + '/engine-evidence.json';
const settings = { engine: 'Stockfish 17.1 lite single local WASM', depth: 18, hash: 16, perspective: 'White centipawns' };
const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
const evidence = { settings, analyses: previous.settings && JSON.stringify(previous.settings) === JSON.stringify(settings) ? previous.analyses : {}, claims: [], limitations: 'Finite-depth engine comparisons are evidence, not proofs. Model journeys are illustrative.' };
for (const cache of ['outputs/white-companions/authoring-evidence.json', 'outputs/black-courses/engine-evidence.json', 'outputs/white-courses/engine-evidence.json', 'outputs/alien-courses/engine-evidence.json', directory + '/authoring-evidence.json']) if (existsSync(cache)) {
  const authored = JSON.parse(readFileSync(cache, 'utf8'));
  if (JSON.stringify(authored.settings) === JSON.stringify(settings)) Object.assign(evidence.analyses, authored.analyses);
}
const engine = await createEngine();
const selected = starterConnectedLessons.filter(lesson => (side === 'all' || lesson.side === side) && (!family || lesson.openingFamilyKey === family) && lesson.openingFamilyKey !== value('--exclude-course'));
if (!['white', 'black', 'all'].includes(side) || !selected.length) { engine.close(); throw new Error('Verification selection matches no courses or has an invalid side.'); }
const families = new Set(selected.map(lesson => lesson.openingFamilyKey));
const failures = [];
async function save() {
  for (let retry = 0; ; retry++) { try { writeFileSync(path + '.tmp', JSON.stringify(evidence, null, 2) + '\n'); renameSync(path + '.tmp', path); return; }
    catch(error) { if (retry >= 6) throw error; await new Promise(resolve => setTimeout(resolve, 300)); } }
}
async function analyse(board) {
  const key = JSON.stringify([settings, 1, board.fen()]);
  if (!evidence.analyses[key]) { evidence.analyses[key] = await engine.analyse(board.fen(), 18); await save(); }
  return evidence.analyses[key];
}
function boardAfter(sequence) { const board = new Chess(); sequence.forEach(move => board.move(move)); return board; }
async function check(id, board, san, assessment, baseline = false) {
  const before = await analyse(board); const afterBoard = new Chess(board.fen()); afterBoard.move(san); const after = await analyse(afterBoard);
  if (!before || !after) throw new Error('Missing nonterminal analysis: ' + id);
  const loss = before.whiteCp === null || after.whiteCp === null ? null : (before.whiteCp - after.whiteCp) * (board.turn() === 'w' ? 1 : -1);
  const claim = { id, fen: board.fen(), move: san, learnerSide: board.turn() === 'w' ? 'white' : 'black', assessment, baseline, afterFen: afterBoard.fen(), lossCp: loss, best: before.best, pv: after.pv, whiteCpBefore: before.whiteCp, whiteCpAfter: after.whiteCp };
  evidence.claims.push(claim);
  if (!baseline && ['accepted', 'sound opponent reply', 'illustrative connecting move'].includes(assessment) && (loss === null || loss > 100)) failures.push(claim);
  if (!baseline && assessment === 'mistake' && (loss === null || loss < 100)) failures.push(claim);
  if (before.depth < 18 || after.depth < 18) failures.push({ ...claim, issue: 'Insufficient depth' });
  console.log(`${id}: ${san} (${assessment}), loss ${loss}cp${baseline ? ' [preserved baseline]' : ''}`);
}
try {
  for (const lesson of selected) {
    const issues = validateConnectedLesson(lesson); if (issues.length) throw new Error(lesson.key + ': ' + issues.join('; '));
    const baseline = isLegacyBaseline('lessons', lesson, contentFingerprint);
    if (!baseline) {
      const opening = new Chess();
      for (const [index, san] of lesson.openingMoves.entries()) { await check(`${lesson.key}/opening:${index}`, opening, san, 'entry position', baseline); opening.move(san); }
    }
    for (const decision of Object.values(lesson.decisions)) {
      const board = boardAfter(decision.movesBefore);
      for (const answer of decision.answers) {
        await check(`${lesson.key}/${decision.id}`, board, answer.moveSan, 'accepted', baseline);
        const replyBoard = new Chess(board.fen()); replyBoard.move(answer.moveSan);
        for (const san of answer.repliesSan) { await check(`${lesson.key}/${decision.id}/reply`, replyBoard, san, 'sound opponent reply', baseline); replyBoard.move(san); }
      }
      for (const san of Object.keys(decision.mistakes)) await check(`${lesson.key}/${decision.id}/mistake`, board, san, 'mistake', baseline);
    }
    const transfer = lesson.decisions[lesson.transferStartId];
    const transferBoard = boardAfter(lesson.transferCheckpointMoves);
    for (const san of transfer.movesBefore.slice(lesson.transferCheckpointMoves.length)) {
      await check(`${lesson.key}/transfer-entry`, transferBoard, san, 'sound opponent reply', baseline);
      transferBoard.move(san);
    }
    if (lesson.continuation) {
      for (const [index, step] of lesson.continuation.steps.entries()) {
        const board = continuationBoard(lesson.continuation, index);
        for (const candidate of step.candidates) {
          await check(`${lesson.key}/continuation:${step.id}`, board, candidate.move, candidate.assessment, baseline);
          const after = new Chess(board.fen()); after.move(candidate.move);
          for (const reply of candidate.replies) await check(`${lesson.key}/continuation:${step.id}/${candidate.move}/reply`, after, reply.move, reply.sound ? 'sound opponent reply' : 'mistake', baseline);
        }
      }
      const board = boardAfter(lesson.continuation.openingPrefix);
      for (const step of lesson.continuation.steps) for (const [index, move] of [...step.bridge, ...step.main].entries()) {
        await check(`${lesson.key}/illustration:${step.id}/${index}`, board, move.san, 'illustrative connecting move', baseline); board.move(move.san);
      }
    }
  }
  for (const drill of starterConceptDrills.filter(drill => families.has(drill.openingFamilyKey))) for (const scenario of drill.scenarios) {
    const board = new Chess(scenario.setupFen);
    // A recognition/setup move can deliberately be inferior. Record its exact
    // evidence without representing it as a recommended opponent reply.
    await check(`${drill.key}/${scenario.id}/setup`, board, scenario.opponentMoveUci, 'entry position', isLegacyBaseline('drills', drill, contentFingerprint));
    board.move(scenario.opponentMoveUci);
    for (const san of [...scenario.preferredMovesUci, ...scenario.acceptableMovesUci]) await check(`${drill.key}/${scenario.id}`, board, san, 'accepted', isLegacyBaseline('drills', drill, contentFingerprint));
  }
  evidence.failures = failures;
  await save();
  console.log(`${evidence.claims.length} claims checked; ${failures.length} require author review.`);
  if (failures.length) process.exitCode = 1;
} finally { await save(); engine.close(); }
