# Opening Middlegame Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the existing beginner opening repertoire into early middlegame plans, with optional theory-heavy branches that build on top.

**Architecture:** Keep static repertoire content in `src/data/repertoires.ts`, add optional metadata to the existing `RepertoireLine` type, and add small helper methods to `OpeningTrainer` so the UI does not need to know how parent/theory relationships work. Validate the repertoire as data with Vitest and `chess.js`, then expose difficulty and middlegame ideas in the existing Openings dock.

**Tech Stack:** Vite, React, TypeScript, chess.js, react-chessboard, lucide-react, Vitest, React Testing Library.

---

## File Structure

- Modify `src/features/openings/types.ts`: add optional repertoire metadata and the `RepertoireMiddlegameIdea` type.
- Modify `src/features/openings/openingTrainer.ts`: add beginner-first sorting and theory branch lookup helpers.
- Modify `src/features/openings/openingTrainer.test.ts`: test the new trainer helpers without touching UI.
- Modify `src/features/journey/journey.ts`: recommend beginner lines before theory lines during setup.
- Modify `src/features/journey/journey.test.ts`: prove theory lines do not become default beginner recommendations.
- Modify `src/data/repertoires.ts`: extend the four current beginner lines and add linked theory branches.
- Create `src/data/repertoires.test.ts`: validate SAN legality and repertoire metadata.
- Modify `src/App.tsx`: show difficulty, linked theory branches, and middlegame ideas in the Openings dock.
- Modify `src/App.test.tsx`: verify the default learner path stays beginner-friendly and theory ideas are discoverable.
- Modify `src/styles.css`: add compact styles for difficulty badges, linked theory choices, and middlegame plan cards.

## Task 1: Add Repertoire Metadata Types

**Files:**
- Modify: `src/features/openings/types.ts`

- [ ] **Step 1: Add optional metadata types**

Replace the `RepertoireLine` type block with:

```ts
export type RepertoireSide = 'white' | 'black';

export type RepertoireDifficulty = 'beginner' | 'theory';

export type RepertoireMiddlegameIdea = {
  title: string;
  summary: string;
  planMoves?: string[];
  themes: string[];
  warning?: string;
};

export type RepertoireLine = {
  id: string;
  side: RepertoireSide;
  name: string;
  eco?: string;
  movesSan: string[];
  tags: string[];
  themeTags?: string[];
  difficulty?: RepertoireDifficulty;
  parentLineId?: string;
  middlegameIdeas?: RepertoireMiddlegameIdea[];
  modelPositionPly?: number;
  explanation?: string;
  moveExplanations?: RepertoireMoveExplanation[];
  commonMistakes?: RepertoireMoveExplanation[];
};
```

- [ ] **Step 2: Run type-checking build**

Run: `pnpm build`

Expected: PASS. No runtime behavior changed because every new field is optional.

- [ ] **Step 3: Commit**

```bash
git add src/features/openings/types.ts
git commit -m "feat: add repertoire middlegame metadata types"
```

## Task 2: Add OpeningTrainer Helpers

**Files:**
- Modify: `src/features/openings/openingTrainer.ts`
- Modify: `src/features/openings/openingTrainer.test.ts`

- [ ] **Step 1: Write failing tests for beginner sorting and theory branches**

Append these tests inside the existing `describe('OpeningTrainer', () => { ... })` block in `src/features/openings/openingTrainer.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test -- src/features/openings/openingTrainer.test.ts`

Expected: FAIL with `trainer.theoryBranchesFor is not a function`, or equivalent TypeScript/test failure.

- [ ] **Step 3: Implement trainer helpers**

Update `src/features/openings/openingTrainer.ts`:

```ts
import type { MoveTrainingResult, RepertoireLine, RepertoireMoveExplanation, RepertoireSide } from './types';

export class OpeningTrainer {
  private lines: RepertoireLine[];

  constructor(lines: RepertoireLine[]) {
    this.lines = lines;
  }

  allLines(): RepertoireLine[] {
    return sortBeginnerFirst(this.lines);
  }

  linesForSide(side: RepertoireSide): RepertoireLine[] {
    return sortBeginnerFirst(this.lines.filter((line) => line.side === side));
  }

  linesForTheme(theme: string): RepertoireLine[] {
    return sortBeginnerFirst(this.lines.filter((line) => line.themeTags?.includes(theme)));
  }

  theoryBranchesFor(parentLineId: string): RepertoireLine[] {
    return sortBeginnerFirst(
      this.lines.filter((line) => line.difficulty === 'theory' && line.parentLineId === parentLineId)
    );
  }

  availableThemes(): string[] {
    return Array.from(new Set(this.lines.flatMap((line) => line.themeTags ?? []))).sort();
  }

  findLine(lineId: string): RepertoireLine | undefined {
    return this.lines.find((line) => line.id === lineId);
  }

  moveExplanation(lineId: string, moveIndex: number): RepertoireMoveExplanation | undefined {
    return this.findLine(lineId)?.moveExplanations?.find((item) => item.moveIndex === moveIndex);
  }

  commonMistake(lineId: string, moveIndex: number): RepertoireMoveExplanation | undefined {
    return this.findLine(lineId)?.commonMistakes?.find((item) => item.moveIndex === moveIndex);
  }

  recordMove(lineId: string, moveIndex: number, san: string): MoveTrainingResult {
    const line = this.findLine(lineId);
    const expectedMove = line?.movesSan[moveIndex] ?? null;

    if (!line || !expectedMove || normalizeSan(san) !== normalizeSan(expectedMove)) {
      return {
        status: 'incorrect',
        expectedMove,
        nextMoveIndex: moveIndex,
        completed: false
      };
    }

    const nextMoveIndex = moveIndex + 1;
    const completed = nextMoveIndex >= line.movesSan.length;

    return {
      status: 'correct',
      expectedMove,
      nextMoveIndex,
      completed
    };
  }
}

function sortBeginnerFirst(lines: RepertoireLine[]): RepertoireLine[] {
  return [...lines].sort((a, b) => difficultyRank(a) - difficultyRank(b));
}

function difficultyRank(line: RepertoireLine): number {
  return line.difficulty === 'theory' ? 1 : 0;
}

function normalizeSan(san: string): string {
  return san.replace(/[+#]/g, '').trim();
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test -- src/features/openings/openingTrainer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/openings/openingTrainer.ts src/features/openings/openingTrainer.test.ts
git commit -m "feat: add opening theory branch helpers"
```

## Task 3: Keep Learner Recommendations Beginner-First

**Files:**
- Modify: `src/features/journey/journey.ts`
- Modify: `src/features/journey/journey.test.ts`

- [ ] **Step 1: Write failing recommendation test**

Append this test inside `describe('learner journey helpers', () => { ... })` in `src/features/journey/journey.test.ts`:

```ts
  it('does not recommend theory branches as the beginner setup default', () => {
    const theoryLine: RepertoireLine = {
      ...whiteLine,
      id: 'white-vienna-gambit-theory',
      name: 'Vienna Gambit: Theory Branch',
      difficulty: 'theory',
      parentLineId: 'white-vienna-main',
      tags: ['vienna', 'attacking']
    };
    const beginnerLine: RepertoireLine = {
      ...whiteLine,
      difficulty: 'beginner',
      tags: ['vienna', 'attacking']
    };

    const setup = createLearnerSetup({
      sidePreference: 'both',
      experienceLevel: 'beginner',
      studyTimeMinutes: 10,
      openingStyle: 'active',
      lines: [theoryLine, beginnerLine, blackLine]
    });

    expect(setup.recommendedWhiteLineId).toBe('white-vienna-main');
  });
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test -- src/features/journey/journey.test.ts`

Expected: FAIL because `chooseLine` currently picks the first active line, including theory branches.

- [ ] **Step 3: Filter theory lines out of setup recommendations**

Replace the `chooseLine` helper in `src/features/journey/journey.ts` with:

```ts
function chooseLine(lines: RepertoireLine[], side: 'white' | 'black', style: LearnerSetup['openingStyle']) {
  const sideLines = lines.filter((line) => line.side === side && line.difficulty !== 'theory');
  if (style === 'solid') {
    return sideLines.find((line) => line.tags.includes('solid') || line.tags.includes('structure')) ?? sideLines[0];
  }

  if (style === 'active') {
    return sideLines.find((line) => line.tags.includes('attacking') || line.tags.includes('counterplay')) ?? sideLines[0];
  }

  return sideLines[0];
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test -- src/features/journey/journey.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/journey/journey.ts src/features/journey/journey.test.ts
git commit -m "feat: keep beginner setup recommendations theory-free"
```

## Task 4: Expand Repertoire Data And Add Validation Tests

**Files:**
- Modify: `src/data/repertoires.ts`
- Create: `src/data/repertoires.test.ts`

- [ ] **Step 1: Write failing repertoire validation tests**

Create `src/data/repertoires.test.ts`:

```ts
import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { starterRepertoires } from './repertoires';

describe('starterRepertoires', () => {
  it('contains legal SAN sequences from the starting position', () => {
    for (const line of starterRepertoires) {
      const chess = new Chess();

      for (const move of line.movesSan) {
        const result = chess.move(move);
        expect(result, `${line.id} should accept ${move}`).not.toBeNull();
      }
    }
  });

  it('keeps theory branches linked to real beginner parent lines', () => {
    const ids = new Set(starterRepertoires.map((line) => line.id));

    for (const line of starterRepertoires.filter((item) => item.difficulty === 'theory')) {
      expect(line.parentLineId, `${line.id} should declare a parentLineId`).toBeTruthy();
      expect(ids.has(line.parentLineId ?? ''), `${line.id} should reference an existing parent`).toBe(true);
      expect(starterRepertoires.find((item) => item.id === line.parentLineId)?.difficulty).toBe('beginner');
    }
  });

  it('gives every beginner line a middlegame plan and valid model position', () => {
    for (const line of starterRepertoires.filter((item) => item.difficulty !== 'theory')) {
      expect(line.middlegameIdeas?.length, `${line.id} should have middlegame ideas`).toBeGreaterThan(0);
      expect(line.modelPositionPly, `${line.id} should mark a model position`).toBeGreaterThan(0);
      expect(line.modelPositionPly, `${line.id} model position should be inside the line`).toBeLessThanOrEqual(
        line.movesSan.length
      );
    }
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test -- src/data/repertoires.test.ts`

Expected: FAIL because existing beginner lines do not yet have `difficulty`, `middlegameIdeas`, and `modelPositionPly`.

- [ ] **Step 3: Replace repertoire data with expanded beginner and theory lines**

Replace the `starterRepertoires` array in `src/data/repertoires.ts` with expanded lines that meet these exact content requirements:

```ts
export const starterRepertoires: RepertoireLine[] = [
  {
    id: 'white-vienna-main',
    side: 'white',
    name: 'Vienna Game: Beginner Middlegame Plan',
    eco: 'C26',
    difficulty: 'beginner',
    modelPositionPly: 10,
    movesSan: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Nf3', 'Be7'],
    tags: ['vienna', 'king-pawn', 'attacking'],
    themeTags: ['center-control', 'initiative', 'minor-piece-quality', 'king-safety'],
    explanation: 'Use Nc3 and f4 to challenge Black early, then develop calmly before the attack outruns your pieces.',
    middlegameIdeas: [
      {
        title: 'Finish development before attacking',
        summary: 'Bring out Nf3, Be2 or Bb5, and castle before committing more pawns toward Black king.',
        planMoves: ['Nf3', 'Be2', 'O-O'],
        themes: ['development', 'king-safety'],
        warning: 'If the e4 pawn is loose, pause the attack and stabilize the center first.'
      },
      {
        title: 'Use the f-file when it opens',
        summary: 'After fxe5 or f-pawn exchanges, a rook on f1 can turn the opening pressure into a middlegame target.',
        planMoves: ['O-O', 'Rf1'],
        themes: ['open-files', 'initiative']
      }
    ],
    moveExplanations: [
      { moveIndex: 0, principle: 'contest center', summary: 'Claim central space so both bishops and the queen knight can develop naturally.' },
      { moveIndex: 2, principle: 'develop', summary: 'The knight supports e4, watches d5, and keeps the f-pawn free for active play.' },
      { moveIndex: 4, principle: 'create threat', summary: 'The f-pawn challenges Black before the position settles into quiet symmetry.' },
      { moveIndex: 8, principle: 'restore development', summary: 'Nf3 brings another piece out and helps White castle before attacking again.' }
    ],
    commonMistakes: [
      { moveIndex: 2, principle: 'avoid drift', summary: 'Early queen moves usually give Black easy developing tempi.' },
      { moveIndex: 4, principle: 'prepare breaks', summary: 'Pushing without enough piece support can leave e4 and the king exposed.' },
      { moveIndex: 8, principle: 'king safety', summary: 'A second pawn push before development gives Black central counterplay.' }
    ]
  },
  {
    id: 'white-vienna-gambit-theory',
    side: 'white',
    name: 'Vienna Gambit: Theory Layer',
    eco: 'C29',
    difficulty: 'theory',
    parentLineId: 'white-vienna-main',
    modelPositionPly: 10,
    movesSan: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Qf3', 'Nxc3'],
    tags: ['vienna', 'king-pawn', 'attacking', 'gambit'],
    themeTags: ['initiative', 'calculation', 'center-control'],
    explanation: 'A sharper Vienna branch where Qf3 asks Black to solve immediate central and kingside threats.',
    middlegameIdeas: [
      {
        title: 'Count forcing moves first',
        summary: 'The queen move creates pressure, but every capture in the center matters. Check forcing replies before choosing an attack.',
        planMoves: ['Qf3', 'bxc3', 'd4'],
        themes: ['calculation', 'initiative'],
        warning: 'This is a theory layer: if the tactics feel unclear, return to the beginner Vienna plan.'
      }
    ],
    moveExplanations: [
      { moveIndex: 4, principle: 'create threat', summary: 'The gambit move tries to seize initiative before Black completes development.' },
      { moveIndex: 8, principle: 'calculate forcing moves', summary: 'Qf3 attacks e4 and f7 ideas, but it must be backed by concrete calculation.' }
    ],
    commonMistakes: [
      { moveIndex: 8, principle: 'queen safety', summary: 'Do not treat Qf3 as automatic; if Black has easy tempi, the queen becomes a target.' }
    ]
  },
  {
    id: 'white-london-solid',
    side: 'white',
    name: 'London System: Beginner Middlegame Plan',
    eco: 'D02',
    difficulty: 'beginner',
    modelPositionPly: 12,
    movesSan: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'Bd6', 'Bg3', 'O-O', 'Bd3', 'b6'],
    tags: ['london', 'queen-pawn', 'structure', 'solid'],
    themeTags: ['pawn-chain', 'minor-piece-quality', 'weak-squares', 'king-safety'],
    explanation: 'Build the light-square bishop setup, keep the center stable, and reach a middlegame where your pieces know their jobs.',
    middlegameIdeas: [
      {
        title: 'Build the triangle, then choose a break',
        summary: 'Use d4, e3, and c3 when needed, then prepare e4 only after the pieces are developed.',
        planMoves: ['c3', 'Nbd2', 'e4'],
        themes: ['pawn-chain', 'pawn-break'],
        warning: 'Playing e4 too early can leave d4 weak and make the bishop on g3 look misplaced.'
      },
      {
        title: 'Use Ne5 as a simple outpost plan',
        summary: 'When Black plays quietly, Ne5 can centralize a knight and support kingside attacking ideas.',
        planMoves: ['Nbd2', 'Ne5', 'Qf3'],
        themes: ['weak-squares', 'minor-piece-quality']
      }
    ],
    moveExplanations: [
      { moveIndex: 0, principle: 'contest center', summary: 'The d-pawn takes space and prepares a reliable development pattern.' },
      { moveIndex: 2, principle: 'improve worst piece', summary: 'The bishop leaves the pawn chain before e3 closes its natural diagonal.' },
      { moveIndex: 4, principle: 'build structure', summary: 'The e-pawn supports d4 and gives the king a calm route to safety.' },
      { moveIndex: 8, principle: 'preserve useful bishop', summary: 'Bg3 keeps the London bishop active instead of trading it without a reason.' }
    ],
    commonMistakes: [
      { moveIndex: 2, principle: 'piece quality', summary: 'Locking the bishop inside the chain makes later plans feel cramped.' },
      { moveIndex: 6, principle: 'finish development', summary: 'Starting flank attacks before the kingside pieces are out weakens the setup.' },
      { moveIndex: 8, principle: 'avoid automatic trades', summary: 'Trading the bishop just because it is attacked can give away your best piece.' }
    ]
  },
  {
    id: 'white-london-qb6-theory',
    side: 'white',
    name: 'London System: Early Qb6 Theory Layer',
    eco: 'D02',
    difficulty: 'theory',
    parentLineId: 'white-london-solid',
    modelPositionPly: 10,
    movesSan: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Qb6', 'Qb3', 'c4'],
    tags: ['london', 'queen-pawn', 'structure', 'theory'],
    themeTags: ['pawn-chain', 'queen-trade', 'weak-squares'],
    explanation: 'A theory layer for meeting early queen pressure on b6 without abandoning the London structure.',
    middlegameIdeas: [
      {
        title: 'Meet queen pressure with structure',
        summary: 'Qb3 can offer a queen trade or defend b2 while White keeps the London setup intact.',
        planMoves: ['Qb3', 'Nbd2', 'Ngf3'],
        themes: ['queen-trade', 'structure'],
        warning: 'Do not ignore b2; the early Qb6 line is designed to punish automatic London moves.'
      }
    ],
    moveExplanations: [
      { moveIndex: 6, principle: 'support center', summary: 'c3 reinforces d4 and gives the queen a b3 square.' },
      { moveIndex: 8, principle: 'answer pressure', summary: 'Qb3 contests b6 and protects b2 without changing the whole plan.' }
    ],
    commonMistakes: [
      { moveIndex: 8, principle: 'notice threats', summary: 'Continuing development while b2 hangs can lose material for no compensation.' }
    ]
  },
  {
    id: 'black-sicilian-basic',
    side: 'black',
    name: 'Sicilian Defense: Beginner Middlegame Plan',
    eco: 'B20',
    difficulty: 'beginner',
    modelPositionPly: 12,
    movesSan: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e6'],
    tags: ['sicilian', 'king-pawn', 'counterplay'],
    themeTags: ['center-control', 'open-files', 'dynamic-advantage', 'king-safety'],
    explanation: 'Challenge White from the flank, trade the c-pawn for central influence, and prepare counterplay on the c-file.',
    middlegameIdeas: [
      {
        title: 'Use the half-open c-file',
        summary: 'After cxd4, Black should think about Rc8, pressure on c3, and piece activity rather than copying White.',
        planMoves: ['Be7', 'O-O', 'Qc7', 'Rc8'],
        themes: ['open-files', 'dynamic-advantage']
      },
      {
        title: 'Develop before pawn hunting',
        summary: 'Sicilian positions reward activity, but Black still needs king safety and coordinated pieces.',
        planMoves: ['Nf6', 'e6', 'Be7', 'O-O'],
        themes: ['development', 'king-safety'],
        warning: 'Taking side pawns while the king is stuck in the center is a common beginner trap.'
      }
    ],
    moveExplanations: [
      { moveIndex: 1, principle: 'contest center', summary: 'The c-pawn fights d4 from the side and keeps Black from mirroring White.' },
      { moveIndex: 3, principle: 'stabilize center', summary: 'The d-pawn supports c5 and prepares development without surrendering central squares.' },
      { moveIndex: 5, principle: 'open file', summary: 'Trading on d4 gives Black a half-open c-file for later rook activity.' },
      { moveIndex: 9, principle: 'control key squares', summary: 'a6 controls b5 and prepares flexible queenside play.' }
    ],
    commonMistakes: [
      { moveIndex: 3, principle: 'king safety', summary: 'Chasing pawns before developing can leave Black behind in a sharp open game.' },
      { moveIndex: 5, principle: 'file play', summary: 'Recapturing too slowly lets White keep a space edge without pressure.' },
      { moveIndex: 9, principle: 'development first', summary: 'Queenside pawn moves are useful only when they support development and safety.' }
    ]
  },
  {
    id: 'black-sicilian-dragon-theory',
    side: 'black',
    name: 'Sicilian Defense: Dragon-Style Theory Layer',
    eco: 'B70',
    difficulty: 'theory',
    parentLineId: 'black-sicilian-basic',
    modelPositionPly: 12,
    movesSan: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7'],
    tags: ['sicilian', 'king-pawn', 'counterplay', 'fianchetto'],
    themeTags: ['dark-square-control', 'open-files', 'king-safety', 'calculation'],
    explanation: 'A theory layer that shows the Dragon idea: fianchetto the bishop and pressure the long diagonal.',
    middlegameIdeas: [
      {
        title: 'Long diagonal counterplay',
        summary: 'The bishop on g7 pressures c3 and b2, but Black must respect White kingside attacking chances.',
        planMoves: ['Bg7', 'O-O', 'Nc6', 'Rc8'],
        themes: ['dark-square-control', 'open-files'],
        warning: 'Dragon-style positions can become sharp quickly; calculate forcing attacks before grabbing material.'
      }
    ],
    moveExplanations: [
      { moveIndex: 9, principle: 'choose structure', summary: 'g6 commits to dark-square pressure and a fianchetto setup.' },
      { moveIndex: 11, principle: 'activate bishop', summary: 'Bg7 turns the bishop into a long-range defender and attacker.' }
    ],
    commonMistakes: [
      { moveIndex: 9, principle: 'king safety', summary: 'The fianchetto is not an excuse to delay castling forever.' }
    ]
  },
  {
    id: 'black-caro-kann-main',
    side: 'black',
    name: 'Caro-Kann: Beginner Middlegame Plan',
    eco: 'B12',
    difficulty: 'beginner',
    modelPositionPly: 12,
    movesSan: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6'],
    tags: ['caro-kann', 'king-pawn', 'solid'],
    themeTags: ['pawn-chain', 'exchanges', 'minor-piece-quality', 'king-safety'],
    explanation: 'Use the c6-d5 structure to contest the center while developing the light-square bishop before e6.',
    middlegameIdeas: [
      {
        title: 'Be solid, not passive',
        summary: 'After the center trade, develop pieces to active squares and look for c5 or e5 breaks when prepared.',
        planMoves: ['e6', 'Nd7', 'Ngf6', 'c5'],
        themes: ['pawn-break', 'minor-piece-quality']
      },
      {
        title: 'Keep the bishop useful',
        summary: 'The bishop often retreats to g6 and supports control of e4 and c2 while Black completes development.',
        planMoves: ['Bg6', 'e6', 'Nd7'],
        themes: ['minor-piece-quality', 'development'],
        warning: 'If Black plays e6 too early, the bishop can become a long-term problem piece.'
      }
    ],
    moveExplanations: [
      { moveIndex: 1, principle: 'prepare break', summary: 'The c-pawn supports d5 so Black can challenge the center with a firm base.' },
      { moveIndex: 5, principle: 'exchange', summary: 'Trading in the center clarifies the structure and gives Black simple development.' },
      { moveIndex: 7, principle: 'develop outside chain', summary: 'The bishop becomes active before e6 builds the compact pawn shell.' },
      { moveIndex: 11, principle: 'make luft', summary: 'h6 gives the bishop a retreat square and reduces back-rank problems later.' }
    ],
    commonMistakes: [
      { moveIndex: 5, principle: 'timing', summary: 'Ignoring the central tension can let White choose a more comfortable structure.' },
      { moveIndex: 7, principle: 'piece quality', summary: 'Trapping the bishop behind e6 too early reduces Black light-square control.' },
      { moveIndex: 11, principle: 'avoid passivity', summary: 'A solid structure still needs active piece development and pawn breaks.' }
    ]
  },
  {
    id: 'black-caro-advance-theory',
    side: 'black',
    name: 'Caro-Kann Advance: Theory Layer',
    eco: 'B12',
    difficulty: 'theory',
    parentLineId: 'black-caro-kann-main',
    modelPositionPly: 10,
    movesSan: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5'],
    tags: ['caro-kann', 'king-pawn', 'solid', 'advance'],
    themeTags: ['pawn-chain', 'pawn-break', 'space'],
    explanation: 'A theory layer for the Advance structure, where Black attacks White pawn chain with c5.',
    middlegameIdeas: [
      {
        title: 'Attack the pawn chain base',
        summary: 'White has more space, so Black should challenge d4 with c5 and avoid drifting into passivity.',
        planMoves: ['c5', 'Nc6', 'Qb6'],
        themes: ['pawn-chain', 'pawn-break'],
        warning: 'If Black never challenges d4, White gets a comfortable space advantage.'
      }
    ],
    moveExplanations: [
      { moveIndex: 5, principle: 'develop outside chain', summary: 'Bf5 activates the bishop before e6 closes the diagonal.' },
      { moveIndex: 9, principle: 'challenge structure', summary: 'c5 attacks the base of White center before the space advantage becomes permanent.' }
    ],
    commonMistakes: [
      { moveIndex: 9, principle: 'pawn breaks', summary: 'Playing only quiet developing moves can leave Black cramped.' }
    ]
  }
];
```

