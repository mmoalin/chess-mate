# Continuous Caro-Kann journey — implementation and verification

Implemented a six-decision continuation of the existing Caro-Kann main line. Open **Repertoire → Caro-Kann → Structure, exchanges & endings → Follow this position into an ending**, or use the same action in the lesson summary.

## Delivered

- The full opening prefix and annotated connecting moves reach every checkpoint without a FEN jump. The complete example contains 57 half-moves and ends after White’s `29.Rd8+` in a rook ending; Black must still answer the check.
- Six checkpoints cover central tension, blockading the isolated pawn, piece improvement, a structural exchange, a queen-exchange offer and rook activity.
- Each checkpoint has an accepted alternative, move-specific reasoning and verified opponent responses. Move, reason and reply feedback are separate. Unknown legal moves open ungraded exploration; unknown replies are explicitly unassessed and cannot earn independent mastery credit.
- First submissions remain authoritative across retries. Pending selections, reflections, submitted feedback, replay inspection and completion persist in the existing lesson-session JSON.
- Alternatives display the chosen position and require an explicit return to the main line before continuing. Every connecting move is replayable with an annotation.
- Existing separate endgame exercises and their progress remain intact. Additive content is supplied only to an unchanged bundled lesson; remotely edited lessons and authored continuations remain authoritative.
- Today schedules individual two-minute checkpoints. A paused full continuation can resume its existing session with a bounded checkpoint target; completing that target does not require finishing the opening lesson. Its recap counts only that checkpoint’s answers.

## Chess-content verification

Every main move, bridge and authored response is checked with `chess.js`. Candidate positions and authored replies were also analysed locally with **Stockfish 17.1 lite at depth 18**, clearing the search state between positions. [Full engine evidence](../outputs/caro-continuation/engine-evidence.json) includes positions, principal variations and White-perspective evaluations. Reproduce with `node outputs/caro-continuation/verify-engine.mjs` using Node 24.

The analysis identified `17.Be5` as weaker than `17.Bc1`. The lesson now assesses `Bc1` as the stronger defensive prediction and explains the problem with `Be5`: Black can play the more testing `…f6`. The replay deliberately uses `…Nxe5` to illustrate the structural exchange. This is an original teaching line, not a historical game, a forced continuation or a claim that every played move is best.

The concrete rook mistake `…Re1+? Rxe1` was verified. The accepted active rook moves `…Re2` and `…Re5` lead to roughly balanced finite-depth evaluations, not a claimed win.

## Verification

- Full regression suite: **203 tests passed across 31 files**, using two workers. [Log](../outputs/caro-continuation/tests.txt).
- TypeScript and production build pass. Existing Stockfish externalisation/IIFE and bundle-size warnings remain. [Build log](../outputs/caro-continuation/build.txt).
- Browser walkthrough completed all six decisions, including the stronger `Bc1` prediction, explicit return to the illustrative line and the final recap. No browser console errors were captured.
- At **390 × 844**, tap moves worked and feedback, Continue and Retry were visible together. [Screenshot](../outputs/caro-continuation/mobile-390-feedback.png).
- At **320 × 740**, the current prompt was visible, document width stayed at 320px and new decisions reset the panel to scroll position zero. Black’s `…Nd5` was entered using Enter and arrow keys. [Screenshot](../outputs/caro-continuation/mobile-320.png).
- At **1280 × 720**, the board and task remained side by side. [Ending](../outputs/caro-continuation/desktop-ending.png) · [Recap](../outputs/caro-continuation/desktop-recap.png).
- Automated checks cover refresh before/after submission, first-result preservation, assisted answers, unassessed alternatives/replies, exact due reviews, whole-game continuity, daily budgeting, legacy exercises and content round-trips.

No database migration or deployment was performed. Live signed-in cross-device behaviour, physical touch hardware, screen-reader use and human learning effectiveness were not evaluated in this implementation pass.
