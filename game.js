/* Alien: Cell Breach — unofficial noncommercial classroom fan project. */
'use strict';

const GameEngine = (() => {
  const WINNING_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  const ATTACKS = ['laser', 'shield', 'claw'];
  const COUNTERS = { laser: 'shield', shield: 'blast', claw: 'dodge' };

  function createState(screen) {
    return {
      screen,
      screenBeforeHelp: null,
      board: Array(9).fill(null),
      pendingCell: null,
      resolvedCell: null,
      playerHealth: 2,
      alienHealth: 2,
      exchangeIndex: 0,
      responseAccepted: false,
      battleOutcome: null,
      boardOutcome: null,
      feedback: ''
    };
  }

  function createInitialState() {
    return createState('intro');
  }

  function createBoardState() {
    return createState('board');
  }

  function evaluateBoard(board) {
    for (const [a, b, c] of WINNING_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] === 'x' ? 'x-win' : 'o-win';
      }
    }
    return board.every(Boolean) ? 'draw' : null;
  }

  function attackForExchange(exchangeIndex) {
    return ATTACKS[exchangeIndex] || ATTACKS[ATTACKS.length - 1];
  }

  function correctResponseFor(attack) {
    return COUNTERS[attack] || null;
  }

  function resolveBattle(state, mark) {
    if (state.pendingCell === null || state.board[state.pendingCell]) return state;
    const board = state.board.slice();
    board[state.pendingCell] = mark;
    const boardOutcome = evaluateBoard(board);
    return {
      ...state,
      screen: boardOutcome ? 'board-result' : 'battle-summary',
      board,
      resolvedCell: state.pendingCell,
      pendingCell: null,
      responseAccepted: true,
      battleOutcome: mark === 'x' ? 'win' : 'loss',
      boardOutcome
    };
  }

  function reduce(state, action) {
    if (!state || !action || typeof action.type !== 'string') return state;

    switch (action.type) {
      case 'START':
        return state.screen === 'intro' ? createBoardState() : state;

      case 'CHOOSE_CELL': {
        const index = Number(action.index);
        if (state.screen !== 'board' || !Number.isInteger(index) || index < 0 || index > 8 || state.board[index]) {
          return state;
        }
        return {
          ...state,
          screen: 'battle-input',
          pendingCell: index,
          resolvedCell: null,
          playerHealth: 2,
          alienHealth: 2,
          exchangeIndex: 0,
          responseAccepted: false,
          battleOutcome: null,
          resolvedCell: null,
          feedback: ''
        };
      }

      case 'RESPOND': {
        if (state.screen !== 'battle-input' || state.responseAccepted || state.pendingCell === null) return state;
        const response = String(action.response || '').toLowerCase();
        if (!['shield', 'blast', 'dodge'].includes(response)) return state;
        const attack = attackForExchange(state.exchangeIndex);
        const correct = correctResponseFor(attack);
        const isCorrect = response === correct;
        const playerHealth = Math.max(0, Math.min(2, state.playerHealth - (isCorrect ? 0 : 1)));
        const alienHealth = Math.max(0, Math.min(2, state.alienHealth - (isCorrect ? 1 : 0)));
        const feedback = isCorrect
          ? `${capitalize(response)} counters ${capitalize(attack)}. Alien loses 1 health.`
          : `${capitalize(response)} fails against ${capitalize(attack)}. You lose 1 health.`;
        const next = {
          ...state,
          screen: 'battle-feedback',
          playerHealth,
          alienHealth,
          responseAccepted: true,
          feedback
        };
        if (alienHealth === 0) return resolveBattle(next, 'x');
        if (playerHealth === 0) return resolveBattle(next, 'o');
        return next;
      }

      case 'NEXT_EXCHANGE':
        if (state.screen !== 'battle-feedback' || !state.responseAccepted || state.exchangeIndex >= 2) return state;
        return {
          ...state,
          screen: 'battle-input',
          exchangeIndex: state.exchangeIndex + 1,
          responseAccepted: false,
          feedback: ''
        };

      case 'RETURN_TO_BOARD':
        if (state.screen !== 'battle-summary' || state.boardOutcome) return state;
        return {
          ...state,
          screen: 'board',
          playerHealth: 2,
          alienHealth: 2,
          exchangeIndex: 0,
          responseAccepted: false,
          battleOutcome: null,
          feedback: ''
        };

      case 'OPEN_HELP':
        if (state.screen === 'help') return state;
        return { ...state, screenBeforeHelp: state.screen, screen: 'help' };

      case 'CLOSE_HELP':
        if (state.screen !== 'help' || !state.screenBeforeHelp) return state;
        return { ...state, screen: state.screenBeforeHelp, screenBeforeHelp: null };

      case 'RESTART':
        return createBoardState();

      case 'PLAY_AGAIN':
        return state.screen === 'board-result' ? createBoardState() : state;

      default:
        return state;
    }
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  return {
    WINNING_LINES,
    createInitialState,
    createBoardState,
    evaluateBoard,
    attackForExchange,
    correctResponseFor,
    reduce
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GameEngine;
if (typeof window !== 'undefined') window.GameEngine = GameEngine;

const CanvasAtmosphere = (() => {
  let canvas = null;
  let context = null;
  let animationFrame = null;
  let running = false;
  let particles = [];
  const reduceMotion = typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = Array.from({ length: 24 }, (_, index) => ({
      x: ((index * 73) % 100) / 100 * rect.width,
      y: ((index * 47) % 100) / 100 * rect.height,
      speed: 5 + (index % 6) * 3,
      size: 1 + (index % 3)
    }));
  }

  function draw(time = 0) {
    if (!canvas || !context) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);

    const glow = context.createRadialGradient(width * 0.58, height * 0.45, 0, width * 0.58, height * 0.45, width * 0.55);
    glow.addColorStop(0, 'rgba(210, 16, 36, 0.27)');
    glow.addColorStop(0.45, 'rgba(100, 0, 12, 0.14)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.save();
    context.translate(width * 0.57, height * 0.5);
    context.fillStyle = 'rgba(3, 3, 4, 0.92)';
    context.beginPath();
    context.ellipse(0, 8, width * 0.13, height * 0.34, -0.12, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(width * 0.03, -height * 0.2, width * 0.14, height * 0.085, -0.12, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(234, 234, 234, 0.16)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(-width * 0.01, -height * 0.02, width * 0.17, 3.8, 5.45);
    context.stroke();
    context.restore();

    context.fillStyle = 'rgba(238, 238, 238, 0.28)';
    particles.forEach((particle, index) => {
      const travel = reduceMotion ? 0 : (time / 1000) * particle.speed;
      const y = (particle.y + travel) % Math.max(height, 1);
      context.fillRect(particle.x, y, particle.size, particle.size);
      if (index % 5 === 0) context.fillRect(width - particle.x, height - y, 1, 1);
    });

    context.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let y = 0; y < height; y += 5) context.fillRect(0, y, width, 1);

    if (running && !reduceMotion) animationFrame = window.requestAnimationFrame(draw);
  }

  function start(target) {
    if (target) {
      canvas = target;
      context = canvas.getContext('2d');
      resize();
    }
    if (!canvas || !context || running) return;
    running = true;
    draw(performance.now());
  }

  function stop() {
    running = false;
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  return { start, stop, resize };
})();

const GameUI = (() => {
  let state = GameEngine.createInitialState();
  let root = null;
  let elements = {};
  let visibleScreen = null;

  function cellName(index) {
    return `Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}`;
  }

  function screenForState(screen) {
    if (screen.startsWith('battle-')) return 'battle';
    if (screen === 'board-result') return 'result';
    return screen;
  }

  function announce(message, urgent = false) {
    const target = urgent ? elements.resultLive : elements.statusLive;
    if (!target) return;
    target.textContent = '';
    window.requestAnimationFrame(() => { target.textContent = message; });
  }

  function dispatch(action) {
    const previous = state;
    state = GameEngine.reduce(state, action);
    if (state === previous) return;
    render();

    if (action.type === 'RESPOND') announce(state.feedback || battleSummaryCopy());
    if (action.type === 'CHOOSE_CELL') announce(`${cellName(state.pendingCell)} selected. Battle initiated.`);
    if (state.screen === 'board-result') announce(resultCopy(), true);
  }

  function handleClick(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;

    if (button.hasAttribute('data-cell-index')) {
      dispatch({ type: 'CHOOSE_CELL', index: Number(button.dataset.cellIndex) });
      return;
    }

    const action = button.dataset.action;
    const actions = {
      start: () => ({ type: 'START' }),
      respond: () => ({ type: 'RESPOND', response: button.dataset.response }),
      'next-exchange': () => ({ type: 'NEXT_EXCHANGE' }),
      'return-board': () => ({ type: 'RETURN_TO_BOARD' }),
      'open-help': () => ({ type: 'OPEN_HELP' }),
      'close-help': () => ({ type: 'CLOSE_HELP' }),
      restart: () => ({ type: 'RESTART' }),
      'play-again': () => ({ type: 'PLAY_AGAIN' })
    };
    if (actions[action]) dispatch(actions[action]());
  }

  function renderBoard() {
    const openCells = state.board.filter(value => !value).length;
    elements.boardStatus.textContent = `${openCells} cell${openCells === 1 ? '' : 's'} remain. Win three cells in a line.`;
    elements.cells.forEach((button, index) => {
      const mark = state.board[index];
      button.classList.toggle('mark-x', mark === 'x');
      button.classList.toggle('mark-o', mark === 'o');
      button.classList.toggle('pending', state.pendingCell === index);
      button.textContent = mark ? mark.toUpperCase() : '';
      const status = mark === 'x' ? 'secured by you' : mark === 'o' ? 'breached by the alien' : 'empty';
      button.setAttribute('aria-label', `${cellName(index)}, ${status}`);
      button.disabled = state.screen !== 'board' || Boolean(mark);
    });
  }

  function renderBattle() {
    const attack = GameEngine.attackForExchange(state.exchangeIndex);
    const cellIndex = state.pendingCell ?? state.resolvedCell;
    elements.pendingCell.textContent = cellIndex === null ? '—' : String(cellIndex + 1).padStart(2, '0');
    elements.exchangeNumber.textContent = String(Math.min(state.exchangeIndex + 1, 3));
    elements.alienAttack.textContent = attack.toUpperCase();
    elements.playerHealth.textContent = `${state.playerHealth} / 2`;
    elements.alienHealth.textContent = `${state.alienHealth} / 2`;
    elements.playerHealthBar.style.width = `${state.playerHealth * 50}%`;
    elements.alienHealthBar.style.width = `${state.alienHealth * 50}%`;
    const inputPhase = state.screen === 'battle-input';
    elements.responseControls.hidden = !inputPhase;
    elements.responseButtons.forEach(button => { button.disabled = !inputPhase; });
    elements.feedbackPanel.hidden = state.screen !== 'battle-feedback';
    elements.feedbackCopy.textContent = state.feedback;
    elements.battleSummary.hidden = state.screen !== 'battle-summary';
    elements.summaryTitle.textContent = state.battleOutcome === 'win' ? 'CELL SECURED' : 'CELL BREACHED';
    elements.summaryCopy.textContent = battleSummaryCopy();
  }

  function battleSummaryCopy() {
    return state.battleOutcome === 'win'
      ? 'The alien recoils. Your X is locked into the grid.'
      : 'The breach spreads. An O is locked into the grid.';
  }

  function resultCopy() {
    if (state.boardOutcome === 'x-win') return 'Containment restored. You completed three X cells in a line.';
    if (state.boardOutcome === 'o-win') return 'Containment failed. The alien completed three O cells in a line.';
    return 'No open cells remain. The station survives in a fragile stalemate.';
  }

  function renderResult() {
    const titles = { 'x-win': 'CONTAINMENT RESTORED', 'o-win': 'CELL BREACH COMPLETE', draw: 'STALEMATE' };
    elements.resultHeading.textContent = titles[state.boardOutcome] || 'MISSION COMPLETE';
    elements.resultCopy.textContent = resultCopy();
    elements.miniBoard.innerHTML = state.board.map((mark, index) =>
      `<span aria-label="${cellName(index)}, ${mark ? mark.toUpperCase() : 'empty'}">${mark ? mark.toUpperCase() : ''}</span>`
    ).join('');
  }

  function render() {
    const screen = screenForState(state.screen);
    elements.screens.forEach(section => { section.hidden = section.dataset.screen !== screen; });
    renderBoard();
    renderBattle();
    renderResult();
    elements.helpRestart.hidden = state.screenBeforeHelp === 'intro';

    if (screen === 'battle') CanvasAtmosphere.start(elements.canvas);
    else CanvasAtmosphere.stop();

    if (visibleScreen !== screen) {
      visibleScreen = screen;
      const heading = root.querySelector(`[data-screen="${screen}"] h1, [data-screen="${screen}"] h2`);
      if (heading) window.requestAnimationFrame(() => heading.focus());
    }
  }

  function init(documentRef) {
    root = documentRef.getElementById('app');
    if (!root) return;
    elements = {
      screens: [...root.querySelectorAll('[data-screen]')],
      cells: [...root.querySelectorAll('[data-cell-index]')],
      boardStatus: documentRef.getElementById('board-status'),
      pendingCell: documentRef.getElementById('pending-cell-label'),
      exchangeNumber: documentRef.getElementById('exchange-number'),
      alienAttack: documentRef.getElementById('alien-attack'),
      playerHealth: documentRef.getElementById('player-health'),
      alienHealth: documentRef.getElementById('alien-health'),
      playerHealthBar: documentRef.getElementById('player-health-bar'),
      alienHealthBar: documentRef.getElementById('alien-health-bar'),
      responseControls: documentRef.getElementById('response-controls'),
      responseButtons: [...root.querySelectorAll('[data-action="respond"]')],
      feedbackPanel: documentRef.getElementById('feedback-panel'),
      feedbackCopy: documentRef.getElementById('battle-feedback'),
      battleSummary: documentRef.getElementById('battle-summary'),
      summaryTitle: documentRef.getElementById('battle-summary-title'),
      summaryCopy: documentRef.getElementById('battle-summary-copy'),
      resultHeading: documentRef.getElementById('result-heading'),
      resultCopy: documentRef.getElementById('result-copy'),
      miniBoard: documentRef.getElementById('result-board'),
      statusLive: documentRef.getElementById('status-live'),
      resultLive: documentRef.getElementById('result-live'),
      helpRestart: documentRef.getElementById('help-restart'),
      canvas: documentRef.getElementById('battle-canvas')
    };
    root.addEventListener('click', handleClick);
    window.addEventListener('resize', CanvasAtmosphere.resize);
    documentRef.addEventListener('visibilitychange', () => {
      if (documentRef.hidden) CanvasAtmosphere.stop();
      else if (screenForState(state.screen) === 'battle') CanvasAtmosphere.start(elements.canvas);
    });
    render();
  }

  return { init };
})();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => GameUI.init(document));
}
