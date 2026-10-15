/**
 * Replay test: the harness (the same file in every game)
 *
 * test/index.html loads the game's own page in a frame, and test/bot.js plays it through the page's own controls: its
 * keys, clicks and buttons. Each run the game finishes is played again with the game's GameRules.simulate() (js/rules.js,
 * what GameHub's server checks runs with), and must come out as the game said: the same outcome, and the same result
 * (score, lines, level, time). A difference means the page and js/rules.js have drifted apart, and GameHub would refuse
 * that run.
 *
 * The frame is the game's index.html under a name of its own (data-game="<game>-replay-test"), so the game saves under
 * <game>-replay-testGameData instead of the player's <game>GameData: their best score and game in progress are left as
 * they were, and the test's own save is removed when it ends. Played on its own (not in GameHub), the game takes no
 * tickets either.
 *
 * test/bot.js defines window.ReplayBot: { games (how many to play by default), ready(frame) (whether the game can be
 * played yet), play(frame, t) (plays one game, to its end if it can) }. frame is the game's window; t is what a bot needs:
 * - t.key(key, target, options): a key pressed on the page, or on one of its elements;
 * - t.click(element) and t.rightClick(element);
 * - t.random(): a number from 0 up to 1;
 * - t.pause(): a moment for the page to draw (await it now and then);
 * - t.watch(): follows the run the game is recording now (call it after anything that may start one);
 * - t.finished: the run the game finished, with what it said, once the game has ended.
 */
