import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { note } from './authoring-annotations.mjs';
const path = 'src/data/blackCourseContent.json'; const content = JSON.parse(readFileSync(path, 'utf8'));
function annotate(board, sequence) { for (const move of sequence) { move.note = note(board, move.san); board.move(move.san); } }
for (const chapter of Object.values(content)) {
  const board = new Chess(); annotate(board, chapter.opening); const opening = board.fen(); annotate(board, chapter.main);
  const branch = new Chess(opening); branch.move(chapter.main[0].san); annotate(branch, chapter.transfer);
  for (const step of chapter.journey ?? []) {
    annotate(board, step.bridge);
    for (const candidate of step.candidates) {
      candidate.note = note(board, candidate.move); const after = new Chess(board.fen()); after.move(candidate.move); candidate.replyNote = note(after, candidate.reply);
    }
    annotate(board, step.main);
  }
}
writeFileSync(path, JSON.stringify(content, null, 2) + '\n');
console.log('Refreshed legal-move annotations, including en passant and promotion.');
