# Alien: Cell Breach — Rules

## Counter table

| Alien attack | Correct response | Correct result | Incorrect result |
|---|---|---|---|
| Laser | Shield | Alien loses 1 health | Player loses 1 health |
| Shield | Blast | Alien loses 1 health | Player loses 1 health |
| Claw | Dodge | Alien loses 1 health | Player loses 1 health |

Both combatants begin each cell battle with 2 health. The first to reach 0 determines the mark: player victory places X; alien victory places O.

## State transitions

| Current state | Allowed action | Result |
|---|---|---|
| Intro | Begin containment | Open a new empty board. |
| Intro | How to play | Open Help; Close help returns to Intro. |
| Board | Select an empty cell | Lock the board and begin a fresh battle for that cell. |
| Board | Select an occupied cell | No change. |
| Battle input | Shield, Blast, or Dodge | Resolve exactly one exchange and show feedback, or end the battle immediately at 0 health. |
| Battle feedback | Next exchange | Advance to the next alien attack and re-enable responses. |
| Battle summary | Return to board | Show the awarded X or O on the board. |
| Board result | Play again | Clear all state and open a new board. |
| Any gameplay state | How to play | Open Help while preserving the exact game state. |
| Help | Close help / Return to mission | Restore the preserved state. |
| Board, battle, result, or Help | Restart game | Clear the board and active battle, reset health, and return to the board. |

After every awarded mark, the game checks all eight three-cell lines before checking for a draw. There is no automatic opponent turn: every mark is earned through a battle.