- [ ] **Step 4: Run repertoire tests**

Run: `pnpm test -- src/data/repertoires.test.ts`

Expected: PASS. If a SAN move is illegal, fix the specific line named in the assertion before continuing.

- [ ] **Step 5: Run related tests**

Run: `pnpm test -- src/features/openings/openingTrainer.test.ts src/features/journey/journey.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/repertoires.ts src/data/repertoires.test.ts
git commit -m "feat: expand repertoire into middlegame plans"
```

## Task 5: Display Difficulty, Theory Branches, And Middlegame Ideas

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing UI tests**

Append these tests inside `describe('App', () => { ... })` in `src/App.test.tsx`:

```tsx
  it('shows beginner difficulty and middlegame ideas for the default opening line', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));

    expect(screen.getByText(/Beginner/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Middlegame ideas/i })).toHaveTextContent(
      /Finish development before attacking/i
    );
  });

  it('surfaces theory branches without making them the default lesson', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Start learning/i }));

    expect(screen.getByRole('heading', { name: /Vienna Game: Beginner Middlegame Plan/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Theory branches/i })).toHaveTextContent(/Vienna Gambit/i);
  });
```

- [ ] **Step 2: Run UI tests to verify failure**

Run: `pnpm test -- src/App.test.tsx`

Expected: FAIL because the UI does not yet render the difficulty badge, middlegame ideas, or theory branch region.

