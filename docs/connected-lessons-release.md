# Connected lessons release

## Delivered

Two original lessons connect the existing Vienna and Classical Caro-Kann lines to structure and plan questions, continuous decisions, a clearly announced alternate-reply branch, a first-attempt summary, and optional Stockfish practice. The Vienna main path has four decisions plus two transfer decisions; Caro-Kann has eight plus three. Both include a concrete exchange consequence.

The session controller is separate from App. Checkpoints retain full SAN history, first-answer identities, assistance, learner ownership, content version, and return destination. Opening replay and skipping are ungraded. Review targets restore the exact checkpoint. Restarting supersedes the old run without removing its answers.

Local session, answer, mastery, and retry-marker writes share one browser-store transaction. Network retries reuse answer IDs. Remote session answers are cached as already recorded, preventing a second device from scoring them again. Engine operations reject overlapping requests, settle cancellation/timeouts, and ignore stale UI results.

## Deployment order

1. Apply the additive `202609090001_connected_lessons.sql` migration to the linked Supabase project. It adds owner-protected lesson sessions and release-scoped lesson content, and updates the content-cloning function to retain both concept drills and connected lessons.
2. Deploy the app. Existing schema-1/2 releases remain readable; compatible bundled lessons are available without rewriting a published release. Saving and publishing a draft stores schema-3 content.
3. Verify the Vercel preview: open both lessons, complete a checkpoint, refresh, leave and resume from Today, and start Stockfish from the lesson ending.

The migration does not delete progress or rewrite existing content. An app rollback can leave the additive tables in place.

## Verification

- Authored paths, player turns, move continuity, questions, and branch endings are checked with chess.js.
- Controller and UI tests complete both lessons and cover mistakes, assistance, replay, exact reviews, history inspection, refreshed sessions, stale content, both engine colours, worker failure, cancellation, and terminal positions.
- Repository tests cover duplicate saves, failed-cloud retries, account ownership, second-device answer identities, and content round-tripping.
- Existing component tests use isolated cloud settings rather than a developer's real Supabase project.
- Browser walkthrough completed Vienna with drag-and-drop, reloaded at the transfer boundary, completed the alternate branch, and observed Stockfish reply ...Be6. Returning to the lesson restored the pre-practice ending.
- Layout checks: 1280×720 (456px board), 1920×1080 (816px board), and 390×844; no horizontal overflow. Mobile uses normal vertical scrolling.
- Mobile answer feedback is placed beside the question controls; a wrong Caro-Kann answer was visible at y=530–604 in the 844px phone viewport. Position changes cancel lesson analysis and clear its old output.
- The linked Supabase migration was applied on 9 September 2026. Remote public-schema lint reported no errors.

Production builds retain the existing Stockfish bundling and large-chunk warnings. Human learning gains have not been measured; the acceptance walkthrough establishes functional behaviour, not a learning study.
