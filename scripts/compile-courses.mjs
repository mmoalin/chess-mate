import './register-typescript.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const { blackCourseLines, blackCourseLessons, blackCourseDrills } = await import('../src/data/blackCourseAuthoring.ts');
const { validateConnectedLesson } = await import('../src/features/connected/session.ts');
for (const lesson of blackCourseLessons) {
  const issues = validateConnectedLesson(lesson);
  if (issues.length) throw new Error(lesson.key + ': ' + issues.join('; '));
}
const path = 'src/data/compiledBlackCourses.json';
const output = JSON.stringify({ lines: blackCourseLines, lessons: blackCourseLessons, drills: blackCourseDrills }) + '\n';
if (!existsSync(path) || readFileSync(path, 'utf8') !== output) writeFileSync(path, output);
console.log(`Compiled ${blackCourseLessons.length} Black chapters and ${blackCourseDrills.length} drills.`);
