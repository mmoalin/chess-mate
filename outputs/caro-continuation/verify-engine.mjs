import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { Chess } from 'chess.js';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(specifier + '.ts', context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
    return nextLoad(url, context);
  }
});
const { starterConnectedLessons } = await import('../../src/data/connectedLessons.ts');

const journey = starterConnectedLessons[1].continuation;
const engine = spawn(process.execPath, ['node_modules/stockfish/src/stockfish-17.1-lite-single-03e3232.js']);
const depth = 18;
let buffer = '', onLine = () => {};
engine.stdout.on('data', (chunk) => { buffer += chunk; const lines = buffer.split('\n'); buffer = lines.pop(); lines.forEach((line) => onLine(line.trim())); });
engine.stderr.on('data', (chunk) => process.stderr.write(chunk));
await new Promise((resolve) => { onLine = (line) => { if (line === 'uciok') resolve(); }; engine.stdin.write('uci\n'); });
async function analyse(board) {
  return new Promise((resolve, reject) => {
    let last;
    const timeout = setTimeout(() => { engine.kill(); reject(new Error('Engine timeout')); }, 30000);
    onLine = (line) => {
      if (line === 'readyok') engine.stdin.write(`position fen ${board.fen()}\ngo depth ${depth}\n`);
      if (line.startsWith('info depth') && line.includes(' score ')) last = line;
      if (line.startsWith('bestmove')) {
        clearTimeout(timeout);
        const pv = new Chess(board.fen());
        const moves = last?.split(' pv ')[1]?.split(' ').map((move) => pv.move(move).san) ?? [];
        resolve({ fen: board.fen(), raw: last, best: moves[0], pv: moves, whiteCp: last?.includes('score cp') ? Number(last.match(/score cp (-?\d+)/)[1]) * (board.turn() === 'w' ? 1 : -1) : null });
      }
    };
    engine.stdin.write('ucinewgame\nisready\n');
  });
}
const board = new Chess(); journey.openingPrefix.forEach((move) => board.move(move));
const evidence = { engine: 'Stockfish 17.1 lite single, local WASM', depth, perspective: 'White centipawns; finite-depth evidence, not definitive positional verdicts', checkpoints: [] };
try {
  for (const step of journey.steps) {
    step.bridge.forEach(({ san }) => board.move(san));
    const record = { id: step.id, before: await analyse(board), candidates: [] };
    for (const candidate of step.candidates) {
      const after = new Chess(board.fen()); after.move(candidate.move);
      const item = { move: candidate.move, assessment: candidate.assessment, afterCandidate: await analyse(after), replies: [] };
      for (const reply of candidate.replies) {
        const replied = new Chess(after.fen()); replied.move(reply.move);
        item.replies.push({ move: reply.move, analysis: await analyse(replied) });
      }
      record.candidates.push(item);
    }
    evidence.checkpoints.push(record);
    console.log(step.id + ': ' + record.candidates.map((candidate) => candidate.move + ' ' + candidate.afterCandidate.whiteCp + 'cp, best reply ' + candidate.afterCandidate.best).join('; '));
    step.main.forEach(({ san }) => board.move(san));
  }
  evidence.finalPgn = board.pgn(); evidence.finalFen = board.fen();
  writeFileSync('outputs/caro-continuation/engine-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
} finally { engine.stdin.write('quit\n'); }
