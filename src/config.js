// DUNKSTAR — every tunable constant lives here.
// Coordinates are in a fixed 1280 x 720 landscape (16:9) "arena" space.

export const ARENA = { W: 1280, H: 720 };

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
  // Short preview only. The time cap is half a second, and the hard distance
  // cap keeps a full-power shot from tracing most of the way to the rim.
  guideTime: 0.5,
  guideSteps: 26,
  guideMaxDist: 220,
};

export const HOOP = {
  right: 1160,       // the rim's fixed back edge (board side)
  cy: 300,
  half: 86,          // initial rim half-opening
  // The rim changes size and height after every made basket. These bounds
  // keep it attached to the board and comfortably away from the launch pads.
  halfMin: 68,
  halfMax: 104,
  halfBigMax: 124,   // hard cap while the BIG RIM power-up is active
  cyMin: 252,
  cyMax: 348,
  sizeStepMin: 6,
  sizeStepMax: 20,
  yStepMin: 22,
  yStepMax: 52,
  rimR: 10,
  ellipseRy: 15,
  boardTop: 190,
  boardBottom: 410,
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
  basket: 100,
  cleanBonus: 100,   // a swish is worth 200 base
  streakStep: 0.5,   // each consecutive clean make adds 0.5x
  maxMult: 10,
  doubleMult: 2,
  panelResetDelay: 0.55,
};

export const POWERUPS = {
  bigRim: { duration: 10, label: 'BIG RIM', tag: 'RIM', color: '#c184ff' },
  multiball: { duration: 12, label: 'MULTIBALL', tag: 'TRIO', color: '#5cf4ff' },
  double: { duration: 10, label: 'DOUBLE SCORE', tag: '×2', color: '#ffd166' },
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
  const top = HOOP.boardTop;
  const bottom = HOOP.boardBottom;
  const h = (bottom - top) / HOOP.panelCount;
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
