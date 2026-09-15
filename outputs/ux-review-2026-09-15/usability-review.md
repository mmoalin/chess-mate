# Chess Opening Trainer — usability and fitness review

**Reviewed:** 15 September 2026 · **Verdict: fit with material limitations**

The app supports useful opening and strategic practice for learners who already know basic chess movement and notation. A complete daily routine, a full connected Caro-Kann lesson, Vienna line practice, PGN review, and local engine analysis all produced usable results. It is not yet dependable for moving between learning and an ongoing engine game: ordinary navigation can replace the game without a recovery path.

**Priorities:** one High and four Medium findings. Fix game continuity first, then opening-error recovery and resumed lesson feedback. Improve mobile space allocation and correct the progress metric before relying on these surfaces to communicate learning progress.

## Review brief and evidence limits

- **Application:** Chess Opening Trainer 0.1.0; repository commit `4c51c5e5b25928c903d8c3384826b17a5773dc68`. Local Vite development build, started with `pnpm dev --port 53291 --strictPort`.
- **Environment:** Windows; Codex in-app browser; desktop 1440 × 900, mobile-sized 390 × 844, and narrow 320 × 740 CSS-pixel viewports. Mobile tests used browser emulation dimensions, not a physical touchscreen.
- **Role/data:** fresh guest on `http://127.0.0.1:53291/`, default Foundation setup, disposable moves and notes. Earlier origins were inspected but already contained progress, so neither was used for the fresh-user results.
- **Documented purpose:** opening preparation, short strategic lessons, and game review, with local guest persistence and optional account sync. Source: [README](C:/Dev/CodexApps/chess/README.md).
- **Audience assumption:** beginner-to-club learners who can already play legal chess and interpret basic notation. Teaching the rules from zero was not assessed. This is an expert walkthrough, not research with human participants or a claim of product-market fit.
- **Success:** start useful practice, receive understandable feedback, correct an error, finish with an accurate recap, return to saved work, and review or play a game without losing its context.
- UI journeys were attempted before source inspection. Source was then used to explain observed behavior. No application code was changed. No new tests were written; unit-test/build results are not claimed as usability evidence.

## Strengths to preserve

1. **Low-friction guest entry.** Default onboarding needs one “Start learning” action; customisation is optional. The daily preview gives concrete activities and estimates.
2. **Meaningful connected practice.** The Caro-Kann lesson links recognition, planning, development, castling, a central break, and a different opponent reply. The tested sequence completed with a detailed checkpoint summary.
3. **Honest grading boundaries.** A wrong first answer followed by a correct retry remained “Needs review.” Exploration was labelled ungraded, and returning restored the original checkpoint. Completion is distinguished from spaced-review reliability.
4. **Useful game-review feedback.** Invalid PGN retained the board and offered a readable correction. A repertoire deviation was explicitly distinguished from an evaluated mistake. Stockfish found `Qh4#` in the known mate-in-one test and cleared its result when the replay position changed.
5. **Accessible board foundations.** Square controls expose coordinates and piece names. Enter, arrow keys, and Enter successfully played `f2–f4`; tap-to-move also worked. Connected question feedback received focus after submission. These checks do not establish screen-reader compatibility or standards conformance.

## Journey coverage

