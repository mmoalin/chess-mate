import { Chess } from 'chess.js';
import content from './whiteCompanionContent.json' with { type: 'json' };
import { companionDefinitions, companionSeeds } from './whiteCompanionSeeds';
import { companionTeaching } from './whiteCompanionTeaching';
import { compileChapter, compileJourney, type CourseDefinition, type DecisionInput } from './courseCompiler';
import type { AnnotatedMove, ContinuationStep, ContinuationJourney } from '../features/connected/continuationJourney';
import type { ConceptDrill } from '../domain/repertoire/types';
import { companionJourneyTeaching } from './whiteCompanionJourneyTeaching';

export type AuthoredJourneyStep = { id: string; bridge: AnnotatedMove[]; main: AnnotatedMove[]; candidates: { move: string; note: string; reply: string; replyNote: string }[] };
type AuthoredChapter = { opening: AnnotatedMove[]; main: AnnotatedMove[]; transfer: AnnotatedMove[]; transferSource?: number; mistake: { san: string; note: string }; journey?: AuthoredJourneyStep[] };
const records = content as unknown as Record<string, AuthoredChapter>;
export const companionLessonKey = (family: string, slug: string) => `lesson:${family}:${slug}`;
export const companionCourses: CourseDefinition[] = companionDefinitions.map(family => ({
  ...family, side: 'white', context: 'white', role: 'response', mainLessonKey: companionLessonKey(family.key, 'main'),
  coverage: { entryMoves: [...family.entryMoves], routes: [
    ...companionSeeds.filter(seed => seed.family === family.key).map(seed => ({ key: seed.slug, title: seed.title, entryMoves: seed.opening.split(' '), lessonKeys: [companionLessonKey(family.key, seed.slug)], scope: seed.threat })),
    ...(family.key === 'white-sicilian-alapin' ? [{ key: 'french-transposition', title: '…e6 and …d5: French transposition', entryMoves: 'e4 c5 c3 e6 d4 d5 e5 Nc6'.split(' '), lessonKeys: [companionLessonKey('white-french-advance', 'main')], scope: 'The same pawn chain is reached by a different move order. Continue in the French chapter; its progress is shared.' }] : [])
  ] }
}));

export function authoredJourneySteps(family: string, steps: AuthoredJourneyStep[], revised = false): ContinuationStep[] {
  return steps.map((step, index) => {
    const teaching = companionJourneyTeaching[family]?.[index];
    if (!teaching) throw new Error('Missing editorial journey teaching: ' + family + '/' + index);
    return { id: (revised ? 'v2-' : '') + step.id, title: teaching.title, prompt: teaching.prompt, hint: teaching.hint, takeaway: teaching.takeaway,
      bridge: step.bridge, main: step.main, choices: [
        ...step.candidates.map((candidate, i) => ({ id: 'plan-' + i, label: teaching.reasons[i], correct: true, feedback: candidate.note + ' ' + teaching.takeaway })),
        { id: 'automatic', label: teaching.misconception, correct: false, feedback: teaching.takeaway }
      ], candidates: step.candidates.map((candidate, i) => ({ move: candidate.move, assessment: 'accepted', explanation: teaching.reasons[i] + ' ' + candidate.note, reasonIds: ['plan-' + i], replies: [{ move: candidate.reply, sound: true, explanation: candidate.replyNote }] }))
    };
  });
}

export const companionChapters = companionSeeds.map(seed => {
  const family = companionDefinitions.find(item => item.key === seed.family)!;
  const course = companionCourses.find(item => item.key === seed.family)!;
  const data = records[seed.family + '/' + seed.slug];
  const teaching = companionTeaching[seed.family + '/' + seed.slug];
  if (!data || !teaching) throw new Error('Missing companion content: ' + seed.title);
  const transferSource = data.transferSource ?? 1;
  const transferOffset = (transferSource - 1) * 2;
  const question = (id: string, prompt: string, correct: string) => ({ id, prompt, hint: seed.focus, choices: [
    { id: 'position', label: correct, correct: true, feedback: seed.focus + ' ' + seed.threat },
    { id: 'automatic', label: seed.misconception, correct: false, feedback: seed.threat }
  ] });
  function decisions(moves: AnnotatedMove[], transfer: boolean): DecisionInput[] {
    const explanations = transfer ? teaching.transfer : teaching.main;
    return moves.filter((_, index) => index % 2 === 0).map((move, index, ownMoves) => {
      const id = (transfer ? 'transfer-' : '') + 'decision-' + (index + 1); const reply = moves[index * 2 + 1];
      return { id, prompt: index === 0 ? seed.focus + ' Choose a move.' : 'Black has changed the position. Choose your next move and anticipate the reply.',
        change: index ? moves[index * 2 - 1].note : transfer ? data.transfer[0].note : seed.threat,
        hint: explanations[index], dimension: index === 0 ? 'tactics' : 'understanding',
        answers: [{ moveSan: move.san, repliesSan: reply ? [reply.san] : [], nextId: index === ownMoves.length - 1 ? null : (transfer ? 'transfer-' : '') + 'decision-' + (index + 2), feedback: explanations[index] + ' ' + (reply?.note ?? '') }],
        mistakes: !transfer && !index ? { [data.mistake.san]: data.mistake.note } : {},
        comparisons: { [move.san]: explanations[index], ...(!transfer && !index ? { [data.mistake.san]: data.mistake.note } : {}) }
      };
    });
  }
  const compiled = compileChapter(course, { key: companionLessonKey(seed.family, seed.slug), lineKey: seed.slug === 'main' ? seed.family : `${seed.family}-${seed.slug}`, conceptKey: `concept:${seed.family}:${seed.slug}`,
    title: seed.title, order: companionSeeds.filter(item => item.family === seed.family).indexOf(seed), opening: data.opening.map((move, index) => index === data.opening.length - 1 ? { ...move, note: move.note + ' ' + seed.threat } : move),
    structure: { title: seed.title, breaks: family.breaks, pieces: family.pieces, counterplay: seed.threat, exchanges: family.exchanges, ending: family.ending },
    introduction: seed.focus + ' ' + course.scope, takeaway: seed.focus,
    questions: [question('structure', 'What feature changes the plan in this position?', seed.threat), question('plan', 'Which practical objective comes first?', seed.focus)],
    main: decisions(data.main, false), transfer: { sourceCheckpointId: 'decision-' + transferSource, sourceMove: data.main[transferOffset].san, opponent: data.transfer[0], explanation: `Return to the position after ${data.main[transferOffset].san}. Black plays ${data.transfer[0].san} instead of ${data.main[transferOffset + 1].san}. ${teaching.transfer[0]}`, decisions: decisions(data.transfer.slice(1), true) }
  });
  if (seed.slug === 'main') {
    if (!data.journey || data.journey.length !== 6) throw new Error('Main companion course needs six journey checkpoints: ' + seed.family);
    compiled.lesson.continuation = compileJourney(compiled.lesson, { id: `${seed.family}-continuation-v1`, title: `${family.title}: follow the position into an ending`, sourceCheckpointId: 'decision-4', sourceMove: data.main[6].san,
      introduction: 'An original illustrative line from this lesson, not a forced sequence or a promised win. Replay the connecting moves, compare plans and anticipate Black’s replies.', steps: authoredJourneySteps(seed.family, data.journey) });
  }
  return compiled;
});

