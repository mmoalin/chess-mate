# Chess trainer: manual testing and improvement plan

9 September 2026

The connected lesson is the strongest learning experience in the app: it carries an opening through a plan, several decisions, a changed opponent reply, and practical play. The next priority should be making that experience consistently understandable and trustworthy. The most serious findings are stale engine advice, a guest progress-sync error, disconnected Study exercises, and mobile feedback that appears outside the viewport.

This review proposes changes; it does not implement them.

## Method and scope

I tested the local app at `http://127.0.0.1:5186/`, using the uncommitted working tree based on commit `afe3e49`. A separate origin provided fresh guest progress. The existing Supabase configuration was present, but no account was created or signed into. Source files were changing during the walkthrough; the report records the observed behavior and the corresponding source paths, rather than claiming a frozen release certification.

This was an agent-led manual and heuristic usability review, using actual browser clicks, keyboard input, dragging, screenshots, accessibility inspection, and targeted source checks. It was not a study with human participants. Completion times, learning gains, and population-level success rates were not measured.

Viewport checks covered 1280×720, 1440×900, 1920×1080, and 390×844. The phone check used a resized browser, not physical touch hardware. No horizontal page overflow was observed in these checks; that did not guarantee that the task remained usable.

Not covered: authenticated cross-device sync, account recovery, content administration, offline/reconnection scenarios, screen-reader operation, all repertoire branches, underpromotion, and a production-hosted browser session. These remain validation tasks, not confirmed defects.

## What was exercised

| Task | Result |
| --- | --- |
| First visit → accept default Vienna/Caro-Kann setup | Completed; entry point is unnecessarily indirect (F8). |
| Today → recommended connected lesson | Opened the Vienna lesson. |
| Recall `e4`, receive automatic `…e5` | Worked by dragging. Clicking source and destination did nothing (F5). |
| Play incorrect `Na3`, then correct `Nc3` | Incorrect move was rejected; retry worked without losing the position. |
| Save and leave at opening ply 4 → reload → resume through Today | Saved position and recall state returned. General workspace location reset (F8). |
| Wrong strategic answer → correct answer → next question | Recovery worked; original mistake remained in the final results. |
| Complete Vienna linked decisions | `Be2`, `O-O`, `d4`, and `bxc3` worked with authored replies and explanations. |
| Complete the changed-reply branch | `dxc3` followed by castling completed the lesson. |
| Inspect completion results | Reported 8/10 first answers correct, preserving the two deliberate mistakes. |
| Play from the completed lesson | Stockfish replied `Be6`; returning to the lesson worked. |
| Start Caro-Kann lesson | Correct Black orientation and model position. |
| Refresh while the Caro-Kann lesson is still active | Restored the active lesson and checkpoint directly. |
| Inspect lesson history → resume active position | Read-only inspection disabled answers; resume restored them. |
| Answer a question at phone size | Answer controls worked, but the board and feedback were off screen (F3). |
| Import valid PGN, open move history, jump to `3.Bc4`, analyze | Worked; deviation numbering was misleading (F6). |
| Import malformed PGN | Existing board remained, but an internal parser error was shown (F10). |
| Open the automatically saved game gap | Correct pre-deviation position loaded; stale engine advice and unrelated import state remained (F2/F7). |
| Complete a Study question and advance | Worked; switching to Basic Endgames revealed a context mismatch (F4). |
| Hint and keyboard attempt in a tactical exercise | Hint appeared; keyboard dragging reached a square, but guest saving raised a sync error (F1/F5). |
| Inspect signed-out account panel | Email/password form available; authentication was not submitted. |

## Prioritized findings

P1 means address before wider learner testing; P2 means address in the next usability iteration; P3 is polish after the core flows work well. Priorities describe user impact, not security severity.

### F1 — P1: a guest tactical attempt tries to sync an invalid user ID

**Reproduce:** Stay signed out, open a Vienna tactical position, and make a legal but incorrect attempt such as `f3`. The page displays `Progress sync: invalid input syntax for type uuid: "local"`.

**Impact:** Ordinary practice produces a database error and makes it unclear whether progress was saved.

**Source:** `src/App.tsx:561` assigns the guest ID; the call at line 574 unconditionally invokes `upsertPositionProgress`. `src/services/supabasePersistence.ts` checks that a client exists, but does not exclude the guest identity. The newer guided repository already has a local-learner guard.

**Change:** Route guest progress through local persistence, and allow remote writes only for an authenticated learner. Give a clear local-save state; expose actionable sync recovery only where remote sync actually applies.

