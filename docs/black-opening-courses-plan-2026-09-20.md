# Black opening courses — implementation plan

Status: planned, 20 September 2026. The user confirmed **one recommended defense per opening, with White’s main replies**. This document defines the next implementation; it does not report completed content or engine verification.

Implementation and verification record: [Black opening courses, 22 September 2026](black-opening-courses-2026-09-22.md).

## Outcome and scope

Provide beginner-to-intermediate Black lessons for all six opening families represented in the application: Caro-Kann, Sicilian, Alien Gambit, Vienna, Queen’s Gambit, and London. Reuse one authoring pipeline, lesson player, continuation system, scheduler, and persistence model for both colours.

Each course teaches a coherent Black approach and the important ways White can respond. Do not reverse White’s lessons mechanically: a Black lesson should recommend sound defense, assess White’s threats, and teach when to seek activity, simplify, or retain tension.

Keep the existing White courses and all existing Black source records, identifiers, assessed answers, progress, and endgame exercises. Preserve current repertoire selections and onboarding defaults. Production publishing and deployment remain outside implementation.

## Curriculum

Each distinct core branch below receives the full lesson experience. Genuine transpositions share a chapter rather than producing duplicate chapters. Concrete move sequences and tactical assessments must pass the verification gates below before release.

| Course and family identity | Recommended Black approach | Core chapter coverage | Secondary material |
| --- | --- | --- | --- |
| **Caro-Kann** — retain `black-caro-kann-main` | Retain the Classical `…Bf5` repertoire and use active central counterplay in White’s other systems. | Existing Classical lesson; positional Advance; sharp Advance bishop-chasing plans; Exchange; Panov; Fantasy; Two Knights. Teach bishop development, the `…c5`/`…e5` breaks, isolated-pawn activity, and the consequences of exchanges. | `Nc3`/`Nd2` transpositions, Hillbilly attacks, early queen pressure. Retain `black-caro-advance-theory`; integrate its compatible source into the expanded course without changing its identity. |
| **Sicilian** — retain `black-sicilian-basic` | Retain the existing `…d6`, `…a6`, `…e6` repertoire. Teach a practical Najdorf approach with development and counterplay. | Open Sicilian against `Be2`, `Be3`, `Bg5`, `Bc4`, `f4`, and `g3`; Alapin; Closed Sicilian; Grand Prix; Moscow `Bb5+`. Explain when the centre, queenside, or king safety takes priority. | Decline the Smith–Morra with `…Nf6` and connect compatible positions to the Alapin chapter; Wing Gambit recognition. Preserve `black-sicilian-dragon-theory` as optional study. The main `2…d6` repertoire calls for Moscow coverage, not an unrelated Rossolimo course. |
| **Alien Gambit defense** — retain `black-alien-gambit-defense` | Retain `1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nf6 5.Ng5 Nbd7`. Develop and defend f7 without inviting the sacrifice with `…h6`. | Direct `Bc4` pressure; quieter `Bd3`/`N1f3` development; White’s more ambitious pawn and queen attacking setups. Teach threat identification, central challenges, and safe exchanges. Group attacking setups by the actual structure identified during authoring. | Retain `black-alien-gambit-accepted` and add an optional full recovery lesson for the accepted sacrifice: challenge the centre, answer checks, coordinate the king’s defenders, and consolidate material. Include `3.Nd2` recognition. This course starts from a different fourth move than the main Classical Caro-Kann course. |
| **Vienna defense** — add `black-vienna-main` | Recommend `1.e4 e5 2.Nc3 Nf6`, answering `3.f4` with `…d5`. | Vienna Gambit after `fxe5`; the alternative central capture `exd5`; `Bc4` development; `g3` development; quieter `d3` setups. Teach central counterplay, recovery of development, and management of White’s e- and f-pawns. | `Nf3` move orders and Four Knights transpositions; premature attacks and entered inferior positions as recognition exercises. Do not recommend cooperative gambit acceptance just because it appeared in the White course. |
| **Queen’s Gambit defense** — add `black-queens-gambit-main` | Recommend the QGD with `…e6`, `…Nf6`, `…Be7`, and normal castling. | Main development with `Bg5`; Exchange with `Nf3` and the minority attack; Exchange with `Nge2`/`f3` and central expansion; `Bf4` systems; White’s Catalan fianchetto. Teach the light bishop, `…c5`/`…e5`, active defense of the Carlsbad structure, and appropriate simplification. | Early queen pressure, premature `e4`, and `Nc3`/`Nf3` move orders. QGA, Slav, Tarrasch, Chigorin, and Albin are alternative Black repertoires and are outside this selected scope. |
| **London defense** — add `black-london-main` | Recommend a compatible `…d5`, `…Nf6`, `…e6`, `…c5` approach, developing the bishop actively when the position permits. | Normal `e3`/`Nf3`/`c3` triangle; `Ne5` and kingside expansion; early central captures and bishop exchanges; Jobava positions with `Nc3`. Teach pressure against d4, the timing of central exchanges, and defense against direct attacks. | Queen pressure, bishop retreat choices, and early `c4` transpositions into covered QGD positions. An early `Bf4` move order alone is not a separate chapter. |