| Journey / user outcome | Success condition | Observed result | Outcome / evidence |
|---|---|---|---|
| First-use guest setup | Reach an understandable next activity without an account | Default Vienna/Caro-Kann setup led to an approximately eight-minute, two-activity routine | **Completed**; [first checkpoint](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/01-first-checkpoint.png) |
| Daily routine | Finish learning and application, then see a recap | Vienna question, Plan Lab recognition, `f4`, and `Nf3` completed; continuation was disabled until the activity result existed | **Completed with friction**; [recap](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/04-daily-recap.png), UXR-04/05 |
| Wrong answer and correction | Understand the error and retry without false mastery | Wrong Vienna answer gave teaching feedback; correction enabled completion; summary retained first-answer failure | **Completed** |
| Refresh during answered checkpoint | Restore the answer, explanation, and next action | Completion persisted, but choices became unselected/disabled and feedback reverted to “choose your answer” | **Completed with friction**; UXR-03 |
| Vienna line practice | Play the complete selected line | All ten half-moves completed; direct Train openings required playing both colours | **Completed with friction**; off-line path below |
| Off-line opening move | Recover and continue at the same point | `e3` and later `a3` were retained; Reveal could request a White move while it was Black’s turn | **Failed direct recovery; workaround verified**; UXR-02 |
| Full Black connected lesson | Link the opening to a plan and adapt to another reply | One Black recall move with automatic White reply; remaining opening replay skipped explicitly; both questions, eight main decisions, three alternative decisions completed. Summary: 14/14 independently correct for attempted checkpoints | **Completed**; [summary transcript](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/10-caro-kann-complete.txt) |
| Candidate exploration | Experiment without changing the graded position | Tried `Bh7` in the alternative position; Return restored the bishop to g6; subsequent `Bxd3` worked | **Completed**; engine comparison inside explorer not tested |
| Study task | Choose, receive feedback, correct, and record progress | Opening Principles task 3: wrong answer then correct answer; score 10/10 and module progress 33% | **Completed**; other module tasks not exhausted |
| PGN import, replay, export | Load known moves, navigate positions, retain usable PGN | Invalid input rejected; Fool’s Mate loaded; previous/next replay worked; history showed numbered plies; copied PGN retained headers, result, and moves | **Completed**; [invalid-input transcript](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/05-invalid-pgn.txt) |
| Review a repertoire difference | Reopen the exact decision and retain a reflection | `1. e4 e5 2. Nc3 Nf6 3. a3 *` produced a saved comparison before 3.a3; note survived refresh; Mark reviewed changed to Reopen for review | **Completed** |
| Local engine analysis | Give a correct, position-specific result | At `1. f3 e5 2. g4`, engine reported Black mate in one, `Qh4#`, depth 8; navigating cleared the old result | **Completed**; [analysis evidence](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/06-engine-mate-in-one.png) |
| Engine play and return | Receive a reply and retain the game after visiting Study | `1.e4` received `...d5`; visiting Study replaced the game; returning showed the Study position | **Failed continuity**; UXR-01. A complete engine game was not played |
| Mobile and keyboard use | Read the prompt and operate relevant controls | Keyboard and taps worked; connected lesson usable at 320px; daily Plan Lab compressed the board and task panel at 390px | **Completed with friction**; UXR-04 |
| Account sync | Authenticate and recover progress on another device | Only the labelled sign-in panel and empty-input disabled state inspected | **Not tested end to end**; no test account used |

## Prioritised findings

### UXR-01 — High: navigation replaces an ongoing engine game

**Affected context:** learners moving between an engine game and Study. **Confidence:** High; observed interaction, copied PGN, and source agree. Ranked first because an important ongoing outcome loses its working state through ordinary navigation.

**Reproduce**

1. Open Review → Play vs Stockfish. Play `e4`; wait for the reply. This run received `d5`.
2. Open Study, then Opening Principles → Choose the Safe Plan.
3. Return to Review.
4. Observe the Study position under the selected Play vs Stockfish controls. Copy PGN. Clicking Play vs Stockfish again resets to an empty game.

**Expected:** restore the engine game, its move history, side to move, and engine status.

**Observed:** exported PGN now contained a setup FEN for the Study position, with no `1.e4 d5` history:

`r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4`

**Evidence:** [screenshot](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/07-engine-game-replaced-by-study.png), [UI transcript](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/07-engine-game-replaced-by-study.txt). The app uses one [GameManager](C:/Dev/CodexApps/chess/src/App.tsx:56); entering Study [resets it](C:/Dev/CodexApps/chess/src/App.tsx:351). Review mode selection also [unconditionally resets the board](C:/Dev/CodexApps/chess/src/App.tsx:975).

**Impact/workaround:** the learner must reconstruct or restart the game. Copying PGN before leaving can preserve it externally, but the interface does not prompt that precaution. No UI recovery for the lost engine history was found.

**Improve:** keep separate persisted board/history state for engine play, PGN review, and Study. Switching workspaces should restore their state. Reset/New game should be a distinct intentional action; clicking the already-selected mode must be harmless.

**Acceptance checks**

- After at least three engine replies, visit Study, change tasks, visit Today, and return. FEN, PGN, player colour, turn, and history selection match the saved engine game.
- Repeat with an imported PGN and a selected replay ply.
- Refresh after returning and verify the same game. Clicking the active Play vs Stockfish control preserves it.
- If navigation interrupts an engine search, return resumes exactly one reply for the correct position.

### UXR-02 — Medium: an off-line move leaves recall practice without a direct retry

**Affected context:** users making a legal but unprepared move in Train openings. **Confidence:** High. This is ranked above presentation work because it interrupts the core practice loop.

**Reproduce:** select the Vienna line; play `e4 e5` (or display the position after e5); play `a3` instead of `Nc3`; wait for evaluation; click Reveal; attempt `b1–c3`.

