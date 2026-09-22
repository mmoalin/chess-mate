# Black opening courses

Six Black courses now share the existing lesson, journey, practice, mastery and persistence machinery. The catalogue has 34 core Black chapters (including the preserved Caro-Kann main lesson), two optional chapters, and five new six-checkpoint journeys. There are 35 newly authored chapters and 43 new concept drills, bringing the complete application to 52 connected lessons and 67 drills.

| Family | Recommended repertoire and coverage | Main lesson |
| --- | --- | --- |
| `black-caro-kann-main` | Classical main; Advance, bishop chase, Exchange, Panov, Fantasy, Two Knights | `lesson:caro-active` |
| `black-sicilian-basic` | …d6/…a6/…e6 Open Sicilian; English Attack, Bg5, Bc4, f4, g3; Alapin, Closed, Grand Prix, Moscow; optional Dragon | `lesson:black-sicilian-main` |
| `black-alien-gambit-defense` | Recommend …Nbd7 against Ng5; Bc4, Bd3 and f4; optional accepted-sacrifice recovery | `lesson:black-alien-main` |
| `black-vienna-main` | …Nf6 and …d5 against f4; fxe5, exd5, Bc4, g3 and d3 | `lesson:black-vienna-main` |
| `black-queens-gambit-main` | QGD; Exchange Nf3 and Nge2, Bg5, Bf4, Catalan | `lesson:black-queens-gambit-main` |
| `black-london-main` | …d5/…Nf6/…e6 with …c5; triangle, Ne5, exchanges and Jobava | `lesson:black-london-main` |

The Vienna, Alien, QGD and London modules are targeted responses, not claims of complete coverage against every first move. Onboarding keeps the existing Vienna/Caro defaults and offers response modules separately. Existing saved selections are retained.

## Reusable authoring

`src/data/courseCompiler.ts` accepts a side-neutral `CourseDefinition`, explicit chapter decision graphs and explicit transfer anchors. IDs and next edges are authored, not inferred from array offsets. It rejects illegal moves, wrong learner turns, duplicate/unreachable checkpoints, cycles, conflicting histories and missing source answers. `compileJourney` uses an explicit source checkpoint and answer; the persisted interface still has one journey per lesson.

`blackCourseSeeds.ts` declares coverage and position-specific teaching goals. `blackCourseContent.json` contains annotated, legal opening/main/transfer/journey paths; `blackJourneyTeaching.ts` supplies the reasoning for each journey position. `blackRecognitionContent.json` contains the short recognition drills. The authoring adapter compiles these to the existing types. Run:

```sh
npm run content:compile
npm run content:verify
npm test -- --maxWorkers=1 --testTimeout=120000
npm run build
```

Compilation writes `compiledBlackCourses.json`, which the runtime imports directly. This avoids rebuilding the new lesson paths in the browser. The production build runs compilation automatically. Review source and generated content together. `scripts/author-black-courses.mjs` is a resumable engine-assisted authoring tool, not a production startup dependency; editorial review and verification remain required after generation.

`courseCatalog`, `mainCourseLesson` and `orderedLessons` derive navigation from the active graph. Optional chapters follow core chapters; a completed main lesson unlocks its journey without completing sidelines. PGN/position matching uses the longest covered canonical position, filters by learner colour and falls back to the declared main lesson for ambiguous family prefixes.

## Storage and upgrades

Storage remains schema 3. Optional `course`, `optional`, `courseOrder`, `structureGuide` and journey `sourceMove` fields live in the existing lesson JSON. No database migration or new progress store is required. Existing lesson keys, assessed answers, checkpoint IDs, separate endgame exercises and journey identities are preserved.

`bundledCourseUpgrades.ts` installs each family's validated dependency package atomically. The package includes source edges, positions, learning units, guidance, deviation policies, motifs, lessons and drills. Recognized legacy, pre-Alien and pre-Black records use `bundledContentManifest.json`; test fixtures retain their complete historical graphs. Unknown source edits, missing edges and dependency collisions skip the affected package. Authored lessons/journeys are preserved. Independent compatible packages may still be installed. Admin displays skipped-package diagnostics.

### Include the courses in an authored remote release

1. Retain a backup/export of the current authored release and create a working draft through the existing editor workflow. Never substitute the embedded release ID for a remote draft ID.
2. Load the draft with `GuidedContentRepository.loadDraft()`. Recognized unchanged starter families acquire complete compatible packages automatically, while the draft's release identity and authored records remain intact.
3. Inspect **Bundled course upgrade notes**. A skipped source family must be reconciled by its author. Use `upgradeBundledCourses(draft, embeddedRepertoireGraph)` for the same conservative programmatic merge; do not copy only lesson JSON into a release missing its source graph.
4. Validate the entire graph with `validateRepertoireGraph`, save it with `saveDraft`, reload it, and verify all six main keys plus expected source memberships, drills and journeys. For a wholly custom release, explicitly reconcile and include the complete desired dependency packages; an unrecognized release is not automatically replaced.
5. Review chapter ordering, scope and engine evidence against that draft. Publishing uses the existing `publishDraft` workflow only when separately authorized. This implementation does not publish or deploy production content.

## Chess evidence

`outputs/black-courses/engine-evidence.json` records 1,231 claims: 1,139 new claims and 92 preserved baseline claims. Local Stockfish 17.1 lite single WASM, depth 18, 16 MB hash; cache keys include engine settings, MultiPV and exact FEN. Records include White-perspective centipawns, learner-relative loss, principal variations and raw UCI output. All new assessed moves/replies/connecting moves pass the 100cp review threshold, and authored mistakes meet it. Entry positions are recorded without treating an opponent's deliberately inferior opening choice as a recommended move. Model journeys are explicitly illustrative, not forced.

Three preserved baseline concerns are reported rather than silently changing assessed content: Caro journey `Be5` (145cp loss), connecting `Nxe5` (163cp), and `concept:caro-resolve-centre/advance-choice` accepting `Bg4` (457cp). These are finite-depth findings for later editorial review. Existing mistake-labelled candidates are not counted as concerns merely because they lose evaluation.

`authoring-evidence.json` and `recognition-evidence.json` retain the authoring analyses. `verification.txt` records the final check: zero new claims require author review. The generic verifier accepts `--side` and `--course`; the historical White wrapper retains its default Vienna/QGD selection and `--alien` mode.

## Validation

The complete suite ran 435 tests across 35 files. Its only remaining failure was a new ambiguous navigation-test selector; after scoping that selector to the numbered chapter, the affected file passed both tests. All 435 tests therefore have passing final results. See `tests-final.txt` and `navigation-tests.txt`; the earlier full-run failure remains visible in the log. Production TypeScript/Vite build passed (`build.txt`), with Vite's bundle-size advisory.

Coverage includes all source graphs and lesson contracts, White/Caro baseline preservation, branch matching and transpositions, exact two-minute journey reviews, independent course progress, first answers, assistance versus ungraded exploration, cached and remote upgrades, edited-record preservation, and draft save/load. Existing lesson-interface and four-move practice tests exercise every new chapter.

Browser acceptance is recorded in `outputs/black-courses/browser-acceptance.md`. Desktop and 390px/320px checks use the production preview; screenshots accompany the record. New courses use Black board orientation and both keyboard and tap input. No production publication was performed.
