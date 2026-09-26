# Personal game review: staging readiness

This follow-up verifies the release at `cb5352b` without applying a migration to a hosted project. The connected Supabase account was inspected read-only: it contains the linked **Chess openings** project and two unrelated projects, but no identifiable chess staging project. The linked project has no database branches. Repository configuration contains a development connection and CI, but no staging hosting target. Docker is installed; its daemon is unavailable.

## Additional verification

`node scripts/verify-game-review-sync.mjs` connects the actual `GameReviewRepository` to the actual migration in disposable PGlite PostgreSQL. Independent device stores and an in-process SQL transport exercise:

- Explicit guest copying and recovery when the migration was initially unavailable.
- Two-device partial analysis merging, offline refresh, completion replacing a timeout and idempotent retries.
- An authoritative submitted answer surviving a conflicting offline draft, with the draft retained as a separate practice-only attempt.
- Deletion tombstones preventing stale-device resurrection while cards, attempts and guest records survive.
- An account switch rejecting queued writes for the previous owner, followed by successful retry under the original owner.
- A fresh device pulling 503 position records across the 500-record pagination boundary.

All passed. Evidence: `outputs/game-review/staging/sync-verification.json`. This test executes PostgreSQL policies and conflict handling, but does not replace hosted PostgREST, Auth or real browser sign-in checks. It uses the isolated PGlite dependency documented in the original release notes.

`node scripts/verify-game-review-long-game.mjs` analyses a legal 33-ply tactical fixture for both colours with the shipped Stockfish ASM asset and production analysis settings. It deliberately pauses after saved evidence, recreates the repository, resumes and asserts that completed exact-FEN evidence is reused. All 17 White moves and 16 Black moves completed. The 40 engine calls took 30.909 seconds in total, with a maximum of 13.938 seconds and no timeout on this run. The retained pre-fix engine run produced one candidate per side. Evidence: `outputs/game-review/staging/long-game-engine.json`.

These timings use a Node process adapter on this Windows machine, not mobile hardware. Scores and timing can differ across engine runs. The fixture exercises mechanics; it does not establish that every selected finding is pedagogically useful across typical learner games.

## Finding corrected during browser verification

The browser run exposed a contradictory finding: the played move and confirmed engine alternative were both `Bxd7+`, despite a large score difference between independent searches. The retained Node evidence also contained a mate-related finding where the played and recommended moves were identical. Such evidence cannot support a corrective teaching moment.

`analysisSummary` now suppresses a finding when the confirmed reference PV starts with the played move. Completed analysis and raw evidence remain intact. Four regressions cover White/Black centipawn and mate outcomes, including a control proving that a distinct alternative remains eligible. Reassessing the retained engine evidence preserves the distinct White alternative and removes the contradictory Black finding: `outputs/game-review/staging/finding-reassessment.json`.

Browser verification on `localhost:5183` imported the same 33-ply fixture, paused at 9/17 learner moves, refreshed, and explicitly resumed with progress intact. At 390px and 320px the controls remained readable; the 320px viewport had a 305px document width with no horizontal overflow. The first browser pass left one position incomplete and ungraded. Retry eventually completed 17/17; after the fix and refresh, the contradictory finding no longer appeared. Browser automation experienced occasional command timeouts; keyboard activation and fresh state inspection verified the resulting UI. These are responsive viewport checks, not physical-device performance measurements.

The focused game-review, engine and scheduler suite passed after the fix, and the production build passed with the existing Stockfish/bundle warnings. No full-suite rerun was performed for this narrowly scoped finding filter; the prior release's broader regression evidence remains in its release note.

## Remaining hosted rollout

1. Provision a separate staging Supabase project or approved preview branch. Keep the existing **Chess openings** project unchanged until its deployment role is explicitly established. Use synthetic games and disposable test accounts; no production-data copy is needed.
2. Apply the repository migrations in filename order to that identified staging target. Verify the target reference before any command that writes migrations; do not use an unqualified `supabase db push` against the currently linked project.
3. Configure a separate local environment file or hosting preview environment with that target's URL and public anonymous/publishable key. Keep service-role keys out of Vite variables and browser bundles.
4. Build and deploy a preview using the chosen hosting provider. Configure Auth site/redirect URLs for that preview.
5. With two test accounts and two browser/device sessions, repeat guest-copy, offline draft, partial analysis, deletion and sign-out tests over the actual HTTP/Auth stack. Confirm one account cannot read or mutate the other's records.
6. Run a longer ordinary learner game on physical mobile hardware, review the selected findings, then decide whether production rollout is ready.

No hosted migration, hosted deployment, project provisioning or production change has been made. New checks and evidence are local working-tree changes until separately committed.
