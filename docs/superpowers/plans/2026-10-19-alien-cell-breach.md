# Alien: Cell Breach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, accessible Alien-themed tic-tac-toe game in which deterministic Xenomorph battles award X or O cells, with preserved-state Help, reliable restart, and a decorative canvas atmosphere.

**Architecture:** `game.js` contains a pure state-transition engine plus a guarded browser adapter, allowing Node’s built-in test runner to exercise the rules without a DOM library. `index.html` contains semantic controls and screen regions; `styles.css` owns the responsive industrial presentation. Canvas remains decorative while ordinary HTML buttons implement every gameplay action.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, Canvas 2D, Node.js built-in `node:test`, browser-based manual verification.

**Spec:** `docs/superpowers/specs/2026-10-19-alien-cell-breach-design.md`

## Global Constraints

- The title is **Alien: Cell Breach**.
- Treat the game as an unofficial, noncommercial classroom fan project for adult *Alien* fans.
- Use a red, black, and white industrial science-fiction treatment without graphic gore.
- Use no framework, package dependency, build step, backend, API, account, payment, remote score service, downloaded franchise artwork, film still, logo, or audio.
- Gameplay must remain usable when the decorative canvas is unavailable.
- Essential gameplay uses native HTML buttons and text, not canvas input.
- Keyboard, mouse, and touch must support the full flow; meaning must not depend on color alone.
- Help preserves current state; Restart game clears the whole board and active battle.
- Deployment is not authorized by this plan.
- Git metadata is currently read-only. Run commit commands only if that restriction has been removed; otherwise retain the completed files and report that the commit step was blocked.

## File structure

- Create `index.html`: semantic application shell, screen regions, board, battle controls, Help, results, canvas, and live regions.
- Create `styles.css`: palette, responsive screen layout, focus states, board and battle presentation, Help overlay, and reduced-motion behavior.
- Create `game.js`: pure game engine, DOM renderer/event adapter, Help preservation, restart behavior, and decorative canvas controller.
- Create `tests/game-engine.test.js`: rule, transition, reset, Help, line, and regression tests using `node:test`.
- Create `tests/static-contract.test.js`: file and accessibility-contract checks using `node:test` and `node:fs`.
- Create `game-brief.md`: concise player, concept, scope, exclusions, and completion checks.
- Create `game-rules.md`: exact board/battle transitions and controls.
- Create `game-test-report.md`: versioned Passed/Failed/Not tested verification record.
- Create `project-state.md`: current files, verified behavior, blockers, and next action.

---

### Task 1: Pure battle and board engine

**Files:**
- Create: `game.js`
- Create: `tests/game-engine.test.js`

**Interfaces:**
- Produces: `GameEngine.createInitialState(): GameState`
- Produces: `GameEngine.reduce(state: GameState, action: GameAction): GameState`
- Produces: `GameEngine.evaluateBoard(board: Cell[]): "x-win" | "o-win" | "draw" | null`
- Produces: `GameEngine.attackForExchange(exchangeIndex: number): "laser" | "shield" | "claw"`
- Produces: `GameEngine.correctResponseFor(attack: string): "shield" | "blast" | "dodge"`
- Produces: `GameEngine.WINNING_LINES: number[][]`
- Produces: CommonJS export for Node and `window.GameEngine` for the browser.

- [ ] **Step 1: Write failing initialization and board tests**

```js
// tests/game-engine.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const GameEngine = require('../game.js');

test('initial state starts at intro with an empty board', () => {
  const state = GameEngine.createInitialState();
  assert.equal(state.screen, 'intro');
  assert.deepEqual(state.board, Array(9).fill(null));
  assert.equal(state.pendingCell, null);
  assert.equal(state.playerHealth, 2);
  assert.equal(state.alienHealth, 2);
});

test('board evaluation checks lines before a full-board draw', () => {
  assert.equal(GameEngine.evaluateBoard(['x','o','o','o','x','x','x','o','x']), 'x-win');
  assert.equal(GameEngine.evaluateBoard(['x','o','x','x','o','o','o','x','x']), 'draw');
});
```

