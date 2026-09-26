import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { GameReviewWorkspace } from './GameReviewWorkspace';
import { GameReviewRepository } from './repository';
import { importGame } from './import';
import { ANALYSIS_VERSION, type PracticeCard } from './types';
import type { RepertoireGraph } from '../../domain/repertoire/types';

vi.mock('react-chessboard',()=>({Chessboard:()=> <div>Board</div>}));
it('keeps analysis hidden, restores drafts, and preserves the first graded answer after refresh', async () => {
  const repository = new GameReviewRepository(null), game = await importGame('1. e4 *','white');
  const before = {fen:game.startFen,version:ANALYSIS_VERSION,requestedDepth:16,depth:16,score:{type:'cp' as const,value:100},pv:['d2d4']};
  const card:PracticeCard = {schema:1,id:'card',gameId:game.id,side:'white',version:ANALYSIS_VERSION,createdAt:new Date().toISOString(),finding:{ply:0,fen:game.startFen,played:'e2e4',alternative:'d2d4',before,after:{...before,fen:game.fens[1]},loss:100,severity:100,category:'evaluation',explanation:'Confirmed evaluation difference'}};
  await repository.save('local','game',game); await repository.save('local','card',card);
  const props={owner:'local',repository,graph:{openings:{},connectedLessons:{}} as RepertoireGraph,selectedKeys:[],targetCard:'card',onChange:vi.fn(),onLesson:vi.fn(),onClose:vi.fn()};
  const first=render(<GameReviewWorkspace {...props}/>);
  await screen.findByRole('textbox',{name:'Practice move'}); expect(screen.queryByText(/Played in the game/)).not.toBeInTheDocument();
  await userEvent.type(screen.getByRole('textbox',{name:'Practice move'}),'d4'); await userEvent.type(screen.getByRole('textbox',{name:'Your plan'}),'Develop centrally');
  await repository.load('local'); first.unmount();
  const second=render(<GameReviewWorkspace {...props}/>);
  await waitFor(()=>expect(screen.getByRole('textbox',{name:'Practice move'})).toHaveValue('d4'));
  expect(screen.getByRole('textbox',{name:'Your plan'})).toHaveValue('Develop centrally');
  await userEvent.click(screen.getByRole('button',{name:'Submit move'})); await screen.findByText(/Your first graded answer is saved/);
  second.unmount(); render(<GameReviewWorkspace {...props}/>);
  await screen.findByText(/Your first graded answer is saved/); expect(screen.getByRole('textbox',{name:'Practice move'})).toBeDisabled();
  expect((await repository.load('local')).sessions.filter(s=>s.submittedAt)).toHaveLength(1);
});
