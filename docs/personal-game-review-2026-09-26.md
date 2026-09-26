# Personal game review — local release

Review now includes **My games · Import and analyse**, alongside the existing saved-position replay and unrestricted engine play. Import one standard PGN by paste or file (1 MB, 600 plies maximum), choose the learner colour, replay/export/remove it, and explicitly add confirmed findings to practice. Headers, custom starting FEN, legal main line and colour determine the saved game; comments and variations are accepted but not analysed. Reimports reopen the original record.

Analysis runs on the device using the existing Stockfish 17.1 ASM worker. The initial pass requests depth 12 with a 15-second position timeout; candidate losses of at least 100cp and changed forced-mate outcomes receive depth-16 confirmation with a 30-second timeout. Evidence retains exact FEN, score perspective, raw cp/mate score, achieved/requested depth, PV, settings and version. Mate outcomes are never converted into centipawns. Incomplete positions remain ungraded and can be retried; completed positions survive pauses and refresh. Navigation and identity changes terminate the worker and invalidate its callbacks.

The library shows at most three confirmed moments, ordered by severity then earlier ply, preferring separation of four plies. Commentary reports demonstrated captures/checks/material changes, not inferred strategic advice. Lesson recommendations require an exact authored decision position and learner colour in the active course graph. Repertoire departure, opponent deviation, exhausted coverage and no match remain distinct; importing no longer schedules a forgotten move. Recurring findings count distinct completed games in three supported categories.

Practice cards contain their own position and confirmation evidence, so source-game removal does not remove practice history. Draft moves/plans survive refresh. Legal alternatives receive the same depth-16 assessment; the exact reference move reuses its already-confirmed depth-16 evidence. The cp tolerance is 50; mate grading preserves forced wins and avoids forced losses where possible, without comparing mate lengths. Failures stay ungraded. First graded answers are immutable; repeats and assisted work cannot earn independent review credit. Cards use the existing spaced-review reducer and take two minutes in the existing daily review slot, without extending the selected duration.

## Storage and sync

`GameReviewRepository` stores version-1 game records separately from course content. Content remains schema 3 / bundled release 5. Local records and persistent pending mutations are partitioned by account. Guest data is copied only through **Copy device games to my account**. Sign-out returns to the guest partition and stops analysis.

The additive migration `supabase/migrations/202609260001_game_review.sql` creates `game_review_records` and a revision-aware RPC. Authenticated users can read only their own rows; direct table writes and anonymous access are denied. The RPC checks the expected owner against `auth.uid()` on every write and checks owned parent records, so queued work cannot cross an account switch. The client validates acknowledgements and handles the one-row array representation described by [PostgREST](https://postgrest.org/en/latest/references/api/functions.html). Immutable runs/results and individually keyed positions allow partial analysis to merge. Submitted answers are immutable. Conflicting offline session work is retained as a separate pending practice attempt, with its original attempt identity recorded; it cannot replace the first authoritative answer. Game tombstones win over stale offline data; related cards remain self-contained. If the migration or network is unavailable, local work continues with pending writes and a visible retry message.

## Verification and reproduction

- Unit and UI checks: `npx vitest run --maxWorkers=1 --testTimeout=300000`. The timeout override accommodates the existing large course UI tests on this machine; it does not change application engine timeouts.
- Production build: `npm run build`.
- Actual browser engine asset: `node scripts/verify-game-review-engine.mjs`. Evidence is retained in `outputs/game-review/engine-evidence.json`.
- Disposable PostgreSQL migration/RLS checks: install the isolated test runtime with `npm install --prefix outputs/game-review/db-runtime --no-package-lock @electric-sql/pglite`, then run `node scripts/verify-game-review-db.mjs`. This uses an in-memory database with test auth roles; it never connects to Supabase. Evidence: `outputs/game-review/database-verification.json`.
- Browser walkthrough and screenshots: `outputs/game-review/`. These cover local guest data and the real engine; two-device sync conflicts and ownership are covered by repository and disposable SQL checks rather than production accounts.

The initial broad run passed 510 tests; seven existing content-upgrade checks exceeded its 60-second timeout, and one old test still assumed imports automatically created a saved gap. That fixture now explicitly seeds a historical gap. All eight affected checks passed in the retained targeted reruns (`slow-regressions.txt` and `remaining-regressions.txt`). New game-review, engine, scheduler and UI tests have separate final reports.

Docker was unavailable, so disposable PostgreSQL verification used PGlite. Existing Stockfish bundling warnings (Node compatibility imports, IIFE name and bundle size) remain; they do not fail the build.

## Separate deployment procedure

The [staging readiness follow-up](game-review-staging-readiness-2026-09-26.md) records environment discovery, database-backed two-device tests and longer-game engine evidence.

1. Review this change and the additive migration in a staging Supabase project. Back up the target database using the project's normal procedure.
2. Apply `202609260001_game_review.sql` through the normal migration pipeline, after existing migrations. Verify owner-only reads, anonymous denial, the RPC and cross-owner parent rejection with disposable staging users.
3. Deploy the production build through the existing application hosting workflow. Do not republish course content: bundled release 5/schema 3 are unchanged.
4. Verify sign-in, explicit guest copy, offline pending writes, reconnect/retry, a second-device partial run, and sign-out isolation in staging before production rollout.

No production migration, deployment or course publication was performed. Chess.com/Lichess integrations, archive imports, external AI commentary, new openings and scheduler redesign remain outside this release.
