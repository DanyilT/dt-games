/**
 * Bounce: the keypad under the screen, as on a Nokia phone: two soft keys, the navi key (four ways, with a select key
 * in the middle), call and end, 1 to 9, *, 0 and #. Each is a <button data-key> in index.html.
 * - Touch and the mouse: pointer events, one for each finger, so a roll and a jump can be held together. A finger that
 *   slides onto another key moves its press there.
 * - The keyboard: ← → ↑ ↓ are the navi key, A D W S are 4 6 2 8, Space is 2, Enter is select, Esc the left soft key,
 *   Backspace the right one, and the digits, * and # are themselves.
 * A key lights up while it's held, however it's held. js/bounce.js hears each press and release (Keypad.onPress,
 * Keypad.onRelease), and asks which keys are held (Keypad.isHeld).
 */
const Keypad = (() => {
    const pad = document.getElementById('keypad');
    const held = new Map(); // phone key → how many things hold it (fingers, keyboard keys)
    const fingers = new Map(); // pointerId → the phone key it holds
    const keys = new Map(); // the keyboard's key (KeyboardEvent.code) → the phone key it holds
    let pressHandler = () => {};
    let releaseHandler = () => {};

    // The keyboard's keys, and the phone key each one is
    const KEYBOARD = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: '4', d: '6', w: '2', s: '8', ' ': '2', Enter: 'select', Escape: 'soft-left', Backspace: 'soft-right',
        1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 0: '0', '*': 'star', '#': 'hash',
    };

    // A key's button lit while anything holds it
    function light(key) {
        pad.querySelector(`[data-key="${key}"]`)?.classList.toggle('lit', held.has(key));
    }

    // One more thing holds a key: lit, and pressed if it's the first
    function hold(key) {
        const count = held.get(key) ?? 0;
        held.set(key, count + 1);
        if (count > 0) return;
        light(key);
        pressHandler(key);
    }

    // One thing fewer holds a key: let go once nothing does
    function letGo(key) {
        const count = held.get(key) ?? 0;
        if (count === 0) return;
        if (count > 1) {
            held.set(key, count - 1);
            return;
        }
        held.delete(key);
        light(key);
        releaseHandler(key);
    }

    // Every key let go (the page lost the keyboard, or the game asks: a pause clears the keys held, as on the phone)
    function releaseAll() {
        fingers.clear();
        keys.clear();
        for (const key of [...held.keys()]) {
            held.set(key, 1);
            letGo(key);
        }
    }

    // The phone key under a point on the page, or null
    function keyAt(x, y) {
        const element = document.elementFromPoint(x, y)?.closest('[data-key]');
        return element && pad.contains(element) ? element.dataset.key : null;
    }

    pad.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || GameHub.replaying) return;
        const key = e.target.closest('[data-key]')?.dataset.key;
        if (!key) return;
        e.preventDefault(); // No focus, no text selection, no double-tap zoom
        try {
            pad.setPointerCapture(e.pointerId);
        } catch (error) {
            // The pointer has gone already (a synthetic event): it still presses
        }
        fingers.set(e.pointerId, key);
        hold(key);
    });

    // A finger sliding onto another key moves its press there (off the keys, it keeps the one it had)
    pad.addEventListener('pointermove', (e) => {
        const key = fingers.get(e.pointerId);
        if (key === undefined) return;
        const under = keyAt(e.clientX, e.clientY);
        if (!under || under === key) return;
        fingers.set(e.pointerId, under);
        letGo(key);
        hold(under);
    });

    // A finger lifted (or the browser took it back)
    function lift(e) {
        const key = fingers.get(e.pointerId);
        if (key === undefined) return;
        fingers.delete(e.pointerId);
        letGo(key);
    }
    pad.addEventListener('pointerup', lift);
    pad.addEventListener('pointercancel', lift);
    pad.addEventListener('lostpointercapture', lift);
    pad.addEventListener('contextmenu', (e) => e.preventDefault()); // A long press isn't a menu

    // The phone key a keyboard event is, or undefined (letters with Shift are the Easter egg's, js/qwerty.js, and what's typed into a field is the field's)
    function keyOf(e) {
        if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea')) return undefined;
        const name = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (e.shiftKey && /^[a-z]$/.test(name)) return undefined;
        return KEYBOARD[name];
    }

    document.addEventListener('keydown', (e) => {
        if (GameHub.replaying) return;
        const key = keyOf(e);
        if (key === undefined) return;
        if (e.target.closest?.('button, a, input, select, textarea') && !pad.contains(e.target) && (e.key === 'Enter' || e.key === ' ')) return;
        e.preventDefault(); // Not a scroll, and not a click on a button that still has the focus
        if (e.repeat || keys.has(e.code)) return;
        keys.set(e.code, key);
        hold(key);
    });

    document.addEventListener('keyup', (e) => {
        const key = keys.get(e.code);
        if (key === undefined) return;
        keys.delete(e.code);
        letGo(key);
    });

    // The keyboard and the fingers gone elsewhere: nothing is held any more
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) releaseAll();
    });

    return Object.freeze({
        set onPress(handler) {
            pressHandler = handler;
        },
        set onRelease(handler) {
            releaseHandler = handler;
        },
        isHeld(key) {
            return held.has(key);
        },
        releaseAll,
        // A press and release from the page itself
        tap(key) {
            hold(key);
            letGo(key);
        },
    });
})();