- [ ] **Step 2: Run the tests and verify the missing module failure**

Run: `node --test tests/game-engine.test.js`

Expected: FAIL because `game.js` does not exist or does not export `createInitialState`.

- [ ] **Step 3: Implement the state shape and board evaluation**

```js
// game.js — initial engine contract
const GameEngine = (() => {
  const WINNING_LINES = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  const ATTACKS = ['laser', 'shield', 'claw'];
  const COUNTERS = { laser: 'shield', shield: 'blast', claw: 'dodge' };

  function createInitialState() {
    return {
      screen: 'intro', screenBeforeHelp: null,
      board: Array(9).fill(null), pendingCell: null,
      playerHealth: 2, alienHealth: 2, exchangeIndex: 0,
      responseAccepted: false, battleOutcome: null,
      boardOutcome: null, feedback: ''
    };
  }

  function evaluateBoard(board) {
    for (const [a,b,c] of WINNING_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] === 'x' ? 'x-win' : 'o-win';
      }
    }
    return board.every(Boolean) ? 'draw' : null;
  }

  const attackForExchange = index => ATTACKS[index];
  const correctResponseFor = attack => COUNTERS[attack];
  return { WINNING_LINES, createInitialState, evaluateBoard, attackForExchange, correctResponseFor };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GameEngine;
if (typeof window !== 'undefined') window.GameEngine = GameEngine;
```

- [ ] **Step 4: Add failing transition tests**

Add tests covering:

```js
test('selecting an empty cell starts one fresh battle and locks the board', () => {
  let state = GameEngine.reduce(GameEngine.createInitialState(), { type: 'START' });
  state = GameEngine.reduce(state, { type: 'CHOOSE_CELL', index: 4 });
  assert.equal(state.screen, 'battle-input');
  assert.equal(state.pendingCell, 4);
  assert.equal(state.playerHealth, 2);
  assert.equal(state.alienHealth, 2);
  assert.deepEqual(
    GameEngine.reduce(state, { type: 'CHOOSE_CELL', index: 5 }),
    state
  );
});

test('Shield then Blast wins a battle and awards one X', () => {
  let state = GameEngine.reduce(GameEngine.createInitialState(), { type: 'START' });
  state = GameEngine.reduce(state, { type: 'CHOOSE_CELL', index: 0 });
  state = GameEngine.reduce(state, { type: 'RESPOND', response: 'shield' });
  state = GameEngine.reduce(state, { type: 'NEXT_EXCHANGE' });
  state = GameEngine.reduce(state, { type: 'RESPOND', response: 'blast' });
  assert.equal(state.board[0], 'x');
  assert.equal(state.alienHealth, 0);
  assert.equal(state.screen, 'battle-summary');
});

test('a repeated response cannot cause repeated damage', () => {
  let state = GameEngine.reduce(GameEngine.createInitialState(), { type: 'START' });
  state = GameEngine.reduce(state, { type: 'CHOOSE_CELL', index: 0 });
  state = GameEngine.reduce(state, { type: 'RESPOND', response: 'shield' });
  const repeated = GameEngine.reduce(state, { type: 'RESPOND', response: 'shield' });
  assert.deepEqual(repeated, state);
});
```

- [ ] **Step 5: Implement `reduce` with immutable transitions**

Implement these action contracts exactly:

```js
// START: intro -> board
// CHOOSE_CELL(index): board -> battle-input only for an empty cell
// RESPOND(response): battle-input -> battle-feedback or terminal battle-summary/board-result
// NEXT_EXCHANGE: battle-feedback -> battle-input, exchangeIndex + 1
// RETURN_TO_BOARD: battle-summary -> board without changing another cell
// OPEN_HELP: any visible state -> help, saving screenBeforeHelp
// CLOSE_HELP: help -> screenBeforeHelp without changing gameplay state
// RESTART: any state -> empty board state with screen "board"
// PLAY_AGAIN: board-result -> empty board state with screen "board"
```

