import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { starterCurriculumModules } from './curriculum';
import { studyPositions } from './studyPositions';

describe('task-owned study positions', () => {
  for (const task of starterCurriculumModules.flatMap((module) => module.tasks)) it('has a legal, playable exercise for ' + task.id, () => {
    const exercise = studyPositions[task.id];
    expect(exercise).toBeDefined();
    expect(exercise.moves.length).toBeGreaterThan(0);
    for (const move of exercise.moves) expect(new Chess(exercise.fen).move(move)).toBeTruthy();
  });
  it('takes opposition in the endgame position, independent of any opening selection', () => {
    const chess = new Chess(studyPositions['basic-endgames-opposition'].fen);
    chess.move('Ke4');
    expect(chess.get('e4')).toEqual({ type: 'k', color: 'w' });
    expect(chess.get('e6')).toEqual({ type: 'k', color: 'b' });
    expect(chess.turn()).toBe('b');
  });
});
