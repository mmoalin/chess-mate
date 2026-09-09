import { Chess } from 'chess.js';
import { buildPositionKey } from './positionKey';
import type { PositionKey, RepertoireGraph } from './types';

export type PgnDivergence = {
  matchedOpeningFamilyKey: string | null;
  matchedPlyCount: number;
  lastKnownPositionKey: PositionKey;
  divergencePly: number | null;
  divergingSide: 'learner' | 'opponent' | null;
  playedUci?: string;
  transposedAtPly?: number;
  recommendedAction: 'schedule-recall' | 'add-opponent-response' | 'schedule-tactic' | 'none';
};

export function matchPgnToRepertoire(input: {
  pgn: string;
  graph: RepertoireGraph;
  selectedOpeningFamilyKeys: string[];
}): PgnDivergence {
  const imported = new Chess();
  imported.loadPgn(input.pgn);
  const moves = imported.history({ verbose: true });
  const replay = new Chess(imported.getHeaders().FEN);
  let matchedOpeningFamilyKey: string | null = null;
  let matchedPlyCount = 0;
  let lastKnownPositionKey = buildPositionKey(replay.fen());
  let divergencePly: number | null = null;
  let divergingSide: 'learner' | 'opponent' | null = null;
  let playedUci: string | undefined;
  let transposedAtPly: number | undefined;

  for (let index = 0; index < moves.length; index += 1) {
    const before = buildPositionKey(replay.fen());
    const move = moves[index];
    const uci = `${move.from}${move.to}${move.promotion ?? ''}`;
    const edge = Object.values(input.graph.edges).find(
      (candidate) => candidate.from === before && candidate.uci === uci && candidate.openingFamilyKeys.some((key) => input.selectedOpeningFamilyKeys.includes(key))
    );
    replay.move(move.san);
    const after = buildPositionKey(replay.fen());

    if (edge && divergencePly === null) {
      matchedPlyCount += 1;
      lastKnownPositionKey = after;
      matchedOpeningFamilyKey ??= edge.openingFamilyKeys.find((key) => input.selectedOpeningFamilyKeys.includes(key)) ?? null;
      if (edge.classification === 'transposition') transposedAtPly = index + 1;
      continue;
    }

    if (divergencePly === null) {
      divergencePly = index + 1;
      playedUci = uci;
      const family = matchedOpeningFamilyKey ? input.graph.openings[matchedOpeningFamilyKey] : undefined;
      const learnerColor = family?.side;
      const movingColor = move.color === 'w' ? 'white' : 'black';
      divergingSide = learnerColor && movingColor === learnerColor ? 'learner' : 'opponent';
      if (input.graph.positions[after]?.openingFamilyKeys.some((key) => input.selectedOpeningFamilyKeys.includes(key))) {
        transposedAtPly = index + 1;
        lastKnownPositionKey = after;
      }
    }
  }

  const motifAtLastPosition = Object.values(input.graph.motifs).some((motif) => motif.positionKeys.includes(lastKnownPositionKey));
  const recommendedAction =
    divergencePly === null
      ? 'none'
      : motifAtLastPosition
        ? 'schedule-tactic'
        : divergingSide === 'learner'
          ? 'schedule-recall'
          : 'add-opponent-response';

  return {
    matchedOpeningFamilyKey,
    matchedPlyCount,
    lastKnownPositionKey,
    divergencePly,
    divergingSide,
    playedUci,
    transposedAtPly,
    recommendedAction
  };
}