Use a private `resolveBattle(state, mark)` helper that copies `board`, fills `pendingCell` once, runs `evaluateBoard`, clears `pendingCell`, and selects `battle-summary` or `board-result`. Invalid actions return the original state object.

- [ ] **Step 6: Run the engine suite**

Run: `node --test tests/game-engine.test.js`

Expected: PASS for initialization, lines, draw, cell locking, deterministic battle, and repeated-input tests.

- [ ] **Step 7: Commit the engine when Git becomes writable**

```bash
git add game.js tests/game-engine.test.js
git commit -m "feat: add Alien Cell Breach game engine"
```

If Git remains read-only, record: `Commit blocked: workspace Git metadata is read-only.`

---

### Task 2: Complete regression coverage for Help, restart, and outcomes

**Files:**
- Modify: `tests/game-engine.test.js`
- Modify: `game.js`

**Interfaces:**
- Consumes: Task 1 `GameEngine.reduce` and `GameState` fields.
- Produces: stable Help preservation and reset semantics used by the browser renderer.

- [ ] **Step 1: Add failing Help-preservation tests**

```js
test('Help preserves an active battle exactly', () => {
  let state = GameEngine.reduce(GameEngine.createInitialState(), { type: 'START' });
  state = GameEngine.reduce(state, { type: 'CHOOSE_CELL', index: 6 });
  state = GameEngine.reduce(state, { type: 'RESPOND', response: 'shield' });
  const beforeHelp = state;
  state = GameEngine.reduce(state, { type: 'OPEN_HELP' });
  assert.equal(state.screen, 'help');
  assert.equal(state.screenBeforeHelp, 'battle-feedback');
  state = GameEngine.reduce(state, { type: 'CLOSE_HELP' });
  assert.deepEqual({ ...state, screenBeforeHelp: beforeHelp.screenBeforeHelp }, beforeHelp);
});
```

- [ ] **Step 2: Add failing full-reset tests**

```js
test('Restart from Help abandons a battle without awarding a mark', () => {
  let state = GameEngine.reduce(GameEngine.createInitialState(), { type: 'START' });
  state = GameEngine.reduce(state, { type: 'CHOOSE_CELL', index: 2 });
  state = GameEngine.reduce(state, { type: 'OPEN_HELP' });
  state = GameEngine.reduce(state, { type: 'RESTART' });
  assert.equal(state.screen, 'board');
  assert.deepEqual(state.board, Array(9).fill(null));
  assert.equal(state.pendingCell, null);
  assert.equal(state.exchangeIndex, 0);
  assert.equal(state.playerHealth, 2);
  assert.equal(state.alienHealth, 2);
});
```

- [ ] **Step 3: Add deterministic loss and every-line tests**

```js
test('Blast then Shield loses a battle and awards one O', () => {
  let state = GameEngine.reduce(GameEngine.createInitialState(), { type: 'START' });
  state = GameEngine.reduce(state, { type: 'CHOOSE_CELL', index: 1 });
  state = GameEngine.reduce(state, { type: 'RESPOND', response: 'blast' });
  state = GameEngine.reduce(state, { type: 'NEXT_EXCHANGE' });
  state = GameEngine.reduce(state, { type: 'RESPOND', response: 'shield' });
  assert.equal(state.board[1], 'o');
  assert.equal(state.playerHealth, 0);
});

test('all eight lines resolve for either mark', () => {
  for (const line of GameEngine.WINNING_LINES) {
    for (const mark of ['x', 'o']) {
      const board = Array(9).fill(null);
      line.forEach(index => { board[index] = mark; });
      assert.equal(GameEngine.evaluateBoard(board), mark === 'x' ? 'x-win' : 'o-win');
    }
  }
});
```

- [ ] **Step 4: Run tests and confirm failures identify missing reset/Help details**

Run: `node --test tests/game-engine.test.js`

