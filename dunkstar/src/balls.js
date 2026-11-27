// The ball catalog. CLASSIC uses the supplied PNG; the rest are procedural
// neon skins generated in code, so no external art is required. `unlockAt` is
// the BEST score required before the ball can be equipped.
export const BALLS = [
  {
    id: 'classic',
    name: 'CLASSIC',
    kind: 'image',
    src: './assets/basketball.png',
    unlockAt: 0,
    glow: 'rgba(255, 140, 40, 0.35)',
    tint: 'rgba(255, 150, 60, 0.15)',
    note: 'THE ORIGINAL',
  },
  {
    id: 'aurora',
    name: 'AURORA',
    kind: 'procedural',
    pattern: 'aurora',
    unlockAt: 5000,
    glow: 'rgba(92, 244, 255, 0.4)',
    tint: 'rgba(92, 244, 255, 0.15)',
    palette: {
      light: '#c8fff2',
      mid: '#24c9d8',
      base: '#063247',
      edge: '#6cfff3',
    },
    note: 'POLAR STREAK',
  },
  {
    id: 'nova',
    name: 'NOVA',
    kind: 'procedural',
    pattern: 'nova',
    unlockAt: 12000,
    glow: 'rgba(255, 80, 140, 0.38)',
    tint: 'rgba(255, 80, 140, 0.15)',
    palette: {
      light: '#fff2c6',
      mid: '#ff9a3c',
      base: '#4a071c',
      edge: '#ff4b7a',
    },
    note: 'SOLAR FLARE',
  },
  {
    id: 'void',
    name: 'VOID',
    kind: 'procedural',
    pattern: 'void',
    unlockAt: 25000,
    glow: 'rgba(127, 92, 255, 0.4)',
    tint: 'rgba(127, 92, 255, 0.17)',
    palette: {
      light: '#b8a8ff',
      mid: '#5039a8',
      base: '#090b22',
      edge: '#8b6cff',
    },
    note: 'EVENT HORIZON',
  },
  // Placeholder high-score skins: swap the art later, keep the unlock gates.
  {
    id: 'pulsar',
    name: 'PULSAR',
    kind: 'procedural',
    pattern: 'pulsar',
    unlockAt: 35000,
    glow: 'rgba(70, 230, 255, 0.42)',
    tint: 'rgba(70, 230, 255, 0.16)',
    palette: {
      light: '#f4ffff',
      mid: '#46e6ff',
      base: '#031c33',
      edge: '#ff5ce0',
    },
    note: 'NEUTRON CORE',
  },
  {
    id: 'nebula',
    name: 'NEBULA',
    kind: 'procedural',
    pattern: 'nebula',
    unlockAt: 50000,
    glow: 'rgba(160, 92, 255, 0.4)',
    tint: 'rgba(160, 92, 255, 0.16)',
    palette: {
      light: '#ffd9ff',
      mid: '#a05cff',
      base: '#26063f',
      edge: '#ff6bd6',
    },
    note: 'STAR CLOUD',
  },
  {
    id: 'prism',
    name: 'PRISM',
    kind: 'procedural',
    pattern: 'prism',
    unlockAt: 100000,
    glow: 'rgba(255, 255, 255, 0.42)',
    tint: 'rgba(140, 244, 255, 0.16)',
    palette: {
      light: '#ffffff',
      mid: '#8cf4ff',
      base: '#151033',
      edge: '#ff7ad9',
    },
    note: 'SPECTRUM CORE',
  },
  {
    id: 'eclipse',
    name: 'ECLIPSE',
    kind: 'procedural',
    pattern: 'eclipse',
    unlockAt: 150000,
    glow: 'rgba(255, 176, 46, 0.42)',
    tint: 'rgba(255, 176, 46, 0.16)',
    palette: {
      light: '#ffe9a8',
      mid: '#ffb02e',
      base: '#140a00',
      edge: '#ff7a1f',
    },
    note: 'TOTAL ECLIPSE',
  },
];

export const DEFAULT_BALL = BALLS[0].id;

const images = new Map();

export function ballById(id) {
  return BALLS.find((ball) => ball.id === id) || null;
}

export function isBallUnlocked(ball, best = 0) {
  return !!ball && best >= (ball.unlockAt || 0);
}

/** Lazily create and cache the canvas image for a classic PNG skin. */
export function getBallImage(id) {
  const ball = ballById(id);
  if (!ball || !ball.src) return null;
  let img = images.get(ball.id);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = ball.src;
    images.set(ball.id, img);
  }
  return img;
}

export function preloadBallImages() {
  for (const ball of BALLS) getBallImage(ball.id);
}
