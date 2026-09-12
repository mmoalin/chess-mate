# Intermediate-player usability walkthrough — 12 September 2026

The app provides a useful opening-to-middlegame foundation. Its next product step should be helping the learner compare decisions and follow their structural consequences into an endgame. The current experience is strongest at guided execution and weaker at independent reasoning, alternative moves, and understanding what progress actually proves.

**Method and scope**

Hands-on, persona-based cognitive walkthrough of the local application at `http://127.0.0.1:5181/`, based on checkout `722fe73`. This is an expert simulation; no human participants were recruited, and no usability scores or learning-effectiveness statistics were measured. Findings below distinguish observed behavior from proposed improvements.

Persona: an intermediate club player, represented by Chess.com 1500 and the goal “Build a deeper repertoire.” Comfortable with notation, legal moves, development, and simple tactics. Wants to explain pawn structures, choose between plausible plans, respond when an opponent deviates, and recognize desirable exchanges and resulting endings. The numeric rating is a test-profile assumption, not a universal definition of intermediate strength.

Used a separate local origin and guest session. Verified that Training preferences retained “Build a deeper repertoire” and “Deep.” Tested the desktop browser, including a visual inspection at 1280 × 720. No account, cloud sync, mobile, or delayed spaced-review claims are made. Existing application source was inspected after the relevant UI observations to locate implementation causes. Application behavior was not changed as part of this review.

| Learning task | Observed outcome |
| --- | --- |
| Set up an intermediate repertoire | Completed; Deep preference persisted, but the sampled lesson questions remained elementary. |
| Recall an opening and explain its plan | Completed the Vienna lesson, including all main and transfer decisions. |
| Understand a reasonable alternative | Partial: alternatives were recognized as outside authored content, but comparison was not supported within the lesson. |
| Apply the idea to a changed opponent reply | Completed the Vienna rewind exercise; the changed recapture was a useful transfer task. |
| Follow the structure into an endgame | No connected route found from the completed lesson or repertoire map; Basic Endgames was a separate beginner module. |
| Review a game and return to learning | Imported a synthetic Vienna PGN, opened its saved position, and found a related-lesson link. The end of stored line coverage was framed as a recall gap. |
| Trust daily progress | Failed: an unanswered application activity could be counted as completed. |

**Preserve these strengths**

- “Learn this opening” already combines opening recall, a structure question, a plan question, linked board decisions, and a different opponent reply. Extend this flow rather than adding another competing workspace.
- The Vienna transfer exercise changes the timing of `...Nxc3`, then asks for `dxc3` instead of the earlier `bxc3`. This provides a concrete reason to adapt a plan.
- Unlisted legal moves in linked decisions are explicitly ungraded. Preserve that distinction.
- “Play from here” and “Return to lesson” make practical exploration reversible. Saved game-review positions already have notes and a related-lesson link.
- The interface distinguishes lesson completion from reliability through spaced recall. Keep that distinction while improving its presentation.

**Prioritized changes**

P1 means a material obstacle to the requested learning goal or trust in the result. P2 means a useful improvement after the core path works. Effort is a relative implementation/content estimate, not a delivery commitment.

