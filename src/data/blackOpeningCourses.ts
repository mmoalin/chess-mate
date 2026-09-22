import bundle from './compiledBlackCourses.json' with { type: 'json' };
import { blackCourseDefinitions } from './blackCourseSeeds';
import type { ConnectedLesson } from '../features/connected/types';
import type { ConceptDrill } from '../domain/repertoire/types';
import type { RepertoireLine } from '../features/openings/types';

// Compiled during authoring/build; loading a course never starts chess analysis.
export const blackCourses = blackCourseDefinitions.map(course => ({ ...course, side: 'black' as const }));
export const blackCourseLines = bundle.lines as RepertoireLine[];
export const blackCourseLessons = bundle.lessons as unknown as ConnectedLesson[];
export const blackCourseDrills = bundle.drills as ConceptDrill[];
