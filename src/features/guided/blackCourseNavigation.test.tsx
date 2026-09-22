import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GuidedOnboarding } from './GuidedOnboarding';
import { RepertoireMap } from './RepertoireMap';
import { courseCatalog } from '../connected/course';
import { embeddedRepertoireGraph as graph } from '../../services/guidedContentRepository';

describe('Black course navigation', () => {
  it('preserves the onboarding defaults and offers targeted Black additions separately', async () => {
    const complete = vi.fn();
    render(<GuidedOnboarding learnerId="local" openings={Object.values(graph.openings)} courses={courseCatalog(graph)} onComplete={complete} />);
    await userEvent.click(screen.getByText('Customize repertoire and training level'));
    const primary = screen.getByRole('combobox', { name: 'As Black against 1.e4' });
    expect(primary).toHaveValue('black-caro-kann-main');
    expect(within(primary).queryByRole('option', { name: /Alien/ })).not.toBeInTheDocument();
    expect(within(primary).queryByRole('option', { name: /Vienna/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start learning' }));
    expect(complete.mock.calls[0][0].openingFamilyKeys).toEqual(['white-vienna-main', 'black-caro-kann-main']);
    const d4 = screen.getByRole('group', { name: 'As Black against 1.d4' });
    await userEvent.click(within(d4).getByRole('checkbox', { name: /QGD for Black/ }));
    await userEvent.click(within(d4).getByRole('checkbox', { name: /London/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Start learning' }));
    expect(complete.mock.calls[1][0].openingFamilyKeys).toEqual(['white-vienna-main', 'black-queens-gambit-main', 'black-london-main', 'black-caro-kann-main']);
    expect(complete.mock.calls[1][0].blackD4Preference).toBe('selected');
  });

  it('shows core chapters, secondary optional study and honest 1.d4 coverage', async () => {
    const open = vi.fn();
    render(<RepertoireMap graph={graph} selectedKeys={['black-alien-gambit-defense', 'black-queens-gambit-main']} mastery={[]} sessions={[]} onTrain={() => {}} onPracticeIdeas={() => {}} onConcept={() => {}} onLesson={open} />);
    expect(screen.getByText(/Other systems and flank openings remain outside their scope/)).toBeInTheDocument();
    const chapters = screen.getByRole('region', { name: 'Alien Gambit: Calm Defense chapters' });
    const core = within(chapters).getByRole('button', { name: /^2\. Alien defense: meet Bd3/ });
    await userEvent.click(core);
    expect(open).toHaveBeenCalledWith('lesson:black-alien-gambit-defense:quiet');
    const optional = within(chapters).getByRole('button', { name: /^4\. Optional Alien recovery/ });
    expect(optional).not.toBeVisible();
    await userEvent.click(within(chapters).getByText(/Optional Alien recovery.*further study/));
    expect(optional).toBeVisible();
  });
});
