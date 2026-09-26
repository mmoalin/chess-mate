import bundle from './compiledWhiteCompanions.json' with { type: 'json' };
import type { RepertoireLine } from '../features/openings/types';
import type { ConceptDrill } from '../domain/repertoire/types';
import type { ConnectedLesson } from '../features/connected/types';
export const companionLines = bundle.lines as RepertoireLine[];
export const companionLessons = bundle.lessons as unknown as ConnectedLesson[];
export const companionDrills = bundle.drills as ConceptDrill[];