Expected: At least one new test fails until `reduce` preserves and clears the exact named fields.

- [ ] **Step 5: Implement the minimal transition corrections**

Ensure `OPEN_HELP` changes only `screen` and `screenBeforeHelp`; `CLOSE_HELP` restores `screenBeforeHelp` and clears that field; `RESTART` and `PLAY_AGAIN` call a shared `createBoardState()` that returns a fresh board with health 2/2 and no pending or feedback state.

- [ ] **Step 6: Run the full engine suite**

Run: `node --test tests/game-engine.test.js`

Expected: PASS with zero failures.

- [ ] **Step 7: Commit regression safeguards when Git becomes writable**

```bash
git add game.js tests/game-engine.test.js
git commit -m "test: cover help restart and board outcomes"
```

---

### Task 3: Semantic application shell and visual system

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `tests/static-contract.test.js`

**Interfaces:**
- Produces DOM IDs consumed by Task 4: `app`, `intro-screen`, `board-screen`, `battle-screen`, `result-screen`, `help-screen`, `board`, `battle-canvas`, `alien-attack`, `player-health`, `alien-health`, `battle-feedback`, `status-live`, and `result-live`.
- Produces action attributes consumed by Task 4: `[data-action="start"]`, `[data-action="open-help"]`, `[data-action="close-help"]`, `[data-action="restart"]`, `[data-action="respond"]`, `[data-action="next-exchange"]`, `[data-action="return-board"]`, and `[data-action="play-again"]`.

- [ ] **Step 1: Write failing static-contract tests**

```js
// tests/static-contract.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

test('page identifies the game and unofficial fan-project status', () => {
  assert.match(html, /Alien: Cell Breach/);
  assert.match(html, /unofficial.*fan project/i);
});

test('essential actions are native buttons', () => {
  for (const action of ['start','open-help','close-help','restart','respond','next-exchange','return-board','play-again']) {
    assert.match(html, new RegExp(`<button[^>]+data-action=["']${action}["']`, 'i'));
  }
});

test('page has polite and assertive announcement regions', () => {
  assert.match(html, /id="status-live"[^>]+aria-live="polite"/);
  assert.match(html, /id="result-live"[^>]+role="alert"/);
});

