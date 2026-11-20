// Responsive arena layout.
//
// The playfield is NOT stretched: its logical size is derived from the viewport
// aspect, and every anchor (rim, backboard, launch pads) is re-derived from that
// size. The canvas therefore maps 1:1 onto the screen with a single uniform
// scale, so the ball stays round and the rim keeps its proportions on a phone,
// a laptop, an ultrawide or a 4K display.
//
// Landscape keeps the original 1280 x 720 tuning exactly; portrait switches to a
// tall arena (the shape StarDunk itself ships in) with the rim high-right and the
// pads in the lower band.
import { ARENA, HOOP, LAYOUT, PADS, clamp } from './config.js';

// Original 16:9 pad set, in 1280 x 720 units.
const LANDSCAPE_PADS = [
  { x: 250, y: 612 },
  { x: 355, y: 650 },
  { x: 468, y: 596 },
  { x: 585, y: 646 },
  { x: 696, y: 578 },
  { x: 300, y: 540 },
  { x: 540, y: 548 },
];

// Portrait pads as fractions of the arena, so they stay clear of the rim at
// every tall aspect. Every pad sits at least PAD_MIN_DX left of the rim.
const PORTRAIT_PADS = [
  { x: 0.1, y: 0.86 },
  { x: 0.2, y: 0.9 },
  { x: 0.3, y: 0.82 },
  { x: 0.14, y: 0.78 },
  { x: 0.26, y: 0.74 },
  { x: 0.08, y: 0.92 },
  { x: 0.22, y: 0.7 },
];

/**
 * Fit the logical arena to a viewport. Mutates the shared config objects so the
 * physics solver, renderer and HUD all read the same geometry.
 * @returns {{W:number,H:number,portrait:boolean}}
 */
export function applyLayout(vw, vh) {
  const aspect = clamp(Math.max(1, vw) / Math.max(1, vh), 0.39, 3.6);
  const portrait = aspect < 1;

  if (portrait) {
    // A narrower world unit means the ball and rim stay readable on a phone.
    ARENA.W = 660;
    ARENA.H = Math.round(clamp(660 / aspect, 820, 1700));
  } else {
    ARENA.H = 720;
    ARENA.W = Math.round(clamp(720 * aspect, 900, 2560));
  }
  LAYOUT.portrait = portrait;

  PADS.length = 0;

  if (portrait) {
    const W = ARENA.W;
    const H = ARENA.H;

    // Backboard hugs the right wall; the rim sits high enough to leave the
    // lower third free for the launch pads.
    HOOP.right = W - 62;
    HOOP.boardX = W - 34;
    HOOP.boardBulge = 6;
    HOOP.cy = Math.round(H * 0.34);
    HOOP.cyMin = Math.round(H * 0.3);
    HOOP.cyMax = Math.round(H * 0.38);

    for (const p of PORTRAIT_PADS) {
      PADS.push({ x: Math.round(p.x * W), y: Math.round(p.y * H) });
    }
  } else {
    const W = ARENA.W;
    const k = W / 1280;

    HOOP.right = W - 120;
    HOOP.boardX = W - 92;
    HOOP.boardBulge = 8;
    HOOP.cy = 320;
    HOOP.cyMin = 292;
    HOOP.cyMax = 348;

    for (const p of LANDSCAPE_PADS) {
      PADS.push({ x: Math.round(p.x * k), y: p.y });
    }
  }

  return { W: ARENA.W, H: ARENA.H, portrait };
}
