import './register-typescript.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { EngineService } = await import('../src/services/engineService.ts');
const { importGame } = await import('../src/features/gameReview/import.ts');
const { GameAnalysisController, analysisSummary, assessMove } = await import('../src/features/gameReview/analysis.ts');

const raw = [];
const engine = new EngineService(() => {
  const child = spawn(process.execPath, ['node_modules/stockfish/src/stockfish-17.1-asm-341ff22.js']);
  const worker = { onmessage:null, onerror:null, postMessage: (message) => child.stdin.write(message + '\n'), terminate: () => child.kill() };
  let buffer = '';
  child.stdout.on('data',chunk=> { buffer += chunk; const lines=buffer.split('\n'); buffer=lines.pop(); for(const data of lines) { raw.push(data); worker.onmessage?.({data:data.trim()}); } });
  child.on('error',error=>worker.onerror?.(error));
  return worker;
});
const game = await importGame('[Event "Local verification"]\n[SetUp "1"]\n[FEN "3r2k1/6pp/8/8/8/8/6PP/3Q2K1 w - - 0 1"]\n\n1. Qd2 Rxd2 *','white');
const positions=[];
const controller=new GameAnalysisController(engine);
try {
  await controller.run(game,'verification',[],async row=>{positions.push(row);});
  const summary=analysisSummary(game,'verification',positions);
  const assessment=summary.findings[0] ? await assessMove(engine,summary.findings[0].before,summary.findings[0].alternative,'white') : null;
  const alternativeAssessment = summary.findings[0] ? await assessMove(engine,summary.findings[0].before,'Qe1','white') : null;
  mkdirSync('outputs/game-review',{recursive:true});
  writeFileSync('outputs/game-review/engine-evidence.json',JSON.stringify({engine:'Stockfish 17.1 ASM (same asset as browser)',game,positions,summary,assessment,alternativeAssessment,raw},null,2)+'\n');
  assert.equal(summary.complete,true,'All required positions must finish within release timeouts');
  assert.equal(summary.findings.length,1); assert.equal(summary.findings[0].category,'material'); assert.equal(assessment.correct,true);
  console.log('Real ASM engine: depth-12 screening, depth-16 confirmation, material finding and reference assessment passed.');
} finally {controller.stop();}
