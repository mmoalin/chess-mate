# Vienna and Queen’s Gambit courses

## Delivered content

Open **Repertoire → Course chapters**. Select Queen’s Gambit in **Today → Training preferences** or during onboarding customization. Default selections are unchanged.

- Five White Vienna chapters: the existing 3…d5 main lesson, 3…exf4, 3…d6, 3…Nc6, and the Bc4 setup against 2…Nc6. The existing Qf3 theory line remains optional.
- Six White Queen’s Gambit chapters: Declined Exchange, Accepted, Exchange Slav, Tarrasch, Chigorin and Albin. The main family key is `white-queens-gambit-main`.
- Every core chapter has annotated opening moves, two structure/plan questions, at least four main decisions, at least two transfer decisions, hints, concrete mistakes, candidate comparisons, and Stockfish practice.
- Fifteen White concept drills, including branch-specific contrasting scenarios and recognition of early bishop/pawn/queen setups. There are 18 concept drills including the unchanged three Caro-Kann drills.
- Two new six-decision continuous journeys from the original main lesson positions into rook endings. Every connecting move is legal and annotated. These are original illustrative lines, not historical games, forced continuations, or claimed wins.
- The total bundle contains 22 repertoire lines and 12 connected lessons. Existing Vienna/Caro-Kann keys, graded answers, and separate endgame exercises are preserved.

The courses cover Vienna after `1.e4 e5` and Queen’s Gambit after `1.d4 d5 2.c4`. Other defenses are outside this release. The Exchange Slav avoids the need to learn a full Semi-Slav repertoire; its transfer branch demonstrates a genuine move-order transposition.

## Navigation and assessment

The chapter directory shows each title and its current completion/resume status. Core branches use beginner visibility; optional theory stays secondary. Structure guides use the active graph’s source positions and lesson metadata. Repertoire, Today, and recommendations share deterministic course ordering.

Completing a main lesson makes its two-minute continuation checkpoints eligible before unstarted sidelines. Unfinished sessions and exact due reviews retain priority. PGN and saved-position links choose the deepest covered position in the appropriate family, including transpositions; ambiguous shared positions fall back to the main chapter.

The existing assessment rules remain: first submissions determine mastery, retries remain practice, assistance is recorded, and unknown legal moves/replies are not silently marked correct. Continuation feedback separates the move, explanation and opponent prediction. Choosing a different supported reply requires an explicit return to the illustrative main line.

## Chess verification

[Engine evidence](../outputs/white-courses/engine-evidence.json) records local Stockfish 17.1 lite single at depth 18, with FENs, principal variations, raw engine output and White-perspective evaluations. Regenerate from the current source with Node 24:

```powershell
node scripts/verify-white-courses.mjs
```

The verifier checks every White lesson answer and authored mistake, both candidates and their assessed replies at each new journey checkpoint, and all accepted White concept-drill moves. It reuses depth-18 analyses by exact FEN while rebuilding the claims list from current content. `chess.js` validation separately checks all opening, main, transfer and bridge sequences, turns, source graph membership, and exact continuity.

Important distinctions retained in the teaching:

- After the QGD minority break `b5`, `…Bg4` is a stronger prediction than the illustrative `…cxb5`. The latter explains how d5 becomes isolated but does not earn a correct strong-reply prediction.
- After the QGD queen exchange `Qxe6`, `…fxe6` is stronger than the illustrative `…Rxe6`. The two recaptures lead to different pawn structures.
- `Qxe6` itself is presented as a playable simplifying choice that gives up some advantage; `Rb5` retains greater pressure. Finite-depth evaluations are evidence for this comparison, not a guarantee of a result.
- Older Vienna drills no longer describe Nf3 as attacking a knight on e4, accept Bc4 where `…dxc4` takes the bishop, or prefer quiet development over the concrete `fxe5` opportunity against early `…Nc6`.

Opening references: [Vienna Gambit](https://lichess.org/opening/Vienna_Game_Vienna_Gambit), [QGD Exchange](https://lichess.org/opening/Queens_Gambit_Declined_Exchange_Variation), [Queen’s Gambit Accepted](https://lichess.org/opening/Queens_Gambit_Accepted), and [Exchange Slav](https://lichess.org/opening/Slav_Defense_Exchange_Variation). Explanations and illustrative journeys are authored for this app.

## Compatibility and publishing

`courseOrder` and `structureGuide` are optional fields in the existing connected-lesson JSON. Storage remains schema 3, with no additional database migration. The embedded bundle uses content release version 2; remote release identities and versions are retained by compatibility loading.

The loader recognizes unchanged starter content by comparing the complete source graph against the legacy/current bundles, not by trusting a release title or id. It supplies all new edges, positions, families and learning units together. Existing edited lessons, drills and authored continuations remain authoritative. The full proposed upgrade must validate before it is returned. Missing/incompatible source lines never receive an attached lesson.

For an unchanged remote starter release, deploying the app makes the compatible bundled expansion available without rewriting the published database. **Clone published to draft**, inspect the chapters, then use the existing save/publish workflow to persist the expanded content when ready.

For a remotely edited source graph, no automatic source-graph replacement occurs. Prepare an editor-owned draft that deliberately merges the selected new lines and all their dependencies from `embeddedRepertoireGraph`, resolves any stable-key conflicts in favor of the intended authored content, and passes `validateRepertoireGraph`. Save that draft through `GuidedContentRepository.saveDraft`; only publish after reviewing the resulting course. Copying lesson JSON alone is insufficient because source edges and family membership must also exist.

This implementation does not publish a remote release, deploy the site, or reset learner progress.

## Browser evidence

- Completed all six decisions in both new journeys, including the two stronger QGD predictions, with separate feedback and explicit returns to the illustrative line.
- Refreshed during a pending QGD candidate/reason/reply; all selections resumed correctly.
- Completed the Vienna Accepted and Queen’s Gambit Accepted core lessons, including their distinct transfer branches; each recap recorded eight independent answers.
- Verified local Stockfish responded from the Vienna sideline and Return to lesson restored the lesson summary.
- Verified keyboard square selection at 320 × 740 CSS pixels, tap/click selection at 390px, and the desktop board/dock layout at 1280 × 720. Browser zoom was accounted for when setting the viewport; document width equaled scroll width at both mobile widths.
- No browser console errors were captured. Physical touch hardware, screen-reader use, and live signed-in cross-device sync were not evaluated.

[Vienna desktop recap](../outputs/white-courses/vienna-desktop-recap.png) · [Queen’s Gambit mobile recap](../outputs/white-courses/queens-gambit-mobile-recap.png)

Automated verification commands:

**252 tests passed across 32 files.** [Full regression log](../outputs/white-courses/tests.txt). TypeScript and the production build passed: [build log](../outputs/white-courses/build.txt). The evidence file contains 240 cached depth-18 analyses supporting 165 current move/reply claims.

```powershell
npm test -- --maxWorkers=1 --testTimeout=60000
npm run build
```

The serial test command allows the longer browser-component flows to run without Windows worker contention. The existing Stockfish externalization/IIFE and large-bundle build warnings remain.
