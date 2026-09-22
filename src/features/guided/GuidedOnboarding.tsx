import { useMemo, useState } from 'react';
import type { LearnerProfile, OpeningFamily } from '../../domain/repertoire/types';
import type { CourseMetadata } from '../connected/types';

export type GuidedOnboardingResult = {
  profile: LearnerProfile;
  openingFamilyKeys: string[];
  blackD4Preference: 'not-sure' | 'selected';
};

export function GuidedOnboarding(props: {
  learnerId: string;
  openings: OpeningFamily[];
  courses?: Record<string, CourseMetadata>;
  onComplete: (result: GuidedOnboardingResult) => void;
}) {
  const white = useMemo(() => props.openings.filter((opening) => opening.side === 'white'), [props.openings]);
  const blackE4 = useMemo(() => props.openings.filter((opening) => opening.context === 'black-vs-e4' && props.courses?.[opening.key]?.role !== 'response'), [props.openings, props.courses]);
  const blackD4 = props.openings.filter(opening => opening.context === 'black-vs-d4');
  const responses = props.openings.filter(opening => opening.context === 'black-vs-e4' && props.courses?.[opening.key]?.role === 'response');
  const [extraKeys, setExtraKeys] = useState<string[]>([]);
  const [whiteKeys, setWhiteKeys] = useState<string[]>([white.find((opening) => opening.key === 'white-vienna-main')?.key ?? white[0]?.key ?? ''].filter(Boolean));
  const [blackE4Key, setBlackE4Key] = useState(blackE4.find((opening) => opening.key === 'black-caro-kann-main')?.key ?? blackE4[0]?.key ?? '');
  const [ratingSource, setRatingSource] = useState<LearnerProfile['ratingSource']>('unsure');
  const [ratingValue, setRatingValue] = useState('');
  const [goal, setGoal] = useState<LearnerProfile['goal']>('basic-plans');

  function submit() {
    const parsedRating = Number(ratingValue);
    const profile: LearnerProfile = {
      learnerId: props.learnerId,
      ratingSource,
      ratingValue: Number.isFinite(parsedRating) && parsedRating >= 100 ? parsedRating : undefined,
      depth: deriveDepth(parsedRating, goal),
      goal,
      dailyDurationMinutes: 10,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString()
    };
    props.onComplete({ profile, openingFamilyKeys: Array.from(new Set([...whiteKeys, ...extraKeys, blackE4Key || blackE4.find((opening) => opening.key === 'black-caro-kann-main')?.key || ''].filter(Boolean))), blackD4Preference: extraKeys.some(key => blackD4.some(opening => opening.key === key)) ? 'selected' : 'not-sure' });
  }

  return (
    <section className="dock-summary onboarding-panel guided-onboarding" aria-label="Guided repertoire setup">
      <p className="eyebrow">Build your repertoire</p>
      <h2>Set up your training repertoire</h2>
      <p>Start with the Vienna as White and the Caro-Kann against 1.e4. Your first 10-minute session will review, teach one idea, and let you apply it.</p>
      <details className="setup-customization">
      <summary>Customize repertoire and training level</summary>

      <fieldset>
        <legend>As White</legend>
        <div className="choice-grid">
          {white.map((opening) => (
            <label key={opening.key}>
              <input
                type="checkbox"
                checked={whiteKeys.includes(opening.key)}
                onChange={(event) => setWhiteKeys((keys) => event.target.checked ? [...keys, opening.key] : keys.filter((key) => key !== opening.key))}
              />
              <span><strong>{opening.name}</strong><small>{opening.summary}</small></span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field-label">
        As Black against 1.e4
        <select value={blackE4Key} onChange={(event) => setBlackE4Key(event.target.value)}>
          {blackE4.map((opening) => <option key={opening.key} value={opening.key}>{opening.name}</option>)}
          <option value="">I’m not sure — recommend one</option>
        </select>
      </label>
      {[{ title: 'As Black against 1.d4', openings: blackD4 }, { title: 'Targeted Black responses', openings: responses }].map(group => <fieldset key={group.title}><legend>{group.title}</legend>
        {group.openings.map(opening => <label className="preference-check" key={opening.key}><input type="checkbox" checked={extraKeys.includes(opening.key)} onChange={event => setExtraKeys(keys => event.target.checked ? [...keys, opening.key] : keys.filter(key => key !== opening.key))} /><span><strong>{opening.name}</strong><small>{props.courses?.[opening.key]?.scope ?? opening.summary}</small></span></label>)}
        <p className="analysis">Choose the systems you want to study. These response courses cover the named openings, not every possible first-move continuation.</p>
      </fieldset>)}

      <div className="onboarding-fields">
        <label className="field-label">Rating source
          <select value={ratingSource} onChange={(event) => setRatingSource(event.target.value as LearnerProfile['ratingSource'])}>
            <option value="unsure">Not sure</option><option value="chess.com">Chess.com</option><option value="lichess">Lichess</option><option value="otb">OTB</option>
          </select>
        </label>
        <label className="field-label">Optional rating
          <input type="number" min="100" max="3500" placeholder="e.g. 1200" value={ratingValue} onChange={(event) => setRatingValue(event.target.value)} />
        </label>
      </div>
      <label className="field-label">Training goal
        <select value={goal} onChange={(event) => setGoal(event.target.value as LearnerProfile['goal'])}>
          <option value="basic-plans">Learn the basic plans</option><option value="tactical-danger">Become tactically dangerous</option>
          <option value="sharp-gambits">Learn sharper and gambit lines</option><option value="deep-repertoire">Build a deeper repertoire</option>
        </select>
      </label>
      </details>
      <button className="primary-button" type="button" disabled={whiteKeys.length === 0} onClick={submit}>Start learning</button>
    </section>
  );
}

function deriveDepth(rating: number, goal: LearnerProfile['goal']): LearnerProfile['depth'] {
  if (goal === 'deep-repertoire' || rating >= 1700) return 'deep';
  if (rating >= 1100 || goal === 'tactical-danger' || goal === 'sharp-gambits') return 'standard';
  return 'foundation';
}
