import content from './blackCourseContent.json' with { type: 'json' };
import recognitionContent from './blackRecognitionContent.json' with { type: 'json' };
import type { ConceptDrill } from '../domain/repertoire/types';
import { blackChapterSeeds, blackCourseDefinitions } from './blackCourseSeeds';
import { blackJourneyTeaching } from './blackJourneyTeaching';
import { compileChapter, compileJourney, type DecisionInput, type CourseDefinition } from './courseCompiler';
import type { AnnotatedMove } from '../features/connected/continuationJourney';

type AuthoredContent = { opening: AnnotatedMove[]; main: AnnotatedMove[]; transfer: AnnotatedMove[]; mistake: { san: string; note: string }; journey?: {
  id: string; bridge: AnnotatedMove[]; main: AnnotatedMove[]; candidates: { move: string; note: string; reply: string; replyNote: string }[];
}[] };
const records = content as Record<string, AuthoredContent>;
export const blackCourses = blackCourseDefinitions.map(course => ({ ...course, side: 'black' as const })) satisfies CourseDefinition[];
const names: Record<string, string> = { N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

export const compiledBlackChapters = blackChapterSeeds.map(seed => {
  const course = blackCourses.find(course => course.key === seed.family)!;
  const data = records[course.key + '/' + seed.slug];
  if (!data) throw new Error('Missing authored course content: ' + course.key + '/' + seed.slug);
  const siblings = blackChapterSeeds.filter(chapter => chapter.family === seed.family);
  const order = siblings.indexOf(seed) + (siblings.some(chapter => chapter.slug === 'main') ? 0 : 1);
  const key = seed.slug === 'main' ? course.mainLessonKey : `lesson:${course.key}:${seed.slug}`;
  const lineKey = seed.lineKey ?? (seed.slug === 'main' ? course.key : `${course.key}-course-${seed.slug}`);
  const question = (id: string, prompt: string, correct: string, wrong: string) => ({ id, prompt, hint: seed.threat,
    choices: [
      { id: 'position', label: correct, correct: true, feedback: seed.focus + ' ' + seed.threat },
      { id: 'automatic', label: wrong, correct: false, feedback: seed.threat + ' Judge the current threats and pawn contact before following a routine.' },
      { id: 'exchange', label: 'Exchange pieces immediately without checking which pawn structure and activity remain.', correct: false, feedback: course.exchanges }
    ]
  });
  function decisions(items: AnnotatedMove[], transfer: boolean): DecisionInput[] {
    const prefix = transfer ? 'transfer-' : '';
    return items.filter((_, index) => index % 2 === 0).map((move, index, moves) => {
      const reply = items[index * 2 + 1];
      const piece = move.san.startsWith('O-O') ? 'king safety' : (names[move.san[0]] ?? 'pawn structure');
      const id = `${prefix}decision-${index + 1}`;
      return { id, prompt: `${index === 0 ? seed.focus : `Reassess your ${piece} after White’s reply.`} Choose a move and check the response.`,
        change: index ? items[index * 2 - 1].note : transfer ? data.transfer[0].note : seed.threat,
        hint: index === 0 ? seed.focus : `Consider ${piece}, then inspect checks, captures, and central pawn contact. ${course.breaks}`,
        dimension: index === 0 ? 'tactics' : 'understanding',
        answers: [{ moveSan: move.san, repliesSan: reply ? [reply.san] : [], nextId: index === moves.length - 1 ? null : `${prefix}decision-${index + 2}`,
          feedback: move.note + ' ' + (index === 0 ? seed.focus : course.exchanges) + (reply ? ' ' + reply.note : '') }],
        mistakes: !transfer && index === 0 ? { [data.mistake.san]: data.mistake.note } : {},
        comparisons: { [move.san]: move.note, ...(!transfer && index === 0 ? { [data.mistake.san]: data.mistake.note } : {}) }
      };
    });
  }
  const compiled = compileChapter(course, {
    key, lineKey, conceptKey: `concept:${course.key}:${seed.slug}`, title: seed.title, order, optional: seed.optional,
    opening: data.opening, structure: { title: seed.title, breaks: course.breaks, pieces: course.pieces, counterplay: seed.threat, exchanges: course.exchanges, ending: course.ending },
    introduction: seed.focus + ' ' + course.scope, takeaway: seed.focus,
    questions: [question('structure', 'What changes your plan in this structure?', seed.threat, seed.misconception), question('plan', 'Which plan connects defense and activity?', seed.focus, seed.misconception)],
    main: decisions(data.main, false), transfer: { sourceCheckpointId: 'decision-1', sourceMove: data.main[0].san, opponent: data.transfer[0],
      explanation: `Return to the position after ${data.main[0].san}. White chooses ${data.transfer[0].san} instead of ${data.main[1].san}. ${data.transfer[0].note} Reassess before continuing.`, decisions: decisions(data.transfer.slice(1), true) }
  });
  if (data.journey) {
    const teaching = blackJourneyTeaching[course.key];
    compiled.lesson.continuation = compileJourney(compiled.lesson, {
      id: `${course.key}-continuation-v1`, title: `${course.title}: follow the position into an ending`, sourceCheckpointId: 'decision-4', sourceMove: data.main[6].san,
      introduction: 'An original illustrative continuation, not a forced sequence or a guaranteed win. Every connecting move is replayed from the lesson. Compare the candidates and White’s replies before returning to the model line.',
      steps: data.journey.map((step, index) => ({ id: step.id, title: teaching[index].title, prompt: teaching[index].title + '. Compare the concrete consequences of the two candidate moves.',
        hint: teaching[index].hint, takeaway: teaching[index].takeaway,
        bridge: step.bridge, main: step.main,
        choices: [
          ...step.candidates.map((candidate, candidateIndex) => ({ id: 'plan-' + candidateIndex, label: teaching[index].reasons[candidateIndex], correct: true, feedback: candidate.note + ' ' + teaching[index].takeaway })),
          { id: 'automatic', label: 'The opening name guarantees that exchanging pieces wins the ending.', correct: false, feedback: 'Check the actual material, pawn structure, and piece activity. This is an illustration, not a forced win.' }
        ],
        candidates: step.candidates.map((candidate, candidateIndex) => ({ move: candidate.move, assessment: 'accepted', explanation: teaching[index].reasons[candidateIndex] + ' ' + candidate.note,
          reasonIds: ['plan-' + candidateIndex], replies: [{ move: candidate.reply, sound: true, explanation: candidate.replyNote }] }))
      }))
    });
  }
  return compiled;
});

// Existing source records remain authoritative; these are only additional source lines.
export const blackCourseLines = compiledBlackChapters.filter((_, index) => !blackChapterSeeds[index].reuseSource).map(chapter => chapter.line);
export const blackCourseLessons = compiledBlackChapters.map(chapter => chapter.lesson);
export const blackCourseDrills: ConceptDrill[] = [...compiledBlackChapters.map(chapter => chapter.drill), ...recognitionContent as ConceptDrill[]];
