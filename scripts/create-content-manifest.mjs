import './register-typescript.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const { compileLegacyLines } = await import('../src/domain/repertoire/graph.ts');
const { legacyStarterRepertoires, preAlienStarterRepertoires } = await import('../src/data/repertoires.ts');
const { legacyStarterConnectedLessons, preAlienStarterConnectedLessons } = await import('../src/data/connectedLessons.ts');
const { legacyStarterConceptDrills, preAlienStarterConceptDrills } = await import('../src/data/conceptDrills.ts');
const { contentFingerprint } = await import('../src/domain/repertoire/contentFingerprint.ts');
const previous = JSON.parse(readFileSync('src/data/fixtures/pre-black-release.json', 'utf8'));
const make = (lines, lessons, drills, version) => ({ ...compileLegacyLines(lines), release: { ...previous.release, version }, connectedLessons: Object.fromEntries(lessons.map(lesson => [lesson.key, lesson])), conceptDrills: Object.fromEntries(drills.map(drill => [drill.key, drill])) });
const legacy = make(legacyStarterRepertoires, legacyStarterConnectedLessons, legacyStarterConceptDrills, 1);
const preAlien = make(preAlienStarterRepertoires, preAlienStarterConnectedLessons, preAlienStarterConceptDrills, 2);
writeFileSync('src/data/fixtures/legacy-release.json', JSON.stringify(legacy));
writeFileSync('src/data/fixtures/pre-alien-release.json', JSON.stringify(preAlien));
const manifest = {};
for (const graph of [legacy, preAlien, previous]) for (const [collection, records] of Object.entries(graph)) {
  if (collection === 'release') continue;
  for (const [key, record] of Object.entries(records)) {
    const slot = (manifest[collection] ??= {})[key] ??= [];
    const fingerprint = contentFingerprint(record); if (!slot.includes(fingerprint)) slot.push(fingerprint);
  }
}
writeFileSync('src/data/bundledContentManifest.json', JSON.stringify(manifest));
console.log('Generated release fingerprints and test-only legacy fixtures.');