**Acceptance:** With Supabase configured and the learner signed out, correct and incorrect tactical attempts survive reload, issue no guest progress writes to Supabase, and produce no sync warning. Verify authenticated saving separately.

[Screenshot: guest sync error](usability-evidence-2026-09-09/guest-sync-uuid-error.png)

### F2 — P1: engine advice survives a change of position

**Reproduce:** Import the test game below, inspect `3.Bc4`, and analyze. Then open its saved gap through Today. The board returns to the position after `2…Nf6`, with White to move, while the feedback still shows `Depth 8 | cp -15 | best f8c5` from the previous, Black-to-move position. The same advice remained when entering Study.

**Impact:** The app can suggest a move for the wrong side and position. This directly undermines trust in the teaching.

**Source:** `src/App.tsx:401` changes the board for a saved gap without invalidating analysis. `analyzeCurrentPosition` at line 885 stores a plain string without checking that the analyzed position remains current when its promise completes.

**Change:** Associate analysis with its position and request ID. Clear it when the displayed position changes; cancel or discard obsolete responses. Apply the same rule to history navigation, new imports, resets, and lesson transitions, including the connected workspace.

**Acceptance:** Starting analysis on position A and immediately switching to B never displays A's result as B's advice. Completed analysis disappears or is explicitly marked as belonging to A. Cover delayed responses with a regression test.

[Screenshot: saved gap with stale advice](usability-evidence-2026-09-09/saved-gap-stale-engine-analysis.png)

### F3 — P1: mobile separates the decision from its board and feedback

**Reproduce:** At 390×844, open the Caro-Kann model-position question and submit the incorrect “bishop is trapped” answer. The question and controls are visible, but the board is above the viewport and the feedback ends roughly 150 pixels above its top. The answer area gives no local visual explanation of the result.

**Impact:** A learner must repeatedly scroll between the position, question, and explanation. A successful button press can appear to do nothing.

**Source:** The mobile layout in `src/styles.css` stacks the complete board/feedback column before the complete lesson column. Connected answer feedback is rendered separately at `ConnectedLessonWorkspace.tsx:144`.

**Change:** Design a mobile lesson layout explicitly: compact persistent board or an accessible board/question switch, the current prompt near the board during moves, and answer feedback directly beside the answer controls. Keep essential actions visible without fixing a large board over the content.

**Acceptance:** At 390×844, a learner can inspect the position, answer, read feedback, and continue without searching above the current question. Repeat with a physical phone, touch dragging, and enlarged text.

[Question screenshot](usability-evidence-2026-09-09/mobile-question-board-offscreen.png) · [Feedback screenshot](usability-evidence-2026-09-09/mobile-answer-feedback-offscreen.png)

### F4 — P1: Study exercises do not own the position they teach

**Reproduce:** Enter Study from the saved Vienna gap, select Basic Endgames, and read “Win the Opposition” / “Use kings only.” The board still shows the Vienna opening. Click “Practice position”: it opens a Vienna initiative exercise asking for `f4`.

**Impact:** The board contradicts the lesson and the practice action leads to an unrelated topic. A beginner cannot rely on the visible position to understand the question.

**Source:** `selectStudyModule` in `src/App.tsx:838` changes question state without loading a teaching position. The practice action at line 1375 uses `activeLine.criticalPositions[0]`, independent of the selected Study task.

**Change:** Make each interactive task supply its own position, objective, move validation, and return destination. Immediately remove the unrelated practice action where no matching exercise exists. Present genuinely conceptual questions as such until matching positions are authored.

**Acceptance:** “Win the Opposition” displays an appropriate king endgame and opens that exercise. No Study task silently opens the previously selected opening. Add representative endgame and opening integration checks.

[Screenshot: endgame lesson with opening board](usability-evidence-2026-09-09/endgame-study-opening-board.png)

### F5 — P1: board and answer controls need usable alternatives to dragging

**Observed:** Clicking `e2`, then `e4`, made no move; dragging did. The board exposes 32 focusable draggable pieces without accessible names. Keyboard dragging exists, so it is not accurate to call the board entirely keyboard-inaccessible: however, two Up presses moved a pawn only one square in the laptop check, and the controls do not communicate piece identity. ArrowDown on the lesson's radio choices did not move selection; every choice is a separate tab stop.

