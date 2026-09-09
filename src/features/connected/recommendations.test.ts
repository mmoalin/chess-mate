import { describe, expect, it } from 'vitest';
import { embeddedRepertoireGraph } from '../../services/guidedContentRepository';
import { recommendGuidedNextActivity } from '../../domain/repertoire/recommendations';
import { createInitialMastery } from '../../domain/repertoire/training';
import { starterConnectedLessons } from '../../data/connectedLessons';
import { createLessonSession } from './session';
import type { LessonSession } from './types';

describe('connected lesson recommendations', () => {
  const lesson = starterConnectedLessons[0];
  const now = '2026-09-09T10:00:00.000Z';
  const due = createInitialMastery({ learnerId: 'local', itemKey: lesson.key + '/develop', positionKey: '', now });
  due.understanding.status = 'learning';
  const input = { graph: embeddedRepertoireGraph, selectedOpeningKeys: [lesson.openingFamilyKey], mastery: [due], backlog: [], now, lessonSessions: [] as LessonSession[] };
  it('prioritizes unfinished sessions, then exact due checkpoints, then new lessons', () => {
    const session = createLessonSession(lesson, 'local', 'today');
    expect(recommendGuidedNextActivity({ ...input, lessonSessions: [session] }).targetKey).toBe('session:' + session.id);
    expect(recommendGuidedNextActivity(input).targetKey).toBe(lesson.key + '/develop');
    expect(recommendGuidedNextActivity({ ...input, mastery: [] }).targetKey).toBe(lesson.key);
  });
  it('does not confuse checkpoint review with whole-lesson completion or restart with resume', () => {
    const old = { ...createLessonSession(lesson, 'local', 'today'), supersededAt: now };
    const review = { ...createLessonSession(lesson, 'local', 'today', 'develop'), completedAt: now };
    expect(recommendGuidedNextActivity({ ...input, mastery: [], lessonSessions: [old, review] }).targetKey).toBe(lesson.key);
    const completed = { ...createLessonSession(lesson, 'local', 'today'), completedAt: now };
    expect(recommendGuidedNextActivity({ ...input, mastery: [], lessonSessions: [completed] }).kind).toBe('concept-drill');
  });
});