**Expected:** clear choices to retry the original position or explore the deviation, with the next prompt matching the board.

**Observed:** `a3` stays on the board, the repertoire cursor still expects `Nc3`, and Reveal says “Play it on the board when you are ready.” It is Black’s turn, so the requested White move cannot be played. The first-move `e3` case behaved similarly. The displayed generic “Common mistake” text after a3 discussed early queen moves, which did not explain the move played.

**Evidence:** [Reveal and board screenshot](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/11-reveal-impossible-turn.png), [transcript](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/11-reveal-impossible-turn.txt), [first-move deviation](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/08-off-line-no-recovery.png). Moves are [applied before grading](C:/Dev/CodexApps/chess/src/App.tsx:723); the [deviation branch](C:/Dev/CodexApps/chess/src/App.tsx:809) does not restore the prior position.

**Workaround verified:** click the repertoire’s previous `e5` move to reconstruct that position, then play `Nc3`. Reset board also works but restarts the line. This recovery is not explained beside the feedback.

**Improve:** offer “Retry this move” beside the deviation feedback, restoring the exact pre-move position while preserving the recorded attempt. Offer exploration separately. Use move-specific teaching text when available.

**Acceptance:** after deviations at the first, middle, and last learner decision, one Retry action restores the correct turn and position; the expected move is legal and advances the line. Reveal never instructs an impossible move. Retrying does not erase the original graded result.

### UXR-03 — Medium: resumed checkpoints forget the displayed answer and explanation

**Affected context:** returning learners refreshing after submitting an answer, before continuing. **Confidence:** High.

**Reproduce:** in the first daily Vienna question, submit the wrong answer about recovering the e4 pawn; choose the central-space/king-safety answer and submit; refresh before Finish checkpoint.

**Expected:** show the submitted answer, its result/explanation, and the available continuation.

**Observed:** the checkpoint remains complete and can be finished, but all radio choices are disabled and unselected. Feedback says “Consider the position, then choose your answer.” This is a contradictory restored state, not loss of the recorded grade.

**Evidence:** [screenshot](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/02-resume-disabled-choices.png), [transcript](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/02-resume-disabled-choices.txt). [Feedback and selected choice initialise locally](C:/Dev/CodexApps/chess/src/features/connected/ConnectedLessonWorkspace.tsx:28), while [disabled/completed state comes from the saved session](C:/Dev/CodexApps/chess/src/features/connected/ConnectedLessonWorkspace.tsx:214).

**Impact/workaround:** learners can continue, but cannot tell which answer was accepted or recover its explanation on that screen. Finishing the checkpoint reaches the summary.

**Improve:** derive restored answer presentation from the saved attempt/checkpoint. Keep first-attempt grading separate from the most recent submitted answer. Tie feedback to its checkpoint so unrelated old feedback does not carry forward.

**Acceptance:** refresh and Save & leave/return after a wrong answer, corrected answer, first-time correct answer, and assisted answer. Restore the appropriate selection, explanation, assistance status, and next action without regrading or inviting interaction with disabled choices.

### UXR-04 — Medium: daily practice leaves little mobile space for the actual task

**Affected context:** daily Plan Lab at 390 × 844. **Confidence:** High for measurements and layout; Medium for the effect on human touch accuracy, which needs real-device testing.

**Observed:** the daily banner, board, feedback, and two rows of navigation occupy most of the screen. The board measures approximately 211px; a measured square was **26.375 × 26.375px**. The task panel occupies approximately the bottom 150px. After Next decision, that panel remained scrolled near its Hint/Reveal controls, requiring further scrolling to inspect the new explanation. A short prompt did remain visible in the separate feedback area.

**Evidence:** [mobile daily exercise](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/03-mobile-plan-board.png). The [daily board rule caps width at 25dvh](C:/Dev/CodexApps/chess/src/styles.css:1257). The separate [connected lesson layout](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/09-mobile-connected-feedback.png) was more usable in the tested 320px viewport and should inform the solution.

**Impact/workaround:** small targets and repeated panel scrolling increase effort during a repeated read–move–feedback loop. Taps and keyboard moves succeeded; this is not a claim that the layout blocks all mobile use or fails a named accessibility standard.

**Improve:** compact the daily controls and global navigation during a decision; give the board and current prompt priority. Reset the task panel to the new decision or focus its new prompt. Keep feedback and the next action together.

**Acceptance:** at 390 × 844 and 320 × 740, the current question is visible on entry and after each decision; answer feedback and continuation are reachable without hunting across multiple scroll regions. Use at least a 280px board at 390px width as a proposed product target, then validate it with touch users. No horizontal overflow, clipped controls, or unreachable content; keyboard focus remains visible. These are product checks, not a conformance certification.

