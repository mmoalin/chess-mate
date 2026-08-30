import { Chess } from 'chess.js';
import { useMemo, useState } from 'react';
import { buildPositionKey } from '../../domain/repertoire/positionKey';
import type { GuidanceKind, MoveEdgeClassification, RepertoireGraph } from '../../domain/repertoire/types';
import { validateRepertoireGraph } from '../../domain/repertoire/validation';

export function AdminPanel(props: {
  draft: RepertoireGraph | null;
  busy: boolean;
  onCreateDraft: () => Promise<void>;
  onChange: (graph: RepertoireGraph) => void;
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
  onPreviewPosition: (fen: string) => void;
}) {
  const graph = props.draft;
  const [openingKey, setOpeningKey] = useState('');
  const [positionKey, setPositionKey] = useState('');
  const [moveSan, setMoveSan] = useState('');
  const [classification, setClassification] = useState<MoveEdgeClassification>('alternative');
  const [guidanceKind, setGuidanceKind] = useState<GuidanceKind>('idea');
  const [guidanceTitle, setGuidanceTitle] = useState('');
  const [guidanceBody, setGuidanceBody] = useState('');
  const [unitTitle, setUnitTitle] = useState('');
  const [unitEdges, setUnitEdges] = useState('');
  const [deviationMove, setDeviationMove] = useState('');
  const [deviationGuidance, setDeviationGuidance] = useState('');
  const [motifTitle, setMotifTitle] = useState('');
  const [motifTrigger, setMotifTrigger] = useState('');
  const [motifExecution, setMotifExecution] = useState('');
  const [motifLimitation, setMotifLimitation] = useState('');
  const issues = useMemo(() => graph ? validateRepertoireGraph(graph) : [], [graph]);
  const activeOpeningKey = openingKey || Object.keys(graph?.openings ?? {})[0] || '';
  const activePositionKey = positionKey || graph?.openings[activeOpeningKey]?.rootPositionKey || '';

  if (!graph) return <section className="dock-panel admin-panel"><p className="eyebrow">Content admin</p><h2>Create a working draft</h2><p>Clone the published release, or seed the first release from the embedded catalogue.</p><button className="primary-button" disabled={props.busy} onClick={() => void props.onCreateDraft()}>Create draft</button></section>;

  function updateOpening(field: 'name' | 'summary', value: string) {
    const next = structuredClone(graph!); next.openings[activeOpeningKey][field] = value; props.onChange(next);
  }

  function addMove() {
    const source = graph!.positions[activePositionKey];
    if (!source || !moveSan.trim()) return;
    const chess = new Chess(source.fen);
    const move = chess.move(moveSan.trim());
    if (!move) return;
    const destinationKey = buildPositionKey(chess.fen());
    const next = structuredClone(graph!);
    next.positions[destinationKey] ??= { key: destinationKey, fen: chess.fen(), sideToMove: chess.turn() === 'w' ? 'white' : 'black', openingFamilyKeys: [activeOpeningKey], legacyPositionIds: [] };
    if (!next.positions[destinationKey].openingFamilyKeys.includes(activeOpeningKey)) next.positions[destinationKey].openingFamilyKeys.push(activeOpeningKey);
    const edgeKey = `edge:admin:${crypto.randomUUID()}`;
    next.edges[edgeKey] = { key: edgeKey, from: activePositionKey, to: destinationKey, san: move.san, uci: `${move.from}${move.to}${move.promotion ?? ''}`, order: Object.values(next.edges).filter((edge) => edge.from === activePositionKey).length, classification, openingFamilyKeys: [activeOpeningKey], legacyLineIds: [] };
    props.onChange(next); setMoveSan(''); setPositionKey(destinationKey);
  }

  function addGuidance() {
    if (!guidanceTitle.trim() || !guidanceBody.trim()) return;
    const next = structuredClone(graph!); const key = `guidance:admin:${crypto.randomUUID()}`;
    next.guidance[key] = { key, positionKey: activePositionKey, kind: guidanceKind, title: guidanceTitle.trim(), text: guidanceBody.trim() };
    props.onChange(next); setGuidanceTitle(''); setGuidanceBody('');
  }

  function addLearningUnit() {
    const edgeKeys = unitEdges.split(',').map((key) => key.trim()).filter(Boolean);
    const edges = edgeKeys.map((key) => graph!.edges[key]).filter(Boolean);
    if (!unitTitle.trim() || edges.length !== edgeKeys.length || !edges.length) return;
    const next = structuredClone(graph!); const key = `unit:admin:${crypto.randomUUID()}`;
    next.learningUnits[key] = { key, openingFamilyKey: activeOpeningKey, lineKey: `admin:${activeOpeningKey}`, title: unitTitle.trim(), startPositionKey: edges[0].from, endPositionKey: edges.at(-1)!.to, edgeKeys, order: Object.values(next.learningUnits).filter((unit) => unit.openingFamilyKey === activeOpeningKey).length, depth: 'standard' };
    props.onChange(next); setUnitTitle(''); setUnitEdges('');
  }

  function addDeviation() {
    if (!deviationGuidance.trim()) return;
    const next = structuredClone(graph!); const key = `deviation:admin:${crypto.randomUUID()}`;
    next.deviationPolicies[key] = { key, positionKey: activePositionKey, moveUci: deviationMove.trim() || undefined, category: 'new-branch', guidance: deviationGuidance.trim() };
    props.onChange(next); setDeviationMove(''); setDeviationGuidance('');
  }

  function addMotif() {
    if (![motifTitle, motifTrigger, motifExecution, motifLimitation].every((value) => value.trim())) return;
    const next = structuredClone(graph!); const key = `motif:admin:${crypto.randomUUID()}`;
    next.motifs[key] = { key, title: motifTitle.trim(), pattern: motifTitle.trim(), trigger: motifTrigger.trim(), execution: motifExecution.trim(), prerequisites: 'Reach and recognise the linked position.', limitation: motifLimitation.trim(), positionKeys: [activePositionKey], difficulty: 'standard' };
    props.onChange(next); setMotifTitle(''); setMotifTrigger(''); setMotifExecution(''); setMotifLimitation('');
  }

  const opening = graph.openings[activeOpeningKey];
  return <section className="dock-panel admin-panel" aria-label="Content admin">
    <div className="admin-heading"><div><p className="eyebrow">Draft release {graph.release.version}</p><h2>Repertoire editor</h2></div><span className={issues.length ? 'validation-badge invalid' : 'validation-badge'}>{issues.length ? `${issues.length} issues` : 'Valid'}</span></div>
    <label className="field-label">Opening family<select value={activeOpeningKey} onChange={(event) => { setOpeningKey(event.target.value); setPositionKey(graph.openings[event.target.value].rootPositionKey); }}>{Object.values(graph.openings).map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>
    {opening && <><label className="field-label">Name<input value={opening.name} onChange={(event) => updateOpening('name', event.target.value)} /></label><label className="field-label">Learner summary<textarea value={opening.summary} onChange={(event) => updateOpening('summary', event.target.value)} /></label></>}
    <label className="field-label">Graph position<select value={activePositionKey} onChange={(event) => { setPositionKey(event.target.value); props.onPreviewPosition(graph.positions[event.target.value].fen); }}>{Object.values(graph.positions).filter((node) => node.openingFamilyKeys.includes(activeOpeningKey)).map((node, index) => <option key={node.key} value={node.key}>Position {index + 1} · {node.sideToMove} to move</option>)}</select></label>
    <code className="fen-preview">{graph.positions[activePositionKey]?.fen}</code>
    <div className="admin-inline"><input aria-label="Legal move SAN" placeholder="Legal move, e.g. e4" value={moveSan} onChange={(event) => setMoveSan(event.target.value)} /><select aria-label="Move classification" value={classification} onChange={(event) => setClassification(event.target.value as MoveEdgeClassification)}><option value="main">Main</option><option value="alternative">Alternative</option><option value="transposition">Transposition</option><option value="deviation">Deviation</option></select><button className="secondary-button" onClick={addMove}>Add move</button></div>
    <div className="admin-guidance"><p className="eyebrow">Position guidance</p><select value={guidanceKind} onChange={(event) => setGuidanceKind(event.target.value as GuidanceKind)}><option value="idea">Idea</option><option value="cue">Cue</option><option value="fallback">Fallback</option><option value="mistake">Mistake</option></select><input placeholder="Title" value={guidanceTitle} onChange={(event) => setGuidanceTitle(event.target.value)} /><textarea placeholder="Guidance" value={guidanceBody} onChange={(event) => setGuidanceBody(event.target.value)} /><button className="secondary-button" onClick={addGuidance}>Add guidance</button></div>
    <details><summary>Learning unit</summary><div className="admin-guidance"><input placeholder="Unit title" value={unitTitle} onChange={(event) => setUnitTitle(event.target.value)} /><textarea aria-label="Ordered edge keys" placeholder="Ordered edge keys, comma separated" value={unitEdges} onChange={(event) => setUnitEdges(event.target.value)} /><small>Available: {Object.values(graph.edges).filter((edge) => edge.openingFamilyKeys.includes(activeOpeningKey)).map((edge) => `${edge.san} (${edge.key})`).join(', ')}</small><button className="secondary-button" onClick={addLearningUnit}>Add learning unit</button></div></details>
    <details><summary>Deviation policy</summary><div className="admin-guidance"><input placeholder="Optional move UCI, e.g. a7a6" value={deviationMove} onChange={(event) => setDeviationMove(event.target.value)} /><textarea placeholder="Fallback guidance" value={deviationGuidance} onChange={(event) => setDeviationGuidance(event.target.value)} /><button className="secondary-button" onClick={addDeviation}>Add deviation policy</button></div></details>
    <details><summary>Tactical motif</summary><div className="admin-guidance"><input placeholder="Motif title" value={motifTitle} onChange={(event) => setMotifTitle(event.target.value)} /><input placeholder="Observable trigger" value={motifTrigger} onChange={(event) => setMotifTrigger(event.target.value)} /><input placeholder="Execution" value={motifExecution} onChange={(event) => setMotifExecution(event.target.value)} /><textarea placeholder="Limitation or failure mode" value={motifLimitation} onChange={(event) => setMotifLimitation(event.target.value)} /><button className="secondary-button" onClick={addMotif}>Add motif</button></div></details>
    {issues.length > 0 && <ul className="validation-list">{issues.slice(0, 8).map((issue) => <li key={`${issue.code}-${issue.itemKey}`}>{issue.message} <small>{issue.itemKey}</small></li>)}</ul>}
    <div className="button-row"><button className="secondary-button" disabled={props.busy} onClick={() => void props.onSave()}>Save draft</button><button className="primary-button" disabled={props.busy || issues.length > 0} onClick={() => void props.onPublish()}>Publish</button></div>
  </section>;
}
