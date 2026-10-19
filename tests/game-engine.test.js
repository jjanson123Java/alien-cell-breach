const test = require('node:test');
const assert = require('node:assert/strict');
const GameEngine = require('../game.js');

function beginBattle(index = 0) {
  let state = GameEngine.reduce(GameEngine.createInitialState(), { type: 'START' });
  return GameEngine.reduce(state, { type: 'CHOOSE_CELL', index });
}

function resolveCell(state, responses) {
  let next = state;
  responses.forEach((response, index) => {
    next = GameEngine.reduce(next, { type: 'RESPOND', response });
    if (index < responses.length - 1 && next.screen === 'battle-feedback') {
      next = GameEngine.reduce(next, { type: 'NEXT_EXCHANGE' });
    }
  });
  return next;
}

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

test('all eight lines resolve for either mark', () => {
  for (const line of GameEngine.WINNING_LINES) {
    for (const mark of ['x', 'o']) {
      const board = Array(9).fill(null);
      line.forEach(index => { board[index] = mark; });
      assert.equal(GameEngine.evaluateBoard(board), mark === 'x' ? 'x-win' : 'o-win');
    }
  }
});

test('selecting an empty cell starts one fresh battle and locks the board', () => {
  const state = beginBattle(4);
  assert.equal(state.screen, 'battle-input');
  assert.equal(state.pendingCell, 4);
  assert.equal(state.playerHealth, 2);
  assert.equal(state.alienHealth, 2);
  assert.strictEqual(GameEngine.reduce(state, { type: 'CHOOSE_CELL', index: 5 }), state);
});

test('Shield then Blast wins a battle and awards one X', () => {
  const state = resolveCell(beginBattle(0), ['shield', 'blast']);
  assert.equal(state.board[0], 'x');
  assert.equal(state.alienHealth, 0);
  assert.equal(state.screen, 'battle-summary');
});

test('Blast then Shield loses a battle and awards one O', () => {
  const state = resolveCell(beginBattle(1), ['blast', 'shield']);
  assert.equal(state.board[1], 'o');
  assert.equal(state.playerHealth, 0);
  assert.equal(state.screen, 'battle-summary');
});

test('a repeated response cannot cause repeated damage', () => {
  let state = beginBattle(0);
  state = GameEngine.reduce(state, { type: 'RESPOND', response: 'shield' });
  const repeated = GameEngine.reduce(state, { type: 'RESPOND', response: 'shield' });
  assert.strictEqual(repeated, state);
});

test('Help preserves an active battle exactly', () => {
  let state = beginBattle(6);
  state = GameEngine.reduce(state, { type: 'RESPOND', response: 'shield' });
  const beforeHelp = state;
  state = GameEngine.reduce(state, { type: 'OPEN_HELP' });
  assert.equal(state.screen, 'help');
  assert.equal(state.screenBeforeHelp, 'battle-feedback');
  state = GameEngine.reduce(state, { type: 'CLOSE_HELP' });
  assert.deepEqual(state, beforeHelp);
});

test('Restart from Help abandons a battle without awarding a mark', () => {
  let state = beginBattle(2);
  state = GameEngine.reduce(state, { type: 'OPEN_HELP' });
  state = GameEngine.reduce(state, { type: 'RESTART' });
  assert.equal(state.screen, 'board');
  assert.deepEqual(state.board, Array(9).fill(null));
  assert.equal(state.pendingCell, null);
  assert.equal(state.exchangeIndex, 0);
  assert.equal(state.playerHealth, 2);
  assert.equal(state.alienHealth, 2);
});

test('occupied cells are rejected after returning to the board', () => {
  let state = resolveCell(beginBattle(3), ['shield', 'blast']);
  state = GameEngine.reduce(state, { type: 'RETURN_TO_BOARD' });
  assert.strictEqual(GameEngine.reduce(state, { type: 'CHOOSE_CELL', index: 3 }), state);
});

test('Play again clears all game state after a terminal board result', () => {
  const state = {
    ...GameEngine.createInitialState(),
    screen: 'board-result',
    board: ['x','x','x',null,null,null,null,null,null],
    boardOutcome: 'x-win',
    feedback: 'Board secured.'
  };
  const reset = GameEngine.reduce(state, { type: 'PLAY_AGAIN' });
  assert.equal(reset.screen, 'board');
  assert.deepEqual(reset.board, Array(9).fill(null));
  assert.equal(reset.boardOutcome, null);
  assert.equal(reset.feedback, '');
});
