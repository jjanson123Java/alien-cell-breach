# Project State — Alien: Cell Breach

- Project type: Static HTML/CSS/JavaScript classroom game
- Version: 1.0.0
- Local folder: `C:\Users\jajanson\OneDrive - Cisco\Documents\ChatGPT\ATOVIBE`
- Last verified working copy: 2026-10-19
- Publication status: Source synced to private GitHub repository; game not deployed as a public website
- Repository: `https://github.com/jjanson123Java/alien-cell-breach`

## Current files

- `index.html` — semantic five-screen application shell
- `styles.css` — responsive red/black/white visual system
- `game.js` — pure game engine, DOM adapter, and canvas atmosphere
- `tests/game-engine.test.js` — game-state and outcome regressions
- `tests/static-contract.test.js` — structure and accessibility contracts
- `tests/browser-smoke.mjs` — local Edge end-to-end smoke test
- `game-preview.png` — verified battle-screen capture
- `game-brief.md`, `game-rules.md`, `game-test-report.md` — workshop records
- `docs/superpowers/specs/2026-10-19-alien-cell-breach-design.md` — approved design
- `docs/superpowers/plans/2026-10-19-alien-cell-breach.md` — implementation plan

## Verified behavior

The game loads locally, runs deterministic win and loss battles, awards one mark per battle, checks all winning lines and draws, preserves state through Help, fully resets from Help, adapts to a narrow viewport, and reports no browser console errors. The latest automated run passed 19 of 19 tests; the end-to-end browser smoke test also passed.

## Known limits and blockers

- Physical-phone touch is not tested.
- The project is intentionally not deployed as a public website.
- The source repository is private.
- The local browser verifier uses `--no-sandbox` only for its disposable headless test profile because managed Chromium GPU sandboxing crashes on this machine. The launched interactive game uses the normal Codex browser.

## Next action

Play the launched local game, then deploy only if a public URL becomes part of the workshop exercise.
