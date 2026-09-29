# Minesweeper Game

Test your logic and luck in this classic minesweeper game. Clear the board without hitting any mines.

![Minesweeper Game on a computer](img/desktop-screenshot.png)

**[Play in GameHub](https://game-hub.danyt.workers.dev/g/minesweeper)** · [Play directly](https://minesweeper.dt-games.pages.dev) · [Source code](https://github.com/DanyilT/dt-games/tree/minesweeper)

## 👾 Controls

| Keys | Action |
| --- | --- |
| Click | Reveal a cell. On a number, reveal the cells around it (when the mines there are flagged) |
| Right-click | Place or remove a flag |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> / <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | Move the selection |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Reveal the selected cell |
| <kbd>Shift</kbd> + <kbd>Space</kbd> | Flag the selected cell |
| <kbd>M</kbd> | Switch between reveal and flag mode |
| <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> | Difficulty: Beginner / Intermediate / Expert |
| <kbd>R</kbd> | Restart |
| <kbd>I</kbd> | Show or hide the instructions |
| <kbd>Esc</kbd> | Close dialogs |

On a phone or tablet:

- **Tap** a cell to reveal it, or to flag it in flag mode (switch modes with the 🔍/🚩 button).
- **Long-press** a cell to place or remove a flag.

## 💿 Features

- Multiple difficulty levels: Beginner (9×9, 10 mines), Intermediate (16×16, 40 mines) and Expert (30×16, 99 mines)
- Timer and mine counter
- First-click safety: the first cell you open is never a mine
- Flag system, with a flag mode for touch screens
- Wins counted for each level (the ⭐ in the Game menu)
- Classic Windows 9x style
- Mobile-friendly
- Easter Egg

## 👀 Links

- **Play in GameHub:** https://game-hub.danyt.workers.dev/g/minesweeper
- **Play directly:** https://minesweeper.dt-games.pages.dev
- **Source code:** https://github.com/DanyilT/dt-games/tree/minesweeper
- **The other games:** [Snake](https://github.com/DanyilT/dt-games/tree/snake), [Tetris](https://github.com/DanyilT/dt-games/tree/tetris) and [Sudoku](https://github.com/DanyilT/dt-games/tree/sudoku), each on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games)
- **GameHub**, the site with all my games: https://github.com/DanyilT/game-hub
- **Where it came from:** the `minesweeper/` folder of [DanyilT/WebDev](https://github.com/DanyilT/WebDev/tree/page/games/minesweeper), branch `page/games`

## 🔌 Run it locally

It's plain HTML, CSS and JavaScript: no build step, nothing to install. Serve the folder with any static server, for example:

```bash
python3 -m http.server
```

Then open http://localhost:8000.

## 📥 Get just this game

Every game lives on its own branch of [DanyilT/dt-games](https://github.com/DanyilT/dt-games). To clone only this one:

```bash
git clone --branch minesweeper --single-branch https://github.com/DanyilT/dt-games.git minesweeper
```

## 🧻 License

This game is licensed under the [MIT License](LICENSE).