(function () {
    const game = document.documentElement.dataset.game;
    const testName = `${game}-replay-test`;
    const frame = document.getElementById('game');
    const gamesField = document.getElementById('games');
    const startButton = document.getElementById('start');
    const copyButton = document.getElementById('copy');
    const summary = document.getElementById('summary');
    const log = document.getElementById('log');
    let runs = []; // The runs checked so far, as GameHub's test fixtures keep them

    gamesField.value = window.ReplayBot.games;

    // A moment for the page to draw and the game's own tasks to run (a message, not a timer: timers slow right down in
    // a hidden tab)
    function pause() {
        return new Promise((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = () => resolve();
            channel.port2.postMessage(null);
        });
    }

    // Take out what the test's game saved (the player's own save has another name)
    function removeTestSave() {
        try {
            Object.keys(localStorage).filter((key) => key.startsWith(testName)).forEach((key) => localStorage.removeItem(key));
        } catch (error) {
            // Storage is blocked: the game saved nothing either
        }
    }

    // The game's page in the frame, under the test's own name, once the game can be played
    async function loadGame() {
        const response = await fetch('../index.html', { cache: 'no-store' });
        const html = (await response.text())
            .replace(`data-game="${game}"`, `data-game="${testName}"`)
            .replace('<head>', '<head>\n    <base href="../">');
        await new Promise((resolve) => {
            frame.onload = resolve;
            frame.srcdoc = html;
        });
        const page = frame.contentWindow;
        page.confirm = () => true; // The game's "Are you sure?": yes
        page.alert = () => {};
        for (let wait = 0; wait < 200 && !window.ReplayBot.ready(page); wait++) {
            await new Promise((resolve) => setTimeout(resolve, 25));
        }
        if (!window.ReplayBot.ready(page)) throw new Error('the game didn\'t get ready');
        return page;
    }

    // What a bot is handed for one game
    function tools(page) {
        const watched = new WeakSet();
        const t = {
            finished: null,
            random: Math.random,
            pause,
            key(key, target = page.document, options = {}) {
                target.dispatchEvent(new page.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options }));
            },
            click(element) {
                element.dispatchEvent(new page.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
            },
            rightClick(element) {
                element.dispatchEvent(new page.MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
            },
            // When the game finishes the run it's recording now, keep the run as it was then, with what the game said
            watch() {
                const run = page.eval('run');
                if (!run || typeof run.finish !== 'function' || watched.has(run)) return;
                watched.add(run);
                const finish = run.finish;
                run.finish = function (claim) {
                    const saved = run.save();
                    if (saved) t.finished = { saved, claim };
                    return finish.call(this, claim);
                };
            },
        };
        return t;
    }

    // The finished run played again with the game's own rules: what came out, and what's different from what the game
    // said (null if nothing)
    function check(page, { saved, claim }) {
        const run = { seed: saved.seed, mode: saved.mode, tick: saved.tick, length: saved.length, inputs: saved.inputs };
        const found = page.eval('GameRules').simulate(structuredClone(run)); // A const of the page's: not on its window
        let problem = null;
        if (!found.ok) {
            problem = `GameRules.simulate() refused it (${found.reason})`;
        } else if (found.outcome !== claim.outcome) {
            problem = `it came out ${found.outcome}, and the game said ${claim.outcome}`;
        } else {
            for (const { label, value } of claim.result ?? []) {
                const item = found.result.find((entry) => entry.label === label);
                if (!item || item.value !== value) {
                    problem = `${label}: ${item ? item.value : 'none'}, and the game said ${value}`;
                    break;
                }
            }
        }
        return { run, found, problem };
    }

    // What the game said at the end, in a few words: "over: Score 12"
    function describe(claim) {
        return `${claim.outcome}: ${(claim.result ?? []).map(({ label, value }) => `${label} ${value}`).join(', ')}`;
    }

    // A line in the log
    function report(text, failed = false) {
        const item = document.createElement('li');
        item.textContent = text;
        if (failed) item.className = 'failed';
        log.appendChild(item);
    }

    // Play the games, and check each run
    async function runTest() {
        startButton.disabled = true;
        copyButton.disabled = true;
        runs = [];
        log.textContent = '';
        window.replayTest = { done: false, matched: 0, failed: 0, notKept: 0 };
        const result = window.replayTest;
        const total = Math.max(1, Math.min(1000, Math.floor(Number(gamesField.value)) || window.ReplayBot.games));
        removeTestSave();
        summary.textContent = 'Loading the game…';

        try {
            const page = await loadGame();
            for (let number = 1; number <= total; number++) {
                const t = tools(page);
                await window.ReplayBot.play(page, t);
                const saved = t.finished?.saved;
                if (!saved || saved.inputs.length === 0) {
                    // GameHub keeps only finished runs with an input or more
                    result.notKept++;
                    report(`Game ${number}: not kept (${saved ? 'no inputs' : 'the bot gave up before it ended'})`);
                } else {
                    const { run, found, problem } = check(page, t.finished);
                    const fixture = { ...run, outcome: t.finished.claim.outcome, result: t.finished.claim.result };
                    if (found.ok && 'level' in found) fixture.level = found.level; // Tetris's checker gives the level too
                    runs.push(fixture);
                    if (problem) {
                        result.failed++;
                        report(`Game ${number}: ${describe(t.finished.claim)}. Different: ${problem}`, true);
                    } else {
                        result.matched++;
                        report(`Game ${number}: ${describe(t.finished.claim)}, ${saved.inputs.length / 2} inputs ✓`);
                    }
                }
                summary.textContent = `${number} of ${total} games: ${result.matched} runs matched, ${result.failed} didn't, `
                    + `${result.notKept} not kept`;
                await pause();
            }
            summary.textContent += result.failed ? '. Some runs came out differently: see below.' : '. Every run matched.';
        } catch (error) {
            result.error = error.message;
            summary.textContent = `The test stopped: ${error.message}`;
        }
        removeTestSave();
        result.done = true;
        startButton.disabled = false;
        copyButton.disabled = runs.length === 0;
    }

    // The runs checked, as JSON in GameHub's fixture shape: { seed, mode, tick, length, inputs, outcome, result }
    async function copyRuns() {
        const json = JSON.stringify(runs);
        try {
            await navigator.clipboard.writeText(json);
            copyButton.textContent = `Copied ${runs.length} runs`;
        } catch (error) {
            copyButton.textContent = 'Couldn\'t copy';
        }
        setTimeout(() => {
            copyButton.textContent = 'Copy the runs as JSON';
        }, 2000);
    }

    startButton.addEventListener('click', runTest);
    copyButton.addEventListener('click', copyRuns);
    if (new URLSearchParams(location.search).has('start')) runTest();
})();
