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
  ambiguousOpeningFamilyKeys: string[];
};

export function matchPgnToRepertoire(input: {
  pgn: string;
  graph: RepertoireGraph;
  selectedOpeningFamilyKeys: string[];
}): PgnDivergence {
  const imported = new Chess();
  imported.loadPgn(input.pgn);
  const moves = imported.history({ verbose: true });
  const startFen = imported.getHeaders().FEN;
  const candidates = input.selectedOpeningFamilyKeys.filter((key) => input.graph.openings[key]).map((familyKey) => matchFamily(familyKey));
  const bestScore = Math.max(0, ...candidates.map((candidate) => candidate.matchedPlyCount));
  const best = candidates.filter((candidate) => candidate.matchedPlyCount === bestScore).sort((a, b) => a.familyKey.localeCompare(b.familyKey))[0];
  const matchedOpeningFamilyKey = bestScore > 0 ? best?.familyKey ?? null : null;
  const matchedPlyCount = best?.matchedPlyCount ?? 0;
  const lastKnownPositionKey = best?.lastKnownPositionKey ?? buildPositionKey(new Chess(startFen).fen());
  const divergencePly = best ? best.divergencePly : (moves.length ? 1 : null);
  const playedUci = divergencePly ? `${moves[divergencePly - 1]?.from ?? ''}${moves[divergencePly - 1]?.to ?? ''}${moves[divergencePly - 1]?.promotion ?? ''}` : undefined;
  const family = matchedOpeningFamilyKey ? input.graph.openings[matchedOpeningFamilyKey] : undefined;
  const movingColor = divergencePly ? (moves[divergencePly - 1]?.color === 'w' ? 'white' : 'black') : null;
  const divergingSide = family && movingColor ? (family.side === movingColor ? 'learner' : 'opponent') : null;
  const transposedAtPly = best?.transposedAtPly;

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
    recommendedAction,
    ambiguousOpeningFamilyKeys: bestScore > 0 ? candidates.filter((candidate) => candidate.matchedPlyCount === bestScore).map((candidate) => candidate.familyKey) : []
  };

  function matchFamily(familyKey: string) {
    const replay = new Chess(startFen);
    let matchedPlyCount = 0; let lastKnownPositionKey = buildPositionKey(replay.fen()); let divergencePly: number | null = null; let transposedAtPly: number | undefined;
    for (let index = 0; index < moves.length; index += 1) {
      const before = buildPositionKey(replay.fen()); const move = moves[index]; const uci = `${move.from}${move.to}${move.promotion ?? ''}`;
      const edge = Object.values(input.graph.edges).find((candidate) => candidate.from === before && candidate.uci === uci && candidate.openingFamilyKeys.includes(familyKey));
      replay.move(move.san); const after = buildPositionKey(replay.fen());
      if (edge && divergencePly === null) { matchedPlyCount += 1; lastKnownPositionKey = after; if (edge.classification === 'transposition') transposedAtPly = index + 1; }
      else if (divergencePly === null) { divergencePly = index + 1; if (input.graph.positions[after]?.openingFamilyKeys.includes(familyKey)) { transposedAtPly = index + 1; lastKnownPositionKey = after; } }
    }
    return { familyKey, matchedPlyCount, lastKnownPositionKey, divergencePly, transposedAtPly };
  }
}
