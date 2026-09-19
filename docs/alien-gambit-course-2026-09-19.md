# Alien Gambit course

## Coverage

Select **Alien Gambit: f7 Attack** in **Today → Training preferences → My openings**, then open **Repertoire → Course chapters**. Onboarding choices and defaults are unchanged.

Five White chapters use the existing `white-alien-gambit-main` family:

1. **The sacrifice and its real cost**: `5…h6 6.Nxf7 Kxf7 7.Nf3 e6`, supporting d4 with Be3 and developing Bd3. The main source record and its existing sacrifice checkpoint remain unchanged.
2. **Immediate …c5**: develop with Bc4+, coordinate the queen and bishops, and respond to central captures.
3. **Checks against …Bf5**: Ne5+, the distinction between …Kg8 and …Ke8, and the changing safety of Qh5 after the knight leaves f6.
4. **Keep the knight against …Bf5**: Bd3, active recapture, N5f3, and a tactical transfer after …Qxd4. This uses the existing decline line identity.
5. **Develop against …Nbd7**: Bd3, N1f3, Qe2, a central knight retreat, and answering …Bb4+ before castling.

Each chapter has an annotated opening replay and recall, structure and plan questions, four main decisions, two transfer decisions, hints, move-specific mistakes, candidate comparisons, a branch structure guide, a first-attempt recap and local Stockfish practice. Six concept drills supply two contrasting scenarios apiece. Core chapters are visible in Foundation mode.

Recognition covers a genuine `3.Nd2` transposition (the same knight reaches e4 and g5) and the boundary with Classical Caro-Kann development after `4…Bf5`. This is a White Alien course, not a complete repertoire against every Caro-Kann branch or other first move. Existing Black Alien-defense records are preserved.

## Continuous journey and chess assessment

The main lesson offers **Follow this position into an ending** immediately after completion. Six checkpoints cover queen coordination, castling against central counterplay, exchanging the f7 defender, a bishop-for-rook exchange, preparation for a queen trade, and active rooks in the ending. Every bridge is annotated and replayed legally from the opening. There are no FEN jumps. Each checkpoint has two assessed candidates, distinct reasons and assessed opponent replies.

The final imbalance is two White rooks against a Black rook, bishop and knight. Black remains better. The journey is an original illustrative model, not a historical game or forced sequence. It teaches resistance and honest material assessment instead of claiming that an attack must win.

The [Chess.com opening reference](https://www.chess.com/openings/Caro-Kann-Defense-Alien-Gambit) identifies the gambit's unsound nature and the …c5, …Bf5 and …e6 approaches. Its notation is not copied uncritically: all authored sequences are independently checked with `chess.js` and local Stockfish.

[Engine evidence](../outputs/alien-courses/engine-evidence.json) contains 136 analysed positions supporting 130 move/reply claims, with exact FENs, depth-18 Stockfish 17.1 evaluations, principal variations and raw UCI output. White-positive centipawn scores are used throughout. Verification covers all new lesson answers, authored mistakes, concept answers, journey candidates and replies, and every illustrative connecting move.

The deliberate exception is the original `Nxf7` sacrifice. It loses approximately 155 centipawns relative to the engine's knight retreat in this run. It is accepted only as the expressly chosen thematic gambit exercise; the introduction, move feedback and concept explanation all disclose that accurate defense favours Black. No other accepted course or journey candidate loses more than 100 centipawns in this evidence. Engine differences are finite-depth comparisons, not proofs.

Regenerate the evidence with Node 24:

```powershell
node scripts/verify-white-courses.mjs --alien
```

The original command without `--alien` continues to verify Vienna and Queen’s Gambit independently. Cached exact-FEN analyses are reused while claims are rebuilt from current content.

## Compatibility and authored releases

Storage remains schema 3; no migration is needed. The embedded content version is now 3. The loader recognises the original starter bundle, the Vienna/Queen’s Gambit release, and the current bundle by their complete source graphs. An unchanged older bundle receives all Alien chapter dependencies together. Remote release identities and authored lessons, drills and journeys stay authoritative. Edited source graphs are not replaced. The full proposed graph must validate or loading retains the original graph.

The two existing White Alien line records, both Black Alien line records, and all earlier Vienna/Caro-Kann lesson keys and answers remain intact. Imported games and saved positions resolve to the deepest chapter, including transpositions. If a main lesson transfer also reaches a dedicated chapter's complete opening, the dedicated chapter wins the tie; ambiguous earlier prefixes still resolve to the family main lesson.

For an unchanged remote starter release, the compatible client upgrade supplies the courses. Use **Clone published to draft**, review the complete expanded graph, and follow the existing draft save/publish workflow to author a permanent remote release.

For an edited remote graph, deliberately merge the selected Alien lines, families, positions, edges, learning units, lessons and drills from `embeddedRepertoireGraph` into an editor-owned draft. Resolve stable-key conflicts in favour of the intended authored content, run `validateRepertoireGraph`, and save through `GuidedContentRepository.saveDraft`. Lesson JSON alone is insufficient. Production publishing, deployment and learner-data resets are not part of this implementation.

## Verification

- Content tests check every new lesson, source-line membership, legal moves, exact journey continuity, branch matching, the Nd2 transposition and preservation of existing Alien records.
- Session tests check pending and submitted persistence, first-answer preservation after a wrong retry, assistance versus unknown legal exploration, independent Queen’s Gambit progress, and exact two-minute reviews.
- Compatibility tests cover cached previous-release upgrades, preservation of edited content and authored journeys, missing source dependencies and idempotence. The existing remote draft save/load test includes every Alien lesson and its metadata.
- Browser testing completed the main and decline chapters (8/8 each), the continuous journey (6/6), keyboard and tap square input, refresh before and after submission, an accepted alternative without overwriting the first answer, and four-move local Stockfish practice with return to the saved summary. The desktop 1280px, mobile 390px and narrow 320px CSS layouts had no horizontal overflow. No browser console errors were recorded. Physical touch hardware and signed-in cross-device sync were not tested.

**279 tests passed across 33 files; the production build passed.** The existing Stockfish externalisation/IIFE and large-bundle warnings remain. Validation commands and evidence:

```powershell
npm test -- --maxWorkers=2 --testTimeout=60000 --reporter=verbose
npm run build
```

[Regression log](../outputs/alien-courses/tests.txt) · [Production build log](../outputs/alien-courses/build.txt) · [Desktop journey](../outputs/alien-courses/journey-desktop.png) · [Mobile journey](../outputs/alien-courses/journey-mobile.png) · [Narrow sideline recap](../outputs/alien-courses/sideline-320.png)
