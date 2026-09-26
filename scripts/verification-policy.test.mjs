// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isLegacyBaseline, verificationDirectory } from './verification-policy.mjs';
import { contentFingerprint } from '../src/domain/repertoire/contentFingerprint.ts';
import previous from '../src/data/fixtures/pre-white-companions-release.json';
describe('verification baseline safety', () => {
  it('exempts only fingerprinted legacy assessments, independently of colour and naming', () => {
    const lesson = structuredClone(previous.connectedLessons['lesson:vienna-development']);
    expect(isLegacyBaseline('lessons', lesson, contentFingerprint)).toBe(true);
    lesson.course = { scope: 'New navigation description' };
    expect(isLegacyBaseline('lessons', lesson, contentFingerprint)).toBe(true);
    lesson.decisions[lesson.mainStartId].answers[0].moveSan = 'a3';
    expect(isLegacyBaseline('lessons', lesson, contentFingerprint)).toBe(false);
    expect(isLegacyBaseline('lessons', { ...previous.connectedLessons['lesson:vienna-development'], key: 'lesson:white-new' }, contentFingerprint)).toBe(false);
    const drill = structuredClone(previous.conceptDrills['concept:caro-resolve-centre']);
    drill.scenarios[1].acceptableMovesUci = [];
    expect(isLegacyBaseline('drills', drill, contentFingerprint)).toBe(false);
  });
  it('isolates side, course and exclusion evidence', () => {
    const runs = [{ side: 'white' }, { side: 'black' }, { side: 'white', family: 'one' }, { side: 'white', family: 'two' }, { side: 'white', exclude: 'one' }].map(verificationDirectory);
    expect(new Set(runs).size).toBe(runs.length);
  });
});
