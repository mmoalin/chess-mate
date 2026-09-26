import { Chess } from 'chess.js';
import type { ConceptDrill, OpeningContext } from '../domain/repertoire/types';
import type { RepertoireLine } from '../features/openings/types';
import type { ConnectedLesson, CourseMetadata, LessonDecision } from '../features/connected/types';
import type { AnnotatedMove, ContinuationJourney, ContinuationStep } from '../features/connected/continuationJourney';

export type DecisionInput = Omit<LessonDecision, 'movesBefore'>;
export type CourseDefinition = CourseMetadata & { key: string; title: string; side: 'white' | 'black'; context: OpeningContext };
export type ChapterDefinition = {
  key: string; lineKey: string; conceptKey: string; title: string; order: number; optional?: boolean;
  opening: AnnotatedMove[]; structure: NonNullable<ConnectedLesson['structureGuide']>;
  introduction: string; takeaway: string; questions: ConnectedLesson['questions'];
  main: DecisionInput[];
  transfer: { sourceCheckpointId: string; sourceMove: string; opponent: AnnotatedMove; explanation: string; decisions: DecisionInput[] };
};

/** Explicit graph edges compile into the existing persisted lesson format. */
export function compileDecisionPath(prefix: string[], nodes: DecisionInput[], side: 'white' | 'black'): Record<string, LessonDecision> {
  const inputs = new Map(nodes.map(node => [node.id, node]));
  if (!nodes.length || inputs.size !== nodes.length) throw new Error('A path needs unique checkpoint identities.');
  const result: Record<string, LessonDecision> = {};
  function visit(id: string, history: string[], board: Chess, stack: string[]) {
    if (stack.includes(id)) throw new Error('Course path contains a cycle: ' + id);
    const node = inputs.get(id); if (!node) throw new Error('Missing checkpoint: ' + id);
    if (result[id]) {
      if (JSON.stringify(result[id].movesBefore) !== JSON.stringify(history)) throw new Error('Conflicting histories at ' + id);
      return;
    }
    if (board.turn() !== side[0]) throw new Error('Wrong learner turn at ' + id);
    if (!node.answers.length) throw new Error('Missing accepted answer at ' + id);
    result[id] = { ...node, movesBefore: [...history] };
    for (const answer of node.answers) {
      const continuation = [...history, answer.moveSan, ...answer.repliesSan];
      const check = new Chess(board.fen()); [answer.moveSan, ...answer.repliesSan].forEach(san => check.move(san));
      if (answer.nextId) visit(answer.nextId, continuation, check, [...stack, id]);
    }
    for (const san of Object.keys(node.mistakes)) new Chess(board.fen()).move(san);
  }
  const initial = new Chess(); prefix.forEach(san => initial.move(san));
  visit(nodes[0].id, prefix, initial, []);
  if (Object.keys(result).length !== nodes.length) throw new Error('Unreachable course checkpoint.');
  return result;
}

