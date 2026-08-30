import type { LearningUnit, MasteryState, RepertoireBacklogItem, RepertoireGraph } from './types';

export type GuidedNextActivity =
  | { kind: 'review'; targetKey: string; title: string; reason: string }
  | { kind: 'game-gap'; targetKey: string; title: string; reason: string }
  | { kind: 'learning-unit'; targetKey: string; title: string; reason: string }
  | { kind: 'tactic'; targetKey: string; title: string; reason: string }
  | { kind: 'complete'; targetKey: ''; title: string; reason: string };

export function recommendGuidedNextActivity(input: {
  graph: RepertoireGraph;
  selectedOpeningKeys: string[];
  mastery: MasteryState[];
  backlog: RepertoireBacklogItem[];
  now: string;
}): GuidedNextActivity {
  const due = input.mastery
    .flatMap((state) => [state.recall, state.understanding, state.tactics].map((dimension) => ({ state, dimension })))
    .filter(({ dimension }) => dimension.status !== 'unseen' && dimension.dueAt <= input.now)
    .sort((a, b) => a.dimension.dueAt.localeCompare(b.dimension.dueAt))[0];
  if (due) {
    return { kind: 'review', targetKey: due.state.itemKey, title: 'Review a weak position', reason: 'This item is due now.' };
  }

  const gap = input.backlog.find((item) => item.status === 'new');
  if (gap) return { kind: 'game-gap', targetKey: gap.id, title: gap.title, reason: 'A recent game exposed this repertoire gap.' };

  const units = Object.values(input.graph.learningUnits)
    .filter((unit) => input.selectedOpeningKeys.includes(unit.openingFamilyKey))
    .sort(compareUnits);
  const incomplete = units.find((unit) => !input.mastery.some((state) => state.itemKey === unit.key && state.recall.status === 'reliable'));
  if (incomplete) return unitActivity(incomplete);

  const motif = Object.values(input.graph.motifs).find((candidate) =>
    candidate.positionKeys.some((position) => input.selectedOpeningKeys.some((opening) => input.graph.positions[position]?.openingFamilyKeys.includes(opening)))
  );
  if (motif) return { kind: 'tactic', targetKey: motif.key, title: motif.title, reason: 'Practise a tactic linked to your repertoire.' };

  return { kind: 'complete', targetKey: '', title: 'Repertoire up to date', reason: 'No learning or review item is currently due.' };
}

function compareUnits(a: LearningUnit, b: LearningUnit): number {
  return a.openingFamilyKey.localeCompare(b.openingFamilyKey) || a.order - b.order || a.key.localeCompare(b.key);
}

function unitActivity(unit: LearningUnit): GuidedNextActivity {
  return { kind: 'learning-unit', targetKey: unit.key, title: unit.title, reason: 'Continue with the next uncovered repertoire branch.' };
}
