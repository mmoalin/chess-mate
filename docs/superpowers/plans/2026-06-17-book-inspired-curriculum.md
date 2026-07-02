# Book-Inspired Chess Curriculum Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a book-inspired curriculum layer to the chess opening trainer so users learn plans, themes, endgames, and review habits alongside memorized repertoire moves.

**Architecture:** Keep copyrighted book content out of the app. Use famous chess books as inspiration for original lesson structures, theme tags, quizzes, and training workflows. The curriculum layer should sit above the existing board, GameManager, OpeningTrainer, EngineService, and Supabase persistence services.

**Tech Stack:** Vite, React, TypeScript, chess.js, react-chessboard, Stockfish worker, Supabase, Vitest, React Testing Library.

---

## Summary

The app should evolve from an opening memorizer into a full training companion. The next roadmap should add structured study paths inspired by well-known chess teaching traditions:

- Nimzowitsch-style strategic themes.
- Silman-style imbalance evaluation.
- Yusupov-style lesson, drill, test progression.
- Chernev-style move-by-move explanations.
- Silman/endgame-manual-style level-based endgame practice.
- Dvoretsky-style candidate-move and calculation discipline.

Do not copy book text, diagrams, exercises, annotations, or exact chapter material. Create original explanations, original exercises, and public-domain or user-supplied positions where needed.

## Source-Inspired Training Concepts

### Aron Nimzowitsch, *My System*

Use as inspiration for strategic theme tagging and position diagnosis.

Training concepts:

- Center control.
- Open files.
- Seventh-rank activity.
- Passed pawns.
- Pins.
- Discovered attacks.
- Exchanges.
- Pawn chains.
- Blockade and prophylaxis.

App features:

- Add strategic theme tags to repertoire lines and review positions.
- Add a “Find the Strategic Theme” quiz type.
- Add position review prompts such as “Which file should you occupy?” or “Which pawn chain break matters?”

### Jeremy Silman, *How to Reassess Your Chess* and Related Work

Use as inspiration for post-position imbalance analysis.

Training concepts:

- Material.
- Minor piece quality.
- Pawn structure.
- Space.
- King safety.
- Open files and weak squares.
- Initiative.
- Static versus dynamic advantages.

App features:

- Add an imbalance checklist to game review mode.
- Add a “Choose the Plan” quiz after opening lines.
- Add automated tags for common structures such as isolated queen pawn, hanging pawns, Carlsbad structure, and fianchetto weaknesses.

### Jeremy Silman, *Silman's Complete Endgame Course*

Use as inspiration for level-based endgame progression.

Training concepts:

- Beginner essentials first.
- Practical endgames by rating band.
- Endgames connected to the user's current level.

App features:

- Add an “Endgame Bridge” section linked to openings.
- Recommend endgame drills based on openings studied.
- Track endgame mastery separately from opening memorization.

### Artur Yusupov Training Series

Use as inspiration for structured lesson modules.

Training concepts:

- Lesson.
- Demonstration positions.
- Exercises.
- Scored tests.
- Gradual progression across tactics, strategy, calculation, and endgames.

App features:

- Add curriculum modules with the shape: Learn, Drill, Test, Review.
- Add scores and pass thresholds.
- Add spaced repetition for failed test positions.

### Irving Chernev, *Logical Chess: Move by Move*

Use as inspiration for simple explanations after every move.

Training concepts:

- Explain why each move was played.
- Connect moves to principles.
- Make classic games understandable to club players.

App features:

- Add “Why this move?” explanation cards for repertoire moves.
- Add “Every Move Explained” mode for annotated model games.
- Add short principle labels such as develop, castle, contest center, improve worst piece, create threat.

### Dvoretsky-Style Training

Use as inspiration for calculation-first workflows.

Training concepts:

- Candidate moves.
- Variation calculation.
- Concrete evaluation.
- Delayed engine reveal.

App features:

- Add a calculation mode before engine analysis.
- Require users to enter candidate moves before Stockfish output appears.
- Compare the user’s candidate line against the engine line and game continuation.

## Feature Roadmap

### Phase 1: Curriculum Data Model

