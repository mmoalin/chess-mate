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

function normalizeSan(san: string): string {
  return san.replace(/[+#]/g, '').trim();
}

function sortBeginnerFirst(lines: RepertoireLine[]): RepertoireLine[] {
  return [...lines].sort((a, b) => difficultyRank(a) - difficultyRank(b));
}

function difficultyRank(line: RepertoireLine): number {
  return line.difficulty === 'theory' ? 1 : 0;
}
