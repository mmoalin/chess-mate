import './register-typescript.mjs';
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { createEngine } from './chess-engine.mjs';
const { starterConnectedLessons } = await import('../src/data/connectedLessons.ts');
const { starterConceptDrills } = await import('../src/data/conceptDrills.ts');
const { continuationBoard } = await import('../src/features/connected/continuationJourney.ts');
const { boardAfter } = await import('../src/data/courseBuilder.ts');
const alienOnly = process.argv.includes('--alien');
const directory = alienOnly ? 'outputs/alien-courses' : 'outputs/white-courses';
const path = directory + '/engine-evidence.json';
mkdirSync(directory, { recursive: true });
const evidence = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { engine: 'Stockfish 17.1 lite single, local WASM', depth: 18, perspective: 'White centipawns; finite-depth evidence, not a proof', analyses: {}, claims: [] };
const engine = await createEngine();
const claims = [];
async function save() {
  for (let retry = 0; ; retry++) {
    try { writeFileSync(path, JSON.stringify(evidence, null, 2) + '\n'); return; }
    catch (error) { if (retry >= 5) throw error; await new Promise((resolve) => setTimeout(resolve, 300)); }
  }
}
async function analyse(board) {
  const fen = board.fen();
  if (!evidence.analyses[fen]) { evidence.analyses[fen] = await engine.analyse(fen); await save(); }
  return evidence.analyses[fen];
}
async function check(id, board, san, assessment) {
  const before = await analyse(board);
  const next = new Chess(board.fen()); next.move(san);
  const after = await analyse(next);
  const loss = before.whiteCp === null || after.whiteCp === null ? null : (before.whiteCp - after.whiteCp) * (board.turn() === 'w' ? 1 : -1);
  const claim = { id, fen: board.fen(), move: san, assessment, afterFen: next.fen(), lossCp: loss, best: before.best };
  claims.push(claim);
  console.log(`${id}: ${san} (${assessment}), loss ${loss}cp, best ${before.best}`);
}
try {
  for (const lesson of starterConnectedLessons.filter((l) => l.side === 'white' && (alienOnly ? l.openingFamilyKey === 'white-alien-gambit-main' : l.openingFamilyKey !== 'white-alien-gambit-main'))) {
    for (const decision of Object.values(lesson.decisions)) {
      const board = boardAfter(decision.movesBefore);
      for (const answer of decision.answers) await check(`${lesson.key}/${decision.id}`, board, answer.moveSan, 'accepted');
      for (const san of Object.keys(decision.mistakes)) await check(`${lesson.key}/${decision.id}/mistake`, board, san, 'mistake');
    }
    if (lesson.continuation) for (const [index, step] of lesson.continuation.steps.entries()) {
      const board = continuationBoard(lesson.continuation, index);
      for (const candidate of step.candidates) {
        await check(`${lesson.key}/continuation:${step.id}`, board, candidate.move, candidate.assessment);
        const after = new Chess(board.fen()); after.move(candidate.move);
        for (const reply of candidate.replies) await check(`${lesson.key}/continuation:${step.id}/${candidate.move}/reply`, after, reply.move, reply.sound ? 'accepted' : 'mistake');
      }
    }
    if (alienOnly && lesson.continuation) {
      const replay = boardAfter(lesson.continuation.openingPrefix);
      for (const step of lesson.continuation.steps) for (const [index, move] of [...step.bridge, ...step.main].entries()) {
        await check(`${lesson.key}/illustration:${step.id}/${index}`, replay, move.san, 'illustrative connecting move');
        replay.move(move.san);
      }
    }
  }
  for (const drill of starterConceptDrills.filter((d) => d.openingFamilyKey.startsWith('white-') && (alienOnly ? d.openingFamilyKey === 'white-alien-gambit-main' : d.openingFamilyKey !== 'white-alien-gambit-main'))) for (const scenario of drill.scenarios) {
    const board = new Chess(scenario.setupFen); board.move(scenario.opponentMoveUci);
    for (const move of [...scenario.preferredMovesUci, ...scenario.acceptableMovesUci]) await check(`${drill.key}/${scenario.id}`, board, move, 'accepted');
  }
  evidence.claims = claims;
  writeFileSync(path, JSON.stringify(evidence, null, 2) + '\n');
} finally { engine.close(); }