- [ ] **Step 3: Add trainer-derived theory branches in App**

In `src/App.tsx`, after `const activeLine = ...`, add:

```ts
  const activeParentLine = activeLine?.parentLineId ? trainer.findLine(activeLine.parentLineId) : activeLine;
  const theoryBranches = activeParentLine ? trainer.theoryBranchesFor(activeParentLine.id) : [];
```

- [ ] **Step 4: Add helper functions in App**

Add these helpers near the existing `formatThemeLabel` function:

```ts
function formatDifficulty(line?: RepertoireLine): string {
  return line?.difficulty === 'theory' ? 'Theory' : 'Beginner';
}

function formatPlanMoves(moves?: string[]): string {
  return moves?.length ? moves.join(' -> ') : 'Choose a plan from the position.';
}
```

- [ ] **Step 5: Render difficulty and theory links**

In the Openings dock, immediately after the line `<p className="eyebrow">Repertoire</p>`, insert:

```tsx
              <div className="line-meta-row">
                <span className={`difficulty-badge ${activeLine?.difficulty === 'theory' ? 'theory' : 'beginner'}`}>
                  {formatDifficulty(activeLine)}
                </span>
                {activeLine?.difficulty === 'theory' && activeParentLine && (
                  <button className="link-button" type="button" onClick={() => selectLine(activeParentLine.id)}>
                    Back to {activeParentLine.name}
                  </button>
                )}
              </div>
```

