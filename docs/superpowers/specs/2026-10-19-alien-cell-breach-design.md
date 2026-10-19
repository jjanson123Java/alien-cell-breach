# Alien: Cell Breach — Game Design Specification

Date: October 19, 2026

## Purpose

Build an unofficial, noncommercial classroom fan game for adult *Alien* fans. The experience combines a three-by-three board with short Xenomorph battles. It uses a tense industrial science-fiction presentation without graphic gore.

The game is a static browser project that runs without installation, a backend, accounts, payments, remote scores, or external game services.

## First-version scope

The first version includes:

- One three-by-three board.
- One deterministic Xenomorph battle system.
- Board, battle, result, Help, replay, and full-restart states.
- Keyboard, mouse, and touch controls.
- A red, black, and white industrial visual treatment.
- Atmospheric canvas animation that never carries gameplay controls or essential information.
- An explicit unofficial fan-project notice.

The first version excludes sound, graphic gore, randomized attacks, inventory, upgrades, multiple enemy types, levels, accounts, multiplayer, databases, remote leaderboards, and downloaded franchise artwork.

## Player experience

### Start and board

The opening screen identifies the game as **Alien: Cell Breach**, displays the unofficial fan-project notice, presents a short mission summary, and provides Start and How to Play controls.

After Start, the player sees an empty three-by-three board. Selecting an empty cell makes it the pending cell, locks the entire board, and opens a battle for that cell. Selecting an occupied cell has no effect. There is no automatic opponent board move.

### Battle

Every battle starts with two player health points and two alien health points. The alien moves in this deterministic order, restarting at Laser for every new battle:

1. Laser — correct response: Shield.
2. Shield — correct response: Blast.
3. Claw — correct response: Dodge.

Each exchange accepts exactly one response:

- A correct response removes one alien health point.
- An incorrect response removes one player health point.
- Only one side loses one point per accepted response.
- Response controls lock after selection.
- If both sides still have health, an explicit Next exchange control appears.
- If either side reaches zero health, the battle resolves immediately without another exchange.

A battle win places X in the pending cell. A battle loss places O in the pending cell. The pending cell resolves exactly once.

### Board outcomes

After a mark is placed, the game checks these eight winning lines: 1–2–3, 4–5–6, 7–8–9, 1–4–7, 2–5–8, 3–6–9, 1–5–9, and 3–5–7.

- Three X marks in a line: the player wins.
- Three O marks in a line: the aliens win.
- A full board with neither line: draw.
- A line is checked before a full-board draw, so a last-cell line is a win or loss rather than a draw.

If the board continues, Return to board dismisses the battle summary without adding another mark. If the board ends, the final result includes Play again.

### Help

How to Play is accessible from the opening screen, board, battle input, battle feedback, and result screens. It explains:

- How a battle awards X or O.
- The Laser/Shield/Claw counter table.
- Health and exchange behavior.
- Board wins, losses, and draws.
- Keyboard, mouse, and touch controls.
- The difference between closing Help and Restart game.

Opening Help preserves the current board, pending cell, health, attack, accepted response, exchange, and feedback. Gameplay controls are unavailable while Help is open. Closing Help returns to the exact preserved state and does not count as an action. Restart game remains available in Help during active play.

### Restart and replay

Restart game is available throughout active play, including battle input, battle feedback, and Help. It immediately clears the board and all battle state and returns to an empty-board state. An abandoned battle never awards a delayed mark.

Play again appears after a board win, board loss, or draw. It resets the same state as Restart game and begins with an empty board.

## Visual design

The approved layout uses separate board and battle views within the same application shell.

- Palette: near-black backgrounds, white text and marks, and red threat indicators.
- Style: industrial spaceship panels, sharp typography, restrained warning graphics, and sparse biomechanical creature imagery.
- Board: large ordinary buttons with visible empty, occupied, and pending states.
- Battle: current cell, alien attack, both health values, response controls, exchange feedback, and next action remain visually distinct.
- Canvas: atmospheric Xenomorph silhouette, movement, scan lines, or ambient effects only. Canvas content is decorative and has an accessible text alternative.
- Meaning never depends on color alone. X, O, pending, health, and results use text, shape, or labels as well as color.
- Motion respects reduced-motion preferences and never blocks input.

