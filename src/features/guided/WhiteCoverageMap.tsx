import type { RepertoireGraph } from '../../domain/repertoire/types';
import type { LessonSession } from '../connected/types';
import { chapterProgress, whiteCoverageGroups } from '../connected/coverage';

export function WhiteCoverageMap(props: { graph: RepertoireGraph; selected: string[]; sessions?: LessonSession[]; onLesson?: (key: string) => void; onAdd?: (key: string) => void }) {
  return <section className="white-coverage" aria-label="White after 1.e4">
    <h3>White after 1.e4</h3><p className="analysis">Choose Black’s reply to see the routes available. A selected course covers its named branches; lesson completion is separate from mastery.</p>
    {whiteCoverageGroups(props.graph).map(group => <details key={group.reply} className="coverage-row">
      <summary>{group.reply === 'other' ? 'Other replies' : '…' + group.reply}<span>{group.courses.some(([key]) => props.selected.includes(key)) ? 'Selected' : group.courses.length ? 'Available to add' : 'No course in this release'}</span></summary>
      {!group.courses.length && <p>No course in this release covers this reply. Continue development, check threats and reassess the centre; an uncovered move is not automatically a mistake.</p>}
      {group.courses.map(([key, course]) => <article key={key} className="coverage-course">
        <h4>{props.graph.openings[key].name}</h4><p>{course.scope}</p>
        <p className="analysis">{props.selected.includes(key) ? 'Selected' : 'Available to add'}</p>
        {!props.selected.includes(key) && props.onAdd && <button type="button" className="secondary-button" onClick={() => props.onAdd?.(key)}>Add {props.graph.openings[key].name}</button>}
        {course.coverage!.routes.map(route => <div className="coverage-route" key={route.key}><strong>{route.title}</strong><p>{route.scope}</p>
          {route.lessonKeys.map(lessonKey => { const lesson = props.graph.connectedLessons?.[lessonKey]; if (!lesson) return null; const progress = chapterProgress(lesson, props.sessions);
            return <button type="button" className="theory-branch-button" key={lessonKey} onClick={() => props.onLesson?.(progress.target)}><span>{progress.action}: {lesson.title}</span><small>{progress.label}</small></button>;
          })}
        </div>)}
      </article>)}
    </details>)}
  </section>;
}
