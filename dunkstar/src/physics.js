// Fixed-step 2D ball physics: gravity, drag, rim knobs, segmented backboard,
// swept score-plane detection and an honest aim prediction that shares the solver.

import { ARENA, BALL } from './config.js';

export const FIXED_DT = 1 / 120;
const SUBSTEPS = 2;

function damp(v, dt) {
  return v * Math.max(0, 1 - BALL.drag * dt);
}

function closestOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby || 1;
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { x: ax + abx * t, y: ay + aby * t };
}

function collideRim(ball, hoop, cb) {
  const knobs = [
    [hoop.cx - hoop.half, hoop.cy],
    [hoop.cx + hoop.half, hoop.cy],
  ];
  for (let k = 0; k < 2; k++) {
    const kx = knobs[k][0];
    const ky = knobs[k][1];
    const R = ball.r + hoop.knobR;
    const dx = ball.x - kx;
    const dy = ball.y - ky;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) continue;

    const d = Math.sqrt(d2) || 0.0001;
    const nx = dx / d;
    const ny = dy / d;
    ball.x = kx + nx * (R + 0.02);
    ball.y = ky + ny * (R + 0.02);

    const vn = ball.vx * nx + ball.vy * ny;
    ball.touchedRim = true;
    if (vn < 0) {
      const tx = -ny;
      const ty = nx;
      const vt = ball.vx * tx + ball.vy * ty;
      const nvn = -vn * BALL.restRim;
      const nvt = vt * BALL.friction;
      ball.vx = nx * nvn + tx * nvt;
      ball.vy = ny * nvn + ty * nvt;
      ball.spin += -nvt * 0.02;
      if (-vn > 45) cb.onRim(ball, -vn);
    }
  }
}

function collideBoard(ball, hoop, cb) {
  for (let i = 0; i < hoop.panels.length; i++) {
    const p = hoop.panels[i];
    const c = closestOnSegment(ball.x, ball.y, p.ax, p.ay, p.bx, p.by);
    const dx = ball.x - c.x;
    const dy = ball.y - c.y;
    const R = ball.r + p.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) continue;

    const d = Math.sqrt(d2) || 0.0001;
    let nx = dx / d;
    let ny = dy / d;
    ball.x = c.x + nx * (R + 0.02);
    ball.y = c.y + ny * (R + 0.02);

    const vn = ball.vx * nx + ball.vy * ny;
    ball.touchedBoard = true;
    if (vn < 0) {
      const tx = -ny;
      const ty = nx;
      const vt = ball.vx * tx + ball.vy * ty;
      const nvn = -vn * BALL.restBoard;
      const nvt = vt * BALL.friction;
      ball.vx = nx * nvn + tx * nvt;
      ball.vy = ny * nvn + ty * nvt;
      ball.spin += -nvt * 0.018;
      if (-vn > 55 && !ball.panelsHit.has(i)) {
        ball.panelsHit.add(i);
        cb.onPanel(ball, i, -vn);
      }
    }
  }
}

function detectScore(ball, hoop, sx, sy, cb) {
  if (ball.scored) return;
  const plane = hoop.cy;
  if (sy > plane || ball.y <= plane || ball.vy <= 0) return;

  const dy = ball.y - sy;
  const t = dy === 0 ? 1 : (plane - sy) / dy;
  const x = sx + (ball.x - sx) * t;
  if (Math.abs(x - hoop.cx) > hoop.scoreHalf) return;

  ball.scored = true;
  ball.clean = !ball.touchedRim && !ball.touchedBoard;
  ball.scoreX = x;
  ball.scoreY = plane;
  cb.onScore(ball, ball.clean);
}

function integrateOnce(ball, dt, hoop, cb) {
  const sx = ball.x;
  const sy = ball.y;

  ball.vy += BALL.gravity * dt;
  ball.vx = damp(ball.vx, dt);
  ball.vy = damp(ball.vy, dt);
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.rot += ball.spin * dt;

  collideRim(ball, hoop, cb);
  collideBoard(ball, hoop, cb);
  detectScore(ball, hoop, sx, sy, cb);
}

/** Advance a ball one fixed step, split into two collision substeps. */
export function stepBall(ball, dt, hoop, cb) {
  ball.px = ball.x;
  ball.py = ball.y;
  const h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) integrateOnce(ball, h, hoop, cb);
  ball.age += dt;

  // The mesh absorbs energy rather than bouncing the ball back out.
  if (ball.scored && ball.y > hoop.cy - 4) {
    ball.vx *= 0.994;
    if (ball.vy > 1350) ball.vy = 1350;
  }

  if (
    ball.y > ARENA.H + 170 ||
    ball.x < -190 ||
    ball.x > ARENA.W + 190 ||
    ball.y < -260 ||
    ball.age > BALL.maxAge
  ) {
    ball.dead = true;
  }
  return ball.dead;
}

/** Same integration as the live solver (2 substeps of 1/120s), collisions off. */
export function predictTrajectory(x, y, vx, vy, seconds = 1.15, samples = 34) {
  const pts = [];
  const dt = FIXED_DT / SUBSTEPS;
  const total = Math.max(1, Math.round(seconds / dt));
  const every = Math.max(1, Math.floor(total / samples));
  let px = x;
  let py = y;
  let pvx = vx;
  let pvy = vy;
  for (let i = 0; i < total; i++) {
    pvy += BALL.gravity * dt;
    pvx = damp(pvx, dt);
    pvy = damp(pvy, dt);
    px += pvx * dt;
    py += pvy * dt;
    if (i % every === 0) pts.push({ x: px, y: py });
    if (px < -40 || px > ARENA.W + 40 || py > ARENA.H + 40 || py < -120) break;
  }
  return pts;
}

/**
 * Solve a ballistic launch that reaches (tx, ty) in roughly `time` seconds.
 * Used only by the debug harness and deterministic checks.
 */
export function solveLaunch(x, y, tx, ty, time = 0.92) {
  const vx = (tx - x) / time;
  const vy = (ty - y - 0.5 * BALL.gravity * time * time) / time;
  return { vx, vy };
}
