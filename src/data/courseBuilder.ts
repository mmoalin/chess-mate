import { Chess } from 'chess.js';
import { compileDecisionPath, type DecisionInput } from './courseCompiler';
import type { ConnectedLesson, LessonDecision, StructureGuideContent } from '../features/connected/types';
import type { RepertoireLine } from '../features/openings/types';
import type { ConceptDrill, SparringScenario } from '../domain/repertoire/types';

export const moves = (text: string) => text.split(/\s+/).filter(Boolean);
export function boardAfter(sequence: string[]) { const board = new Chess(); sequence.forEach((san) => board.move(san)); return board; }
type TeachingMove = [san: string, explanation: string];
export type CourseChapter = {
  slug: string; family: 'vienna' | 'queens-gambit' | 'alien-gambit'; title: string; eco: string; order: number; lineKey?: string;
  opening: TeachingMove[]; main: TeachingMove[]; transferAfter: number; transfer: TeachingMove[];
  structure: StructureGuideContent; plan: string; misconception: string; correction: string;
  mistake: { decision: number; san: string; explanation: string };
};

export function buildChapter(chapter: CourseChapter): { line: RepertoireLine; lesson: ConnectedLesson; drill: ConceptDrill } {
  const family = `white-${chapter.family}-main`;
  const lineKey = chapter.lineKey ?? (chapter.slug === 'qgd' ? family : `white-${chapter.family}-${chapter.slug}`);
  const openingMoves = chapter.opening.map(([san]) => san);
  const decisions: Record<string, LessonDecision> = {};
  function path(prefix: string[], items: TeachingMove[], transfer: boolean) {
    const nodes: DecisionInput[] = [];
    // Each authored path starts on White's turn; opponent replies are explicit.
    for (let index = 0; index < items.length; index += 2) {
      const [moveSan, feedback] = items[index];
      const reply = items[index + 1];
      const id = `${transfer ? 'transfer-' : ''}decision-${index / 2 + 1}`;
      const last = index + 2 >= items.length;
      nodes.push({
        id, prompt: feedback.split('. ')[0] + '.',
        change: index ? items[index - 1][1] : transfer ? chapter.transfer[0][1] : chapter.opening.at(-1)![1],
        hint: feedback, dimension: !transfer && index / 2 === chapter.mistake.decision ? 'tactics' : 'understanding',
        answers: [{ moveSan, repliesSan: reply ? [reply[0]] : [], nextId: last ? null : `${transfer ? 'transfer-' : ''}decision-${index / 2 + 2}`, feedback: feedback + (reply ? ' ' + reply[1] : '') }],
        mistakes: !transfer && index / 2 === chapter.mistake.decision ? { [chapter.mistake.san]: chapter.mistake.explanation } : {},
        comparisons: { [moveSan]: feedback, ...(!transfer && index / 2 === chapter.mistake.decision ? { [chapter.mistake.san]: chapter.mistake.explanation } : {}) }
      });
    }
    Object.assign(decisions, compileDecisionPath(prefix, nodes, 'white'));
  }
  path(openingMoves, chapter.main, false);
  const transferCheckpointMoves = [...openingMoves, ...chapter.main.slice(0, chapter.transferAfter).map(([san]) => san)];
  path([...transferCheckpointMoves, chapter.transfer[0][0]], chapter.transfer.slice(1), true);
  const question = (id: string, prompt: string, correct: string, wrong: string, feedback: string) => ({
    id, prompt, hint: chapter.structure.breaks,
    choices: [
      { id: 'automatic', label: wrong, correct: false, feedback },
      { id: 'position', label: correct, correct: true, feedback: correct },
      { id: 'queen', label: 'Keep moving the queen before developing the remaining pieces.', correct: false, feedback: 'Coordinate the pieces and check forcing threats before looking for queen attacks.' }
    ]
  });
  const lesson: ConnectedLesson = {
    key: `lesson:${chapter.family}-${chapter.slug}`, version: 1, title: chapter.title,
    openingFamilyKey: family, lineKey, side: 'white', courseOrder: chapter.order, structureGuide: chapter.structure,
    openingMoves, openingExplanations: chapter.opening.map(([, text]) => text), modelPositionPly: openingMoves.length,
    introduction: chapter.structure.breaks, takeaway: chapter.plan,
    questions: [question('structure', 'What matters in this pawn structure?', chapter.structure.title + '. ' + chapter.structure.counterplay, chapter.misconception, chapter.correction), question('plan', 'Which plan connects development to this structure?', chapter.plan, chapter.misconception, chapter.correction)],
    mainStartId: 'decision-1', transferStartId: 'transfer-decision-1', transferCheckpointMoves,
    transferExplanation: `Return to the position after ${transferCheckpointMoves.at(-1)}. Black chooses ${chapter.transfer[0][0]} instead. ${chapter.transfer[0][1]}`,
    decisions
  };
  const line: RepertoireLine = {
    id: lineKey, side: 'white', name: chapter.slug === 'qgd' ? 'Queen’s Gambit: practical White repertoire' : chapter.title, eco: chapter.eco, movesSan: openingMoves,
    parentLineId: lineKey === family ? undefined : family, difficulty: 'beginner',
    tags: [chapter.family, 'development'], themeTags: ['pawn-structure', 'development', 'king-safety'],
    explanation: chapter.plan, modelPositionPly: openingMoves.length,
    moveExplanations: chapter.opening.map(([, summary], moveIndex) => ({ moveIndex, summary, principle: 'Understand the position' })),
    middlegameIdeas: [{ title: chapter.structure.title, summary: chapter.plan, themes: ['pawn-structure', 'development'], warning: chapter.structure.counterplay }],
    criticalPositions: [{ id: `${lineKey}:model`, lineId: lineKey, ply: openingMoves.length, fen: boardAfter(openingMoves).fen(), prompt: decisions['decision-1'].prompt, expectedMoves: [chapter.main[0][0]], themes: ['development'], hint: decisions['decision-1'].hint, teachingPoint: chapter.plan }],
    deviationPolicies: [{ ply: 1, category: 'new-branch', guidance: chapter.family === 'alien-gambit' ? 'This course reaches the Alien setup through 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nf6 5.Ng5. Other Caro-Kann branches and other first replies are outside this course; they are not mistakes.' : chapter.family === 'vienna' ? 'This course starts after 1.e4 e5. Other first replies are outside its coverage; a different opening is not a mistake.' : 'This course covers 1.d4 d5 2.c4. Indian defenses and the Dutch are outside this course. A move order that reaches a covered position can transpose back.' }]
  };
  const drill: ConceptDrill = {
    key: `concept:${chapter.family}-${chapter.slug}`, openingFamilyKey: family, title: chapter.title + ' · apply the plan',
    principle: chapter.structure.title, summary: chapter.plan, themes: ['development', 'pawn-structure'], depth: 'foundation', order: chapter.order + 10,
    planPrompt: 'What should guide your next decision?', planChoices: lesson.questions[1].choices,
    scenarios: [scenario('main', openingMoves, chapter.main[0][0], chapter.main[0][1], chapter.plan), scenario('different-reply', decisions['transfer-decision-1'].movesBefore, chapter.transfer[1][0], chapter.transfer[1][1], chapter.plan)]
  };
  return { line, lesson, drill };
}

export function scenario(id: string, sequence: string[], answer: string, prompt: string, teachingPoint: string): SparringScenario {
  const board = boardAfter(sequence.slice(0, -1));
  const setupFen = board.fen();
  const opponent = board.move(sequence.at(-1)!);
  const move = board.move(answer);
  return { id, setupFen, opponentMoveUci: opponent.from + opponent.to + (opponent.promotion ?? ''), prompt, change: `Black played ${opponent.san}. Reassess the position before following the plan.`, preferredMovesUci: [move.from + move.to + (move.promotion ?? '')], acceptableMovesUci: [], hint: teachingPoint, teachingPoint, watchFor: 'Check captures, threats, and the opponent’s central breaks before continuing.' };
}