This is roughly thirty to thirty-five core chapters, including the existing Caro-Kann main lesson. Final chapter boundaries follow distinct positions and learning objectives; transpositions should reduce duplication. Optional accepted-Alien and Dragon material does not gate core progress.

The family main chapters are Classical Caro-Kann, Open Sicilian with `Be2`, Alien defense against `Bc4`, Vienna Gambit with `fxe5`, QGD Exchange with `Nf3`, and the normal London triangle. These are the shared-prefix fallback and journey entry points. Other chapter order follows the table’s learning progression, with the declared main chapter first. The QGD main chapter therefore teaches the same Carlsbad structure as the White course from Black’s perspective.

Opening references support terminology and starting structures, not the correctness of every authored move. The existing Sicilian `…a6` source is a [Najdorf structure](https://lichess.org/opening/Sicilian_Defense_Najdorf_Variation). The Vienna recommendation follows the [Falkbeer `2…Nf6` approach](https://lichess.org/opening/Vienna_Game_Falkbeer_Variation). Use the [QGD reference](https://lichess.org/opening/Queens_Gambit_Declined) and [Alien Gambit reference](https://www.chess.com/openings/Caro-Kann-Defense-Alien-Gambit) alongside independent engine verification.

### Coverage boundaries

- Caro-Kann and Sicilian are alternative primary responses to `1.e4`; learners may study both, but onboarding should not imply both are required.
- Vienna defense is a response course after `1.e4 e5 2.Nc3`, not a complete `1…e5` repertoire. Spanish, Italian, Scotch, and other second moves remain outside it unless a covered position is reached by transposition.
- Alien defense is a targeted Caro-Kann module after `4…Nf6`. Do not attach it as the next position after the Classical course’s `4…Bf5`.
- QGD and London cover the named `1.d4` systems. Neither their selection nor their completion means all `1.d4`, `1.c4`, and `1.Nf3` openings are covered. Explain relevant Catalan and QGD transpositions without claiming full flank-opening coverage.
- A sound White move outside a course is a coverage boundary, not a learner mistake.

## Architecture first

### 1. Introduce a colour-independent authoring model

Refactor `src/data/courseBuilder.ts` into shared course authoring and compilation helpers. Keep the runtime `ConnectedLesson`, `ConceptDrill`, `RepertoireLine`, and continuation representations; this is not a second lesson engine.

Add an explicit `CourseDefinition` with family key, learner side, display title, context, scope, main lesson key, ordered chapters, source lines, and optional supporting courses. A chapter declares its own stable line, lesson, concept, and checkpoint identifiers. An opening name or slug must not determine its colour or IDs.

Author decision nodes with explicit prompts, hints, accepted answers, opponent continuations, next checkpoint references, move-specific mistakes, and comparisons. Reference a transfer by its source checkpoint and alternative opponent reply rather than an opaque array offset. Derive legal histories and learner turns with `chess.js`; do not assume every decision path starts with White or that odd/even array indices are sufficient validation.

Keep answer identity and sequencing compatible with the existing runtime. An answer’s `repliesSan` remains an ordered played continuation, not a set of mutually exclusive alternatives. Compile alternative responses into explicit paths or the existing transfer mechanism.

Move the generic journey helper from `whiteContinuations.ts` into a neutral shared module. Its inputs explicitly identify the source checkpoint and selected source answer, candidates and their assessments, reason choices, predicted replies, and component feedback. Do not automatically mark every supplied alternative correct or silently choose the first source answer.

Generate opponent labels from the learner side. Require authored teaching text: a hint must help reasoning, and a wrong answer must represent a plausible position-specific misconception. Avoid extracting questions from the first sentence of feedback or inserting the same queen-development distractor into every lesson.

### 2. Register courses once; derive runtime navigation from active content

Create a build-time registry for course definitions. Compilation returns all required lines, lessons, drills, journeys, and dependency metadata. Adding a course should not require another family-name conditional in the player, Today, matching, or authoring helpers.

At runtime, derive the course catalogue from the **active loaded graph**, including authored remote content. Persist optional course metadata on the family’s main `ConnectedLesson` JSON: main lesson identity, repertoire/response role, entry conditions, context, scope description, and covered systems. Keep chapter order and structure guidance on individual lessons. This uses schema-3 lesson JSON and avoids a database migration solely for course navigation metadata.

Validate that a family has at most one authoritative course descriptor and that all declared chapter and source references exist. Existing lessons without metadata receive deterministic defaults. Legacy content without scope metadata must not be described as complete coverage merely from its first move.

Keep structure guides branch-specific and resolve them from the selected lesson in the active graph. Shared structures can reuse authoring templates with colour-specific explanations; White minority-attack advice must not appear as Black’s plan.

### 3. Preserve existing content and progress through the refactor

First capture current generated content in compatibility fixtures. Adapt existing White course definitions to the shared compiler without changing their generated IDs, assessed answers, histories, lesson versions, continuation IDs, or ordering. Preserve the original hand-authored Caro-Kann lesson `lesson:caro-active` and its endgame and continuation checkpoints.

Keep the existing Black family keys listed in the curriculum. Use explicit Black-qualified IDs for new lessons and concepts, such as `lesson:black-vienna-main`; do not reuse White lesson keys. New source lines are additive. If an existing source ends with White to move, preserve it and author a legal annotated continuation to the first Black decision rather than changing the old source checkpoint.

No migration or reset of learner sessions, answers, preferences, or mastery is part of this work. Tests must distinguish course progress by lesson identity even when opposite-colour lessons share a canonical board position.

### 4. Make bundled upgrades reusable

Replace the growing chain of complete historical starter graphs with explicit release manifests and course dependency packages. Keep old fixtures for compatibility tests; generate deterministic fingerprints from their recognised records for production upgrade checks.

Each package declares its source requirements and complete dependency closure: positions, edges, families, units, guidance, deviations, motifs, lessons, and drills. Plan the merge without mutating the input, recognise unchanged bundled records, preserve authored records, and validate the proposed graph before applying a package atomically.

Unknown or incompatible source edits, stable-key collisions, or absent dependencies prevent that package from being attached. Preserve remotely authored lessons and journeys. Report skipped packages and conflicts to the content editor; do not overwrite edits or silently assemble a partial lesson. An unrelated remote edit should not automatically disqualify independent compatible packages.

Use the same upgrade path for embedded fallback, cached content, remote published content, and drafts. Upgrades must be deterministic and idempotent. Draft save/load must round-trip all optional course metadata. Publishing a permanent remote course release remains an explicit authored release operation.

## Complete lesson experience

Every core chapter includes:

- Annotated opening replay and recall, ending at the correct Black learner turn.
- Structure and plan questions, branch-specific pawn diagrams and guidance.
- At least four linked Black decisions, plus at least two transfer decisions against a different White continuation.
- Useful hints, concrete mistake feedback, and candidate comparisons.
- At least one concept drill with two contrasting scenarios requiring the learner to reassess the position.
- First-attempt recap, exact checkpoint review, and Stockfish practice from the actual resulting position.

Reuse the existing distinction between independent answers, assisted answers, and legal exploration that has not been assessed. Trying an unlisted legal move must not grant independent credit or overwrite the first submitted answer. Practice and replay must return to the saved learning position.

### Six continuous journeys

Retain the existing Caro-Kann journey and add one six-checkpoint journey to each of the other five family main lessons. Retain the one-continuation-per-lesson interface and separate existing endgame exercises.

| Main course | Journey focus |
| --- | --- |
| Caro-Kann | Preserve the existing journey and its assessed content. |
| Sicilian | Complete development; prepare central or queenside counterplay; respond to White’s attack; assess a structural exchange; weigh simplification; activate the remaining pieces in the ending. |
| Alien defense | Secure f7; challenge the centre; improve coordination; answer renewed pressure; assess a simplifying exchange; activate king and remaining pieces. Use the recommended `…Nbd7` branch, not a silently accepted sacrifice. |
| Vienna defense | Resolve central tension; regain harmonious development; restrain White’s pawn space; select a structural exchange; evaluate a queen trade; activate rooks and king. |
| QGD | Anticipate White’s queenside expansion; organise counterplay; manage a potential weakness; improve the least active piece; choose an exchange; find rook activity in the ending. |
| London defense | Pressure d4; manage White’s kingside plans; execute a justified central break; evaluate the changed pawns; simplify on favourable terms; find active ending play. |

Every journey must replay legally from its source lesson without position jumps. Include annotated connecting moves, sound accepted alternatives, reason choices, opponent-reply predictions, and separate feedback for each component. Label the journey an illustrative model, not a forced sequence or guaranteed win. Do not manufacture an ending through unexplained blunders simply to reach the final checkpoint.

## Navigation, matching, and scheduling

Show White and Black course groups with an ordered chapter directory, distinct titles, progress, and clear scope. Keep every core White-response chapter visible in Foundation mode; optional alternative Black repertoires stay secondary. Offer the main journey as soon as its own lesson is complete, without requiring all sidelines.

Keep Vienna and Caro-Kann onboarding defaults. Offer Caro-Kann and Sicilian as primary `1.e4` choices, with Vienna and Alien as targeted additions. Enable selection of QGD and London lessons under the Black `1.d4` section, initially unselected. Persist selections through the existing family-key preferences rather than introducing a second preference store. Derive coverage text from the selected courses’ declared scope; replace the current disabled `1.d4` control and hard-coded “planned” message.

Preserve the existing learner-side filter during PGN import and enforce side and family context throughout lesson resolution, including saved positions. Match the longest covered branch using canonical positions for transpositions. Prefer a dedicated chapter over an incidental appearance in another lesson’s transfer. Resolve shared prefixes to the family’s declared main lesson. If multiple selected families remain genuinely ambiguous, retain the ambiguity instead of choosing an unrelated course by lexical order.

Centralise ordering so Repertoire, Today, recommendations, and next-chapter actions agree. Keep unfinished-session and due-review priorities above new course lessons. Supplemental courses should not be automatically selected or inserted as mandatory prerequisites for a primary repertoire. Cross-links may recommend a relevant chapter without changing the learner’s preferences or mastery.

## Verification and acceptance

### Authoring contracts and chess evidence

Generalise `scripts/verify-white-courses.mjs` into a course verifier accepting course and side filters; preserve existing commands as compatibility wrappers. It must discover registered content rather than use White-only key prefixes or an Alien-specific switch.

Validate every source line, opening path, decision, transfer, candidate, reply, drill, and connecting move with `chess.js`. Check learner turns, stable IDs, source membership, exact history continuity, cross-course references, and transposition identity. Cover Black-to-move starts, White’s initial move, castling, promotion, en passant, and legal checks.

Run local Stockfish 17.1 at depth 18 or higher for authored tactical claims and assessed alternatives. Record exact FEN, chosen move, depth, engine identity and options, White-perspective evaluation, learner-relative loss, principal variation, and raw analysis. Cache by position plus engine settings/version, not FEN alone. A White-positive score must be interpreted correctly when judging a Black move. Review relevant opponent defenses, not just the cooperative reply used in the example.

Revise unsupported claims and candidates before release. Flag large evaluation losses for review; any deliberately thematic exception needs explicit learner-facing disclosure and a recorded rationale. Existing assessed content is a compatibility baseline: report newly discovered concerns separately rather than silently changing old answers during the architecture refactor.

### Automated regressions

- Shared compiler: both colours, explicit transfer anchors, multiple answer paths, source-answer selection, candidate correctness, duplicate IDs, missing dependencies, and unchanged legacy output.
- Catalogue and UI: all six Black courses selectable; honest scope; core visibility; branch structure guides; onboarding defaults and saved choices; identical chapter ordering across entry points.
- PGN and saved positions: Black perspective, longest matching branch, canonical transpositions, same-position White/Black separation, Caro/Alien boundaries, and ambiguous family prefixes.
- Scheduling: unfinished sessions, due reviews, independent course mastery, direct main-journey availability, and exact two-minute continuation reviews.
- Persistence: refresh before and after submission, first-answer preservation, hints and analysis assistance, unassessed legal moves, replay/practice return, local and remote round-trips, stale content, and existing retry/account-isolation behavior.
- Content upgrades: every recognised previous bundle, partial compatible packages, missing sources, conflicting edits, authored journeys, idempotence, cached/embedded/remote loading, and draft save/load.

### Browser acceptance

Complete the main lesson and journey for each Black course, plus representative sharp, quiet, and transposed sidelines. Exercise Black board orientation, keyboard and tap input, legal move feedback, refresh/resume before and after submission, practice against White’s engine moves, and return to the saved lesson.

Check desktop, 390px, and 320px widths, including long Black chapter titles, reason/reply feedback, pawn diagrams, and no horizontal overflow. Re-run representative White Vienna, Queen’s Gambit, and Alien flows and the existing Caro-Kann regression suite. Run the full test suite and production build; preserve screenshots, test/build logs, and engine evidence.

## Delivery sequence

1. **Shared architecture and compatibility:** capture baseline fixtures, introduce the generic compiler/registry and neutral journey builder, add metadata validation, implement course packages, and prove existing content and progress remain compatible.
2. **A complete Black vertical slice:** preserve and register Caro-Kann; build Alien defense with a main lesson, transfer, drill, journey, engine evidence, loading, matching, and browser verification. This proves the shared pipeline works end to end before multiplying content.
3. **Caro-Kann and the `1.d4` courses:** finish Caro-Kann sidelines, then QGD and London with shared structure templates, exact transposition links, preferences, and truthful coverage UI.
4. **Vienna and Sicilian:** add Vienna defense, then the larger Sicilian curriculum. Keep the retained Dragon branch optional and maintain the existing source identities.
5. **Release readiness:** complete all evidence and regressions, run the full test suite and production build, and document authored remote release assembly and conflict resolution.

Deliver the implementation, reusable authoring examples, all course content and dependencies, engine evidence, automated and browser verification artifacts, and updated release instructions. Success means a learner can select any of the six Black courses, find the covered White response, complete its lesson, practise the resulting position, resume later, and receive a review at the exact assessed checkpoint.
