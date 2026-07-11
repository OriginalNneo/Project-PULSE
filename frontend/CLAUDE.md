# CLAUDE.md — frontend/

## Context
This is Project PULSE, a monorepo (Node/Express backend + Next.js frontend
in one repo, not separate packages). `frontend/` is the Next.js 14 (App
Router) + React 18 + TypeScript site — all four public tabs (Chat, CPF
Portal, Officer Dashboard, Text Us Demo), plus the landing page and a
handful of non-nav pages (`correspondence`, `login`, `proxy`, `settings`).
"Dashboard" is just one tab's folder name (`/dashboard`), not the whole
app — don't conflate the two.

The backend (Express gateway, 9 microservices, OpenClaw multi-agent
system, SQLite + MongoDB) is already built and working end-to-end via a
live Telegram bot integration. I'm only doing UI/UX work on `frontend/`
right now.

For backend/architecture context, read `../AGENTS.md`, `../CONTEXT.md`,
and `../README.md` at the repo root — don't restate or re-derive that
information here. If anything in this file ever conflicts with those
root docs, stop and flag it to me rather than silently picking one.

## Ownership boundaries
- I own: `frontend/` only.
- Do NOT edit anything outside `frontend/` (`src/`, `data/`, `deploy/`,
  `scripts/`, root config) — read it for context (API contracts, response
  shapes, env vars) but never modify it.
- If a task seems to require a backend change (new endpoint, changed
  response shape, etc.), stop and tell me instead of making the change
  yourself.

## Before writing code
- Always read existing code in the area you're about to touch before
  writing anything new. Match existing naming, file structure, and
  formatting conventions exactly.
- If wiring a page to a backend endpoint, check how a neighboring page
  already does it first (fetch calls, error handling, response parsing)
  and mirror that pattern rather than inventing a new one.
- For any non-trivial task, give me a short plan (files touched,
  approach) before writing code. Wait for confirmation.

## Code style
- No new dependencies unless I explicitly approve them. Use what's
  already in `frontend/package.json`.
- This project does not use Tailwind or a component library — styling is
  inline `style={{}}` objects plus `globals.css` and occasional
  component-scoped `.css` files (e.g. `DotField.css`). Match that
  pattern; don't introduce Tailwind, CSS-in-JS libraries, or a new
  styling system on the spot.
- No new state management patterns, folder structures, or abstractions
  invented on the spot — extend what exists.
- Comment only non-obvious logic. No comment-per-line, no restating what
  the code already says.
- Keep diffs surgical: don't rename, reformat, or "clean up" files or
  code outside the scope of the current task.
- Match existing TypeScript/React conventions in the file you're editing
  (function vs arrow components, named vs default exports) — check a
  neighboring file before deciding.

## Avoiding conflicts / contradictions
- This work happens on the `UI_Frontend` branch, which has already
  diverged from `main`'s `frontend/`. Don't assume `main`'s current
  frontend state reflects what's here, and don't "fix" divergences
  between the two branches on your own — that's a merge decision, not a
  coding one.
- Keep changes scoped and mergeable: don't rename routes/files, move
  components between folders, or restructure shared pieces unless the
  task specifically calls for it. Unnecessary structural changes are
  exactly what turns a later merge into `main` into a conflict mess.
- Don't create a second implementation of something that already exists
  for a tab (e.g. a duplicate page, a parallel version of a shared
  component) — extend the existing one.
- If you notice this file contradicts itself, or contradicts an
  instruction I give you in chat, point it out instead of guessing which
  one wins.

## Environment / secrets
- Never hardcode API base URLs, keys, or endpoints — use environment
  variables, matching whatever `.env` pattern already exists in
  `frontend/`.
- Never commit `.env` files or print their contents.

## When unsure
- If you're not sure whether something is in scope, ask rather than
  guessing.
- If you find messy/inconsistent code while working, don't fix it
  silently — flag it to me and let me decide.
