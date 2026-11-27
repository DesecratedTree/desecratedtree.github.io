// DUNKSTAR — every tunable constant lives here.
// Coordinates live in "arena" space. The arena starts at the original
// 1280 x 720 landscape design and is resized to the viewport shape by
// layout.js, which also re-anchors the hoop and launch pads.

export const ARENA = { W: 1280, H: 720 };

// Shape of the current layout, set by layout.js.
export const LAYOUT = { portrait: false };

// Flip the whole hoop/ball layout left-right. Physics and rendering both obey it.
export const MIRROR = false;

export const TIME = {
  match: 120,        // StarDunk's two-minute contest
  countdown: 3.0,
  respawnDelay: 0.24,
  resultsDelay: 0.7,
};

export const BALL = {
  r: 22,
  gravity: 2100,     // arena units / s^2
  drag: 0.045,       // linear air drag per second
  restRim: 0.62,
  restBoard: 0.5,
  friction: 0.86,
  maxAge: 6,
  trail: 13,
};

export const SHOT = {
  minSpeed: 1350,
  maxSpeed: 2500,
  dragMin: 86,       // swipe length in arena units before a shot is armed
  dragMax: 520,      // full power swipe
  minUp: 0.16,       // drag must be at least this upward (normalized y)
  // The dotted preview covers ~two thirds of the shot's real arc: enough to
  // read the line and the drop, never the whole flight.
  guideFraction: 0.67,
  guideHorizon: 2.2,
  guideSamples: 150,
};

export const HOOP = {
  right: 1160,       // the rim's fixed back edge (board side)
  cy: 320,
  half: 86,          // initial rim half-opening
  // The rim changes size and height after every made basket. These bounds
  // keep it attached to the board and comfortably away from the launch pads.
  halfMin: 68,
  halfMax: 104,
  halfBigMax: 124,   // hard cap while the BIG RIM power-up is active
  cyMin: 292,
  cyMax: 348,
  sizeStepMin: 6,
  sizeStepMax: 20,
  yStepMin: 14,
  yStepMax: 34,
  rimR: 10,
  ellipseRy: 15,
  // The board is bolted to the rim and hangs entirely above it, so all four
  // panels sit on the ball's flight path instead of hiding below the rim.
  boardH: 172,
  boardLift: -6,     // board bottom, relative to the rim centre
  boardX: 1188,
  boardBulge: 8,
  panelCount: 4,
  netH: 102,
  bigRimScale: 1.36,
  scoreInset: 17,
};

// Every pad sits low and left of the hoop, so the shot is always a real arc
// rather than a point-blank attempt from underneath the rim.
export const PADS = [
  { x: 250, y: 612 },
  { x: 355, y: 650 },
  { x: 468, y: 596 },
  { x: 585, y: 646 },
  { x: 696, y: 578 },
  { x: 300, y: 540 },
  { x: 540, y: 548 },
];

export const PAD_JITTER = { x: 14, y: 9 };

// Hard floor on how close a launch point may sit to the rim.
export const PAD_MIN_DIST = 400;
export const PAD_MIN_DX = 300;

export const SCORE = {
  swish: 500,         // a clean make: nothing but net
  rimBasket: 200,     // a make that touched the rim or the backboard
  panelHit: 50,       // every backboard tile struck
  panelSetBonus: 500, // lighting all four tiles (also grants a power-up)
  streakStep: 0.5,    // each consecutive make adds 0.5x, swish or not
  maxMult: 10,
  doubleMult: 2,
  panelResetDelay: 0.55,
};

// Difficulty controls how much of the real shot arc the aim guide reveals and
// a flat score modifier applied to every award.
export const DIFFICULTY = {
  easy: { label: 'EASY', guideFraction: 0.85, scoreMult: 0.75, note: '85% ARC · -25% SCORE' },
  normal: { label: 'NORMAL', guideFraction: 0.67, scoreMult: 1, note: 'CURRENT ARC · 100% SCORE' },
  hard: { label: 'HARD', guideFraction: 0.35, scoreMult: 1.25, note: '35% ARC · +25% SCORE' },
};

export const DIFFICULTY_KEYS = ['easy', 'normal', 'hard'];
export const DEFAULT_DIFFICULTY = 'normal';

export function difficultyFor(key) {
  return DIFFICULTY[key] || DIFFICULTY[DEFAULT_DIFFICULTY];
}

export const POWERUPS = {
  bigRim: { duration: 10, label: 'BIG RIM', tag: 'RIM', color: '#c184ff' },
  multiball: { duration: 12, label: 'MULTIBALL', tag: 'TRIO', color: '#5cf4ff' },
  double: { duration: 10, label: 'DOUBLE SCORE', tag: '×2', color: '#ffd166' },
  blackHole: { duration: 10, label: 'BLACK HOLE', tag: 'VOID', color: '#b07cff' },
};

export const POWERUP_KEYS = Object.keys(POWERUPS);

export const COLORS = {
  bg: '#04060f',
  cyan: '#5cf4ff',
  cyanSoft: 'rgba(92,244,255,0.5)',
  magenta: '#ff3ea5',
  orange: '#ff8a2b',
  amber: '#ffc46b',
  white: '#f2fbff',
  dim: 'rgba(196,222,240,0.62)',
};

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function mirrorX(x) {
  return MIRROR ? ARENA.W - x : x;
}

/** Geometry for the rim, backboard panels and score window. */
export function hoopFor(bigRim, baseHalf = HOOP.half, baseCy = HOOP.cy) {
  const rawHalf = clamp(baseHalf, HOOP.halfMin, HOOP.halfMax) * (bigRim ? HOOP.bigRimScale : 1);
  const half = clamp(rawHalf, HOOP.halfMin, bigRim ? HOOP.halfBigMax : HOOP.halfMax);
  const cy = clamp(baseCy, HOOP.cyMin, HOOP.cyMax);
  const edge = mirrorX(HOOP.right);
  const dir = MIRROR ? 1 : -1;
  const cx = edge + dir * half;

  const panels = [];
  const bottom = cy + HOOP.boardLift;
  const top = bottom - HOOP.boardH;
  const h = HOOP.boardH / HOOP.panelCount;
  for (let i = 0; i < HOOP.panelCount; i++) {
    const y0 = top + i * h;
    const y1 = y0 + h;
    const t0 = (i + 0.12) / HOOP.panelCount;
    const t1 = (i + 0.88) / HOOP.panelCount;
    const x0 = mirrorX(HOOP.boardX + HOOP.boardBulge * Math.sin(Math.PI * t0));
    const x1 = mirrorX(HOOP.boardX + HOOP.boardBulge * Math.sin(Math.PI * t1));
    panels.push({
      i,
      ax: x0, ay: y0 + 5,
      bx: x1, by: y1 - 5,
      r: 6,
      y0, y1,
      x: Math.min(x0, x1) - 8,
      w: 42,
    });
  }

  return {
    cx,
    cy,
    half,
    boardTop: top,
    boardBottom: bottom,
    right: edge,
    knobR: HOOP.rimR,
    ry: HOOP.ellipseRy,
    boardX: mirrorX(HOOP.boardX),
    panels,
    scoreHalf: Math.max(12, half - HOOP.scoreInset),
    netH: HOOP.netH,
    mirrored: MIRROR,
  };
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatScore(n) {
  return Math.round(n).toLocaleString('en-US');
}
