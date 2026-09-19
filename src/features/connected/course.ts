import { Chess } from 'chess.js';
import { buildPositionKey } from '../../domain/repertoire/positionKey';
import type { MasteryState, RepertoireGraph } from '../../domain/repertoire/types';
import { continuationKey } from './continuationJourney';
import type { ConnectedLesson, LessonSession } from './types';

export function orderedLessons(graph: RepertoireGraph, families = Object.keys(graph.openings)): ConnectedLesson[] {
  return Object.values(graph.connectedLessons ?? {}).filter((lesson) => families.includes(lesson.openingFamilyKey))
    .sort((a, b) => families.indexOf(a.openingFamilyKey) - families.indexOf(b.openingFamilyKey) || (a.courseOrder ?? 0) - (b.courseOrder ?? 0) || Number(a.lineKey !== a.openingFamilyKey) - Number(b.lineKey !== b.openingFamilyKey) || a.key.localeCompare(b.key));
}

export function nextCourseContinuation(lessons: ConnectedLesson[], sessions: LessonSession[], mastery: MasteryState[]) {
  for (const lesson of lessons) {
    const current = sessions.filter((session) => session.lessonKey === lesson.key && !session.supersededAt && session.contentVersion === lesson.version);
    if (!current.some((session) => (session.completedAt && !session.reviewCheckpointId) || session.continuation)) continue;
    const step = lesson.continuation?.steps.find((candidate) => !current.some((session) => session.completedCheckpoints.includes(continuationKey(candidate.id))) && !mastery.some((state) => state.itemKey === lesson.key + '/' + continuationKey(candidate.id) && state.understanding.status !== 'unseen'));
    if (step) return { lesson, step };
  }
  return undefined;
}

const positionCache = new WeakMap<ConnectedLesson, Map<string, number>>();
function lessonPositions(lesson: ConnectedLesson) {
  const existing = positionCache.get(lesson);
  if (existing) return existing;
  const result = new Map<string, number>();
  const paths = [lesson.openingMoves, ...Object.values(lesson.decisions).flatMap((decision) => decision.answers.map((answer) => [...decision.movesBefore, answer.moveSan, ...answer.repliesSan]))];
  if (lesson.continuation) paths.push([...lesson.continuation.openingPrefix, ...lesson.continuation.steps.flatMap((step) => [...step.bridge, ...step.main].map((move) => move.san))]);
  for (const sequence of paths) {
    const board = new Chess();
    sequence.forEach((san, index) => { board.move(san); const key = buildPositionKey(board.fen()); result.set(key, Math.max(result.get(key) ?? 0, index + 1)); });
  }
  positionCache.set(lesson, result);
  return result;
}

/** Match the deepest covered position, including transposed move orders. Shared positions use the main chapter. */
export function lessonForPosition(graph: RepertoireGraph, input: { familyKey?: string; positionKey?: string; pgn?: string }): ConnectedLesson | undefined {
  const lessons = orderedLessons(graph, input.familyKey ? [input.familyKey] : undefined);
  const positions = new Set<string>(input.positionKey ? [input.positionKey] : []);
  if (input.pgn) {
    const game = new Chess(); game.loadPgn(input.pgn);
    const replay = new Chess(game.getHeaders().FEN);
    positions.add(buildPositionKey(replay.fen()));
    for (const move of game.history()) { replay.move(move); positions.add(buildPositionKey(replay.fen())); }
  }
  const scored = lessons.map((lesson) => ({ lesson, score: Math.max(0, ...[...positions].map((key) => lessonPositions(lesson).get(key) ?? 0)) }));
  const best = Math.max(0, ...scored.map((item) => item.score));
  const matches = scored.filter((item) => item.score === best && best > 0);
  if (matches.length === 1) return matches[0].lesson;
  return input.familyKey ? lessons.find((lesson) => lesson.lineKey === lesson.openingFamilyKey) ?? lessons[0] : undefined;
}