**Change:** Support click/tap source-and-destination moves, selected-piece and legal-destination indicators, named squares/pieces, predictable square-based keyboard movement, and announcements of moves and results. Use native radio inputs or implement the complete radio keyboard interaction. Preserve working drag support.

**Acceptance:** Complete a recall move and a castling decision with dragging, tapping, and keyboard-only input. A screen reader identifies the selected piece and square. Arrow keys navigate choices, and leaving the board does not require traversing every piece.

**Source:** `src/components/ChessBoardUI.tsx`; answer choices at `ConnectedLessonWorkspace.tsx:161`.

### F6 — P2: review confuses half-moves with chess move numbers

**Reproduce:** Import `1. e4 e5 2. Nc3 Nf6 3. Bc4 Bc5 4. d3 d6 *`. The review reports “Matched 4 Moves” and “Left book on move 5,” although the departure is `3.Bc4`. The history itself correctly displays `3.` beside `Bc4`.

**Change:** Show “Matched through 2…Nf6” and “First difference: 3.Bc4,” including the side and an action to jump there. Use the same format in saved-position titles instead of “ply 5.”

**Acceptance:** White and Black deviations use conventional move numbers and SAN consistently. The example above identifies `3.Bc4` everywhere.

**Source:** Review summary at `src/App.tsx:1411`; backlog titles in `loadReviewPgn`.

[Screenshot: review/history](usability-evidence-2026-09-09/review-move-number-and-history.png)

### F7 — P2: saved positions have no clear completion workflow

**Observed:** Opening a saved gap restores the correct board, but the main panel remains the PGN import form, including text from a failed import. There is no visible response note, resolve action, or direct link to the matching lesson. Previous/next controls remain available even when the loaded FEN has no replay history.

**Change:** Give saved positions a dedicated review panel: opening and move context, saved position, candidate response or note, matching study action, and “Reviewed” / “Practise again.” Retain completed items in a history view rather than deleting them. Disable unavailable replay controls.

**Acceptance:** Import → open gap → study a response → mark reviewed → return to Today is a complete flow. The active gap count updates and the review state survives reload.

**Source:** `startGuidedTarget`, `TodayPanel.tsx`, and the existing backlog status model.

### F8 — P2: onboarding and navigation compete with the recommended lesson

**Observed:** “Start learning” completes setup but opens the dense Train openings panel. The clearer recommended connected lesson requires Today → Start now. Five main modes coexist with a second “Show today” summary. After Save & leave → Today → reload, the app returns to opening practice. Refreshing an active connected lesson does restore that lesson correctly.

**Change:** Finish onboarding at the recommended lesson or a single Today landing page. Use “Continue lesson” for an existing session. Consolidate duplicate Today entry points and preserve the current workspace and selected opening across reloads. Keep an explicit return destination when moving between related activities.

**Acceptance:** A new learner starts the recommended activity directly after setup. A returning learner can resume in one action. Reloading Today or Review preserves its context without affecting working lesson restoration.

### F9 — P2: completing a lesson is barely visible outside its summary

**Observed:** After completing Vienna, the repertoire map still shows `0/4 reliable units` and a generic “Learn this opening” button. Today shows due/reliable/gap counts but no completed lesson. Zero reliable units is not itself a scoring error: the lesson correctly distinguishes completion from spaced mastery. The problem is that the learner's completed work is absent from these views.

**Change:** Show separate completion and mastery information: “Lesson completed,” recent result, the next scheduled review, and “Practise again.” Explain “reliable” in plain language. Include connected-lesson progress in the opening card without granting mastery for simply finishing.

**Acceptance:** Completing a lesson immediately updates its opening card and Today, including after reload, while assisted or retried answers retain their existing scoring rules.

**Source:** `RepertoireMap.tsx`, `TodayPanel.tsx`, connected session completion data.

### F10 — P2: error and teaching language exposes internals or gets ahead of the board

**Observed:** Invalid PGN produces a long parser message beginning “Expected brace comment…”. Engine output uses `cp -15` and coordinate notation. At the start of Vienna, explanatory text discusses an e5 pawn before the opening has been replayed. Move counters also count individual plies while calling them moves.

**Change:** Give invalid PGN an inline error, an example, and a clear recovery action while preserving the current game. Label the engine's evaluation perspective and express candidates in chess notation. Make introductory explanations match the currently displayed position; keep advanced details expandable.

**Acceptance:** A learner can repair an invalid import from the message alone, understand whose advantage an evaluation describes, and follow replay without text claiming a position that has not yet appeared.

