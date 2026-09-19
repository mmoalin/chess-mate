import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

/** Serial UCI driver used by authoring verification; no network engine. */
export async function createEngine() {
  const processHandle = spawn(process.execPath, ['node_modules/stockfish/src/stockfish-17.1-lite-single-03e3232.js']);
  let buffer = '', handle = () => {};
  processHandle.stdout.on('data', (chunk) => { buffer += chunk; const lines = buffer.split('\n'); buffer = lines.pop(); lines.forEach((line) => handle(line.trim())); });
  processHandle.stderr.on('data', (chunk) => process.stderr.write(chunk));
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Engine initialization timed out')), 30000);
    processHandle.once('error', reject);
    handle = (line) => { if (line === 'uciok') { clearTimeout(timeout); resolve(); } };
    processHandle.stdin.write('uci\n');
  });
  return {
    async analyse(fen, depth = 18, multiPV = 1) {
      return new Promise((resolve, reject) => {
        const rows = new Map();
        const timeout = setTimeout(() => { processHandle.kill(); reject(new Error('Engine timeout: ' + fen)); }, 120000);
        handle = (line) => {
          if (line === 'readyok') processHandle.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
          if (line.startsWith('info depth') && line.includes(' score ') && line.includes(' pv ')) rows.set(Number(line.match(/multipv (\d+)/)?.[1] ?? 1), line);
          if (line.startsWith('bestmove')) {
            clearTimeout(timeout);
            const records = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, raw]) => {
              const board = new Chess(fen);
              const turn = board.turn();
              const pv = raw.split(' pv ')[1].trim().split(' ').map((uci) => board.move(uci).san);
              return { fen, depth: Number(raw.match(/depth (\d+)/)[1]), best: pv[0], pv, whiteCp: raw.includes('score cp') ? Number(raw.match(/score cp (-?\d+)/)[1]) * (turn === 'w' ? 1 : -1) : null, mate: raw.match(/score mate (-?\d+)/)?.[1], raw };
            });
            resolve(multiPV === 1 ? records[0] : records);
          }
        };
        processHandle.stdin.write(`setoption name MultiPV value ${multiPV}\nucinewgame\nisready\n`);
      });
    },
    close() { processHandle.stdin.write('quit\n'); }
  };
}