No downloaded franchise artwork, film stills, logos, audio, or proprietary assets are bundled. The fan homage uses original CSS/canvas treatment and text references supplied for this classroom exercise.

## Technical architecture

The game uses three static files kept in one folder:

- `index.html` — semantic screen structure, board controls, battle controls, Help, results, canvas, and accessible status regions.
- `styles.css` — responsive red/black/white presentation, focus states, screen transitions, and reduced-motion behavior.
- `game.js` — state model, transitions, board evaluation, deterministic battles, reset behavior, DOM rendering, and decorative canvas animation.

Essential gameplay uses standard HTML buttons and text. Canvas does not receive gameplay input.

### State model

The application maintains:

- `screen`: intro, board, battle-input, battle-feedback, battle-summary, board-result, or help.
- `screenBeforeHelp`: the screen restored when Help closes.
- `board`: nine values containing empty, X, or O.
- `pendingCell`: selected cell index or null.
- `playerHealth` and `alienHealth`: integers from zero through two.
- `exchangeIndex`: zero through two.
- `responseAccepted`: whether the current exchange already resolved.
- `battleOutcome`: win, loss, or null.
- `boardOutcome`: X-win, O-win, draw, or null.
- `feedback`: the current explanation shown to the player.

All state changes go through explicit actions: start, choose cell, choose response, next exchange, return to board, open Help, close Help, restart game, and play again.

## Error prevention and resilience

- Ignore occupied-cell selections.
- Ignore all board selections while a battle is active.
- Ignore additional response activations after one response is accepted.
- Resolve a battle and pending cell at most once.
- Clamp health to zero through two.
- Never display Next exchange after a terminal battle.
- Cancel or invalidate decorative animation work during reset so repeated restarts do not create duplicate loops.
- Keep gameplay usable if canvas animation cannot initialize.
- Do not store or transmit personal information.

## Accessibility and responsive behavior

- All gameplay actions use native buttons.
- Cells have labels such as “Row 1, column 2, empty” and update when occupied or pending.
- Tab, Enter, and Space support the complete game flow.
- Visible browser focus remains intact.
- Status and result changes use a polite live region; terminal results receive stronger announcement treatment.
- Touch targets remain usable at phone widths.
- The layout is checked at desktop and narrow widths, then on a real phone when available.
- Decorative canvas imagery is hidden from assistive technology and paired with concise visible threat text.

## Verification

The implementation must be checked against the workshop tests:

1. Nothing progresses before Start.
2. Selecting a cell locks every board cell and preserves the pending location.
3. Shield then Blast produces a two-exchange battle win.
4. Blast then Shield produces a two-exchange battle loss.
5. Repeated activation during one exchange causes only one damage event.
6. A terminal health result resolves immediately and awards one mark.
7. No automatic opponent mark is added.
8. All eight X and O winning lines are recognized.
9. The documented full-board sequence ends in a draw.
10. A last-cell winning line is not mislabeled as a draw.
11. Help preserves every active board and battle value.
12. Restart from board, battle input, battle feedback, and Help clears all state and awards no delayed mark.
13. Play again repeatedly returns a clean empty board without duplicate behavior.
14. Keyboard play completes the full flow with visible focus.
15. Narrow-screen layout remains readable; real-phone touch is recorded separately when performed.

Each check is recorded as Passed, Failed, or Not tested for the exact version inspected. Code review, local browser checks, and published-URL checks remain distinct evidence.

## Deliverables

- `index.html`
- `styles.css`
- `game.js`
- `game-brief.md`
- `game-rules.md`
- `game-test-report.md`
- `project-state.md`

Publication and deployment are separate later actions and are not authorized by this design approval.
