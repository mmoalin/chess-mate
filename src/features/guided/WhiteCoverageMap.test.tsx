import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WhiteCoverageMap } from './WhiteCoverageMap';
import { CompanionPack } from './CompanionPack';
import { GuidedOnboarding } from './GuidedOnboarding';
import { embeddedRepertoireGraph as graph } from '../../services/guidedContentRepository';
import { courseCatalog, mainCourseLesson } from '../connected/course';
import { companionKeys } from '../connected/coverage';
import { createLessonSession } from '../connected/session';

describe('White reply coverage and companion selection', () => {
  it('shows unsupported replies, limited Alien scope and exact resume destinations', async () => {
    const lesson = mainCourseLesson(graph, companionKeys[0])!; const session = createLessonSession(lesson, 'local', 'repertoire'); const open = vi.fn();
    render(<WhiteCoverageMap graph={graph} selected={[companionKeys[0]]} sessions={[session]} onLesson={open} />);
    const map = screen.getByRole('region', { name: 'White after 1.e4' });
    const rows = map.querySelectorAll(':scope > details'); expect(rows).toHaveLength(9);
    expect(rows[1].querySelector('summary')).toHaveTextContent('…c5Selected');
    expect(rows[4].querySelector('summary')).toHaveTextContent('No course in this release');
    await userEvent.click(rows[1].querySelector('summary')!);
    await userEvent.click(within(rows[1] as HTMLElement).getByRole('button', { name: /Resume: Alapin: meet the immediate …d5/ }));
    expect(open).toHaveBeenCalledWith('session:' + session.id);
    await userEvent.click(rows[3].querySelector('summary')!);
    expect(within(rows[3] as HTMLElement).getByText(/accepted Alien sacrifice is unsound/)).toBeInTheDocument();
    expect(map.textContent).not.toMatch(/\d+%/);
  });

  it('adds only available courses without removing or duplicating existing selections', async () => {
    const courses = { ...courseCatalog(graph) }; delete courses[companionKeys[1]]; const change = vi.fn();
    render(<CompanionPack openings={Object.values(graph.openings)} courses={courses} selected={['white-vienna-main', companionKeys[0], 'black-caro-kann-main']} onChange={change} />);
    expect(screen.getByRole('status')).toHaveTextContent('French Advance');
    await userEvent.click(screen.getByRole('button', { name: 'Add White 1.e4 companion courses' }));
    expect(change).toHaveBeenCalledWith(['white-vienna-main', companionKeys[0], 'black-caro-kann-main', companionKeys[2]]);
  });

  it('keeps onboarding defaults until the learner explicitly adds the pack', async () => {
    const complete = vi.fn(); const view = render(<GuidedOnboarding learnerId="local" openings={Object.values(graph.openings)} courses={courseCatalog(graph)} onComplete={complete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Start learning' }));
    expect(complete.mock.calls[0][0].openingFamilyKeys).toEqual(['white-vienna-main', 'black-caro-kann-main']);
    await userEvent.click(screen.getByText('Customize repertoire and training level'));
    await userEvent.click(screen.getByRole('button', { name: 'Add White 1.e4 companion courses' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start learning' }));
    expect(complete.mock.calls[1][0].openingFamilyKeys).toEqual(['white-vienna-main', ...companionKeys, 'black-caro-kann-main']);
    view.unmount();
  });
});