test('styles include visible focus and reduced-motion handling', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
```

- [ ] **Step 2: Run tests and verify missing-file failure**

Run: `node --test tests/static-contract.test.js`

Expected: FAIL because `index.html` and `styles.css` do not exist.

- [ ] **Step 3: Create the semantic HTML shell**

Create all five screen sections, nine board buttons, three response buttons, Help counter table, canvas fallback text, restart controls, and live regions. Keep all Help text concise and include:

```html
<table>
  <thead><tr><th>Alien attack</th><th>Your counter</th></tr></thead>
  <tbody>
    <tr><td>Laser</td><td>Shield</td></tr>
    <tr><td>Shield</td><td>Blast</td></tr>
    <tr><td>Claw</td><td>Dodge</td></tr>
  </tbody>
</table>
```

Load `<script src="game.js" defer></script>` so the project can open directly from local files without a module server.

- [ ] **Step 4: Create the responsive industrial CSS**

Define exact theme tokens under `:root`: `--ink: #050505`, `--panel: #111111`, `--paper: #f5f5f2`, `--threat: #d71920`, and neutral grays. Implement:

- A single visible `[data-screen]` and hidden inactive screens.
- A square three-column board with 44px minimum targets.
- White X, red O plus text labels, and a dashed pending state.
- Responsive board/battle layouts that stack below 760px.
- High-contrast `:focus-visible` outlines.
- A reduced-motion rule that disables nonessential transition and canvas presentation motion.

- [ ] **Step 5: Run static-contract tests**

Run: `node --test tests/static-contract.test.js`

Expected: PASS.

- [ ] **Step 6: Open `index.html` locally for a structure check**

Expected: intro screen renders without a server; Start and Help controls are visible; no source code is displayed; browser console has no missing-file error.

- [ ] **Step 7: Commit the shell when Git becomes writable**

```bash
git add index.html styles.css tests/static-contract.test.js
git commit -m "feat: add accessible Alien game shell"
```

---

### Task 4: DOM adapter and complete playable flow

**Files:**
- Modify: `game.js`
- Modify: `tests/static-contract.test.js`

**Interfaces:**
- Consumes: Task 1 engine methods and Task 3 DOM IDs/action attributes.
- Produces: `GameUI.init(document): void`, `GameUI.render(state): void`, and event-to-engine action dispatch.

- [ ] **Step 1: Extend static tests for browser initialization hooks**

```js
const script = fs.readFileSync('game.js', 'utf8');

test('browser adapter initializes only when a document exists', () => {
  assert.match(script, /typeof document !== ['"]undefined['"]/);
  assert.match(script, /DOMContentLoaded/);
});

test('renderer updates accessible board labels', () => {
  assert.match(script, /aria-label/);
  assert.match(script, /Row/);
  assert.match(script, /column/);
});
```

- [ ] **Step 2: Run tests and verify the browser-adapter expectations fail**

Run: `node --test tests/static-contract.test.js`

Expected: FAIL because the browser adapter is not implemented.

- [ ] **Step 3: Implement guarded browser initialization**

Add a `GameUI` closure after the engine export. It must:

- Store one current `state` value.
- Delegate every click to `GameEngine.reduce` through one `dispatch(action)` function.
- Use event delegation from `#app` instead of repeated listeners.
- Map nine board buttons to `CHOOSE_CELL` with numeric indices.
- Map response buttons to `RESPOND` with shield, blast, or dodge.
- Render only the active screen.
- Disable occupied cells and every cell outside the board state.
- Disable responses after one accepted response.
- Update health text, current attack, feedback, result text, pending cell, and board cell labels.
- Move focus to the main heading of the newly active screen after major transitions while preserving ordinary tab order.

- [ ] **Step 4: Implement Help restoration and Restart from every active screen**

Ensure the browser renders Help from engine state rather than cloning or rebuilding prior DOM. Closing Help dispatches `CLOSE_HELP`; Restart dispatches `RESTART`. No Help click mutates health, board, exchange, response, or pending cell.

- [ ] **Step 5: Run all automated tests**

Run: `node --test tests/*.test.js`

Expected: PASS for engine and static-contract suites.

- [ ] **Step 6: Perform the first browser loop**

On the exact local `index.html`:

1. Start.
2. Select cell 1.
3. Respond Shield.
4. Activate Next exchange.
5. Respond Blast.
6. Confirm exactly one X appears in cell 1.
7. Return to board.
8. Select cell 2 and lose with Blast, then Shield.
9. Confirm exactly one O appears in cell 2.

Expected: no extra mark, duplicate exchange, or automatic opponent turn.

- [ ] **Step 7: Commit the playable flow when Git becomes writable**

```bash
git add game.js tests/static-contract.test.js
git commit -m "feat: connect board battle help and replay UI"
```

---

### Task 5: Decorative canvas atmosphere with safe lifecycle

**Files:**
- Modify: `game.js`
- Modify: `styles.css`
- Modify: `tests/static-contract.test.js`

**Interfaces:**
- Consumes: `#battle-canvas`, current active screen, and `prefers-reduced-motion`.
- Produces: `CanvasAtmosphere.start(): void`, `CanvasAtmosphere.stop(): void`, `CanvasAtmosphere.resize(): void`, with at most one animation-frame loop.

- [ ] **Step 1: Add failing canvas lifecycle tests**

```js
test('canvas atmosphere exposes start stop and resize controls', () => {
  assert.match(script, /CanvasAtmosphere/);
  assert.match(script, /function start\(/);
  assert.match(script, /function stop\(/);
  assert.match(script, /function resize\(/);
  assert.match(script, /cancelAnimationFrame/);
});
```

- [ ] **Step 2: Run the static tests and verify failure**

Run: `node --test tests/static-contract.test.js`

Expected: FAIL because the lifecycle controller is absent.

- [ ] **Step 3: Implement the canvas controller**

Implement one guarded animation loop that draws original red/white scan lines, drifting particles, and a non-graphic biomechanical alien silhouette. Store the active request ID; `start()` is idempotent, and `stop()` cancels and clears it. Resize for device pixel ratio without changing CSS size. Skip continuous animation when reduced motion is requested and draw one static frame instead.

- [ ] **Step 4: Connect the lifecycle to screen rendering**

Start the atmosphere only when the battle screen is visible. Stop it when leaving battle, opening Help, resolving the board, restarting, or when the page becomes hidden. Resume only when an active battle screen becomes visible again.

- [ ] **Step 5: Run all automated tests**

Run: `node --test tests/*.test.js`

Expected: PASS.

- [ ] **Step 6: Run repeated-restart browser checks**

Start and restart during battle feedback five times. Expected: animation speed remains consistent, one response causes one event, the board clears, and the next battle begins at two health each.

- [ ] **Step 7: Commit the atmosphere when Git becomes writable**

```bash
git add game.js styles.css tests/static-contract.test.js
git commit -m "feat: add safe cinematic canvas atmosphere"
```

---

### Task 6: Course records and full acceptance verification

**Files:**
- Create: `game-brief.md`
- Create: `game-rules.md`
- Create: `game-test-report.md`
- Create: `project-state.md`
- Modify only if a verified failure requires repair: `index.html`, `styles.css`, `game.js`, or tests.

**Interfaces:**
- Consumes: approved spec, exact implementation files, automated results, and actual browser observations.
- Produces: workshop-ready brief, rules, test evidence, and resume record.

- [ ] **Step 1: Write `game-brief.md` from the approved design**

Include the title, intended adult fan audience, one-sentence concept, main action, short round, X/O outcome, controls, replay, unofficial fan-project status, five observable completion checks, and exclusions copied from the spec.

- [ ] **Step 2: Write `game-rules.md` with a transition table**

The table must cover intro, board, battle input, battle feedback, battle summary, board result, Help, Restart, and Play again. Name the exact allowed action and result for each state.

- [ ] **Step 3: Run the complete automated suite**

Run: `node --test tests/*.test.js`

Expected: all tests PASS with zero failures.

- [ ] **Step 4: Perform browser acceptance checks**

Record exact browser, device, file path, and version. Check:

- No progress before Start.
- Occupied-cell rejection and board lock.
- Two-exchange win and loss paths.
- Rapid repeated responses.
- Immediate terminal health result.
- No automatic opponent turn.
- X win, O win, draw, and last-cell win precedence.
- Help preservation during battle feedback.
- Restart from board, battle input, battle feedback, and Help.
- Repeated Play again.
- Full keyboard route and visible focus.
- Narrow desktop layout; real phone remains Not tested unless actually used.

- [ ] **Step 5: Write `game-test-report.md` from actual observations**

Use one row per check with Expected, Observed, and Passed/Failed/Not tested. Do not mark canvas appearance, phone touch, or published behavior Passed unless actually observed in that environment.

- [ ] **Step 6: Repair only verified failures and rerun adjacent checks**

For each failure: add or tighten an automated regression test when feasible, verify it fails, implement the smallest correction, run all automated tests, and repeat the failed browser step plus the core start-to-replay loop.

- [ ] **Step 7: Write `project-state.md`**

Record project name/type, local folder, exact files, current version, last working copy, automated and browser results, Not tested items, Git metadata blocker, publication status `not deployed`, and one next action.

- [ ] **Step 8: Commit the verified local game when Git becomes writable**

```bash
git add index.html styles.css game.js tests game-brief.md game-rules.md game-test-report.md project-state.md docs/superpowers
git commit -m "feat: complete Alien Cell Breach classroom game"
```

If Git remains read-only, do not claim a commit exists. Retain all files and include the blocker in `project-state.md`.