[Screenshot: parser error](usability-evidence-2026-09-09/review-raw-parser-error.png)

### F11 — P3: desktop space and scroll continuity can be improved

**Observed:** At 1440×900, the board ends at x=660 and the lesson dock starts at x=936, leaving about 276 pixels between them. At 1280×720, the gap is about 296 pixels while the teaching panel scrolls. Switching Study tasks/modules can retain a low scroll position and hide the new heading. The 1920×1080 layout fits the board and lesson comfortably.

**Change:** Bring the board and teaching panel closer at laptop sizes; use spare width for readable teaching content rather than enlarging the board beyond the available height. Reset lesson-panel scroll and focus deliberately when the task changes. Preserve stable board positioning.

**Acceptance:** At 1280×720 and 1440×900, the current task heading and primary action remain easy to find, and changing content does not unexpectedly leave the learner midway down a new panel.

[Screenshot: large-screen connected lesson](usability-evidence-2026-09-09/desktop-connected-lesson.png)

## Implementation order

| Phase | Work | Size and dependency | Exit condition |
| --- | --- | --- | --- |
| 1. Restore trust in the current position | F1 guest persistence; F2 position-bound analysis; F4 remove unrelated Study routing and establish task-owned positions | Medium; establish shared position/persistence rules before expanding flows | Guest practice saves cleanly; advice always belongs to the visible position; Study never opens an unrelated exercise. |
| 2. Make the core lesson usable on phone and keyboard | F3 mobile layout; F5 board and answer interaction | Large; design and implementation across the board and connected workspace | One complete lesson can be completed on a phone and with keyboard-only input, with visible feedback. |
| 3. Connect entry, progress, and review | F6 notation; F7 gap completion; F8 navigation; F9 completion visibility; F10 copy and error recovery | Medium to large; reuses phase 1 context ownership and existing session/backlog data | New learner → lesson → summary → return; imported game → gap → study → reviewed all have clear next actions. |
| 4. Refine layout and validate with learners | F11 spacing/scroll behavior; observed remaining friction | Small layout work plus participant sessions; follows phases 1–3 | Learners can complete the task script below without coaching, and explain the chess connection. |

Sizes are relative scope estimates, not delivery commitments. Split each phase into reviewable changes. Do not start with a cosmetic redesign: preserve the working connected sequence, first-answer accounting, automatic replies, castling, and lesson resume.

## Validation plan

Add focused regression coverage for the guest write guard, obsolete engine responses, Study-to-position mapping, saved-gap resolution, conventional move numbering, and completion visibility. Use real browser checks for tapping, keyboard behavior, scrolling, and feedback visibility; component tests alone do not establish usability.

Repeat the manual sequence at the four tested sizes, then on physical iOS/Android hardware. Include slower engine responses, unavailable engine recovery, signed-in saving, offline/reconnection, and a screen-reader pass before treating those paths as verified.

Run a small moderated study with about five learners spanning newer players and club players, including phone and keyboard users where possible. Ask them to:

1. Set up a repertoire and begin the recommended activity.
2. Explain the position, recover from a wrong answer, and finish a connected lesson.
3. Leave, reload, and find their progress again.
4. Import the sample game, locate the first deviation, and finish reviewing its saved position.
5. Find and practise an endgame exercise relevant to its stated topic.

Record first clicks, backtracking, requests for help, unnoticed feedback, task completion, and whether learners can explain why the plan fits the position. Set the release gate at no blocked core task, no wrong-position guidance, and successful recovery without moderator instructions; use measured participant results to set subsequent time targets.

## Verification and test data

The last automated run, started at 01:40 BST, passed **105 tests across 20 files** using `pnpm test -- --maxWorkers=2`. `pnpm build` also passed. The initial run earlier in the walkthrough passed 103 tests; additional tests appeared in the shared working tree during the review. These results apply to the code present when each command ran, not subsequent edits.

The build reports Stockfish browser-externalization/IIFE warnings and a main bundle above 500 kB; this review did not measure load performance on a slow phone, so those warnings are not presented as proven usability failures.

Test PGN:

```pgn
[Event "Usability test"]
[White "Test White"]
[Black "Test Black"]
[Result "*"]

1. e4 e5 2. Nc3 Nf6 3. Bc4 Bc5 4. d3 d6 *
```

Malformed input: `This is not a chess game`.

Artifacts from this review are this document and the screenshots in `docs/usability-evidence-2026-09-09/`. Application code and the earlier review were not edited by this testing task.
