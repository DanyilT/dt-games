# Sudoku Game

Challenge your mind with this classic Japanese number puzzle game. Fill the grid following Sudoku rules.

![Sudoku Game on a computer](img/desktop-screenshot.png)

**[Play in GameHub](https://game-hub.danyt.workers.dev/g/sudoku)** · [Play directly](https://sudoku.dt-games.pages.dev) · [Source code](https://github.com/DanyilT/dt-games/tree/sudoku)

## 👾 Controls

| Keys | Action |
| --- | --- |
| Click | Select a cell |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> / <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | Move around the grid |
| <kbd>1</kbd> … <kbd>9</kbd> | Fill in the number |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Clear the cell |
| <kbd>Enter</kbd> | Check the solution (when no cell is selected) |
| <kbd>Shift</kbd> + <kbd>Enter</kbd> | Check the solution |
| <kbd>Shift</kbd> + <kbd>1</kbd> … <kbd>5</kbd> | Difficulty: For a Bread / Easy / Medium / Hard / Expert |
| <kbd>R</kbd> | New game |
| <kbd>I</kbd> | Show or hide the info (your wins and the instructions) |

On a phone or tablet:

- **Tap** a cell, then a number on the pad (✕ clears the cell).

## ✨ Features

- Multiple difficulty levels, from For a Bread (61 numbers given) to Expert (11 given)
- Auto-save progress: close the page and carry on later
- Validation: numbers that clash turn red
- Number highlighting: select a given number to see where else it is
- Achievement tracking: your wins for each level
- Modern neumorphic design
- Mobile-friendly: a number pad instead of the phone's keyboard
- Easter Egg

## 👀️ Links

- **Play in GameHub:** https://game-hub.danyt.workers.dev/g/sudoku
- **Play directly:** https://sudoku.dt-games.pages.dev
- **Source code:** https://github.com/DanyilT/dt-games/tree/sudoku
- **The other games:** [Snake](https://github.com/DanyilT/dt-games/tree/snake), [Tetris](https://github.com/DanyilT/dt-games/tree/tetris) and [Minesweeper](https://github.com/DanyilT/dt-games/tree/minesweeper), each on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games)
- **GameHub**, the site with all my games: https://github.com/DanyilT/game-hub
- **Where it came from:** the `sudoku/` folder of [DanyilT/WebDev](https://github.com/DanyilT/WebDev/tree/page/games/sudoku), branch `page/games`

## 🔌 Run it locally

It's plain HTML, CSS and JavaScript: no build step, nothing to install. Serve the folder with any static server, for example:

```bash
python3 -m http.server
```

Then open http://localhost:8000.

## 💿 Get just this game

Every game lives on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games). To clone only this one:

```bash
git clone --branch sudoku --single-branch https://github.com/DanyilT/dt-games.git sudoku
```

## 🧻 License

This game is licensed under the [MIT License](LICENSE).
