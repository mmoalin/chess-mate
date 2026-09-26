import './register-typescript.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { EngineService } = await import('../src/services/engineService.ts');
const { importGame } = await import('../src/features/gameReview/import.ts');
const { GameAnalysisController, analysisSummary } = await import('../src/features/gameReview/analysis.ts');
const { GameReviewRepository } = await import('../src/features/gameReview/repository.ts');
const { ANALYSIS_VERSION } = await import('../src/features/gameReview/types.ts');
// Legal 33-ply tactical game fixture: castling, captures and terminal checkmate.
const pgn='1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const directory='outputs/game-review/staging'; mkdirSync(directory,{recursive:true});
const timings=[];
const engine=new EngineService(() => {
  const child=spawn(process.execPath,['node_modules/stockfish/src/stockfish-17.1-asm-341ff22.js']);
  const worker={onmessage:null,onerror:null,postMessage:message=>{ if (!child.killed) child.stdin.write(message+'\n'); },terminate:()=>child.kill()};
  let buffer='';
  child.stdout.on('data',chunk=>{ buffer+=chunk; const lines=buffer.split('\n'); buffer=lines.pop(); for(const data of lines) worker.onmessage?.({data:data.trim()}); });
  child.on('error',error=>worker.onerror?.(error));
  child.stdin.on('error',error=>{ if (!child.killed) worker.onerror?.(error); });
  return worker;
});
const measured={stop:()=>engine.stop(),analyze:async(fen,settings)=>{
  const start=performance.now();
  try { const result=await engine.analyze(fen,settings); timings.push({fen,settings,elapsedMs:Math.round(performance.now()-start),depth:result.depth}); return result; }
  catch(error) { timings.push({fen,settings,elapsedMs:Math.round(performance.now()-start),error:error.message}); throw error; }
}};
let repository=new GameReviewRepository(null);
const reports=[];
try {
  for (const side of ['white','black']) {
    const game=await importGame(pgn,side),runId=game.id+':'+ANALYSIS_VERSION;
    await repository.save('local','game',game);
    const controller=new GameAnalysisController(measured);
    let paused=false;
    const save=async result=>{ await repository.save('local','position',result); };
    if(side==='white') {
      await assert.rejects(controller.run(game,runId,[],async result=>{
        await save(result);
        if(!paused && result.evidence) { paused=true; controller.stop(); }
      }),{name:'AbortError'});
      assert.equal(paused,true);
      repository=new GameReviewRepository(null); // restore completed positions through repository
      console.log('Pause and repository reload retained the first completed position.');
    }
    const retained=(await repository.load('local')).positions;
    const completedKeys=new Set(retained.filter(p=>p.evidence).map(p=>p.depth+':'+p.fen));
    const timingStart=timings.length;
    await controller.run(game,runId,retained,save);
    assert.ok(timings.slice(timingStart).every(t=>!completedKeys.has(t.settings.depth+':'+t.fen)),'Resume must reuse completed exact-FEN evidence');
    const positions=(await repository.load('local')).positions.filter(p=>p.runId===runId);
    const summary=analysisSummary(game,runId,positions);
    assert.ok(summary.findings.length<=3);
    assert.ok(summary.findings.every(f=>f.before.depth>=16 && f.after.depth>=16));
    assert.ok(summary.findings.every(f=>f.played!==f.alternative),'A teaching moment must offer a different confirmed move');
    assert.ok(positions.filter(p=>p.error).every(p=>!p.evidence),'Timeouts must remain incomplete');
    reports.push({side,plies:game.moves.length,summary,positions});
    writeFileSync(directory+'/long-game-engine.json',JSON.stringify({engine:'Stockfish 17.1 ASM',scope:'Node worker adapter; not mobile hardware',pgn,pauseResumePassed:paused||side==='black',reports,timings},null,2)+'\n');
    console.log(JSON.stringify({side,completed:summary.completed,total:summary.total,findings:summary.findings.length,incomplete:!summary.complete}));
    controller.stop();
  }
} finally { engine.stop(); }
