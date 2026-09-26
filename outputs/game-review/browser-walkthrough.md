# Browser walkthrough — 26 September 2026

Test environment: isolated guest origin `http://localhost:5183/`, real Stockfish 17.1 ASM worker, desktop and explicit 390×844 / 320×740 viewports. No production account or migration was used.

Verified through the UI:

- Imported a White custom-FEN game: `3r2k1/6pp/8/8/8/8/6PP/3Q2K1 w - - 0 1`, `1. Qd2 Rxd2`. Replayed from the correct starting board. Analysis completed one learner move and confirmed the queen loss at depth 16/16. Its deterministic explanation described `Rxd2` capturing a queen; it offered no unrelated lesson.
- Explicitly added the finding. The library showed one practice position and one distinct completed game under demonstrated material loss.
- Today scheduled the card for two minutes within a ten-minute session. Before submission the card hid the original move and engine alternative. A plan draft survived refresh.
- Exercised an actual engine timeout during assessment: the result stayed ungraded, the draft survived, and retry remained available. Submitted `Qxd8+` using its retained depth-16 reference evidence. The first graded answer remained saved and inputs remained disabled after refresh.
- Completed the game-position daily activity. The session advanced from activity 1 to activity 2. Returned through Review to the saved card and then to its original game and confirmed finding.
- Imported a Black custom-FEN game: `3q2k1/6pp/8/8/8/8/6PP/3R2K1 b - - 0 1`, `1... Qd7 2. Rxd7`. The board used Black orientation and analysis explicitly identified Black as the learner.
- Paused Black analysis, refreshed, verified it remained paused, and explicitly resumed. It completed with a depth-16/16 queen-loss finding and the alternative `d8d1`.
- At 320px, tapped the Black queen on d8 and the rook on d1. The draft contained `d8d1`, survived refresh, and submitted as a supported move. The first graded answer was then displayed with the original move and explanation.
- Checked the White assessment at 390px and 320px. At 320px the measured document width was 305px inside a 320px viewport, with vertical scrolling and no horizontal overflow. Screenshots are adjacent to this report.
- Both keyboard activation and two-square pointer selection worked. Browser automation occasionally timed out after a delivered input; state was checked before retrying. One test tab stopped accepting pointer input after refresh; keyboard activation and a recovered tab allowed the walkthrough to continue.

Retained images: `practice-390.png`, `practice-320.png`, `black-practice-320.png`. Programmatic engine evidence additionally verifies an arbitrary legal alternative (`Qe1`) using a fresh depth-16 evaluation, rather than only checking the reference move.

Account isolation, offline recovery, duplicate sync, conflicting sessions, partial-position merging and tombstones are covered by repository tests. Migration authorization and account-switch rejection are verified in disposable PostgreSQL; no production-account browser sync was attempted.
