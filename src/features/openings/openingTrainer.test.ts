import { describe, expect, it } from 'vitest';
import { OpeningTrainer } from './openingTrainer';
import type { RepertoireLine } from './types';

const line: RepertoireLine = {
  id: 'vienna-main',
  side: 'white',
  name: 'Vienna Game Main Line',
  eco: 'C26',
  movesSan: ['e4', 'e5', 'Nc3', 'Nf6'],
  tags: ['vienna'],
  explanation: 'Develop the queen knight before f4 ideas.'
};

describe('OpeningTrainer', () => {
  it('marks a correct move and advances the expected move index', () => {
    const trainer = new OpeningTrainer([line]);

    const result = trainer.recordMove('vienna-main', 0, 'e4');

    expect(result).toEqual({
      status: 'correct',
      expectedMove: 'e4',
      nextMoveIndex: 1,
      completed: false
    });
  });

  it('marks incorrect moves as needs-review without advancing', () => {
    const trainer = new OpeningTrainer([line]);

    const result = trainer.recordMove('vienna-main', 0, 'd4');

    expect(result).toEqual({
      status: 'incorrect',
      expectedMove: 'e4',
      nextMoveIndex: 0,
      completed: false
    });
  });

  it('evaluates expected and acceptable critical-position moves', () => {
    const trainer = new OpeningTrainer([{
      ...line,
      criticalPositions: [{ id: 'critical', lineId: line.id, ply: 2, fen: 'start', prompt: 'Choose', expectedMoves: ['Nxf7'], acceptableMoves: ['Bc4'], themes: ['initiative'] }]
    }]);
    const position = trainer.criticalPositionsFor(line.id)[0];
    expect(trainer.evaluateCriticalMove(position, 'Bc4').status).toBe('correct');
    expect(trainer.evaluateCriticalMove(position, 'a3').status).toBe('incorrect');
  });

  it('returns side-specific repertoire lines', () => {
    const trainer = new OpeningTrainer([
      line,
      { ...line, id: 'sicilian-black', side: 'black', name: 'Sicilian Defense', movesSan: ['e4', 'c5'] }
    ]);

    expect(trainer.linesForSide('black').map((item) => item.id)).toEqual(['sicilian-black']);
  });

  it('filters lines by strategic theme tags', () => {
    const trainer = new OpeningTrainer([
      { ...line, themeTags: ['center-control', 'initiative'] },
      { ...line, id: 'london', name: 'London System', themeTags: ['pawn-chain', 'minor-piece-quality'] }
    ]);

    expect(trainer.linesForTheme('pawn-chain').map((item) => item.id)).toEqual(['london']);
    expect(trainer.availableThemes()).toEqual(['center-control', 'initiative', 'minor-piece-quality', 'pawn-chain']);
  });

  it('returns move explanations and common mistake notes by move index', () => {
    const trainer = new OpeningTrainer([
      {
        ...line,
        moveExplanations: [{ moveIndex: 2, principle: 'develop', summary: 'Bring a knight toward the center.' }],
        commonMistakes: [{ moveIndex: 2, principle: 'tempo', summary: 'Avoid queen moves before pieces are ready.' }]
      }
    ]);

    expect(trainer.moveExplanation('vienna-main', 2)?.principle).toBe('develop');
    expect(trainer.commonMistake('vienna-main', 2)?.summary).toMatch(/queen moves/i);
  });

  it('sorts beginner lines before theory branches while keeping side filtering', () => {
    const trainer = new OpeningTrainer([
      {
        ...line,
        id: 'vienna-gambit-theory',
        name: 'Vienna Gambit: Theory Branch',
        difficulty: 'theory',
        parentLineId: 'vienna-main'
      },
      {
        ...line,
        id: 'vienna-main',
        name: 'Vienna Game Main Line',
        difficulty: 'beginner'
      },
      {
        ...line,
        id: 'sicilian-theory',
        side: 'black',
        name: 'Sicilian Theory Branch',
        difficulty: 'theory',
        parentLineId: 'sicilian-main'
      }
    ]);

    expect(trainer.linesForSide('white').map((item) => item.id)).toEqual(['vienna-main', 'vienna-gambit-theory']);
  });

  it('finds theory branches that build from a parent beginner line', () => {
    const trainer = new OpeningTrainer([
      { ...line, id: 'vienna-main', difficulty: 'beginner' },
      {
        ...line,
        id: 'vienna-gambit-theory',
        name: 'Vienna Gambit: Theory Branch',
        difficulty: 'theory',
        parentLineId: 'vienna-main'
      },
      {
        ...line,
        id: 'london-theory',
        name: 'London Theory Branch',
        difficulty: 'theory',
        parentLineId: 'london-main'
      }
    ]);

    expect(trainer.theoryBranchesFor('vienna-main').map((item) => item.id)).toEqual(['vienna-gambit-theory']);
  });
});
