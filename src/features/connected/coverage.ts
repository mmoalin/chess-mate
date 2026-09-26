import type { OpeningFamily, RepertoireGraph } from '../../domain/repertoire/types';
import type { ConnectedLesson, CourseMetadata, LessonSession } from './types';
import { courseCatalog } from './course';

export const companionKeys = ['white-sicilian-alapin', 'white-french-advance', 'white-caro-exchange'] as const;
export const companionNames = ['Alapin Sicilian', 'French Advance', 'Caro-Kann Exchange'];
export function companionAvailability(openings: OpeningFamily[], courses: Record<string, CourseMetadata>) {
  const available = companionKeys.filter(key => openings.some(opening => opening.key === key && opening.side === 'white') && courses[key]);
  return { available, missing: companionKeys.flatMap((key, index) => available.includes(key) ? [] : [companionNames[index]]) };
}
export function addCompanions(selected: string[], available: readonly string[]) { return [...new Set([...selected, ...available])]; }
export function chapterProgress(lesson: ConnectedLesson, sessions: LessonSession[] = []) {
  const current = sessions.filter(session => session.lessonKey === lesson.key && session.contentVersion === lesson.version && !session.supersededAt && !session.reviewCheckpointId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const active = current.find(session => !session.completedAt);
  return { label: active ? 'In progress' : current.some(session => session.completedAt) ? 'Completed' : 'Not started', target: active ? 'session:' + active.id : lesson.key, action: active ? 'Resume' : current.some(session => session.completedAt) ? 'Practise again' : 'Start' };
}
export function whiteCoverageGroups(graph: RepertoireGraph) {
  const courses = Object.entries(courseCatalog(graph)).filter(([key, course]) => graph.openings[key]?.side === 'white' && course.coverage?.entryMoves[0] === 'e4');
  const replies = ['e5', 'c5', 'e6', 'c6', 'd5', 'd6', 'g6', 'Nf6'];
  return [...replies, 'other'].map(reply => ({ reply, courses: courses.filter(([, course]) => reply === 'other' ? !replies.includes(course.coverage!.entryMoves[1]) : course.coverage!.entryMoves[1] === reply) }));
}
