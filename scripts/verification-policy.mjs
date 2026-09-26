import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const baseline = JSON.parse(readFileSync(new URL('./legacy-verification-baseline.json', import.meta.url), 'utf8'));
// Navigation metadata does not change a chess claim. All teaching, answers,
// positions and continuations remain part of the immutable legacy fingerprint.
export function assessmentRecord(record) {
  const { course, courseOrder, optional, relatedLessons, ...assessed } = record;
  return assessed;
}
export function isLegacyBaseline(collection, record, fingerprint) {
  return baseline[collection]?.[record.key] === fingerprint(assessmentRecord(record));
}
export function verificationDirectory({ side, family, exclude, output }) {
  if (output) return output;
  const filter = [side, family ?? 'all-courses', exclude ?? ''].join('|');
  return `outputs/course-verification/${side}-${(family ?? 'all-courses').replace(/[^a-z0-9-]/gi, '-')}-${createHash('sha256').update(filter).digest('hex').slice(0, 8)}`;
}