- [x] Define a `CurriculumModule` type with `id`, `title`, `level`, `sourceInspiration`, `themes`, `lessonSummary`, `tasks`, and `completionCriteria`.
- [x] Define task types: `explain-move`, `find-theme`, `choose-plan`, `calculate-line`, `endgame-drill`, and `model-game`.
- [x] Add original starter modules for opening principles, pawn chains, open files, imbalances, and basic endgames.
- [x] Store user progress in Supabase by module, task, score, attempts, and last reviewed date.

### Phase 2: Strategic Theme Tags

- [x] Add reusable theme tags to opening repertoire lines.
- [x] Show tags in the opening trainer panel.
- [x] Add a theme filter so users can train only lines involving a selected concept.
- [ ] Add “theme mastery” metrics to the progress dashboard.

### Phase 3: Move Explanation Cards

- [x] Add optional explanation metadata to repertoire moves.
- [x] Display a short “Why this move?” panel after correct moves.
- [x] Display a “Common mistake” panel after incorrect moves.
- [x] Keep all explanations original and concise.

### Phase 4: Imbalance Review

- [ ] Add an imbalance checklist to game review mode.
- [ ] Let users mark the most important imbalance before seeing engine analysis.
- [ ] Save imbalance selections with reviewed games.
- [ ] Show recurring weaknesses such as king safety, bad bishop, weak squares, or poor pawn breaks.

### Phase 5: Book-Style Quizzes

- [ ] Add quiz screens for original positions.
- [ ] Support multiple-choice plan questions.
- [ ] Support board-based best-move questions.
- [ ] Support calculation-line input before engine reveal.
- [ ] Add pass/fail scoring and retry queues.

### Phase 6: Endgame Bridge

- [ ] Map openings to likely endgame themes.
- [ ] Add starter endgame drills for king and pawn, rook activity, opposition, passed pawns, and basic rook endings.
- [ ] Recommend endgame drills after users complete related opening modules.
- [ ] Track endgame progress separately from opening line progress.

### Phase 7: Annotated Model Games

- [ ] Add model game support using public-domain PGNs or user-imported PGNs.
- [ ] Add original move explanations and theme tags.
- [ ] Let users step through model games using the existing board and move list.
- [ ] Add “pause and predict” moments where the user must choose a plan or move.

## Suggested Starter Modules

### Opening Principles

- Develop pieces toward the center.
- Castle before opening the position.
- Avoid moving the same piece repeatedly without a reason.
- Connect opening moves to concrete threats.

### Pawn Chains

- Identify the base and head of a pawn chain.
- Choose the correct pawn break.
- Recognize French Defense and King's Indian style structures.

### Open Files

- Identify files likely to open.
- Place rooks on useful files.
- Use open files to invade the seventh rank.

### Imbalances

- Compare bishops and knights.
- Identify weak squares.
- Decide whether to trade or preserve pieces.
- Build a plan from the position's main imbalance.

### Calculation

- List candidate moves.
- Calculate forcing lines first.
- Evaluate the final position before moving.
- Compare human candidate lines to engine recommendations.

### Endgame Essentials

- Opposition.
- Outside passed pawns.
- Rook activity.
- King activity.
- Converting extra pawns.

## Copyright And Content Rules

- Do not copy book prose.
- Do not reproduce copyrighted diagrams or exercise sets.
- Do not import positions directly from copyrighted books unless the position is independently public-domain or user-supplied.
- It is acceptable to use broad chess concepts, teaching structures, and public-domain games.
- Use source labels as inspiration only, such as “inspired by imbalance-based training,” not as copied chapter content.

## Testing Plan

- Unit test curriculum module validation.
- Unit test theme filtering and module completion calculations.
- Unit test Supabase mappers for curriculum progress.
- Component test lesson, drill, test, and review states.
- Component test explanation cards for correct and incorrect opening moves.
- Integration test: complete a module, miss a quiz, confirm it appears in the review queue.
- Integration test: review a game, select imbalances, save progress, and reload.

## Priority Recommendation

Implement in this order:

1. Strategic theme tags.
2. Move explanation cards.
3. Curriculum module data model.
4. Book-style quizzes.
5. Imbalance review.
6. Endgame bridge.
7. Annotated model games.

This order gives users immediate learning value while keeping the app's core opening-trainer experience stable.