After the current active line explanation paragraph `<p>{activeLine?.explanation}</p>`, insert:

```tsx
              {theoryBranches.length > 0 && activeLine?.difficulty !== 'theory' && (
                <section className="theory-branch-list" aria-label="Theory branches">
                  <p className="eyebrow">Build on this</p>
                  {theoryBranches.map((branch) => (
                    <button key={branch.id} className="theory-branch-button" type="button" onClick={() => selectLine(branch.id)}>
                      <span>{branch.name}</span>
                      <small>{branch.explanation}</small>
                    </button>
                  ))}
                </section>
              )}
```

- [ ] **Step 6: Render middlegame idea cards**

Insert this block after the theory branch block and before the existing `<div className="lesson-card">` lesson goal:

```tsx
              {activeLine?.middlegameIdeas && activeLine.middlegameIdeas.length > 0 && (
                <section className="middlegame-ideas" aria-label="Middlegame ideas">
                  <p className="eyebrow">Middlegame ideas</p>
                  {activeLine.middlegameIdeas.map((idea) => (
                    <article key={idea.title} className="plan-card">
                      <strong>{idea.title}</strong>
                      <p>{idea.summary}</p>
                      <span>{formatPlanMoves(idea.planMoves)}</span>
                      {idea.warning && <p className="analysis">{idea.warning}</p>}
                    </article>
                  ))}
                </section>
              )}
```

