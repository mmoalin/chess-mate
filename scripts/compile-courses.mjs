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
const { companionLines: lines, companionLessons: lessons, companionDrills: drills, correctedCaroContinuation } = await import('../src/data/whiteCompanionAuthoring.ts');
for (const lesson of lessons) {
  const issues = validateConnectedLesson(lesson);
  if (issues.length) throw new Error(lesson.key + ': ' + issues.join('; '));
}
const whitePath = 'src/data/compiledWhiteCompanions.json';
const whiteOutput = JSON.stringify({ lines, lessons, drills }) + '\n';
if (!existsSync(whitePath) || readFileSync(whitePath, 'utf8') !== whiteOutput) writeFileSync(whitePath, whiteOutput);
console.log(`Compiled ${lessons.length} White companion chapters and ${drills.length} drills.`);
const previousCaro = JSON.parse(readFileSync('src/data/fixtures/pre-white-companions-release.json', 'utf8')).connectedLessons['lesson:caro-active'];
const caroIssues = validateConnectedLesson({ ...previousCaro, version: 2, continuation: correctedCaroContinuation });
if (caroIssues.length) throw new Error('Corrected Caro: ' + caroIssues.join('; '));
const caroPath = 'src/data/compiledCaroCorrection.json';
const caroOutput = JSON.stringify(correctedCaroContinuation) + '\n';
if (!existsSync(caroPath) || readFileSync(caroPath, 'utf8') !== caroOutput) writeFileSync(caroPath, caroOutput);
