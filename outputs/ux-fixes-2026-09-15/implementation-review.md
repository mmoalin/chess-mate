# UX review fixes — implementation and verification

Implemented all five prioritised findings from the [original review](../ux-review-2026-09-15/usability-review.md). Verified on 15 September 2026 using the local Vite app, a guest learner, and the automated regression suite. Changes remain in the working tree.

## Findings and acceptance results

| Finding | Implemented behaviour | Verification |
| --- | --- | --- |
| UXR-01 — preserve ongoing games | Separate saved board contexts for engine play, imported PGN, saved gaps, and individual Study tasks. Preserve moves, displayed replay position, orientation, and feedback. Cancel stale engine searches and resume one pending reply on return. Selecting the active engine mode preserves the game. | Automated: three engine replies, Study task change, Today, reload while away, return, active-mode click, another reload, and history. Imported PGN retains its selected replay ply. Interrupted engine result cannot change the Study board; return requests exactly one replacement. Live Stockfish game `1. e4 d5` survived Study/task change and refresh with identical move history. [Screenshot](engine-restored.png). |
| UXR-02 — recover from an off-line move | “Retry this move” restores the exact prior position. “Explore this continuation” is explicitly ungraded. Reveal restores the original decision before offering its move. Corrections retain the first recorded result. Teaching describes the repertoire idea rather than an unrelated generic mistake. | Automated: first, middle, and last deviations; expected move becomes legal and advances; stored attempts remain unchanged by the correction. Exploration and Reveal also tested. Live `e3 → Retry → e4` succeeded. [Recovery controls](opening-recovery.png). |
| UXR-03 — restore answer presentation | Save the latest submitted choice separately from first-attempt grading. Restore selection and explanation, including compatible restoration of older completed sessions. | Automated: wrong, corrected, first-time correct, assisted, and legacy corrected sessions round-trip through persistence with appropriate selection, feedback, and enabled/disabled state. Live wrong → correct → refresh retained the accepted answer and explanation; completion still recorded the original wrong answer. [Screenshot](restored-answer.png). |
| UXR-04 — improve mobile practice | Compact navigation and daily controls; collapsible session options and position tools; larger board; question first with a collapsible plan reminder. One feedback panel contains the result and continuation. Focus moves to results, and each new decision resets panel scrolling. | Live at 390×844: board 286.95px, task panel 278.5px (previously about 211px and 150px). Feedback and Next decision are visible together. Next prompt opens with panel scrollTop 0. At 320×740: board 251.59px, current prompt visible, no horizontal overflow (document width 320px). [390px prompt](mobile-390-plan.png), [feedback](mobile-390-feedback.png), [320px next prompt](mobile-320-next-prompt.png). |
| UXR-05 — explain the actual progress metric | Relabelled the count “distinct skills practised in 7 days,” with an explanation of skill dimensions, repeated practice, and the separate answer recap. | Deterministic test: repeated answers in one skill count once; a second dimension increases the count; the 3/4-answer recap remains separate; practice expires immediately beyond seven days. Live completed recap showed 3/4 answers plus the explained skill count. This browser had three skills because it also performed the opening-recovery test. [Screenshot](recap-and-metric.png). |

## Automated checks

- `pnpm test -- --maxWorkers=2`: **175 tests passed, 29 files passed**. [Log](tests.txt).
- `pnpm build`: **passed**, including TypeScript. [Log](build.txt).
- `git diff --check`: passed.
- The unrestricted parallel run exhausted available test capacity and hit 15-second timeouts; the complete two-worker run passed without increasing timeouts. Existing Stockfish bundling and chunk-size warnings remain in the build output.

New regression coverage is in `src/App.ux-regression.test.tsx`, `src/features/guided/TodayPanel.test.tsx`, and the expanded connected-lesson tests. Existing guided-flow tests were updated to exercise the new Session options menu.

## Limits

Browser checks used desktop emulation of mobile viewport sizes, real Stockfish for the observed engine game, and the local guest profile. Automated engine interruption tests use controlled responses. Physical touch ergonomics, screen-reader compatibility, and signed-in cloud synchronisation were not validated here. The larger-board target is met at 390px; real-device testing remains appropriate before claiming broad mobile accessibility.
