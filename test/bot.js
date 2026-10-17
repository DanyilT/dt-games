/**
 * Replay test: Bounce's bot (test/index.html, with test/check.js)
 *
 * Each game is one level, one run. From the menu the bot starts a new game (level 1) or picks a level it has reached;
 * on "Level completed" it goes on to the next. It then plays the level's winning route (ROUTES: the keys to hold, step
 * by step, found by a search through js/rules.js) through the page's own controls: the keyboard (← → ↑, A D W, Space,
 * 4 6 2), or the keypad's buttons, with a finger for each key, so roll and jump are often two fingers at once, and a
 * finger now and then slides from one key onto another. The bot steps the game itself (as the page does every 40 ms),
 * so a level takes no time. Now and then it opens the menu (Esc, or the left soft key) and carries on (Continue, or
 * Esc again, which chooses it), and in about one game in four it strays from the route with random keys until
 * the last ball pops (or gives the level up with a new game if that takes too long, and that run isn't kept).
 */
window.ReplayBot = (function () {
    const STRAY_STEPS = 6000; // steps a straying game may take to lose before it's given up

    // Each level's winning route: the keys held (1 left, 2 right, 4 jump) for so many steps, as "keys*steps,…"
    const ROUTES = {
        1: '1*4,2*7,6*31,5*1,6*24,2*4,6*20,2*13,6*27,5*2,1*6,6*13,2*18,6*2,4*16,6*35,2*10,6*29,5*5,2*13,6*30,2*17,6*15,1*5,4*2,6*5,2*3,5*7,6*6,5*3,6*16',
        2: '6*7,5*10,0*18,6*13,4*11,6*18,2*15,5*3,6*16,4*18,5*2,0*10,6*6,2*22,6*11,2*6,1*12,5*20,6*12,2*19,6*3,4*22,6*5,4*7,0*6,6*8,2*31,0*6,2*20,1*13,5*4,2*1,4*6,2*16,6*22,2*3,6*4,4*16,0*8,2*17,1*16,2*9,6*4,4*3,6*17,5*7,6*1,5*1,2*16,6*1,4*16,6*7,4*5,2*13,5*4,6*15,5*9,2*13,6*9,0*15,2*17,1*3,4*9,6*43,5*4,6*49,2*2,6*19,2*8,6*17,1*18,5*8,1*7,5*7,4*1,5*13,2*9,6*2,4*3,5*6,4*2,2*35,5*12,1*8,2*24',
        3: '1*12,5*20,4*3,1*21,2*2,5*3,6*2,1*35,5*27,6*10,1*15,5*19,1*18,6*11,1*16,6*9,1*12,0*9,6*18,2*8,5*26,2*20,0*16,5*19,2*10,5*4,6*19,2*7,5*5,4*6,6*1,2*1,6*55,5*4,1*9,5*41,2*18,1*3,2*8,6*13,1*16,6*6,5*6,6*13,2*15,4*5,5*5,6*3,0*16,6*10,2*18,4*3,2*6,6*44,2*14,1*18,6*14,5*3,2*23,6*7,1*10,5*19,6*12,5*3,2*19,5*9,2*2,5*14,6*13,2*20,6*31,2*14,5*9,6*5,1*8,5*11,4*13,1*36,2*5,6*4,5*18,1*20,2*8,5*12,0*19,6*19,1*15,2*10,6*5,0*13,5*12,6*18,2*10,5*21,4*14,5*21,4*5,2*4,5*5,4*16,5*16,2*2,1*7,5*30,1*2,5*14,2*22,6*3,1*15',
        4: '2*10,5*16,6*3,0*3,1*9,4*5,1*3,6*6,5*9,2*12,5*12,6*31,1*17,6*16,2*20,5*7,6*16,0*4,6*40,5*5,2*18,6*8,4*17,0*12,1*7,6*14,1*11,6*9,5*16,4*17,6*1,1*12,4*18,0*12,1*18,5*30,4*18,5*18,4*5,6*16,4*5,6*20,2*12,1*1,2*23,0*8,5*17,6*7,1*16,2*6,5*17,4*18,5*3,2*4,5*48,2*11,1*15,5*19,6*1,1*14,0*6,2*2,4*2,5*14,1*14,6*10,5*19,6*2,4*9,5*16,6*4,1*35,6*9,5*15,6*14,5*8,4*3,1*1,5*9,1*15,5*23,6*3,1*1,5*15,4*2,5*6,4*12,6*48,1*6,2*22,4*8,6*29,0*18,1*7,5*36,2*5,1*7',
        5: '1*12,5*2,1*13,6*9,4*2,1*12,5*5,1*1,5*17,6*1,4*17,2*14,1*14,5*4,1*18,2*3,6*20,0*23,6*36,5*12,6*20,1*10,0*13,6*34,0*18,2*16,6*19,5*29,6*4,2*6,5*18,2*14,6*6,4*3,0*10,1*14,0*3,1*40,6*8,2*14,5*6,2*1,5*13,6*9,2*11,5*19,4*9,5*15,1*3,5*16,1*31,6*19,1*4,2*7,5*12,4*38,5*20,2*1,1*13,2*4,5*3,2*44,5*12,4*11,6*6,1*16,5*10,2*2,6*17,1*14,2*15,5*8,6*41,5*2,2*13,6*33,2*12,6*17,2*13,5*20,6*6,4*15,1*1,4*2,6*14,2*5,4*14,6*11,2*20,1*8,2*5,6*8,4*3,1*11,6*19,4*7,1*20,4*3,2*13,6*18,5*13,6*8,5*12,0*10,6*3,5*16,2*14,5*8,1*17,2*1,5*9,6*41,2*17,5*5,1*16,2*3,6*29,5*19,6*18,5*1,1*8,6*15,2*31,5*15,6*23,5*17,6*15,4*39,5*18,4*5,6*23,4*13,6*5,4*17,1*5,0*6,6*37,1*19,2*11,5*15,1*21,5*41,2*9,4*6,5*20,6*28,5*19,2*14,6*10,1*4,6*16,1*32,2*2,6*8,1*14,4*10,5*13,6*17,2*5,6*1,2*5,4*4,6*16,2*5,6*18,2*20,5*3,2*22',
        6: '4*36,1*12,5*6,1*11,5*28,0*14,6*24,4*20,2*16,6*9,4*5,6*34,5*4,4*3,0*15,2*18,5*11,6*4,1*11,2*15,6*24,2*2,1*18,2*9,5*38,2*16,5*7,6*2,1*18,4*20,2*9,5*2,4*5,2*5,6*20,4*7,2*18,6*10,2*11,6*4,5*18,6*13,0*10,4*13,2*2,1*8,6*2,1*11,6*16,5*7,2*20,6*8,2*20,6*1,4*17,1*7,2*5,5*4,6*7,5*16,1*8,6*12,1*10,5*6,1*20,5*19,1*10,5*19,4*10,2*11,6*7,5*18,2*6,4*10,5*38,1*10,4*12,1*1,4*6,1*20,5*36,2*10,6*16,2*25,6*28,2*12,6*3,1*14,2*20,6*40,1*6,4*5,1*6,6*27,2*15,4*9,1*6,5*4,6*18,0*4,4*5,1*13,0*6,2*19,4*7,6*5,4*10,6*8,5*3,6*9,2*25,4*19,6*5,1*12,2*17,1*16,2*14,1*7,6*26,5*15,6*19,4*37,6*30,2*12,6*7,5*15,2*20,5*7,4*10,1*4,0*9,2*17,6*9,1*7,5*33,2*1,5*16,2*16,1*5,6*8,4*11,1*11,5*5,4*18,1*19,5*7,6*22,5*9,1*11,4*13,2*4,6*14,5*18,6*7,1*20,5*7,4*18,5*7,4*14,1*18,4*3,6*30,0*4,4*12,5*20,6*6,4*13,5*9,1*15,0*5,1*5,4*27,2*11,1*1,5*2,1*19,6*5,1*5,2*18,6*5,2*19,5*18,4*5,1*16,6*5,5*21,6*7,2*1,0*17,1*5,5*8,6*2,5*8,6*5,4*12,1*17,4*10,1*31,2*36,4*12,5*15,6*8,5*24,2*6,6*2,1*14,0*17,5*12,0*13,2*20,6*20,4*2,6*18,2*12,6*17,2*25,5*1,6*19,0*36,4*3,2*13,1*20,2*7,6*20,5*1,6*8,1*62,5*38,1*25,2*6,4*4,5*56,0*6,6*8,4*7,6*7,1*14,6*8,2*14,6*23,1*8,5*7,6*7,5*1,6*15',
        7: '2*34,1*13,5*8,6*6,2*3,6*3,4*13,1*1,6*25,4*13,5*4,2*7,5*6,2*18,6*8,1*20,5*22,6*30,5*18,6*29,2*10,6*17,4*14,2*20,6*19,2*13,4*25,1*9,2*11,6*17,4*34,2*20,6*2,5*4,1*31,5*29,4*9,6*10,1*3,2*34,6*7,5*14,4*3,5*4,6*38,5*11,6*18,4*9,2*51,4*16,1*3,4*17,2*8,1*19,2*4,1*4,4*6,1*15,5*55,2*13,5*20,6*18,1*8,5*20,2*7,4*24,1*10,0*8,4*21,5*7,1*9,5*3,6*10,5*19,2*15,6*15,5*20,4*12,2*7,6*10,4*19,6*8,1*8,6*25,0*18,2*5,1*8,6*23,2*28,0*2,5*20,6*9,2*6,1*11,2*30,4*16,2*18,4*7,2*17,5*1,2*11,6*2,5*14,6*6,2*15,1*6,0*16,2*12,6*23,2*3,6*17,5*17,6*19,4*13,2*26,6*4,5*19,4*37,5*11,2*6,1*17,4*9,6*2,2*7,6*11,2*3,6*8,4*4,6*7,1*8,4*18,6*17,5*14,2*14,5*5,0*17,5*20,6*11,1*15,6*8,0*6,6*12,4*14,5*18,4*9,2*3,1*18,4*5,1*18,5*12,6*3,0*16,5*8,6*9,1*5,5*11,1*5,2*1,6*10,5*20,6*10,2*7,5*16,6*15,0*27,6*7,5*9,4*1,0*3,1*11,5*22,2*8,5*8,2*14,5*18,1*22,5*17,4*20,6*2,4*9,5*16,1*1,2*14,0*13,6*71,2*26,6*15,4*12,2*2,5*5,6*4,5*18,2*15,6*3,2*17,6*5,2*9,6*28,4*7,2*27,5*1,2*11,6*23,4*13,5*2,6*7,5*11,2*14,0*19,6*4,1*25,4*2,6*20,2*17,6*17,4*17,6*19,5*17,1*6,6*12,2*14,5*9,6*14,5*6,1*4,2*6,1*14,0*3,2*4,6*4,5*5,6*15,2*8,4*19,5*6,1*3,4*21,6*7,1*9,0*1,5*13,1*10,0*8,1*38,6*15,2*5,6*40,5*17,6*7,1*6,6*35,2*4,1*20,5*10,6*32,5*8,6*21,2*18,6*14,1*9,5*8,4*12,5*17,2*9,6*3,2*11,5*34,0*11,5*14,6*4,1*12,2*3,5*17,1*16,6*5,5*6,6*5,5*15,2*3,1*5,5*18,0*7,1*33,0*4,4*14,5*7,0*14,1*16,2*3,1*13,5*20,4*12,5*18,4*3,1*2,4*4,5*54',
        8: '2*23,5*5,6*11,1*7,5*5,2*9,1*4,0*12,2*9,4*15,2*14,1*5,0*6,1*5,6*13,2*35,6*8,5*18,2*3,0*10,2*13,0*5,2*15,6*24,2*33,1*17,6*13,2*19,6*18,5*14,4*11,2*13,5*10,1*15,2*8,5*8,6*7,1*14,2*1,6*8,1*14,0*1,5*14,2*9,5*9,2*4,5*43,6*13,5*6,1*15,5*1,2*7,5*31,2*4,0*9,4*8,5*23,6*14,4*16,1*6,5*1,6*20,5*5,4*18,5*53,0*15,2*2,1*9,5*19,1*4,5*16,4*3,5*16,6*16,5*9,2*14,4*5,1*20,6*2,4*4,5*18,2*3,5*4,2*14,1*18,2*9,0*16,1*4,5*6,6*6,5*29,4*1,6*2,4*14,5*13,2*14,5*37,6*10,0*2,1*20,6*20,2*3,6*7,1*17,5*16,1*10,6*11,5*34,2*5,1*19,5*17,6*20,5*15,6*5,5*29,2*11,5*14,2*5,4*5,5*16,1*13,5*32,2*9,1*20,4*7,6*10,5*16,6*8,4*12,6*12,2*3,5*3,6*11,5*3,6*12,5*6,6*4,5*11,4*15,1*5,2*32,5*5,6*19,1*1,5*4,4*19,1*12,2*8,1*18,4*6,5*19,2*8,5*4,1*11,6*10,4*17,2*11,4*12,6*47,5*9,2*8,6*22,0*2,6*10,2*18,0*21,5*16,4*19,5*15,1*10,0*4,4*12,1*14,6*23,1*4,6*17,2*12,6*17,5*50,6*4,2*15,6*5,1*19,4*14,1*19,2*9,6*2,1*10,2*1,1*6,6*11,1*8,6*11,5*19,4*20,5*18,4*2,6*12,5*20,4*3,6*18,5*4,4*5,2*5,1*16,5*14,2*4,6*26,4*1,6*24,0*16,4*15,6*19,2*1,0*5,2*9,5*6,6*6,0*17,6*6,1*19,2*8,5*7,6*1,2*17,6*50,2*19,4*7,1*3,0*2,6*25,4*15,6*14,2*11,1*20,4*8,5*40,2*5,4*4,0*5,4*7,1*8,2*4,1*5,2*16,5*27,1*1,5*23,6*13,1*15,4*10,6*15,0*6,5*13,2*14,5*28,6*22,1*5,6*18,4*3,5*1,6*12,2*14,5*1,4*13,0*2,2*18,4*6,6*20,5*12,2*2,0*12,5*3,2*21,6*34,1*17,5*33,2*8,6*13,2*4,1*2,0*16,1*18,6*16,2*13,4*1,5*7,6*17,5*1,6*3,1*5,4*2,1*26,2*5,6*6,2*2,4*2,5*13,0*8,1*26,5*34,4*1',
        9: '6*17,1*18,2*19,6*9,2*17,0*11,5*9,2*7,5*28,1*7,5*19,6*13,5*10,4*19,2*12,1*6,2*6,6*4,5*16,2*44,4*15,5*20,1*12,0*12,5*4,2*1,4*17,1*19,2*3,1*19,5*33,6*14,4*17,6*18,2*1,6*6,4*5,0*4,2*20,5*14,2*13,4*8,2*3,5*5,4*7,5*2,6*5,2*3,5*18,2*7,4*8,5*7,4*13,5*27,1*10,2*12,5*20,6*6,5*18,6*8,5*11,6*9,2*18,6*1,0*14,4*7,1*13,6*19,4*20,1*9,2*2,0*15,2*7,1*13,6*27,5*19,6*31,0*9,4*1,6*14,4*7,2*16,6*10,4*9,6*15,5*3,6*6,5*42,2*14,6*20,1*16,6*23,2*8,1*14,0*16,5*1,2*4,5*1,2*13,5*13,6*11,4*9,6*1,2*9,5*5,2*6,4*10,5*20,6*17,4*4,5*9,4*15,6*38,5*22,2*16,5*15,4*5,2*13,4*13,1*15,5*6,6*1,4*8,5*23,2*5,5*12,1*5,2*14,6*12,5*43,2*14,1*17,5*12,2*13,1*16,4*3,2*10,6*1,4*24,6*12,4*9,1*6,5*17,2*13,5*34,1*11,2*16,4*7,2*16,6*13,1*28,5*14,2*8,5*34,2*1,5*7,6*14,0*11,2*6,4*3,1*5,6*14,2*3,5*13,2*16,0*18,4*15,0*14,4*1,1*9,6*8,5*39,1*19,5*4,6*6,2*7,1*6,5*7,6*13,0*1,5*7,6*6,1*36,4*27,5*20,2*4,0*16,5*14,1*15,0*8,4*9,5*1,2*12,6*19,5*3,2*4,6*4,1*13,4*3,1*17,5*8,6*9,4*3,6*24,4*15,6*5,5*2,6*15,5*13,1*14,4*10,5*3,2*30,6*15,2*14,1*10,6*31,5*8,6*16,0*9,1*9,5*14,6*6,5*4,2*14,5*12,6*18,5*18,4*9,6*21,4*25,6*19,2*6,6*23,4*4,1*6,2*11,6*2,2*3,4*11,6*5,5*18,6*5,0*11,1*7,6*10,5*50,1*4,6*2',
        10: '5*13,6*11,1*11,2*6,6*13,1*4,6*29,0*14,2*13,6*29,5*2,6*9,4*9,2*9,5*4,4*2,6*13,1*11,6*7,2*9,5*2,6*9,5*23,4*19,1*8,6*24,4*19,6*15,1*25,6*5,2*1,0*15,6*13,0*10,2*9,5*10,2*4,6*10,0*10,2*30,1*10,6*15,2*11,4*11,5*16,1*12,6*23,2*17,4*20,2*18,6*17,1*16,5*16,2*21,5*16,4*2,6*24,0*20,5*11,2*12,6*7,2*14,6*20,5*19,0*20,5*16,6*4,5*17,6*4,2*3,5*20,4*15,5*15,1*1,2*2,6*6,2*22,4*14,5*10,1*11,4*5,1*14,4*11,1*3,4*11,6*2,2*12,6*12,2*9,6*2,2*3,6*24,2*1,1*10,0*11,4*15,0*17,5*5,6*20,4*5,2*19,1*14,6*18,1*1,5*18,4*17,5*18,6*8,1*18,6*22,2*8,1*17,4*18,1*27,6*11,4*19,1*20,6*19,1*14,2*10,1*2,5*5,1*14,5*40,0*3,6*28,2*22,4*1,6*12,0*8,6*7,5*2,6*12,0*6,6*25,5*35,1*11,4*18,5*10,1*18,2*9,5*16,6*27,2*34,6*61,1*8,5*4,1*6,5*3,2*3,1*9,5*6,6*1,1*19,5*10,6*1,1*17,0*4,1*10,5*12,0*8',
        11: '2*3,5*11,4*7,6*19,2*5,0*3,2*14,6*26,2*13,6*12,4*2,2*18,6*3,5*2,6*8,1*18,6*17,2*36,0*14,5*22,6*9,4*5,6*17,0*17,4*21,1*12,0*14,1*19,5*13,2*10,1*8,0*7,5*27,6*9,4*17,5*12,1*8,5*17,4*4,6*6,4*5,1*10,6*19,1*11,2*7,6*10,5*19,1*20,5*19,1*19,4*2,5*14,4*13,5*2,4*17,5*4,6*15,4*2,1*17,6*11,5*14,2*8,4*14,5*12,1*6,2*15,6*1,4*19,5*16,1*15,2*1,4*17,0*2,5*7,0*20,4*20,0*4,6*18,4*18,6*3,0*5,5*1,2*4,1*16,2*10,1*11,6*1,1*2,4*7,1*19,4*9,5*22,4*11,6*17,1*20,2*10,5*20,0*12,2*9,6*36,0*14,2*10,1*1,2*24,6*9,4*5,2*22,4*14,2*11,5*27,2*1,4*11,2*12,6*22,2*24,6*14,0*2,4*16,6*5,2*42,0*5,2*17,5*2,6*27,5*15,2*21,5*13,6*15,1*8,4*6,1*35,2*21,1*14,0*10,4*1,5*7,2*16,5*21,6*12,4*7,5*3,2*15,4*33,5*27,1*5,4*17,5*15,4*2,0*5,6*16,5*9,1*12,2*1,5*31,6*5,1*32,6*26,4*19,6*13,5*13,4*15,2*20,5*17,6*8,2*6,0*11,2*13,6*20,5*7,6*5,2*18,4*10,5*19,6*11,5*16,6*6,5*20,6*10,2*5,4*5,6*20,5*8,1*8,5*8,2*13,5*2,2*34,0*14,5*1,0*2,1*7,2*1,6*15,1*3,4*27,2*31,1*13,0*13,1*11,6*1,4*13,5*13,4*32,1*16,0*10,6*25,0*8,4*34,0*19,1*4,4*10,1*16,5*32,6*12,1*15,2*7,1*19,5*9,6*4,1*3,6*17,4*9,1*20,6*10,2*1,1*17,4*7,6*9,5*5,4*37,5*5,1*18,6*17,1*14,5*6,4*12,5*83,2*11,1*11,5*18,6*8,4*11,2*7,1*37,6*12,4*20,5*12,6*30,5*17,0*4,1*8,2*7,5*4,0*11,5*44,2*6,5*16,6*1,5*13,1*6,0*4,2*16,1*5,5*15,1*11,2*5,6*21,5*12,6*20,2*20,6*16,2*9,6*13,2*23,1*3,5*29,6*12,1*8,6*8,4*12,6*12,2*5,6*20,5*12,6*18,2*4,1*7,6*12,4*16,1*14,5*7,1*7,6*19,2*16,1*11,2*20,6*3,1*5,6*7,1*9,2*9,0*3,5*8,6*28,2*16,5*14,2*11,6*18,4*15,5*44,4*5,5*16,6*5,5*16,2*8,5*10,6*20,5*48,2*6,1*20,5*8,6*12,0*6,5*22,6*12,1*16,2*5,0*2,2*3,5*2,6*3,2*19,5*51,6*4,2*20,4*9,5*15,6*11,5*16,2*1,4*4,2*16,6*7,5*34,1*4,0*4,4*6,2*6,4*11,6*19,1*16,5*8,6*14,4*19,6*3,0*3,2*8,5*4,4*6,5*18,6*9,1*16,6*20,4*1,2*19,6*12,2*31,6*5,1*34,4*15,5*12,1*10,6*18,2*15,1*2,4*6,6*4,4*18,1*22,6*13,2*8,5*34,2*7,6*17,5*11,1*10,4*12,6*17,2*3,6*14,5*4,6*15,2*4,5*15,6*2,2*17,5*25,1*5,0*11,5*19,1*10,2*14,1*15,5*18,1*1,2*4,5*4,1*18,4*19,2*6,1*19,2*3,5*4,1*19,5*20,6*11,2*4,6*3,1*5,0*17,5*15,1*13,6*10,4*15,5*18,2*3,0*19,1*10,5*6,0*13,6*20,5*12,1*12,5*22,6*15,5*25,6*18,2*18,5*31,6*6,2*31,5*41,6*15,4*17,1*16,0*12,1*9',
    };

    function any(t, list) {
        return list[Math.floor(t.random() * list.length)];
    }

    // A route as the keys held at each step (step 1 first)
    function stepsOf(route) {
        return route.split(',').flatMap((part) => {
            const [keys, count] = part.split('*').map(Number);
            return Array(count).fill(keys);
        });
    }

    // Holding and letting go of the game's three keys (left, right, jump), each in a way picked when it's pressed: a
    // keyboard key, or a finger on one of the keypad's two buttons for it
    function hands(page, t) {
        const held = {}; // 1, 2, 4 → how it's held: { kind: 'keyboard', key, code } or { kind: 'finger', id, key }
        let nextFinger = 11;
        const KEYBOARD = {
            1: [['ArrowLeft', 'ArrowLeft'], ['a', 'KeyA'], ['4', 'Digit4']],
            2: [['ArrowRight', 'ArrowRight'], ['d', 'KeyD'], ['6', 'Digit6']],
            4: [['ArrowUp', 'ArrowUp'], ['w', 'KeyW'], [' ', 'Space'], ['2', 'Digit2']],
        };
        const BUTTONS = { 1: ['left', '4'], 2: ['right', '6'], 4: ['up', '2'] };

        const keyEvent = (type, key, code) => page.document.dispatchEvent(new page.KeyboardEvent(type, { key, code, bubbles: true, cancelable: true }));
        const pad = () => page.document.getElementById('keypad');
        const centre = (name) => {
            const box = pad().querySelector(`[data-key="${name}"]`).getBoundingClientRect();
            return { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
        };
        const finger = (type, id, name) => {
            pad().querySelector(`[data-key="${name}"]`).dispatchEvent(new page.PointerEvent(type, {
                ...centre(name), pointerId: id, button: 0, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 11,
            }));
        };

        function press(bit) {
            if (t.random() < 0.5) {
                const [key, code] = any(t, KEYBOARD[bit]);
                held[bit] = { kind: 'keyboard', key, code };
                keyEvent('keydown', key, code);
            } else {
                const id = nextFinger++;
                const key = any(t, BUTTONS[bit]);
                held[bit] = { kind: 'finger', id, key };
                finger('pointerdown', id, key);
            }
        }

        function release(bit) {
            const way = held[bit];
            delete held[bit];
            if (way.kind === 'keyboard') {
                keyEvent('keyup', way.key, way.code);
                return;
            }
            // Sometimes the finger slides onto the key's other button first (it holds the same key there)
            if (t.random() < 0.2) {
                const other = BUTTONS[bit].find((key) => key !== way.key);
                pad().querySelector(`[data-key="${way.key}"]`).dispatchEvent(new page.PointerEvent('pointermove', {
                    ...centre(other), pointerId: way.id, bubbles: true, cancelable: true, pointerType: 'touch',
                }));
                way.key = other;
            }
            finger('pointerup', way.id, way.key);
        }

        return {
            // Hold exactly these keys (1 left, 2 right, 4 jump)
            set(keys) {
                for (const bit of [1, 2, 4]) {
                    if (held[bit] && (keys & bit) === 0) release(bit);
                }
                for (const bit of [1, 2, 4]) {
                    if (!held[bit] && (keys & bit) !== 0) press(bit);
                }
            },
            // The page let go of everything (the menu opened): nothing is held now
            forget() {
                for (const bit of Object.keys(held)) delete held[bit];
            },
        };
    }

    // A press and release of a keypad button
    function tapKey(page, name) {
        const button = page.document.querySelector(`#keypad [data-key="${name}"]`);
        const box = button.getBoundingClientRect();
        const point = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, pointerId: 99, button: 0, bubbles: true, cancelable: true };
        button.dispatchEvent(new page.PointerEvent('pointerdown', point));
        button.dispatchEvent(new page.PointerEvent('pointerup', point));
    }

    // A key pressed and let go on the page's keyboard
    function keyTap(page, t, key, code) {
        t.key(key, page.document, { code });
        page.document.dispatchEvent(new page.KeyboardEvent('keyup', { key, code, bubbles: true }));
    }

    // Open the menu, one way or another
    function openMenu(page, t) {
        if (t.random() < 0.5) keyTap(page, t, 'Escape', 'Escape');
        else tapKey(page, 'soft-left');
    }

    // Choose the item labelled `label` on the list on the screen: down to it, then select (Enter, 5, the left soft key
    // or the navi key's middle), or a tap on it
    function choose(page, t, label) {
        const list = page.eval('screen');
        const index = list.items.findIndex((item) => item.label === label);
        if (index < 0) throw new Error(`no "${label}" on the screen`);
        if (t.random() < 0.25 && index - list.top < 8) {
            const canvas = page.document.getElementById('screen');
            const box = canvas.getBoundingClientRect();
            const y = ((15 + (index - list.top) * 12 + 4) * box.height) / 128;
            canvas.dispatchEvent(new page.PointerEvent('pointerdown', { clientX: box.left + box.width / 2, clientY: box.top + y, button: 0, bubbles: true, cancelable: true }));
            return;
        }
        while (page.eval('screen').index !== index) keyTap(page, t, 'ArrowDown', 'ArrowDown');
        const way = t.random();
        if (way < 0.4) keyTap(page, t, 'Enter', 'Enter');
        else if (way < 0.6) keyTap(page, t, '5', 'Digit5');
        else if (way < 0.8) tapKey(page, 'soft-left');
        else tapKey(page, 'select');
    }

    // From the screen the page shows, a level under way: Continue on "Level completed", or a level from the menu
    function startLevel(page, t) {
        if (page.eval('screen').type === 'text') {
            // "Level completed" (Continue), or Game over / Congrats! (OK, back to the menu)
            if (t.random() < 0.5) keyTap(page, t, 'Enter', 'Enter');
            else tapKey(page, 'soft-left');
        }
        if (page.eval('screen').type === 'game') return;
        const reached = page.eval('gameData.maxLevel');
        if (reached > 1 && t.random() < 0.6) {
            choose(page, t, 'Levels');
            const level = t.random() < 0.6 ? reached : 1 + Math.floor(t.random() * reached);
            choose(page, t, `Level ${level}`);
        } else {
            choose(page, t, 'New game');
        }
    }

    // How long GameRules.simulate() takes on each level's winning route, played to its win: lines of text
    function timeSimulate(rules) {
        const lines = [];
        let allSteps = 0;
        let allMs = 0;
        for (const [level, route] of Object.entries(ROUTES)) {
            const keys = stepsOf(route);
            const game = rules.newGame(Number(level));
            const inputs = [];
            let last = 0;
            for (let s = 0; s < keys.length && !game.over; s++) {
                if (keys[s] !== game.keys) {
                    inputs.push(s - last, keys[s]);
                    last = s;
                }
                rules.setKeys(game, keys[s]);
                rules.step(game);
            }
            const run = { seed: 0, mode: level, tick: rules.TICK, length: game.steps, inputs };
            const started = performance.now();
            const found = rules.simulate(run);
            const ms = performance.now() - started;
            allSteps += game.steps;
            allMs += ms;
            lines.push(`Level ${level}: ${game.steps} steps in ${ms.toFixed(1)} ms (${found.ok ? found.outcome : found.reason})`);
        }
        lines.push(`All: ${allSteps} steps in ${allMs.toFixed(1)} ms, ${((allMs / allSteps) * 1000).toFixed(2)} ms per 1000 steps`);
        return lines;
    }

    return {
        games: 30,
        timeSimulate,

        ready(page) {
            return page.eval('ready');
        },

        async play(page, t) {
            startLevel(page, t);
            if (page.eval('screen').type !== 'game') throw new Error('the bot couldn\'t start a level');
            t.watch();
            const level = page.eval('game.level');
            const route = stepsOf(ROUTES[level]);
            const strayAt = t.random() < 0.25 ? Math.floor(t.random() * route.length) : Infinity;
            const keys = hands(page, t);
            let wanted = 0;
            for (let step = 0; step < route.length + STRAY_STEPS && page.eval("screen.type === 'game'"); step++) {
                if (step < strayAt && step >= route.length) break; // The route ran out without a win: give up below
                if (step < strayAt) {
                    wanted = route[step];
                } else if (t.random() < 0.08) {
                    wanted = any(t, [0, 1, 2, 4, 5, 6, 6, 2]); // Straying: random keys for a while
                }
                keys.set(wanted);
                if (t.random() < 0.002) {
                    openMenu(page, t);
                    keys.forget(); // The menu let go of every key
                    if (t.random() < 0.5) choose(page, t, 'Continue');
                    else keyTap(page, t, 'Escape', 'Escape');
                    keys.set(wanted);
                }
                if (page.eval("screen.type !== 'game'")) {
                    keys.forget();
                    page.eval('carryOn')(); // The page paused by itself (it lost the keyboard): carry on
                    keys.set(wanted);
                }
                page.gameStep();
                if (step % 400 === 0) await t.pause();
            }
            keys.set(0);
            if (page.eval("screen.type === 'game'")) {
                // Still going (the route didn't win, or straying took too long): give up with a new game (the next
                // game plays it)
                openMenu(page, t);
                choose(page, t, 'New game');
            }
            await t.pause();
        },
    };
})();
