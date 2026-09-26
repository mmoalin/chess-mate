import type { ConnectedLesson } from '../features/connected/types';

export function addWhiteCoverageMetadata(lessons: ConnectedLesson[]) {
  for (const descriptor of [
    { key: 'white-vienna-main', main: 'lesson:vienna-development', entry: ['e4', 'e5'], scope: 'After 1.e4 e5, play 2.Nc3. These chapters cover the named Vienna responses, not every legal continuation after …e5.' },
    { key: 'white-alien-gambit-main', main: 'lesson:alien-gambit-main', entry: ['e4', 'c6'], scope: 'A targeted Caro-Kann course after 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nf6 5.Ng5. Other Caro-Kann fourth moves are outside it. The accepted Alien sacrifice is unsound against accurate defence.' }
  ]) {
    const family = lessons.filter(lesson => lesson.openingFamilyKey === descriptor.key && !lesson.optional).sort((a, b) => (a.courseOrder ?? 0) - (b.courseOrder ?? 0));
    const main = family.find(lesson => lesson.key === descriptor.main) ?? family.find(lesson => lesson.lineKey === descriptor.key);
    if (!main) throw new Error('Missing coverage main lesson: ' + descriptor.key);
    main.course = { mainLessonKey: main.key, role: 'response', context: 'white', scope: descriptor.scope,
      coverage: { entryMoves: descriptor.entry, routes: family.map(lesson => ({ key: lesson.key, title: lesson.title, entryMoves: lesson.openingMoves, lessonKeys: [lesson.key], scope: lesson.takeaway })) }
    };
  }
}