| Priority | Finding and evidence | Concrete change | Acceptance criterion | Effort |
| --- | --- | --- | --- | --- |
| P1 | After completing Vienna, I opened “Time the f-pawn break,” answered nothing, and pressed “Complete & continue.” Today reported “2 activities completed.” | Enable completion only after that activity's required checkpoints have been submitted. Keep “Skip for today” and save/resume available. Derive completion from the activity result, not just a navigation button. | An untouched activity cannot increment completed activities; skipped and partial work have distinct recap states. A completed checkpoint need not require a perfect score. | Small–medium |
| P1 | No endgame continuation appeared in the Vienna summary. Repertoire presents openings, plans, and tactics; Basic Endgames separately starts with king opposition. | Extend connected lessons with an exchange decision and a related endgame checkpoint. Show the actual continuation, or label a separate model-game example explicitly. Explain which structural features survive the exchanges. | From an opening lesson, the learner can reach a related ending without navigating through a general course menu, and can explain one trade decision and one endgame objective. | Large; mostly authored chess content |
| P1 | `6.Bc4` in the Vienna linked decision returned the bishop to f1 and said it was a legal but ungraded alternative. “Analyse position” evaluated the original position and suggested `d4`, while the lesson revealed `Be2`. | Add “Explore my move” with an isolated variation, “Compare with lesson move,” and “Return to checkpoint.” Show the best reply to each candidate and the positional tradeoff. Label engine recommendations separately from the lesson's illustrative move. | The learner can compare Bc4, Be2, and an engine candidate from the same starting position; exploration preserves lesson progress and does not imply that an unlisted move is bad. | Medium–large |
| P1 | Deep preferences persisted, but questions contrasted development and castling with obviously poor plans. Basic Endgames displayed the exact move `Ke4` before an answer. | Add an intermediate task mode: move first, explain the idea, predict the opponent's reply, then see feedback. Use plausible alternatives of similar wording/length. Place explicit move instructions behind a hint or in a clearly labeled demonstration. Offer a short diagnostic to skip familiar material. | A learner can attempt the task without seeing the answer; success requires reasoning about this position. Deep mode produces visibly different task demands. | Medium–large |
| P1 | After the synthetic PGN reached `5...Be7`, Review said “Your move created the first gap” at `6.Bc4` and created “Recall the repertoire move before 6.Bc4.” The stored main line ends at `5...Be7`. | Distinguish “outside stored coverage,” “different from your selected line,” and “evaluated mistake.” For exhausted coverage, say “You reached the end of this line—choose a middlegame plan.” Reuse the existing related-lesson link and add a relevant checkpoint link. | Continuing beyond the final stored move never creates an unsupported recall-error framing. Any mistake label requires separate chess evidence. | Medium |
| P2 | The repertoire “map” shows opening cards, line lists, and theme labels, but no visual comparison of resulting structures. | Add a structure overview within each opening: pawn-only thumbnail, key breaks, useful piece squares, opponent's counterplay, typical exchanges, and related endings. Connect lines reaching the same position or a related structure; distinguish exact transpositions from structural similarity. | The learner can answer “Which other lines lead to this structure?” and “What changes if this pawn is exchanged?” directly from the opening page. | Large |
| P2 | The completed Vienna lesson led into general ungraded Stockfish play, without a visible bounded learning objective or post-exercise explanation in that view. | Add a short scenario: “Prepare the central break while answering threats,” with a fixed move limit, varied opponent replies, and a recap of the key decision. Keep free play available. | The exercise ends with feedback about the practiced idea and offers a retry against a different reply, rather than requiring a full game to finish practice. | Medium–large |
| P2 | The recap used “Opening move 3” for `2.Nc3`. An analysed/revealed checkpoint still said “Correct first answer · hint · revealed.” Analysis also revealed the authored candidate immediately. | Use normal move notation and action-oriented results: “2.Nc3: review why the f-pawn stays free”; “Be2: completed with analysis.” Separate independent success, assisted completion, and needs review. Label analysis as assisted before entry and reveal only the help requested. | A learner can identify the exact move and why it needs review without translating half-move indexes. Assisted answers are never visually presented as independent success. | Small–medium |
| P2 | The daily bar said about 4 minutes for a lesson labeled 10–15 minutes; Apply said 3 minutes while its activity showed 5. At 1280 × 720 the fixed bar overlapped the lower lesson area and competed with local controls. | Use one content-based estimate or schedule an explicit subset of checkpoints. Reserve layout space for session controls and make the current lesson action the primary control. | All surfaces agree about scope and estimate; active prompt, feedback, and action remain readable without a floating control covering them. | Small–medium |

There is also a small accessibility fix within alternative-move handling: the board announces “That move is unavailable” while lesson feedback says the move is legal but outside the authored continuation. Return a structured move outcome so visual and announced feedback agree about legality, grading, and whether exploration is available.

**A concrete first content slice**

Build one complete Caro-Kann journey before expanding the opening catalog. The existing lesson already introduces bishop activity, development, and the `...c5` break; that makes it a suitable starting point.

