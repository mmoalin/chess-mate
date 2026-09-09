# Usability fixes and verification — 9 September 2026

Implemented the behavioral fixes from the 9 September review and checked the relevant flows from the 6 September review. The work was reviewed through browser interaction, focused regression tests, the full test suite, and a production-build smoke test.

## Findings addressed

| Review finding | Result | Verification |
|---|---|---|
| F1 · Guest progress fails to save | Guest line, tactical and Study progress persists locally without sending the `local` identity to UUID database fields. Authenticated writes still use the existing backend. Revealed tactical answers do not earn unassisted mastery. | Repository tests cover guest isolation, remount persistence and authenticated writes. Browser and production-build tactical retries completed without a sync error. |
| F2 · Analysis belongs to an earlier position | Analysis is keyed to the position and learning context. Moving, replaying or changing tasks clears results and cancels pending work; late results are ignored. Interrupted engine games offer a working reply/retry action. | Delayed-result tests, same-position/context-change tests, interrupted-game remount test, live Stockfish reply and analysis checks. |
| F3 · Phone feedback is far from the board | Phone practice uses a fixed board above a scrollable task panel. Connected-lesson feedback appears beside the answer controls and receives focus after submission. | Visually checked 390 × 844; checked 320 × 700 for overflow and board/panel bounds. Board and answer feedback were visible together. |
| F4 · Study opens an unrelated Vienna position | All 18 Study tasks map to legal positions for their topic. Guided moves retry in place and are recorded against the Study task. Module progress survives refresh; due Study reviews reopen the correct task. | Validated every authored candidate with chess.js. Browser: wrong Kd3 restores the opposition position; Ke4 succeeds. Integration tests cover board ownership, persistence and the review route. |
| F5 · Board and choices are inaccessible by keyboard/tap | Tap source/destination and drag both work. Named squares have one board tab stop; arrows move by square, Enter/Space select, Escape cancels. Choice groups use native radio inputs. | Browser: tap development, drag d4, keyboard castling, retained destination focus and one tab stop. Radio arrow keys select adjacent choices. Tests cover Black orientation, cancellation and inspection boards. |
| F6 · Half-moves are called move numbers | PGN matches and differences use scoresheet notation, such as `2…Nf6` and `3.Bc4`. A direct action opens the position before the difference. Custom starting-position move numbers are supported. | Browser import of `1. e4 e5 2. Nc3 Nf6 3. Bc4`; notation and replay tests, including a custom starting FEN. |
| F7 · Saved gaps have no useful completion flow | Dedicated gap review supports candidate/plan notes, returning to the saved board, a related lesson when available, reviewed status and reopening. Reviewed items remain accessible in Today. | Browser and integration tests: save notes → refresh → related lesson → return to the same board → mark reviewed → reopen. |
| F8 · Dense onboarding and lost workspace | Onboarding lands on Today with one next action. Overview pages give their content the full workspace. The duplicate Today dashboard is removed. Selected opening, Study task, PGN replay, saved gap and built-in Plan Lab context restore after refresh. | Fresh-origin onboarding, “recommend one” Black choice, browser refreshes, PGN/Study/Plan Lab remount tests and interrupted-scenario recovery. Existing connected-lesson restore tests continue to pass. |
| F9 · Finished lessons are invisible | Today and Repertoire show completed lessons and link to results. Completion and reliable mastery remain separate. | Completed the Vienna main and transfer branches in the browser; Today showed completion after refresh. Integration tests verify both overview pages. |
| F10 · Technical or premature explanations | PGN errors explain recovery and preserve the current board. Analysis shows a SAN candidate and a consistently stated White-side evaluation. Opening-stage instructions no longer describe a later model position. | Invalid-PGN preservation test, real Stockfish output, readable notation tests and connected-lesson browser walkthrough. |
| F11 · Empty desktop space and stale task scroll | Board and task panel now sit beside each other. Task/checkpoint changes reset the panel and focus the new heading while preserving board focus during keyboard play. | 1440 × 900 visual review; 1920 × 1080 measured a 24 px board/panel gap. Production check confirmed the next question has heading focus and panel scroll position zero. |

The earlier review’s model continuations, tactical retry behavior, explicit plan-lesson directory, connected decision branches and exact-position engine handoff were retained. Existing tests for both Vienna and Caro-Kann connected lessons pass.

## Iteration and evidence

Testing caught and corrected a new refresh crash caused by mounting the chessboard inside a hidden overview, a duplicate mobile feedback block, and a clipped phone header. The revised versions were checked again in the browser. Study practice remains a guided illustration; following an explicit move prompt does not count as an unassisted answer.

Screenshots are in `docs/usability-fixes-evidence-2026-09-09/`:

- `mobile-lesson-feedback.png` — board and submitted-answer feedback together.
- `mobile-study-correct.png` — the correct opposition position and Ke4 feedback.
- `mobile-completed-progress.png` — completed Vienna lesson on Today after refresh.
- `desktop-review-analysis.png` — adjacent board/task layout and readable analysis.

## Validation

- Full suite: **144 tests passed across 25 files**.
- Production build: **passed** (`pnpm build`, including TypeScript checking).
- Browser testing used isolated local origins and the built app on a separate local preview port.
- Live bundled Stockfish returned legal replies and SAN analysis. Changing replay position discarded prior analysis.
- `git diff --check` passed.

The build still reports the existing Stockfish bundling/externalization and bundle-size warnings. They did not prevent the build or the live production-engine check.

## Limits and next priorities

1. Run short sessions with actual learners on physical phones and a screen reader. This review used browser input and viewport emulation; it does not establish touch comfort or learning effectiveness. At 320 px width the task viewport is necessarily short.
2. Add account-synced annotations if cross-device notes are needed. Notes are explicitly device-local today; reviewed status uses the existing backlog persistence. Authenticated behavior was checked with repository tests, not a real signed-in account.
3. Expand authored connected lessons beyond Vienna and Caro-Kann, and deepen the Study exercises into longer decisions. The new Study positions repair topic/board mismatches; they are not a replacement for a complete endgame course.
4. Validate any remotely authored Plan Lab content against refresh/version changes. Built-in Plan Labs restore; unavailable content falls back to Repertoire.

Changes were validated locally. No deployment or database migration was performed.
