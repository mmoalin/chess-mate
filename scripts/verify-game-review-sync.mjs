// Runs the real repository against the real migration in disposable PostgreSQL.
// The adapter replaces HTTP/auth transport only; conflict and RLS rules execute in SQL.
import './register-typescript.mjs';
import { PGlite } from '../outputs/game-review/db-runtime/node_modules/@electric-sql/pglite/dist/index.js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { GameReviewRepository } = await import('../src/features/gameReview/repository.ts');
const { importGame } = await import('../src/features/gameReview/import.ts');
const db = new PGlite();
const account = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
class DeviceStore {
  records = new Map();
  async get(key) { return structuredClone(this.records.get(key) ?? null); }
  async put(key, value) { this.records.set(key, structuredClone(value)); }
  async list(prefix) { return [...this.records].filter(([key]) => key.startsWith(prefix)).map(([, value]) => structuredClone(value)); }
}
function device() {
  const connection = { owner: account, offline: false };
  const request = async (action) => {
    if (connection.offline) return { error: { message: 'Device offline' } };
    try {
      await db.exec('reset role; set role authenticated;');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [connection.owner]);
      return { data: (await action()).rows };
    } catch (error) { return { error }; }
  };
  const client = {
    rpc: (_name, p) => request(() => db.query('select * from public.write_game_review_record($1::uuid,$2,$3,$4::jsonb,$5,$6::uuid,$7)', [p.p_owner,p.p_kind,p.p_id,JSON.stringify(p.p_value),p.p_revision,p.p_mutation,p.p_deleted])),
    from: () => {
      let owner;
      const query = { select: () => query, eq: (_field,value) => { owner=value; return query; }, order: () => query,
        range: (start,end) => request(() => db.query('select * from public.game_review_records where user_id=$1::uuid order by kind,id offset $2 limit $3',[owner,start,end-start+1])) };
      return query;
    }
  };
  const store = new DeviceStore();
  return { connection, store, client, repository: new GameReviewRepository(client,store) };
}
const checks = [];
try {
  await db.exec(`create role authenticated; create role anon; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
    insert into auth.users values ('${account}'),('${other}');`);
  const a=device(), b=device();
  const game=await importGame('1. e4 e5 2. Nf3 Nc6 *','white');
  await a.repository.save('local','game',game);
  assert.equal((await a.repository.load(account)).games.length,0);
  await a.repository.copyGuest(account);
  assert.match(await a.repository.sync(account),/sync pending/);
  assert.equal(await a.repository.pending(account),1);
  await db.exec('reset role');
  await db.exec(readFileSync('supabase/migrations/202609260001_game_review.sql','utf8'));
  assert.equal(await a.repository.sync(account),'Games and practice synced.');
  await b.repository.sync(account);
  assert.equal((await b.repository.load(account)).games.length,1);
  checks.push('Explicit guest copy, unavailable migration, retained outbox and recovery');

  const run={schema:1,id:'run',gameId:game.id,version:'fixture',createdAt:'2026-09-26T00:00:00Z'};
  await a.repository.save(account,'run',run); await a.repository.sync(account); await b.repository.sync(account);
  const position={schema:1,id:'position-a',runId:run.id,fen:game.startFen,depth:16,error:'timeout'};
  await a.repository.save(account,'position',position); await a.repository.sync(account);
  const complete={...position,error:undefined,evidence:{fen:game.startFen,version:'fixture',depth:16,requestedDepth:16,score:{type:'cp',value:20},pv:['e2e4']}};
  b.connection.offline=true;
  await b.repository.save(account,'position',complete);
  await b.repository.save(account,'position',{...complete,id:'position-b'});
  assert.match(await b.repository.sync(account),/sync pending/);
  // Simulate refresh using the persisted store, including pending mutations.
  b.repository=new GameReviewRepository(b.client,b.store); b.connection.offline=false;
  await b.repository.sync(account); await a.repository.sync(account);
  assert.equal((await a.repository.load(account)).positions.filter(p=>p.evidence).length,2);
  await a.repository.sync(account); assert.equal((await a.repository.load(account)).positions.length,2);
  checks.push('Two-device partial merge, offline refresh, timeout upgrade and duplicate retry');

  const card={schema:1,id:'card',gameId:game.id,side:'white',version:'fixture',createdAt:run.createdAt,finding:{fen:game.startFen,before:complete.evidence}};
  await a.repository.save(account,'card',card); await a.repository.sync(account); await b.repository.sync(account);
  const draft={schema:1,id:'attempt',cardId:card.id,createdAt:run.createdAt,updatedAt:run.createdAt,move:'e4',plan:'centre',assisted:false};
  await a.repository.save(account,'session',draft); await a.repository.sync(account); await b.repository.sync(account);
  await a.repository.save(account,'session',{...draft,submittedAt:'2026-09-26T00:01:00Z',correct:true}); await a.repository.sync(account);
  await b.repository.save(account,'session',{...draft,move:'d4',plan:'offline plan'});
  assert.match(await b.repository.sync(account),/preserved offline/); await b.repository.sync(account); await a.repository.sync(account);
  const attempts=(await a.repository.load(account)).sessions;
  assert.equal(attempts.length,2);
  assert.equal(attempts.find(s=>s.id==='attempt').correct,true);
  assert.equal(attempts.find(s=>s.originAttemptId==='attempt').practiceOnly,true);
  assert.equal(attempts.find(s=>s.originAttemptId==='attempt').plan,'offline plan');
  checks.push('Submitted answer authority and separately preserved conflicting offline draft');

  await a.repository.save(account,'game',game,true); await a.repository.sync(account);
  // Stale offline device attempts to recreate a previously downloaded record.
  const stale=device(); await stale.repository.save(account,'game',game); await stale.repository.sync(account);
  assert.equal((await stale.repository.load(account)).games.length,0);
  await b.repository.sync(account);
  assert.equal((await b.repository.load(account)).games.length,0);
  assert.equal((await b.repository.load(account)).cards.length,1);
  assert.equal((await b.repository.load(account)).sessions.length,2);
  assert.equal((await a.repository.load('local')).games.length,1);
  checks.push('Tombstones prevent resurrection while practice history and guest data survive');

  const pending=await importGame('1. d4 d5 *','black');
  await a.repository.save(account,'game',pending); a.connection.owner=other;
  assert.match(await a.repository.sync(account),/Account changed/);
  assert.equal(await a.repository.pending(account),1);
  await a.repository.sync(other); assert.equal((await a.repository.load(other)).games.length,0);
  a.connection.owner=account; await a.repository.sync(account); assert.equal(await a.repository.pending(account),0);
  checks.push('Account switch cannot redirect pending writes; original owner can retry');

  for(let index=0;index<501;index++) await a.repository.save(account,'position',{...position,id:'paged-'+index});
  await a.repository.sync(account);
  const fresh=device(); await fresh.repository.sync(account);
  assert.equal((await fresh.repository.load(account)).positions.length,503);
  checks.push('A fresh device retrieves all analysis records across the 500-record page boundary');

  mkdirSync('outputs/game-review/staging',{recursive:true});
  const report={runtime:'Real repository + migration on disposable PGlite PostgreSQL',transport:'In-process SQL adapter; hosted PostgREST and browser account sync remain separate checks',productionTouched:false,passed:true,checks};
  writeFileSync('outputs/game-review/staging/sync-verification.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally { await db.close(); }
