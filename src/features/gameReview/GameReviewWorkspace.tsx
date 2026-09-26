import { moveLabel } from '../../core/notation';
import { canonicalContent } from '../../domain/repertoire/contentFingerprint';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ChessBoardUI } from '../../components/ChessBoardUI';
import { EngineService } from '../../services/engineService';
import { matchPgnToRepertoire } from '../../domain/repertoire/pgn';
import type { RepertoireGraph } from '../../domain/repertoire/types';
import { GameReviewRepository } from './repository';
import { digest, importGame } from './import';
import { analysisSummary, assessMove, GameAnalysisController } from './analysis';
import { matchingLessons } from './practice';
import { ANALYSIS_VERSION, type AnalysisRun, type Finding, type Game, type Library, type PracticeCard, type PracticeSession, type Side } from './types';

function displayMove(fen: string, move: string) { try { return new Chess(fen).move(move).san; } catch { return move; } }
const empty: Library = { games: [], runs: [], positions: [], cards: [], sessions: [] };
type Props = { owner: string; repository: GameReviewRepository; graph: RepertoireGraph; selectedKeys: string[]; targetCard?: string; attemptId?: string; onChange: () => void; onCardChange?: (id: string) => void; onLesson: (key: string) => void; onClose: () => void };
export function GameReviewWorkspace({ owner, repository, graph, selectedKeys, targetCard, attemptId, onChange, onCardChange, onLesson, onClose }: Props) {
  const [library, setLibrary] = useState<Library>(empty);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState(() => localStorage.getItem('game-review:selected:' + owner) ?? '');
  const [cardId, setCardId] = useState(targetCard || localStorage.getItem('game-review:card:' + owner) || '');
  const [pgn, setPgn] = useState('');
  const [side, setSide] = useState<Side>(() => localStorage.getItem('game-review:side:' + owner) === 'black' ? 'black' : 'white');
  const [ply, setPly] = useState(0), [line, setLine] = useState<string[] | null>(null);
  const [error, setError] = useState(''), [status, setStatus] = useState('Saved on this device.'), [busy, setBusy] = useState(false);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const controller = useMemo(() => new GameAnalysisController(), []), practiceEngine = useMemo(() => new EngineService(), []);
  const generation = useRef(0), mounted = useRef(true), sessionRef = useRef(session);
  sessionRef.current = session;
  async function reload() { const next = await repository.load(owner); if (mounted.current) { setLibrary(next); setLoaded(true); onChange(); } }
  async function sync() { const text = await repository.sync(owner); if (mounted.current) { setStatus(text); await reload(); } }
  function stop() { generation.current++; controller.stop(); practiceEngine.stop(); setBusy(false); }
  useEffect(() => { mounted.current = true; void reload().then(sync); const online = () => void sync(); window.addEventListener('online', online); return () => { mounted.current = false; generation.current++; controller.stop(); practiceEngine.stop(); window.removeEventListener('online', online); }; }, [owner, repository]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (targetCard) setCardId(targetCard); }, [targetCard]);
  useEffect(() => { localStorage.setItem('game-review:card:' + owner, cardId); onCardChange?.(cardId); }, [owner, cardId, onCardChange]);
  useEffect(() => { localStorage.setItem('game-review:selected:' + owner, selected); }, [owner, selected]);
  const game = library.games.find((g) => g.id === selected);
  const run = library.runs.filter((r) => r.gameId === game?.id && r.version === ANALYSIS_VERSION).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const summary = game && run ? analysisSummary(game, run.id, library.positions) : null;
  const card = library.cards.find((c) => c.id === cardId);
  useEffect(() => {
    if (!card) { setSession(null); return; }
    let active = true;
    const previousId = attemptId ?? localStorage.getItem('game-review:attempt:' + owner + ':' + card.id);
    const saved = library.sessions.find((s) => s.cardId === card.id && (previousId ? s.id === previousId : !s.submittedAt));
    const now = new Date().toISOString();
    const next: PracticeSession = saved ?? { schema: 1, id: attemptId ?? crypto.randomUUID(), cardId: card.id, createdAt: now, updatedAt: now, move: '', plan: '', assisted: false };
    localStorage.setItem('game-review:attempt:' + owner + ':' + card.id, next.id);
    void repository.save(owner, 'session', next).then(() => { if (active) setSession(next); }).catch((e) => setError(String(e)));
    return () => { active = false; };
  }, [card?.id, attemptId]); // eslint-disable-line react-hooks/exhaustive-deps
  function openGame(id: string) { stop(); setSelected(id); setCardId(''); setLine(null); setPly(0); setError(''); }
  async function doImport() {
    setError('');
    try { const imported = await importGame(pgn, side); const existing = library.games.find((g) => g.id === imported.id); if (!existing) await repository.save(owner, 'game', imported); localStorage.setItem('game-review:side:' + owner, side); await reload(); openGame(imported.id); setPgn(''); void sync(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  async function analyse() {
    if (!game || busy) return; stop(); const token = generation.current; setBusy(true); setError('');
    try {
      const activeRun: AnalysisRun = run ?? { schema: 1, id: game.id + ':' + ANALYSIS_VERSION, gameId: game.id, version: ANALYSIS_VERSION, createdAt: new Date().toISOString() };
      await repository.save(owner, 'run', activeRun); await reload();
      if (token !== generation.current) return;
      await controller.run(game, activeRun.id, library.positions, async (result) => { if (token !== generation.current) return; await repository.save(owner, 'position', result); if (mounted.current && owner !== 'local') setStatus('Analysis saved locally; sync pending.'); await reload(); });
      if (token === generation.current) {
        const saved = await repository.load(owner);
        const finished = analysisSummary(game, activeRun.id, saved.positions).complete;
        setError(finished ? '' : 'Some positions are incomplete. Resume / retry to finish; they have not been graded.');
        setStatus(finished ? 'Analysis complete. Select a finding to add to practice.' : 'Completed positions are saved.'); void sync();
      }
    } catch (e) { if (token === generation.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (token === generation.current) setBusy(false); }
  }
  async function addCard(finding: Finding) {
    if (!game) return;
    const version = ANALYSIS_VERSION + ':' + await digest(canonicalContent(finding.before));
    const id = await digest(JSON.stringify([finding.fen, game.side, version]));
    if (!library.cards.some((c) => c.id === id)) await repository.save(owner, 'card', { schema: 1, id, gameId: game.id, side: game.side, version, finding, createdAt: new Date().toISOString() } satisfies PracticeCard);
    await reload(); setStatus('Position added to assessed practice.'); void sync();
  }
  function editSession(changes: Partial<PracticeSession>) {
    const current = sessionRef.current; if (!current || current.submittedAt || busy) return;
    const next = { ...current, ...changes, updatedAt: new Date().toISOString(), error: undefined };
    sessionRef.current = next; setSession(next); setStatus(owner === 'local' ? 'Draft saved on this device.' : 'Draft saved locally; sync pending.'); void repository.save(owner, 'session', next).catch((e) => setError(String(e)));
  }
  async function submit() {
    const current = sessionRef.current; if (!current || !card || current.submittedAt || busy) return;
    const board = new Chess(card.finding.fen);
    try { board.move(current.move); } catch { setError('Choose a legal move, using the board or SAN / UCI notation.'); return; }
    setError(''); setBusy(true); const token = generation.current;
    try {
      const assessed = await assessMove(practiceEngine, card.finding.before, current.move, card.side);
      if (token !== generation.current || !mounted.current) return;
      const now = new Date().toISOString();
      const next = { ...current, ...assessed, submittedAt: now, updatedAt: now, error: undefined };
      await repository.save(owner, 'session', next); if (token !== generation.current || !mounted.current) return; setSession(next); await reload(); void sync();
    } catch (e) { if (token === generation.current) { const next = { ...current, error: 'Ungraded: ' + (e instanceof Error ? e.message : String(e)) }; await repository.save(owner, 'session', next); setSession(next); } }
    finally { if (token === generation.current) setBusy(false); }
  }
  const savedCard = (finding: Finding) => library.cards.find((c) => c.finding.fen === finding.fen && c.side === game?.side && c.version.startsWith(ANALYSIS_VERSION) && canonicalContent(c.finding.before) === canonicalContent(finding.before));
  const fen = card ? card.finding.fen : line ? line[Math.min(ply, line.length - 1)] : game?.fens[Math.min(ply, game.moves.length)];
  const targets: Record<string, string[]> = {};
  if (card && session && !session.submittedAt && !busy) for (const move of new Chess(card.finding.fen).moves({ verbose: true })) (targets[move.from] ??= []).push(move.to);
  function replay(finding: Finding, played: boolean) {
    const evidence = played ? finding.after : finding.before; const board = new Chess(evidence.fen); const fens = [board.fen()];
    for (const move of evidence.pv) { try { board.move(move); fens.push(board.fen()); } catch { break; } }
    setLine(fens); setPly(0);
  }
  const coverage = game ? matchPgnToRepertoire({ graph, pgn: game.pgn, selectedOpeningFamilyKeys: selectedKeys.filter((key) => graph.openings[key]?.side === game.side) }) : null;
  const recurring = (['mate', 'material', 'evaluation'] as const).map((category) => ({ category, games: library.games.filter((g) => library.runs.some((r) => { if (r.gameId !== g.id) return false; const s = analysisSummary(g, r.id, library.positions); return s.complete && s.findings.some((f) => f.category === category); })) }));
  return <section className="game-library" aria-label="My games">
    <div className="button-row"><button onClick={() => { stop(); setSelected(''); setCardId(''); }}>My games</button><button onClick={onClose}>Saved positions and engine play</button></div>
    <p role="status">{status}</p><button onClick={() => void sync()}>Retry game sync</button>
    {owner !== 'local' && <button onClick={() => void repository.copyGuest(owner).then(reload).then(sync).catch((e) => setError(String(e)))}>Copy device games to my account</button>}
    {error && <p role="alert">{error}</p>}
    {!loaded && <p role="status">Loading saved games…</p>}
    {loaded && !game && !card && <>
      <h2>My games</h2><p>Analyse your moves locally, then choose up to three confirmed positions for practice. Analysis alone awards no mastery.</p>
      {library.games.length === 0 && <p>No games saved yet.</p>}
      {library.games.map((g) => <button className="theory-branch-button" key={g.id} onClick={() => openGame(g.id)}>{g.headers.White ?? 'White'} – {g.headers.Black ?? 'Black'} · playing {g.side} · {g.moves.length} plies</button>)}
      <h3>Import game</h3><label>Your colour <select aria-label="Your colour" value={side} onChange={(e) => setSide(e.target.value as Side)}><option value="white">I played White</option><option value="black">I played Black</option></select></label>
      <label>PGN<textarea aria-label="Game PGN" value={pgn} onChange={(e) => setPgn(e.target.value)} /></label>
      <label>Upload one PGN (up to 1 MB)<input type="file" accept=".pgn,text/plain" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 1024 * 1024) { setError('Import one PGN of at most 1 MB.'); return; } void file.text().then(setPgn); }} /></label>
      <button className="primary-button" onClick={() => void doImport()}>Import game</button>
      <h3>Practice positions</h3>{library.cards.map((c) => <button key={c.id} onClick={() => { stop(); setCardId(c.id); }}>Practise position · {c.side} · move {c.finding.fen.split(' ')[5]}</button>)}
      <h3>Recurring findings</h3>{recurring.map(({ category, games }) => <div key={category}><p>{category === 'mate' ? 'Mate-related findings' : category === 'material' ? 'Demonstrated material loss' : 'Other evaluation loss'}: {games.length} distinct completed games</p>{games.map((g) => <button key={g.id} onClick={() => openGame(g.id)}>Example: {g.headers.White ?? 'White'} – {g.headers.Black ?? 'Black'}</button>)}</div>)}
    </>}
    {fen && <div className="game-review-grid"><div><ChessBoardUI fen={fen} orientation={card?.side ?? game?.side ?? 'white'} legalTargets={targets} onMoveAttempt={(from, to, promotion) => { editSession({ move: from + to + (promotion ?? '') }); return true; }} />
      {!card && <><div className="button-row"><button disabled={ply === 0} onClick={() => setPly(ply - 1)}>Previous move</button><button disabled={ply >= (line ? line.length - 1 : game!.moves.length)} onClick={() => setPly(ply + 1)}>Next move</button><button onClick={() => { setLine(null); setPly(0); }}>Game start</button></div><p>{line ? 'Engine continuation' : `Game replay · ply ${ply}${ply ? ' · ' + game?.sans[ply - 1] : ''}`}</p></>}
    </div><div>
      {card && session ? <><h2>Choose your move</h2><p>Find a supported continuation. You can optionally explain your plan.</p><label>Move (SAN or UCI)<input aria-label="Practice move" disabled={!!session.submittedAt || busy} value={session.move} onChange={(e) => editSession({ move: e.target.value })} /></label><label>Your plan<textarea disabled={!!session.submittedAt || busy} value={session.plan} onChange={(e) => editSession({ plan: e.target.value })} /></label>
        {!session.submittedAt && <><button disabled={busy} onClick={() => void submit()}>{busy ? 'Assessing…' : 'Submit move'}</button><button disabled={busy} onClick={() => editSession({ assisted: true })}>Reveal engine alternative</button></>}
        {session.error && <p role="alert">{session.error} Your draft is preserved; submit again to retry.</p>}
        {(session.assisted || session.submittedAt) && <p>Played in the game: {displayMove(card.finding.fen, card.finding.played)}. Engine alternative: {displayMove(card.finding.fen, card.finding.alternative)}. {card.finding.explanation}</p>}
        {session.submittedAt && <><p role="status">{session.correct ? 'Supported move.' : 'This move is outside the supported range.'} {session.assisted || session.practiceOnly ? 'Assisted or additional practice; no independent mastery credit.' : 'Your first graded answer is saved.'}</p><button onClick={() => { const now = new Date().toISOString(); const next: PracticeSession = { schema: 1, id: crypto.randomUUID(), cardId: card.id, createdAt: now, updatedAt: now, move: '', plan: '', assisted: true }; setSession(next); void repository.save(owner, 'session', next); }}>Try again as practice</button></>}
        <button onClick={() => openGame(card.gameId)}>Return to game</button>
      </> : game && <><h2>{game.headers.White ?? 'White'} – {game.headers.Black ?? 'Black'}</h2><p>Analysing {game.side}'s moves. {summary ? `${summary.completed} of ${summary.total} learner moves complete.` : 'Ready for local analysis.'}</p>
        {busy ? <button onClick={() => { stop(); void sync(); }}>Pause analysis</button> : <button className="primary-button" disabled={summary?.complete} onClick={() => void analyse()}>{run ? 'Resume / retry analysis' : `Analyse as ${game.side}`}</button>}
        <p>Repertoire: {!coverage?.matchedOpeningFamilyKey ? 'No match.' : coverage.coverageEnded ? 'Exhausted coverage; later moves are not repertoire mistakes.' : coverage.divergencePly !== null ? coverage.divergingSide === 'learner' ? 'Learner departure; this is not an evaluated mistake.' : 'Opponent deviation.' : 'Within the matched course route.'}</p>
        <div className="button-row"><button onClick={() => { const url = URL.createObjectURL(new Blob([game.pgn], { type: 'application/x-chess-pgn' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'game.pgn'; anchor.click(); URL.revokeObjectURL(url); }}>Export PGN</button><button onClick={() => { stop(); void repository.save(owner, 'game', game, true).then(() => { setSelected(''); return reload(); }).then(sync); }}>Remove game</button></div>
        <h3>Confirmed teaching moments</h3>{summary?.findings.length === 0 && <p>No confirmed findings yet. Incomplete analysis is never counted as a mistake.</p>}
        {summary?.findings.map((finding) => <article key={finding.ply}><h4>{moveLabel(finding.ply + 1, game.sans[finding.ply], game.startFen)}</h4><p>{finding.explanation}</p><p>Played {displayMove(finding.fen, finding.played)}; alternative {displayMove(finding.fen, finding.alternative)}. Confirmed at depth {finding.before.depth}/{finding.after.depth}.</p><div className="button-row"><button onClick={() => { setLine(null); setPly(finding.ply); }}>Original position</button><button onClick={() => replay(finding, false)}>Replay alternative</button><button onClick={() => replay(finding, true)}>Replay played continuation</button><button onClick={() => { const saved = savedCard(finding); if (saved) { stop(); setCardId(saved.id); } else void addCard(finding); }}>{savedCard(finding) ? 'Practise saved position' : 'Add to practice'}</button></div>{matchingLessons(graph, finding.fen, game.side).map((lesson) => <button key={lesson.key} onClick={() => { stop(); onLesson(lesson.key); }}>{lesson.title}</button>)}</article>)}
      </>}
    </div></div>}
  </section>;
}