1. **Recognize the position.** Reach the current model position. Ask the player to identify White's central space, the bishop's safety, and the pawn break Black wants to prepare. Highlight relevant squares after the answer.
2. **Compare plans.** Present two plausible development sequences and ask what must be ready before `...c5`. Have the player choose a move and anticipate White's strongest response. Author and verify the comparison from the exact position.
3. **Explain the transformation.** Continue through central exchanges. Display before/after pawn diagrams and ask which pawn or square became a target. Keep the real legal move sequence available.
4. **Connect strategy to tactics.** Use a verified continuation where a forcing reply either enables the plan or makes the immediate break premature. Ask for a short calculation before showing the explanation.
5. **Choose an exchange.** Compare keeping major pieces with a specific simplification from an annotated continuation. Ask whose king, pawn weaknesses, and piece activity benefit. Avoid teaching a universal “trade into this ending” rule.
6. **Play the resulting ending.** Start a short rook- or minor-piece-ending exercise from that continuation. Give a concrete objective tied to the surviving structure, such as activating a piece while defending a weak pawn. If this uses a different model game, show the source and explicitly identify the jump.
7. **Recall and transfer.** Review a changed version later: same structural idea, different piece placement or move order. Ask whether the original plan still works and why.

Proposed opening-page action sequence: **Learn the structure → Compare plans → Calculate the critical reply → Choose the exchange → Play the ending**. Each stage should reopen its exact board position. The existing connected lesson should contain this sequence, with optional line exploration beside it.

**Reproduction details and implementation pointers**

- Completion bypass: Today → Start session → complete Vienna → “Time the f-pawn break” → press “Complete & continue” before choosing a plan. See `src/features/guided/DailySessionBar.tsx:10`, `src/App.tsx:438`, and `src/domain/repertoire/dailySessions.ts:47`. The observed issue concerns activity-completion reporting; this test did not establish undeserved mastery credit.
- Alternative comparison: Vienna model position after `1.e4 e5 2.Nc3 Nf6 3.f4 d5 4.fxe5 Nxe4 5.Nf3 Be7` → pass structure/plan questions → play `Bc4` → Analyse position. Observed engine result: `d4`, White evaluation `0.34`, depth 8. This is recorded UI evidence, not a claim of definitive move quality. See `src/features/connected/ConnectedLessonWorkspace.tsx:195` and `src/components/ChessBoardUI.tsx:52`.
- Recap wording and assistance: `src/features/connected/ConnectedLessonWorkspace.tsx:188`. Explicit endgame instructions: `src/features/curriculum/studyPositions.ts:29`.
- Timing: estimates are allocated from duration budgets in `src/domain/repertoire/dailySessions.ts:6`; the connected lesson header uses a fixed 10–15 minute label. Session-bar placement: `src/styles.css:1159`.
- Review input: `1. e4 e5 2. Nc3 Nf6 3. f4 d5 4. fxe5 Nxe4 5. Nf3 Be7 6. Bc4 O-O 7. O-O Nxc3 8. dxc3 *`. See stored line in `src/data/repertoires.ts:99`, matching logic in `src/domain/repertoire/pgn.ts`, and gap messaging in `src/App.tsx:1002`.
- Connected content and stages: `src/data/connectedLessons.ts` and `src/features/connected/types.ts`. Repertoire entry points: `src/features/guided/RepertoireMap.tsx`. These are the natural extension points for the connected ending and structure overview.

**Delivery order and validation**

First fix completion integrity, coverage language, move-feedback consistency, assistance labeling, and timing/layout. Then deliver candidate comparison and one complete Caro-Kann journey with intermediate questions. Expand the structure overview and additional endings after the first journey demonstrates value.

Validate with 5–6 real intermediate players, recording their rating source and experience rather than treating all ratings as equivalent. Give them an unfamiliar line, ask them to explain its pawn break, choose between plausible moves, handle a changed reply, and select an exchange leading to an ending. Observe wrong turns, hints, explanations, and confidence. Repeat a changed position after a delay to distinguish retention and transfer from immediate recall.

Suggested acceptance targets for that next study: at least 4 of 5 players independently find the related ending, explain one structural reason for their plan, and identify whether a deviation is uncovered content or an actual mistake. These are proposed release targets, not results of this walkthrough. Use meaningful regression tests for the confirmed completion and coverage bugs; assess teaching quality with chess-content review and observed learner reasoning.