function scenario(id: string, sequence: string, answer: string, teachingPoint: string): ConceptDrill['scenarios'][number] {
  const moves = sequence.split(' '); const board = new Chess(); moves.slice(0, -1).forEach(move => board.move(move)); const setupFen = board.fen(); const opponent = board.move(moves.at(-1)!); const chosen = board.move(answer);
  return { id, setupFen, opponentMoveUci: opponent.from + opponent.to, prompt: 'Recognise what the changed move order allows. Choose a move.', change: teachingPoint, preferredMovesUci: [chosen.from + chosen.to], acceptableMovesUci: [], hint: 'Inspect the central pawn contact and develop with the current threats in mind.', teachingPoint, watchFor: 'An unfamiliar move is not automatically a mistake; check the actual position.' };
}
const recognitionPositions: [string, string, string][][] = [
  [['e4 c5 c3 e6 d4 d5 e5 Nc6', 'Nf3', 'This is the French Advance position after a Sicilian move order. Develop and support the d4–e5 chain.'], ['e4 c5 c3 g6 d4 Bg7', 'Nf3', 'Black fianchettos early. Develop behind the centre while checking pressure on d4.']],
  [['e4 e6 d4 d5 e5 b6', 'Nf3', 'Black prepares a bishop fianchetto instead of immediately challenging d4. Develop while retaining central support.'], ['e4 e6 d4 d5 e5 c5 Nf3 Nc6', 'c3', 'The king knight moved first. Support d4 with c3 to reach the familiar Advance chain.']],
  [['e4 c6 d4 d5 exd5 cxd5 Nf3 Nc6', 'Bd3', 'The knight developed before the bishop. Develop toward h7 without assuming an immediate attack.'], ['e4 c6 d4 d5 exd5 cxd5 Bd3 g6', 'Nf3', 'Black prepares a fianchetto before the knights. Develop and keep the centre supported.']]
];
export const companionRecognition: ConceptDrill[] = companionDefinitions.map((family, index) => ({ key: `concept:${family.key}:recognition`, openingFamilyKey: family.key, title: family.title + ' · recognise the move order', principle: family.breaks, summary: family.scope,
  themes: ['pawn-structure', 'development'], depth: 'foundation', order: 110, planPrompt: 'What should guide your response to a changed move order?',
  planChoices: [{ id: 'assess', label: family.breaks, correct: true, feedback: family.pieces }, { id: 'copy', label: 'Play the memorised sequence without checking the changed pawn contact.', correct: false, feedback: family.exchanges }],
  scenarios: recognitionPositions[index].map(([sequence, answer, explanation], i) => scenario('recognition-' + (i + 1), sequence, answer, explanation)),
  ...(index === 0 ? { relatedLessons: [{ lessonKey: companionLessonKey('white-french-advance', 'main'), label: 'Continue the transposed position in French Advance' }] } : {})
}));
export const companionLines = companionChapters.map(chapter => chapter.line);
export const companionLessons = companionChapters.map(chapter => chapter.lesson);
export const companionDrills = [...companionChapters.map(chapter => chapter.drill), ...companionRecognition];
companionLessons[0].course!.drillMetadata = [{ key: companionRecognition[0].key, relatedLessons: companionRecognition[0].relatedLessons }];
const caroRecord = records['black-caro-kann-main/main'];
if (!caroRecord?.journey || caroRecord.journey.length !== 6) throw new Error('Missing corrected Caro continuation.');
export const correctedCaroContinuation: ContinuationJourney = {
  id: 'caro-main-continuation-v2', title: 'Caro-Kann: follow central exchanges into an imbalanced ending', sourceCheckpointId: 'break', sourceMove: 'c5',
  openingPrefix: caroRecord.opening.map(move => move.san), steps: authoredJourneySteps('black-caro-kann-main', caroRecord.journey, true),
  introduction: 'An original illustrative continuation with verified central exchanges and active rook play, not a forced sequence or a claimed win. White chooses a queen trade and later a material imbalance. Replay every connecting move and compare the alternatives.'
};
