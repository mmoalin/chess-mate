// Deliberately reads the fixed pre-release fixture, never current authored content.
import './register-typescript.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { contentFingerprint } from '../src/domain/repertoire/contentFingerprint.ts';
import { assessmentRecord } from './verification-policy.mjs';
const graph = JSON.parse(readFileSync('src/data/fixtures/pre-white-companions-release.json', 'utf8'));
const records = collection => Object.fromEntries(Object.values(collection).map(record => [record.key, contentFingerprint(assessmentRecord(record))]));
writeFileSync('scripts/legacy-verification-baseline.json', JSON.stringify({ lessons: records(graph.connectedLessons), drills: records(graph.conceptDrills) }, null, 2) + '\n');
const upgrade = Object.fromEntries(['openings', 'learningUnits', 'guidance', 'deviationPolicies', 'connectedLessons', 'conceptDrills'].map(collection => [collection, Object.fromEntries(Object.entries(graph[collection]).map(([key, record]) => [key, contentFingerprint(record)]))]));
writeFileSync('src/data/preWhiteCompanionManifest.json', JSON.stringify(upgrade, null, 2) + '\n');
