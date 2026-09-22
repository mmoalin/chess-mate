import { note } from './authoring-annotations.mjs';
import './register-typescript.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { Chess } from 'chess.js';
import { createEngine } from './chess-engine.mjs';
const { blackChapterSeeds: seeds, blackCourseDefinitions: families } = await import('../src/data/blackCourseSeeds.ts');
const directory = 'outputs/black-courses';
mkdirSync(directory, { recursive: true });
const evidencePath = directory + '/authoring-evidence.json';
const contentPath = 'src/data/blackCourseContent.json';
const settings = { engine: 'Stockfish 17.1 lite single local WASM', depth: 18, hash: 16, perspective: 'White centipawns' };
const evidence = existsSync(evidencePath) ? JSON.parse(readFileSync(evidencePath, 'utf8')) : { settings, analyses: {} };
const content = existsSync(contentPath) ? JSON.parse(readFileSync(contentPath, 'utf8')) : {};
const engine = await createEngine();
const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
let lastContent = JSON.stringify(content, null, 2) + '\n';
const save = async () => { for (const [path, value] of [[evidencePath, evidence], [contentPath, content]]) { const serialized = JSON.stringify(value, null, 2) + '\n'; if (path === contentPath && serialized === lastContent) continue; for (let retry = 0; ; retry++) { try { writeFileSync(path + '.tmp', serialized); renameSync(path + '.tmp', path); if (path === contentPath) lastContent = serialized; break; } catch(error) { if(retry >= 6) throw error; await new Promise(resolve => setTimeout(resolve, 300)); } } } };
async function analyse(board, count = 1) {
  const key = JSON.stringify([settings, count, board.fen()]);
  if (!evidence.analyses[key]) { evidence.analyses[key] = await engine.analyse(board.fen(), 18, count); await save(); }
  return evidence.analyses[key];
}
function replay(sequence) { const board = new Chess(); sequence.forEach(move => board.move(move)); return board; }
function annotated(board, san) { const item = { san, note: note(board, san) }; board.move(san); return item; }
async function path(board, count) {
  const result = [];
  for (let ply = 0; ply < count; ply++) { const row = await analyse(board); result.push(annotated(board, row.best)); }
  return result;
}
async function mistake(board, best) {
  const legal = board.moves({ verbose: true }).filter(move => move.san !== best.best).map(move => {
    const after = new Chess(board.fen()); after.move(move.san);
    return { move, risk: (after.isAttacked(move.to, after.turn()) ? values[move.piece] : 0) - (values[move.captured] ?? 0) };
  }).sort((a, b) => b.risk - a.risk);
  for (const { move } of legal.slice(0, 5)) {
    const after = new Chess(board.fen()); after.move(move.san); const result = await analyse(after);
    const loss = (best.whiteCp - result.whiteCp) * (board.turn() === 'w' ? 1 : -1);
    if (best.whiteCp !== null && result.whiteCp !== null && loss > 120) return { san: move.san,
      note: `${move.san} allows ${result.pv.slice(0, 3).join(' ')}. This concrete response is stronger for the opponent than the lesson move; check the threats before continuing the plan.`, lossCp: loss };
  }
  throw new Error('No verified mistake found: ' + board.fen());
}
try {
  // Validate every entry before spending engine time.
  for (const seed of seeds) { const board = replay(seed.opening.split(' ')); if (board.turn() !== 'b') throw new Error('Wrong entry turn: ' + seed.title); }
  if (!process.argv.includes('--journeys')) for (const seed of seeds) {
    const key = seed.family + '/' + seed.slug;
    if (content[key]) continue;
    const opening = seed.opening.split(' '); const board = replay(opening);
    const best = await analyse(board);
    const main = await path(new Chess(board.fen()), 7);
    const branch = replay([...opening, main[0].san]);
    const replies = await analyse(branch, 3);
    const different = replies.find(row => row.best !== main[1].san && row.whiteCp !== null && Math.abs(row.whiteCp - replies[0].whiteCp) < 100) ?? replies.find(row => row.best !== main[1].san);
    if (!different) throw new Error('Missing distinct opponent reply: ' + key);
    const opponent = annotated(branch, different.best);
    const transfer = [opponent, ...await path(branch, 3)];
    const bad = await mistake(board, best);
    const openingBoard = new Chess();
    content[key] = { opening: opening.map(san => annotated(openingBoard, san)), main, transfer, mistake: bad };
    await save(); console.log('Authored ' + key + ': ' + main.map(item => item.san).join(' '));
  }
  if (process.argv.includes('--journeys')) for (const family of families.slice(1)) {
    const key = family.key + '/main'; const chapter = content[key]; if (!chapter || chapter.journey) continue;
    const prefix = [...chapter.opening, ...chapter.main].map(item => item.san);
    const board = replay(prefix); const played = []; const candidates = []; const visits = new Map();
    // Save the evolving illustration so an interrupted authoring run can reuse every analysis.
    for (let ply = 0; ply < 180 && !board.isGameOver(); ply++) {
      let row = await analyse(board);
      if (['black-vienna-main', 'black-queens-gambit-main', 'black-london-main'].includes(family.key)) {
        const options = [...await analyse(board, 5)];
        for (const castle of board.moves().filter(san => san.startsWith('O-O'))) { if (!options.some(option => option.best === castle)) { const after = new Chess(board.fen()); after.move(castle); const evaluation = await analyse(after); options.push({ ...evaluation, best: castle }); } }
        const eligible = options.filter(option => option.whiteCp !== null && row.whiteCp !== null && (row.whiteCp - option.whiteCp) * (board.turn() === 'w' ? 1 : -1) <= 50);
        const score = option => { const after = new Chess(board.fen()); const move = after.move(option.best); const key = after.fen().split(' ').slice(0, 4).join(' '); const queen = after.board().flat().find(piece => piece?.type === 'q' && piece.color === move.color); const offersQueens = queen && after.attackers(queen.square, after.turn()).some(square => after.get(square)?.type === 'q'); const rook = after.board().flat().find(piece => piece?.type === 'r' && piece.color === move.color); const rookContact = queen && rook && after.attackers(rook.square, after.turn()).some(square => after.get(square)?.type === 'r'); return (values[move.captured] ?? 0) * 2 + (offersQueens ? 40 : 0) + (move.isKingsideCastle() || move.isQueensideCastle() ? 12 : 0) - (queen && (rookContact || move.captured === 'r') ? 30 : 0) - (visits.get(key) ?? 0) * 20; };
        row = eligible.sort((a, b) => score(b) - score(a))[0] ?? row;
      }
      if (board.turn() === 'b') {
        const material = board.board().flat().filter(piece => piece && !['p', 'k'].includes(piece.type));
        const ending = (!material.some(piece => piece.type === 'q') && material.length <= 6 && material.some(piece => piece.type === 'r' && piece.color === 'b')) || (family.key === 'black-london-main' && material.length <= 4);
        candidates.push({ offset: played.length, fen: board.fen(), ending });
        if (ending && ply >= 24) {
          const options = await analyse(board, 3);
          const root = await analyse(board);
          let sound = 0;
          for (const option of options) {
            const after = new Chess(board.fen()); after.move(option.best); const response = await analyse(after);
            if (root.whiteCp !== null && response.whiteCp !== null && response.whiteCp - root.whiteCp <= 100) sound++;
          }
          if (sound >= 2) break;
        }
      }
      played.push(annotated(board, row.best));
      const visitedKey = board.fen().split(' ').slice(0, 4).join(' '); visits.set(visitedKey, (visits.get(visitedKey) ?? 0) + 1);
    }
    const end = candidates.findLastIndex(candidate => candidate.ending);
    if (end < 5) throw new Error('Illustration needs an ending: ' + family.key);
    const selected = [...new Set([0, Math.round(end * .18), Math.round(end * .36), Math.round(end * .55), Math.round(end * .76), end])];
    const steps = []; let consumed = 0;
    for (const [index, desiredIndex] of selected.entries()) {
      let selectedIndex = desiredIndex;
      let accepted, position, before, preferred;
      const pool = candidates.map((candidate, candidateIndex) => ({ ...candidate, candidateIndex }))
        .filter(candidate => candidate.offset >= consumed && candidate.candidateIndex <= end - (5 - index) && (index !== 5 || candidate.ending))
        .sort((a, b) => Math.abs(a.candidateIndex - desiredIndex) - Math.abs(b.candidateIndex - desiredIndex));
      for (const trial of pool) {
      selectedIndex = trial.candidateIndex;
      position = candidates[selectedIndex];
      if (position.offset < consumed) continue;
      before = new Chess(position.fen);
      const alternatives = await analyse(before, 3);
      preferred = selectedIndex === end ? alternatives[0].best : played[position.offset].san;
      const best = await analyse(before);
      accepted = [];
      for (const san of [preferred, ...alternatives.map(row => row.best)].filter((san, i, all) => all.indexOf(san) === i)) {
        const after = new Chess(before.fen()); after.move(san); const response = await analyse(after);
        const loss = response.whiteCp === null || best.whiteCp === null ? 10000 : response.whiteCp - best.whiteCp;
        if (loss <= 100) accepted.push({ move: san, note: note(before, san), reply: response.best, replyNote: note(after, response.best) });
        if (accepted.length === 2) break;
      }
      if (accepted.length === 2 && accepted[0].move === preferred) break;
      }
      if (!accepted || accepted.length < 2 || accepted[0].move !== preferred || selectedIndex > end) throw new Error('Need two sound journey choices: ' + family.key + '/' + index);
      // An existing bridge follows the original engine reply; retain it and verify separately.
      const main = selectedIndex === end ? [annotated(before, preferred), annotated(before, accepted[0].reply)] : played.slice(position.offset, position.offset + 2);
      accepted[0].reply = main[1].san; accepted[0].replyNote = main[1].note;
      steps.push({ id: ['coordinate', 'counterplay', 'structure', 'improve', 'simplify', 'ending-activity'][index], bridge: played.slice(consumed, position.offset), main, candidates: accepted });
      console.log(`${family.key} checkpoint ${index + 1}: ply ${prefix.length + position.offset}, ${accepted.map(item => item.move).join(' / ')}`);
      consumed = position.offset + 2;
    }
    chapter.journey = steps; await save(); console.log('Journey ' + family.key + ': ' + (prefix.length + played.length) + ' plies to ending');
  }
} finally { await save(); engine.close(); }
