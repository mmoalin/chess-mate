# Chess Opening Trainer

A browser-based chess learning app focused on opening preparation, short strategic lessons, and game review. It combines an interactive `chess.js` board, built-in White and Black repertoires, a guided curriculum, local Stockfish analysis, PGN review, adaptive practice, and optional Supabase progress sync.

## Features

### Connected opening, middlegame and endgame lessons

- Choose **Learn this opening** for Vienna as White or Caro-Kann as Black.
- Replay the opening or recall your own moves, identify the structure, choose a plan, and play linked decisions with authored opponent replies.
- Rewind explicitly to test a different opponent reply, then review your first answers and assistance used.
- In Standard or Deep mode, choose a move, explain its purpose, and predict a legal reply before seeing feedback. A short diagnostic offers an exact decision without repeating the full lesson.
- Explore an alternative on an isolated board and compare it with the lesson example and local Stockfish suggestion. Replay each candidate's replies, then return to the unchanged checkpoint.
- Follow optional Caro-Kann and Vienna journeys through central exchanges, pawn transformations, rook activity, and king endings. These are explicitly labelled authored training examples; before/after pawn diagrams and exact checkpoint reviews connect the ideas.
- Caro-Kann also offers **Follow this position into an ending**: six decisions on one continuous, annotated line from the main lesson’s `…c5` to a rook ending. Compare alternatives, explain structural choices and predict strong replies, with separate feedback for each component. Replay every connecting move, resume saved answers and practise two-minute checkpoints through Today. The original separate endgame exercises remain available.
- Practise a four-move plan against local Stockfish, retain your continuation and reflection, or use unrestricted **Play from here**. **Return to lesson** restores the original summary position.
- Sessions save locally, resume after refresh, and sync when signed in. Today prioritizes unfinished lessons and exact due checkpoints.
- Only the first graded answer at each checkpoint per run affects mastery. Retries remain practice; unlisted legal moves are ungraded, and reveals do not earn mastery credit.

Connected content uses schema version 3. Apply `202609090001_connected_lessons.sql` before deploying this version. Older releases remain readable and receive the compatible bundled lessons; draft saving and publishing persist the full version-3 content. No existing progress is reset.

The usability update adds optional JSON fields to that schema; it needs no additional migration. See [implementation coverage and validation](docs/usability-implementation-2026-09-12.md) for the review backlog, content boundaries, and checks.

### Opening training

- Practice complete repertoire lines for White or Black on an interactive drag-and-drop board.
- Validate every move against the selected line and receive immediate correct/incorrect feedback.
- Follow move-by-move progress, or click any repertoire move to display the resulting position.
- Switch automatically between White and Black board orientation.
- Filter lines by themes including development, initiative, king safety, pawn chains, open files, weak squares, and counterplay.
- Learn with move explanations, common-mistake guidance, strategic summaries, hints, and move reveals.
- Explore optional theory branches after learning their beginner parent lines.
- Compare pawn structures, breaks, piece placement, counterplay, exchanges and related endings from each opening's structure guide. Related lines distinguish identical positions from shared pawn layouts.
- Study practical middlegame plans, candidate continuations, and warnings for each repertoire.
- Drill critical positions from supplied FENs with position-specific feedback.
- Turn opening mistakes into due review items and track recurring weak themes.

The starter repertoire contains 12 lines covering:

- Alien Gambit plans for White and defensive responses for Black.
- Vienna Game and Vienna Gambit.
- London System and the `...Qb6` branch.
- Open Sicilian and Sicilian Dragon.
- Classical Caro-Kann and Caro-Kann Advance.

### Guided study path

The Study workspace contains six curriculum modules with three interactive tasks per module:

- Opening Principles
- Pawn Chains
- Open Files
- Imbalances
- Basic Endgames
- Alien Gambit Mastery

Lessons include explaining moves, finding themes, choosing plans, calculating lines, studying model games, and solving endgame decisions. Each module provides hints, teaching points, answer feedback, retries, task scores, attempt counts, completion requirements, and a progress bar. Later tasks unlock after the current task is passed.

### Game review

- Paste and import standard PGN.
- Replay games with previous/next controls or by clicking moves in the history drawer.
- Detect the closest built-in opening and report how long the game remained in the repertoire.
- Distinguish a deviation from the stored repertoire from reaching the end of its coverage. Uncovered continuation links to a middlegame plan without creating an unsupported recall error; a line difference is not automatically an evaluated mistake.
- Copy the current game as PGN for use in another chess tool.

### Stockfish tools

- Analyze the current position and display search depth, evaluation, and best move.
- Play a complete training game against Stockfish with automatic engine replies.
- Start a dedicated Alien Gambit engine-practice game.
- Run Stockfish locally in a web worker without an external engine service.

### Progress and recommendations

- A resumable 5, 10, or 20-minute daily routine that moves through due review, focused learning, practical application, and a recap.
- Stable daily activity targets that reopen exact lesson checkpoints, opening units, Study tasks, tactics, Plan Labs, and saved positions.
- Activity completion requires its result; untouched work cannot count as completed. Recaps distinguish completed, partial and skipped activities, while short sessions schedule focused checkpoints with consistent time estimates.
- Seven-day activity and separate recall, understanding, and tactics progress, with editable goals, depth, duration, and opening selections.
- Beginner onboarding built around a focused ten-minute study routine.
- Recommended next activities based on learner setup and due reviews.
- A Today dashboard with the next lesson, due-review count, mastered-line count, daily target, and weak themes.
- Local tracking of correct moves, mistakes, streaks, current line position, theme weaknesses, and mastery state.
- Critical-position tracking with attempts, correct answers, mistake themes, mastery scores, and future review dates.
- Shorter review intervals after errors and longer intervals after successful critical-position practice.

### Accounts and cloud sync

- Register, sign in, and sign out with email and password through Supabase Auth.
- Save opening-training and critical-position progress when signed in.
- Database support for profiles, repertoire progress, curriculum progress, position mastery, and preferences.
- Row-level security policies that restrict learners to their own records.
- Continue using the app locally when Supabase is not configured.

Curriculum progress, daily sessions, and training preferences persist locally for guests and sync for signed-in learners. Apply `202609120001_daily_sessions.sql` after the connected-lessons migration before deploying this version.

### Board and interface

- Legal chess movement, castling, en passant, notation, game-over detection, and promotion support.
- Legal-piece and last-move highlighting, plus arrow drawing.
- Collapsible move-history drawer and one-click board reset.
- Live feedback and analysis shared across all workflows.
- Three primary workspaces: **Openings**, **Study**, and **Review**.
- Responsive two-column layout that collapses to one column on smaller screens.

Drag-and-drop promotions currently default to a queen.

## Run Locally

```powershell
pnpm install
pnpm dev
```

If `node` and `pnpm` are not on PATH in Codex Desktop, use the bundled Node runtime shown by the workspace dependencies tool.

## Supabase

1. Create a Supabase project.
2. Apply every file in `supabase/migrations` in filename order (or run `supabase db push`). The migrations include the learner progress tables, versioned repertoire content, and Plan Lab content.
3. Add the first content editor manually with `insert into public.content_editors (user_id) values ('<AUTH_USER_UUID>');`.
4. Copy `.env.example` to `.env.local`.
5. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

`supabase/schema.sql` remains a convenient base-schema reference for manual setup, but deployments should use the migrations so tables such as `public.training_progress` are not skipped.

Without these variables, the app still runs, but account sync is disabled and the login panel explains what is missing.

## Verification

```powershell
pnpm test
pnpm build
```
