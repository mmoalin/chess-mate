import { StructureGuide } from '../connected/StructureGuide';
import { LessonProgress } from './LessonProgress';
import { orderedLessons } from '../connected/course';
import type { LessonSession } from '../connected/types';
import { outgoingEdges } from '../../domain/repertoire/graph';
import type { MasteryState, OpeningFamily, RepertoireGraph } from '../../domain/repertoire/types';

export function RepertoireMap(props: { sessions?: LessonSession[]; graph: RepertoireGraph; selectedKeys: string[]; mastery: MasteryState[]; onTrain: (openingKey: string) => void; onPracticeIdeas: (openingKey: string) => void; onConcept: (key: string) => void; onLesson?: (key: string) => void; onLine?: (key: string) => void }) {
  const selected = props.selectedKeys.map((key) => props.graph.openings[key]).filter((opening): opening is OpeningFamily => Boolean(opening));
  const uncoveredD4 = !selected.some((opening) => opening.context === 'black-vs-d4');
  return (
    <section className="dock-panel repertoire-map" aria-label="Repertoire map">
      <p className="eyebrow">Repertoire map</p><h2>Your openings, plans & tactics</h2><p className="analysis">Choose an opening, understand its plan, then test the decisions it creates.</p>
      {selected.map((opening) => {
        const edges = outgoingEdges(props.graph, opening.rootPositionKey, opening.key);
        const units = Object.values(props.graph.learningUnits).filter((unit) => unit.openingFamilyKey === opening.key);
        const reliable = units.filter((unit) => props.mastery.some((item) => item.itemKey === unit.key && item.recall.status === 'reliable')).length;
        const concepts = Object.values(props.graph.conceptDrills ?? {}).filter((drill) => drill.openingFamilyKey === opening.key);
        const chapters = orderedLessons(props.graph, [opening.key]);
        return <article className="repertoire-map-card" key={opening.key}>
          <div><span>{opening.context === 'white' ? 'White' : opening.context.replace('black-vs-', 'Black vs 1.')}</span><strong>{opening.name}</strong><p>{opening.summary}</p></div>
          <StructureGuide graph={props.graph} lineKey={opening.key} lesson={chapters[0]} onLesson={props.onLesson} onLine={props.onLine} />
          <LessonProgress sessions={props.sessions?.filter((s) => props.graph.connectedLessons?.[s.lessonKey]?.openingFamilyKey === opening.key)} lessons={props.graph.connectedLessons ?? {}} onOpen={(key) => props.onLesson?.(key)} />
          <div className="branch-meter" aria-label={`${opening.name} progress`}><span style={{ width: `${units.length ? reliable / units.length * 100 : 0}%` }} /></div>
          <small>{edges.length} first branches · {reliable}/{units.length} reliable units</small>
          {chapters.length > 0 && <section className="lesson-directory" aria-label={`${opening.name} chapters`}><h3>Course chapters</h3>{chapters.map((lesson, index) => {
            const sessions = (props.sessions ?? []).filter((session) => session.lessonKey === lesson.key && !session.supersededAt && !session.reviewCheckpointId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            const active = sessions.find((session) => !session.completedAt);
            const complete = sessions.some((session) => session.completedAt);
            return <div key={lesson.key}><button className="theory-branch-button" onClick={() => props.onLesson?.(active ? 'session:' + active.id : lesson.key)}><strong>{index + 1}. {lesson.title}</strong><small>{active ? 'In progress · Resume' : complete ? 'Completed · Practise again' : 'Start lesson'}</small></button>
              {index > 0 && <StructureGuide graph={props.graph} lineKey={lesson.lineKey} lesson={lesson} onLesson={props.onLesson} onLine={props.onLine} />}
            </div>;
          })}</section>}
          {concepts.length > 0 && <details className="lesson-directory"><summary>{concepts.length} plan lessons for this opening</summary>{concepts.map((drill) => <button className="theory-branch-button" type="button" key={drill.key} onClick={() => props.onConcept(drill.key)}><span>{drill.title}</span><small>{drill.principle}</small></button>)}</details>}
          {concepts.length > 0 && <button className="primary-button" type="button" onClick={() => props.onPracticeIdeas(opening.key)}>Practice ideas</button>}
          <button className="secondary-button" type="button" onClick={() => props.onTrain(opening.key)}>Explore lines & tactical decisions</button>
        </article>;
      })}
      {uncoveredD4 && <article className="repertoire-map-card coverage-gap"><span>Coverage gap</span><strong>Black vs 1.d4</strong><p>A curated response to 1.d4 is not available yet. Your repertoire currently covers the openings shown above.</p></article>}
    </section>
  );
}
