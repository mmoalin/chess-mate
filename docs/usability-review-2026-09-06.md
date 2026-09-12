# Usability review — 6 September 2026

The main problem is that the app organizes learning around separate tools rather than a connected chess decision. A learner can find a line, but must infer why its pawn structure suggests a plan, when that plan becomes tactical, and what to do after leaving preparation. The desktop layout compounds this by moving or hiding the teaching content.

## Method and limits

This was an agent-led usability walkthrough of the local app, source inspection, regression tests, and browser layout checks. No human participants were recruited, so these findings do not establish learning gains or measured task-completion rates. Fullscreen was checked using a 1920×1080 browser viewport; native operating-system fullscreen transitions were not automated.

Tasks covered: locate a repertoire line; inspect its resulting position; find its related plan lesson; open a tactical decision; replay a middlegame continuation; reopen a saved gap; return to line practice; resize the desktop workspace.

## Findings and changes

| Severity | Observed problem | Change made |
| --- | --- | --- |
| High | Header title wraps around a permanently visible sign-in form; board height competes with feedback and the lesson panel. | Compact account disclosure, bounded desktop header, viewport-sized workspace, independent lesson scrolling, and reserved feedback space. |
| High | Changing panel content changes the navigation position and page height. | Board and navigation have stable desktop anchors; history and the optional Today summary overlay rather than displacing them. |
| High | Opening practice buries its plans and offers no direct route to the existing critical-position exercises. | Added an opening-to-middlegame section above the move list with direct model-position, plan-lesson, and tactical-decision actions. |
| High | Middlegame move sequences are text that the user must reconstruct manually. | Each authored continuation move can now be displayed on the board, starting from that line's model position. These are explicitly examples, not forced lines. |
| High | Saved gaps are counted but not browsable; a recommended gap opens generic Review without the saved board position. | Added Today → Saved positions and routed both its buttons and recommended gaps to their exact saved position. |
| High | A wrong tactical answer changes the board even though feedback says “Try again.” | Undo the wrong move so retry is possible. Successful exercises enter review mode instead of incorrectly grading subsequent moves as opening recall. |
| Medium | The app asks users to add gaps even though it saves them automatically. | Updated runtime feedback to identify the automatic save and where to find it. |
| Medium | Learners cannot choose a particular plan lesson within an opening. | Added an expandable lesson directory with titles and principles. Plan sessions also display their opening context. |
| Medium | Returning from a preview or exercise can leave incompatible board and training states. | Returning to Train openings resets the line; model previews cannot be scored as recall, and board moves are blocked during the plan-question stage. |
| Medium | Tactical hints use the ordinary opening move index. | Tactical Hint and Reveal now use the active exercise's authored guidance. |

## Verification

Browser checks found no page overflow at 1280×720, 1440×900, or 1920×1080. At 1280×720 the board remained at x=24, y=104 with a 456px square before and after loading a continuation. At 1440×900 the board remained at x=24, y=104 with a 636px square when changing from line practice to a tactical decision. At 1920×1080 it fit as an 816px square within the centered workspace. The 390×844 check found no horizontal page overflow; its account disclosure was adjusted to stay inside the narrow viewport.

Regression coverage checks exact chess positions for model continuations, tactical exercise loading, saved-gap reopening, and return to line practice. Existing content tests validate legality of all authored middlegame continuations. Production build passes, with existing Stockfish bundling and bundle-size warnings.

## What still limits learning

1. **Plan coverage is uneven.** The embedded interactive concept bank has six drills covering Vienna and Caro-Kann. Other openings have written plans and example continuations but need equivalent decision-based lessons. Some “tactical decisions” teach pawn-break timing rather than a multi-move combination.
2. **The lesson should follow a position through several decisions.** Use the sequence: opening moves → resulting pawn structure → candidate plans → opponent challenge → tactical consequence → practical continuation. Current examples and short scenarios provide pieces of this sequence, but are not a complete middlegame curriculum.
3. **Saved positions need a completion workflow.** They can now be reopened and analysed, but there is no personal annotation, chosen-response editor, or learner-facing resolve action. Saving a gap still does not author a new repertoire line.
4. **Review and Study still have separate contexts.** A future pass should carry the chosen opening and exact position through related lessons and game review, including an explicit return destination. Avoid silently substituting an unrelated recommended lesson.
5. **Reduce competing entry points.** Today and “Show today” duplicate summary concepts; Study and opening plan practice partly overlap. Test an opening-centered workspace with three clear activities—learn the line, understand the plan, test the decision—before removing established navigation.

## Suggested next human test

Ask several learners, without coaching, to choose a Vienna line, explain the resulting plan, find a relevant tactical exercise, and reopen an unfamiliar move from a game. Observe first clicks, backtracking, whether they can explain why the plan fits, and whether they can adapt after a different opponent reply. Include a laptop-height viewport and a fullscreen monitor. Success means completing the tasks and explaining the chess connection; merely finding the buttons is insufficient.

Final test result: all 81 tests across 16 files passed with two workers. The default parallel run had one timeout in existing graph compilation; the reduced-concurrency run passed without increasing test time limits.