### UXR-05 — Medium: “answers practised” counts a different thing from the recap

**Affected context:** learners assessing daily effort and progress. **Confidence:** High.

**Reproduce:** complete the fresh default routine: one Vienna checkpoint and three Plan Lab decisions, then read Today.

**Observed:** the recap reports **3/4 answers correct**, while the adjacent seven-day metric reports **2 answers practised**. The routine is the only prior activity on this fresh origin. The metric counts mastery-item dimensions with a recent `lastReviewedAt`, rather than answer events; multiple answers can contribute to one item.

**Evidence:** [both numbers in one screenshot](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15/04-daily-recap.png); [metric computation](C:/Dev/CodexApps/chess/src/features/guided/TodayPanel.tsx:15) and [display label](C:/Dev/CodexApps/chess/src/features/guided/TodayPanel.tsx:24).

**Impact:** users cannot reconcile the dashboard with the work they just completed and may suspect missing progress. The separate “reliable” explanation is helpful but does not explain this counter.

**Improve:** either count answer events with a stated policy for retries/assistance, or relabel this value as distinct skills/items practised and briefly explain its unit. Keep completion, answer volume, and spaced mastery separate.

**Acceptance:** the four-decision routine produces a reconciled dashboard and recap. Repeat one checkpoint: the chosen metric behaves consistently with its label. Verify retries, assistance, repeated work on the same day, and seven-day expiry using deterministic dates.

## Improvement sequence

| Order | Work | Dependency / rough effort |
|---|---|---|
| 1 | UXR-01: preserve each workspace’s game and feedback context | Medium–large: touches state, persistence, replay and engine cancellation. Verify before adding further cross-workspace links |
| 2 | UXR-02: direct retry from the exact pre-move position | Small–medium once position ownership is clear; cover both direct line practice and guided recall |
| 3 | UXR-03: restore answer presentation from saved results | Small–medium; may require storing the latest submitted answer separately from first-attempt grading |
| 4 | UXR-05: make the progress unit truthful | Small for relabelling; larger if introducing an event-based counter and migration |
| 5 | UXR-04: compact daily mobile controls and fix decision scroll reset | Medium; prototype against actual content at both tested widths and validate touch use |

Effort is relative implementation scope, not a calendar estimate. It assumes the current architecture and excludes broader design or content expansion.

## Fitness boundaries and smallest follow-ups

- **Local learning:** supported by completed practice journeys. The app is suitable for supervised/pilot use within the tested repertoire; resolve UXR-01 before treating engine play as a dependable companion to Study.
- **Learning effectiveness remains unproven.** The first default routine starts at a developed Vienna position and asks a question immediately. Whether this is enough context for the intended beginner is a hypothesis to test, not an observed participant failure. Run five short sessions with target learners: start unaided, explain the position, recover from one error, and say what to study next.
- **Two recall models need clearer intent.** Direct Train openings required both colours; connected Recall my moves automatically played the opponent. Check whether learners understand that distinction, and label the modes explicitly if both remain.
- **Mobile/accessibility:** keyboard board movement, labels, focus after connected answers, and narrow reflow were sampled. No screen reader, physical touch, browser text zoom, measured contrast audit, or comprehensive keyboard traversal was performed. Test the daily loop with a screen reader and a physical small-screen phone after the layout change.
- **Sync and backend reliability:** no account creation/sign-in, multi-device merge, expired session, disconnected network, failed write, or production environment was tested. Use a disposable authenticated account and two isolated browser profiles for the next persistence check.
- **Sampled content:** no exhaustive opening catalogue, all six Study modules, endgame connection journeys, independent explanation/prediction mode, engine comparison within exploration, or four-move sparring completion. No complete engine game or underpromotion was tested. The shared board currently chooses queen promotion in [source](C:/Dev/CodexApps/chess/src/components/ChessBoardUI.tsx:105); verify promotion choice before promising unrestricted endgame practice.
- **Coverage promise:** the preferences explicitly state that Black versus 1.d4 coverage is planned. The product should continue to make repertoire boundaries clear rather than imply comprehensive opening coverage.

## Evidence bundle

Screenshots and captured UI transcripts are saved beside this report in [the review output directory](C:/Dev/CodexApps/chess/outputs/ux-review-2026-09-15). All observed failures above have reproduction steps and linked evidence. The review produced files only; existing application source and pre-existing user artifacts were preserved.
