# White 1.e4 companions — bundled release 5

The release adds 12 core White chapters, 15 drills and three continuous six-checkpoint journeys. The complete catalogue has 64 connected lessons and 82 drills. Storage remains schema 3; there is no database migration or separate preferences store.

| Family | Chapters in order | Main lesson |
| --- | --- | --- |
| `white-sicilian-alapin` | Immediate …d5; immediate …Nf6; …Nc6; …d6 | `lesson:white-sicilian-alapin:main` |
| `white-french-advance` | …c5/…Nc6/…Qb6; early …cxd4; …Bd7; …f6 | `lesson:white-french-advance:main` |
| `white-caro-exchange` | Normal development with Bd3; early …Bf5; …Bg4; …g6 | `lesson:white-caro-exchange:main` |

Each chapter has annotated replay/recall ending on White's turn, two structure/plan questions, four main decisions, two transfer decisions and a two-scenario concept drill. Each family also has a two-scenario recognition drill. Main lessons unlock their journeys without requiring sidelines. Four-move Stockfish practice, first-answer assessment, recorded assistance and exact reviews use the existing learning system.

## Scope and selection

The Repertoire workspace displays **White after 1.e4** above the directory. Accessible expandable rows follow the fixed order …e5, …c5, …e6, …c6, …d5, …d6, …g6, …Nf6, other replies. Selection/availability and learning progress are separate. No overall coverage percentage is presented.

Availability and routes come from `CourseMetadata.coverage` in the active loaded graph, including remote releases. Legal entry sequences, canonical route membership, learner colour and referenced lessons are validated. Vienna covers only its named routes; Alien covers its particular Caro route. Legacy courses without metadata keep their directory/scope. The Black interface is unchanged.

Alapin's …e6/…d5 transposition and recognition drill link directly to the French main chapter. They share its progress rather than creating another copy. White and Black families use separate stable keys.

Onboarding and Training preferences have an explicit additive companion-pack action. Existing Vienna/Caro defaults, individual selection and progress remain intact. Missing active courses are named and omitted from the addition. Repeated additions do not duplicate keys.

## Content and editorial decisions

The shared compiler emits `compiledBlackCourses.json`, `compiledWhiteCompanions.json` and `compiledCaroCorrection.json` deterministically. Authoring sources and engine helpers remain outside runtime loading. Position-specific teaching is in `whiteCompanionTeaching.ts` and `whiteCompanionJourneyTeaching.ts`.

Editorial review checked pawn contacts, piece identities, material counts, castling rights, the purpose of exchanges and the distinction between an illustration and a forced line. The journeys are labelled original illustrative continuations. The Alapin and Caro journeys retain minor pieces; the French journey includes a material imbalance and a supported passed pawn. None claims a forced win. The premature …Bf5 chapter explicitly identifies the undefended bishop and teaches Bxf5 followed by development, rather than calling it a fair exchange.

The initial …Nc6 Alapin transfer retreated …Nb8 with 130cp loss. It was replaced by a branch after Nf3 with …Nf6, Nc3, …Qf5 and d5. The learner now compares the queen's changed placement with the main …Bg4 setup. No new editorial engine exception was needed.

## Legacy Caro correction and compatibility

`lesson:caro-active` is revision 2. Its weaker Be5/…Nxe5 segment is replaced by a verified continuous illustration with recalculated downstream positions and teaching. Journey ID `caro-main-continuation-v2` and all six `continuation:v2-*` checkpoint identities are new. Unchanged opening/main/transfer answers and separate endgame exercises retain their identities.

The Advance scenario no longer accepts …Bg4. The revised drill is `concept:caro-resolve-centre-v2`, explicitly retiring `concept:caro-resolve-centre`.

Historical sessions and attempts remain stored. Version-1 sessions use the existing lesson-updated restart flow. Retired targets map to fresh replacement practice; scheduling can carry a due date forward, but never the old score, streak, answer or credit. Completed historical daily outcomes remain history. Existing mastery on unchanged checkpoints remains intact.

