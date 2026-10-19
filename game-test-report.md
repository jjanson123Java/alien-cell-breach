# Alien: Cell Breach — Test Report

Version: 1.0.0  
Test date: 2026-10-19  
Local URL: `http://127.0.0.1:8765/`  
Automated browser: Microsoft Edge 155.0.4283.62 headless, 1440×1000 and emulated 390×844  
Published build: Not tested; the game has not been deployed.

| Check | Expected | Observed | Status |
|---|---|---|---|
| Automated suite | Engine and static contracts pass | 19 passed, 0 failed | Passed |
| Initial load | Intro appears; no progress before Start | Intro was the only active screen | Passed |
| Win battle | Shield, then Blast awards one X | Cell 1 contained one X | Passed |
| Loss battle | Blast, then Shield awards one O | Cell 2 contained one O | Passed |
| Duplicate response | One input causes one damage event | Reducer rejects repeated response in the same exchange | Passed |
| Board lock / occupied cell | Grid locks during battle; filled cell cannot be selected | Covered by reducer regression tests | Passed |
| X and O win lines | Every horizontal, vertical, and diagonal line resolves | All eight lines passed for both marks | Passed |
| Draw and last-cell precedence | Winning line is checked before full-board draw | Regression tests passed | Passed |
| Help preservation | Closing Help restores the exact match | X board state remained unchanged through Help | Passed |
| Restart from Help | Entire match resets | Board returned empty with no active battle | Passed |
| No automatic turn | Only resolved battles award marks | Browser flow produced only the two chosen cells | Passed |
| Console | No uncaught errors | No runtime or logged errors after the full browser flow | Passed |
| Canvas appearance | Decorative scene renders without blocking controls | Battle screenshot visually inspected | Passed |
| Narrow layout | No horizontal page overflow at 390×844 | Browser assertion passed | Passed |
| Keyboard semantics | Essential actions are native buttons with focus styling | Static accessibility contract passed | Passed |
| Real phone touch | Works on a physical phone | No physical phone used | Not tested |
| Deployment | Public URL loads | Deployment was not authorized | Not tested |

Run locally with `python -m http.server 8765 --bind 127.0.0.1`, then open `http://127.0.0.1:8765/`. Run automated checks with `node --test tests/*.test.js` and `node tests/browser-smoke.mjs http://127.0.0.1:8765/` while the server is active.
