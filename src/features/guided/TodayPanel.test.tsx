import { render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TodayPanel } from './TodayPanel';
import { createInitialMastery, scheduleReview } from '../../domain/repertoire/training';
import type { LearningAttempt } from '../../domain/repertoire/types';

afterEach(() => vi.useRealTimers());

it('counts distinct recently practised skills, preserves the answer recap, and expires old practice', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
  const now = new Date().toISOString();
  let mastery = createInitialMastery({ learnerId: 'test', itemKey: 'plan', positionKey: 'position', now });
  const attempt: LearningAttempt = { id: 'one', learnerId: 'test', itemKey: 'plan', positionKey: 'position', dimension: 'understanding', response: 'develop', correct: true, hintUsed: false, revealed: false, createdAt: now };
  mastery = scheduleReview(scheduleReview(mastery, attempt), { ...attempt, id: 'two' });
  mastery = scheduleReview(mastery, { ...attempt, id: 'three', dimension: 'recall' });
  const props: Parameters<typeof TodayPanel>[0] = {
    dailySession: { id: 'daily', learnerId: 'test', contentVersion: 1, status: 'completed', durationMinutes: 5, currentIndex: 1, targets: [], outcomes: [{ targetId: 'plan', status: 'completed', correct: 3, total: 4, assistanceUsed: 0, completedAt: now }], createdAt: now, updatedAt: now },
    preview: { id: 'preview', learnerId: 'test', contentVersion: 1, status: 'active', durationMinutes: 5, currentIndex: 0, targets: [], outcomes: [], createdAt: now, updatedAt: now }, profile: { learnerId: 'test', depth: 'foundation', goal: 'basic-plans', onboardingCompleted: true, updatedAt: now },
    openings: [], selectedOpeningKeys: [], mastery: [mastery], backlog: [],
    onStart: vi.fn(), onStartSession: vi.fn(), onContinueSession: vi.fn(), onDuration: vi.fn(), onPreferences: vi.fn()
  };
  const view = render(<TodayPanel {...props} />);
  const metric = () => within(screen.getByRole('region', { name: 'Learning progress' })).getByText('distinct skills practised in 7 days').parentElement!;
  expect(metric()).toHaveTextContent('2distinct skills');
  expect(screen.getByText(/3\/4 answers correct/)).toBeInTheDocument();
  vi.setSystemTime(new Date('2026-09-22T12:00:00Z'));
  view.rerender(<TodayPanel {...props} />);
  expect(metric()).toHaveTextContent('2distinct skills');
  vi.setSystemTime(new Date('2026-09-22T12:00:00.001Z'));
  view.rerender(<TodayPanel {...props} />);
  expect(metric()).toHaveTextContent('0distinct skills');
});