export function compileChapter(course: CourseDefinition, chapter: ChapterDefinition): { line: RepertoireLine; lesson: ConnectedLesson; drill: ConceptDrill } {
  const openingMoves = chapter.opening.map(move => move.san);
  const main = compileDecisionPath(openingMoves, chapter.main, course.side);
  const source = main[chapter.transfer.sourceCheckpointId];
  const sourceAnswer = source?.answers.find(answer => answer.moveSan === chapter.transfer.sourceMove);
  if (!sourceAnswer) throw new Error('Transfer source answer is missing: ' + chapter.key);
  const transferCheckpointMoves = [...source.movesBefore, sourceAnswer.moveSan];
  if (chapter.transfer.opponent.san === sourceAnswer.repliesSan[0]) throw new Error('Transfer needs a different opponent reply.');
  const transfer = compileDecisionPath([...transferCheckpointMoves, chapter.transfer.opponent.san], chapter.transfer.decisions, course.side);
  if (Object.keys(transfer).some(key => main[key])) throw new Error('Main and transfer checkpoint identities collide.');
  const lesson: ConnectedLesson = {
    key: chapter.key, version: 1, title: chapter.title, side: course.side, openingFamilyKey: course.key, lineKey: chapter.lineKey,
    courseOrder: chapter.order, optional: chapter.optional, structureGuide: chapter.structure,
    ...(chapter.key === course.mainLessonKey ? { course: { mainLessonKey: course.mainLessonKey, role: course.role, context: course.context, scope: course.scope, ...(course.coverage ? { coverage: course.coverage } : {}), ...(course.drillMetadata ? { drillMetadata: course.drillMetadata } : {}) } } : {}),
    openingMoves, openingExplanations: chapter.opening.map(move => move.note), modelPositionPly: openingMoves.length,
    introduction: chapter.introduction, takeaway: chapter.takeaway, questions: chapter.questions,
    mainStartId: chapter.main[0].id, transferStartId: chapter.transfer.decisions[0].id, transferCheckpointMoves,
    transferExplanation: chapter.transfer.explanation, decisions: { ...main, ...transfer }
  };
  const board = new Chess(); openingMoves.forEach(san => board.move(san));
  const first = main[lesson.mainStartId];
  const line: RepertoireLine = {
    id: chapter.lineKey, parentLineId: chapter.lineKey === course.key ? undefined : course.key,
    side: course.side, name: chapter.lineKey === course.key ? course.title : chapter.title,
    difficulty: chapter.optional ? 'theory' : 'beginner', tags: ['course', course.key], themeTags: ['development', 'pawn-structure', 'king-safety'],
    movesSan: openingMoves, modelPositionPly: openingMoves.length, explanation: chapter.lineKey === course.key ? course.scope : chapter.takeaway,
    moveExplanations: chapter.opening.map((move, moveIndex) => ({ moveIndex, summary: move.note, principle: 'Read the position before choosing a plan' })),
    middlegameIdeas: [{ title: chapter.structure.title, summary: chapter.takeaway, themes: ['pawn-structure', 'development'], warning: chapter.structure.counterplay }],
    criticalPositions: [{ id: `${chapter.lineKey}:model`, lineId: chapter.lineKey, ply: openingMoves.length, fen: board.fen(), prompt: first.prompt, expectedMoves: first.answers.map(answer => answer.moveSan), themes: ['development'], hint: first.hint, teachingPoint: chapter.takeaway }],
    deviationPolicies: [{ ply: 1, category: 'new-branch', guidance: course.scope + ' A sound move outside this coverage is not a mistake.' }]
  };
  const scenario = (id: string, decision: LessonDecision) => {
    const before = new Chess(); decision.movesBefore.slice(0, -1).forEach(san => before.move(san));
    const setupFen = before.fen(); const opponent = before.move(decision.movesBefore.at(-1)!);
    const answer = before.move(decision.answers[0].moveSan);
    return { id, setupFen, opponentMoveUci: opponent.from + opponent.to + (opponent.promotion ?? ''), prompt: decision.prompt, change: decision.change,
      preferredMovesUci: [answer.from + answer.to + (answer.promotion ?? '')], acceptableMovesUci: [], hint: decision.hint, teachingPoint: decision.answers[0].feedback, watchFor: chapter.structure.counterplay };
  };
  const drill: ConceptDrill = { key: chapter.conceptKey, openingFamilyKey: course.key, title: chapter.title + ' · apply the plan', principle: chapter.structure.title,
    summary: chapter.takeaway, themes: ['pawn-structure', 'development'], depth: chapter.optional ? 'deep' : 'foundation', order: chapter.order + 100,
    planPrompt: chapter.questions[1].prompt, planChoices: chapter.questions[1].choices,
    scenarios: [scenario('main', first), scenario('different-reply', transfer[lesson.transferStartId])] };
  return { line, lesson, drill };
}

/** Source choice is explicit; candidate assessments and reasons are authored, not inferred. */
export function compileJourney(lesson: ConnectedLesson, input: {
  id: string; title: string; sourceCheckpointId: string; sourceMove: string; introduction: string; steps: ContinuationStep[];
}): ContinuationJourney {
  const source = lesson.decisions[input.sourceCheckpointId];
  const answer = source?.answers.find(candidate => candidate.moveSan === input.sourceMove);
  if (!answer || answer.nextId) throw new Error('Journey needs an explicit terminal source answer.');
  return { id: input.id, title: input.title, introduction: input.introduction, sourceCheckpointId: source.id, sourceMove: input.sourceMove,
    openingPrefix: [...source.movesBefore, answer.moveSan, ...answer.repliesSan], steps: input.steps };
}