`pre-white-companions-release.json` and `preWhiteCompanionManifest.json` identify the preceding bundled records. Upgrades install validated family dependency packages atomically and idempotently, with cross-family links ordered after their dependencies. Recognized records are replaced/retired explicitly. Independently edited remote records cause a conflict report and preserve the affected package. Optional drill links/retirements travel through existing schema-3 course JSON and are restored when loading database rows.

Unsubmitted question choices and independent move/plan/reply drafts now persist separately from graded answers. Restoring a draft does not reveal feedback or award credit.

## Verification and evidence

`scripts/verification-policy.mjs` uses an explicit immutable legacy fingerprint. Only unchanged assessed content qualifies; White colour and identifier prefixes grant no exemption. Navigation metadata is excluded from the assessment fingerprint. Changing teaching, moves, replies, drills or continuations subjects the record to strict review.

Runs use filter-specific directories so one course's claims cannot replace another's evidence. Evidence records exact FENs, engine settings, depth, side-relative evaluation loss and principal variations. Local Stockfish 17.1 lite single WASM ran at depth 18 with 16 MB hash. The 100cp threshold is a review trigger, not a proof of chess correctness. Deliberately inferior opening/setup deviations are recorded as entry positions rather than recommended replies.

| Verification scope | Claims | Unresolved reviews | Evidence directory under `outputs/course-verification/` |
| --- | ---: | ---: | --- |
| Alapin | 154 | 0 | `white-white-sicilian-alapin-eb6dff0c` |
| French Advance | 186 | 0 | `white-white-french-advance-dc75e7ca` |
| White Caro Exchange | 164 | 0 | `white-white-caro-exchange-e284be2e` |
| Black Caro including correction | 208 | 0 | `black-black-caro-kann-main-1e59e3db` |

Each directory contains `engine-evidence.json`. Authoring analyses and verification logs are retained under `outputs/white-companions/`. Browser results are in [browser acceptance](../outputs/white-companions/browser-acceptance.md). Test and production-build logs are retained in the same directory. The build retains the existing Stockfish externalization/IIFE warnings and bundle-size advisory.

Final regression: **499 tests passed across 38 files** (`tests-release.txt`). The production TypeScript/Vite build passed (`build.txt`). Recompiling all three generated bundles produced byte-identical SHA-256 hashes; `git diff --check` passed. The initial regression logs retain the superseded expectation failures for traceability. The 320px browser check also corrected a pre-existing body minimum width that caused horizontal overflow when a vertical scrollbar was present.

Reproduce the release checks:

```sh
npm run content:compile
node scripts/verify-courses.mjs --side white --course white-sicilian-alapin
node scripts/verify-courses.mjs --side white --course white-french-advance
node scripts/verify-courses.mjs --side white --course white-caro-exchange
node scripts/verify-courses.mjs --side black --course black-caro-kann-main
npm test -- --maxWorkers=2 --testTimeout=120000
npm run build
```

## Remote publication instructions

1. Back up/export the current remote release. Create a working draft through the existing editor workflow and retain its remote identity.
2. Load it with `GuidedContentRepository.loadDraft()`. The conservative bundled upgrade installs compatible complete packages. Inspect **Bundled course upgrade notes**; resolve edited-record conflicts with the content author. Do not replace an authored release wholesale or copy lesson JSON without its graph dependencies.
3. Confirm all three new family packages, their main keys, the French transposition and the corrected Caro records. Validate with `validateRepertoireGraph`, save with `saveDraft`, reload and compare lesson metadata and drill links/retirements.
4. Repeat the four filtered engine checks against the intended authored content if it differs from the bundle. Review changes editorially as well as by engine score. Check a fresh learner, an existing learner, an old Caro session and a retired review target.
5. Use the existing `publishDraft` workflow only when publication is separately authorized. Deploy production separately. This implementation neither publishes remote content nor deploys production.

Personal game analysis, account integrations, other opening families and scheduler redesign remain later milestones. White Panov, Grand Prix and alternative French repertoires are outside this companion release; existing unrelated courses remain available.
