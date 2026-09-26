import { addCompanions, companionAvailability } from '../connected/coverage';
import type { OpeningFamily } from '../../domain/repertoire/types';
import type { CourseMetadata } from '../connected/types';

export function CompanionPack(props: { openings: OpeningFamily[]; courses: Record<string, CourseMetadata>; selected: string[]; onChange: (keys: string[]) => void }) {
  const { available, missing } = companionAvailability(props.openings, props.courses);
  const added = available.length > 0 && available.every(key => props.selected.includes(key));
  return <div className="companion-pack">
    <p>Keep the Vienna against …e5 and add Alapin, French Advance and Caro-Kann Exchange responses.</p>
    <button type="button" className="secondary-button" disabled={!available.length || added} onClick={() => props.onChange(addCompanions(props.selected, available))}>{added ? 'White 1.e4 companion courses added' : 'Add White 1.e4 companion courses'}</button>
    {missing.length > 0 && <p className="analysis" role="status">Not available in this release: {missing.join(', ')}. Only available courses can be added.</p>}
  </div>;
}
