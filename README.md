# Chess Opening Trainer

A Vite + React + TypeScript chess training app focused on opening repertoires for White and Black. It includes a shared board, a `chess.js` game manager, built-in starter lines, Stockfish-backed analysis/play, PGN review, and Supabase progress sync.

## Run Locally

```powershell
pnpm install
pnpm dev
```

If `node` and `pnpm` are not on PATH in Codex Desktop, use the bundled Node runtime shown by the workspace dependencies tool.

## Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Without these variables, the app still runs, but account sync is disabled and the login panel explains what is missing.

## Modes

- Openings: train built-in White and Black repertoire lines.
- Review: paste PGN, load it, and step through replay positions.
- Play: make moves against the Stockfish worker.

## Verification

```powershell
pnpm test
pnpm build
```
