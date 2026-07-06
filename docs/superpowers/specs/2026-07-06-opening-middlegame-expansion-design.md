# Opening Middlegame Expansion Design

## Goal

Expand the opening trainer so beginners can learn a small set of reliable opening families through early middlegame plans, with optional theory-heavy branches that build on the same ideas.

The default experience should stay beginner-friendly: the learner first sees a principled main line, the plan behind it, common mistakes, and a clear middlegame target. More theoretical lines should be available as an optional next layer rather than mixed into the first lesson path.

## Current Context

The app is a Vite, React, and TypeScript chess trainer. Opening content is currently static data in `src/data/repertoires.ts`, using `RepertoireLine` objects from `src/features/openings/types.ts`.

The existing trainer already supports:

- White and Black repertoire lines.
- SAN move sequences.
- Theme tags and theme filtering.
- Move-level explanations.
- Common mistake notes.
- PGN review detection against repertoire history.

The current starter repertoire has four short lines:

- Vienna Game: Main Development.
- London System: Solid Setup.
- Sicilian Defense: Open Sicilian Start.
- Caro-Kann: Classical Development.

## User Direction

The expansion should be beginner-friendly by default, with the option for theory-heavy ideas that build on top. This means content should form a ladder:

1. Learn a clear beginner version of the opening.
2. Reach a recognizable early middlegame structure.
3. Understand the main plans and pitfalls.
4. Optionally explore sharper or more theoretical branches from that foundation.

## Data Model

Extend `RepertoireLine` with optional fields so all existing lines remain valid:

- `difficulty?: 'beginner' | 'theory'`
- `parentLineId?: string`
- `middlegameIdeas?: RepertoireMiddlegameIdea[]`
- `modelPositionPly?: number`

Add a new `RepertoireMiddlegameIdea` type:

- `title: string`
- `summary: string`
- `planMoves?: string[]`
- `themes: string[]`
- `warning?: string`

`difficulty` lets the UI and recommendation logic keep beginner content prominent. `parentLineId` links a theory branch to the beginner line it builds from. `middlegameIdeas` gives each line one to three short plan cards. `modelPositionPly` marks the ply where memorized opening play should turn into planning.

## Content Scope

The first implementation should deepen the existing four opening families instead of adding unrelated openings.

### White Repertoire

Vienna Game:

- Extend the beginner line into a natural middlegame plan with development, kingside pressure, and central awareness.
- Add optional theory branches such as a Vienna Gambit idea and a copycat variation response.
- Emphasize when f4 is active and when it overextends White.

London System:

- Extend the beginner line toward a complete setup with c3, Nbd2, Bd3, castling, and a choice of e4 or Ne5 plans.
- Add optional theory branches against early c5 or Qb6 pressure.
- Emphasize bishop placement, pawn-chain stability, and when the center break is ready.

### Black Repertoire

Sicilian Defense:

- Extend the beginner Open Sicilian line into development, c-file counterplay, and king safety.
- Add optional theory branches inspired by Dragon-style or Najdorf-style ideas without requiring exhaustive memorization.
- Emphasize why Black accepts asymmetry and how to avoid falling behind in development.

Caro-Kann:

- Extend the beginner Classical line into a solid middlegame structure with light-square development and timely e6/c5 ideas.
- Add optional theory branches for Advance and Panov-style structures.
- Emphasize the difference between solid development and passive development.

## UI Behavior

The Openings dock should keep its current beginner workflow. Add small, practical enhancements:

- Display a compact difficulty badge for each selected line.
- Keep beginner lines first in the selector.
- Show theory lines as linked options that build from the active beginner line.
- Add a "Middlegame ideas" section after the move strip and before the detailed lesson card.
- Show one to three plan cards with plan themes, short summaries, and warnings where useful.

The UI should not become a theory browser. A beginner who presses "Start learning" should still land on a simple first line and see a clear next move.

## Training Flow

For beginner lines:

1. Show the opening idea.
2. Train the move sequence.
3. At the model position, show middlegame ideas.
4. Encourage the learner to name a plan before asking the engine.

For theory lines:

1. Make the parent line visible.
2. Explain what problem the branch solves.
3. Keep explanations tactical or structural, not encyclopedic.
4. Avoid adding branches that cannot be tied to a beginner plan.

## Validation And Error Handling

Add data-focused tests to keep the static repertoire reliable:

- Every `movesSan` sequence should be legal when played from the starting position with `chess.js`.
- Every `parentLineId` should reference an existing line.
- Every theory line should have `parentLineId`.
- Every beginner line should have at least one `middlegameIdeas` entry.
- Every `modelPositionPly`, if present, should be within the move sequence length.

Existing trainer behavior should remain unchanged for lines that omit the new optional fields.

## Testing

Update or add tests for:

- Repertoire metadata validation.
- Optional theory branches linked to beginner parents.
- UI rendering of beginner/default lines and theory options.
- UI rendering of middlegame idea cards for the selected line.
- Existing opening trainer behavior so correct and incorrect move handling stays stable.

Run:

```powershell
pnpm test
pnpm build
```

## Non-Goals

This work will not:

- Build a complete opening database.
- Add engine-generated repertoire recommendations.
- Add user-authored custom repertoire editing.
- Require theory branches for every possible opponent reply.
- Replace the existing curriculum system.

## Implementation Readiness

The design is intentionally incremental. The first implementation can add the optional types, content, and validation tests, then make a small UI pass to expose difficulty and middlegame ideas. More theory branches can be added later without changing the core model again.
