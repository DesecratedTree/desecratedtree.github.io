import { ARENA, LAYOUT } from './config.js';
import { applyLayout } from './layout.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { AudioEngine } from './audio.js';

// Fit the arena before the world exists so the very first frame is already
// sized for this screen.
applyLayout(window.innerWidth, window.innerHeight);

const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const ui = new UI();
const audio = new AudioEngine();
const game = new Game({ canvas, ui, audio });

let lastArena = `${ARENA.W}x${ARENA.H}`;
let relayoutTimer = 0;

function layout() {
  const vw = Math.max(1, window.innerWidth);
  const vh = Math.max(1, window.innerHeight);
  applyLayout(vw, vh);

  // Any arena change re-anchors the rim and board to the new right wall; the
  // debounce keeps a dragged window edge from rebuilding them every frame.
  const key = `${ARENA.W}x${ARENA.H}`;
  if (key !== lastArena) {
    lastArena = key;
    clearTimeout(relayoutTimer);
    relayoutTimer = setTimeout(() => game.relayout(), 160);
  }

  // One uniform scale, no stretch: the arena aspect is derived from the
  // viewport, so this exactly fills the screen on every shape.
  const scale = Math.min(vw / ARENA.W, vh / ARENA.H);
  const w = Math.max(1, Math.round(ARENA.W * scale));
  const h = Math.max(1, Math.round(ARENA.H * scale));
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.setProperty('--s', (w / ARENA.W).toFixed(5));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  game.resize(w, h, dpr);
}

ui.bind({
  play: () => {
    audio.unlock();
    audio.play('ui');
    game.startRun();
  },
  menu: () => {
    audio.play('ui');
    game.quitToMenu();
  },
  resume: () => {
    audio.play('ui');
    game.resume();
  },
  quit: () => {
    audio.play('ui');
    game.quitToMenu();
  },
  pause: () => {
    audio.play('ui');
    game.togglePause();
  },
  mute: () => {
    game.toggleMute();
  },
  balls: () => {
    audio.play('ui');
    game.openBalls();
  },
  closeBalls: () => {
    audio.play('ui');
    game.closeBalls();
  },
});

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const key = e.key.toLowerCase();

  if (key === ' ' || key === 'enter') {
    if (game.state === 'title' || game.state === 'results') {
      e.preventDefault();
      audio.unlock();
      audio.play('ui');
      game.startRun();
    } else if (game.paused) {
      e.preventDefault();
      game.resume();
    }
  }

  if (key === 'escape' || key === 'p') {
    e.preventDefault();
    game.togglePause();
  }

  if (key === 'm') {
    game.toggleMute();
  }
});

window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 120));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', layout);
}

document.addEventListener('visibilitychange', () => {
  game.handleHidden();
});

layout();

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  game.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame((now) => {
  last = now;
  requestAnimationFrame(loop);
});

// Installable / offline app shell. The service worker is optional: the game is
// fully playable without it, and it is skipped on file:// where it cannot run.
const debugMode = new URLSearchParams(window.location.search).has('debug');
if ('serviceWorker' in navigator && !debugMode && /^https?:$/.test(window.location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline caching is a bonus, never a requirement */
    });
  });
}

if (new URLSearchParams(window.location.search).has('debug')) {
  const ensurePlay = () => {
    if (game.state === 'title' || game.state === 'results') {
      game.startRun();
      game.beginPlay();
    } else if (game.state === 'countdown') {
      game.beginPlay();
    }
  };

  const drag = (x0, y0, x1, y1) => {
    ensurePlay();
    const rect = canvas.getBoundingClientRect();
    const toClient = (x, y) => ({
      clientX: rect.left + (x / ARENA.W) * rect.width,
      clientY: rect.top + (y / ARENA.H) * rect.height,
    });
    const a = toClient(x0, y0);
    const b = toClient(x1, y1);
    const base = { pointerId: 7, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true };
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...base, ...a, buttons: 1 }));
    window.dispatchEvent(new PointerEvent('pointermove', { ...base, ...b, buttons: 1 }));
    window.dispatchEvent(new PointerEvent('pointerup', { ...base, ...b, buttons: 0 }));
    return game.debugSummary();
  };

  window.__dunkstar = {
    game,
    ui,
    play: () => {
      game.startRun();
      game.beginPlay();
    },
    start: () => game.startRun(),
    skip: () => game.beginPlay(),
    state: () => game.debugSummary(),
    shootAt: (tx, ty) => {
      ensurePlay();
      return game.debugShootAt(tx, ty);
    },
    shootCenter: () => {
      ensurePlay();
      const h = game.world.hoop;
      return game.debugShootAt(h.cx, h.cy);
    },
    shootRim: () => {
      ensurePlay();
      const h = game.world.hoop;
      return game.debugShootAt(h.cx - h.half, h.cy);
    },
    shootBoard: (i = 1) => {
      ensurePlay();
      const p = game.world.hoop.panels[i];
      return game.debugShootAt((p.ax + p.bx) / 2, (p.ay + p.by) / 2);
    },
    drag,
    advance: (seconds = 1) => {
      const n = Math.max(1, Math.round(seconds / (1 / 120)));
      for (let i = 0; i < n; i++) game.step(1 / 120);
      game.updateVisual(1 / 60);
      game.effects.update(1 / 60);
      game.render(0.5);
      return game.debugSummary();
    },
    shootPoint: (tx, ty, time = 0.9) => {
      ensurePlay();
      return game.debugLaunchAtPoint(tx, ty, time);
    },
    panel: (i) => game.debugHitPanel(i),
    powerup: (type) => game.debugGrantPowerup(type),
    setTime: (t) => game.debugSetTime(t),
    kill: () => game.world.killBalls(),
    ready: () => game.world.forceReady(),
    pause: () => game.pause(),
    resume: () => game.resume(),
    menu: () => game.quitToMenu(),
    balls: () => game.openBalls(),
    selectBall: (id) => game.selectBall(id),
    closeBalls: () => game.closeBalls(),
    mute: () => game.toggleMute(),
    screens: () => ({
      title: !ui.title.classList.contains('hidden'),
      results: !ui.results.classList.contains('hidden'),
      pause: !ui.pause.classList.contains('hidden'),
      balls: !ui.ballsScreen.classList.contains('hidden'),
      hud: !ui.hud.classList.contains('hidden'),
    }),
    canvas: () => ({
      width: canvas.width,
      height: canvas.height,
      cssWidth: canvas.getBoundingClientRect().width,
      cssHeight: canvas.getBoundingClientRect().height,
    }),
    arena: () => ({
      W: ARENA.W,
      H: ARENA.H,
      portrait: LAYOUT.portrait,
      hoop: { cx: game.world.hoop.cx, cy: game.world.hoop.cy, half: game.world.hoop.half },
      pad: { ...game.world.pad },
      viewport: { w: window.innerWidth, h: window.innerHeight },
    }),
  };
}
