import { outgoingEdges } from '../../domain/repertoire/graph';
import type { MasteryState, OpeningFamily, RepertoireGraph } from '../../domain/repertoire/types';

export function RepertoireMap(props: { graph: RepertoireGraph; selectedKeys: string[]; mastery: MasteryState[]; onTrain: (openingKey: string) => void; onPracticeIdeas: (openingKey: string) => void }) {
  const selected = props.selectedKeys.map((key) => props.graph.openings[key]).filter((opening): opening is OpeningFamily => Boolean(opening));
  const uncoveredD4 = !selected.some((opening) => opening.context === 'black-vs-d4');
  return (
    <section className="dock-panel repertoire-map" aria-label="Repertoire map">
      <p className="eyebrow">Repertoire map</p><h2>Your position branches</h2>
      {selected.map((opening) => {
        const edges = outgoingEdges(props.graph, opening.rootPositionKey, opening.key);
        const units = Object.values(props.graph.learningUnits).filter((unit) => unit.openingFamilyKey === opening.key);
        const reliable = units.filter((unit) => props.mastery.some((item) => item.itemKey === unit.key && item.recall.status === 'reliable')).length;
        const concepts = Object.values(props.graph.conceptDrills ?? {}).filter((drill) => drill.openingFamilyKey === opening.key);
        return <article className="repertoire-map-card" key={opening.key}>
          <div><span>{opening.context === 'white' ? 'White' : opening.context.replace('black-vs-', 'Black vs 1.')}</span><strong>{opening.name}</strong><p>{opening.summary}</p></div>
          <div className="branch-meter" aria-label={`${opening.name} progress`}><span style={{ width: `${units.length ? reliable / units.length * 100 : 0}%` }} /></div>
          <small>{edges.length} first branches · {reliable}/{units.length} reliable units</small>
          {concepts.length > 0 && <button className="primary-button" type="button" onClick={() => props.onPracticeIdeas(opening.key)}>Practice ideas</button>}
          <button className="secondary-button" type="button" onClick={() => props.onTrain(opening.key)}>Optional line practice</button>
        </article>;
      })}
      {uncoveredD4 && <article className="repertoire-map-card coverage-gap"><span>Coverage gap</span><strong>Black vs 1.d4</strong><p>You chose “not sure.” This remains visible until a curated response is available.</p></article>}
    </section>
  );
}