- [ ] **Step 7: Add compact CSS**

Append to `src/styles.css`:

```css
.line-meta-row {
  align-items: center;
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
}

.difficulty-badge {
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
}

.difficulty-badge.beginner {
  background: #e8f5ef;
  color: #166534;
}

.difficulty-badge.theory {
  background: #fff3d6;
  color: #92400e;
}

.link-button {
  background: transparent;
  border: 0;
  color: #2457a6;
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  padding: 0;
  text-align: right;
}

.theory-branch-list,
.middlegame-ideas {
  display: grid;
  gap: 0.65rem;
}

.theory-branch-button {
  background: #f8fafc;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem;
  text-align: left;
}

.theory-branch-button span {
  font-weight: 700;
}

.theory-branch-button small {
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.35;
}

.plan-card {
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  display: grid;
  gap: 0.35rem;
  padding: 0.75rem;
}

.plan-card span {
  color: #2457a6;
  font-size: 0.8rem;
  font-weight: 700;
}
```

- [ ] **Step 8: Run UI tests**

Run: `pnpm test -- src/App.test.tsx`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: show opening theory and middlegame plans"
```

## Task 6: Final Verification

**Files:**
- Review all changed files.

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`

Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 3: Inspect git status**

Run: `git status --short`

Expected: no unstaged implementation changes after the task commits. If only build artifacts or unrelated user files appear, do not modify them without explicit user instruction.

- [ ] **Step 4: Commit any final test-only fixes**

If Task 6 required corrections, commit only those corrections:

```bash
git add src/features/openings src/features/journey src/data src/App.tsx src/App.test.tsx src/styles.css
git commit -m "test: verify opening middlegame expansion"
```

If no corrections were required, do not create an empty commit.

## Self-Review Notes

- Spec coverage: data model fields are covered by Task 1; existing-family content expansion by Task 4; beginner-first behavior by Tasks 2, 3, and 5; validation by Task 4; UI display by Task 5; verification by Task 6.
- Scope check: the plan does not add a full opening database, engine recommendations, or custom repertoire editing.
- Type consistency: the plan uses `difficulty`, `parentLineId`, `middlegameIdeas`, `modelPositionPly`, `RepertoireDifficulty`, and `RepertoireMiddlegameIdea` consistently across type, data, trainer, and UI tasks.
