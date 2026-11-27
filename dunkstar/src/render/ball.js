import { BALL, SHOT, clamp } from '../config.js';
import { ballById, getBallImage } from '../balls.js';
import { drawProceduralBall } from './ball-skins.js';
import { predictTrajectory } from '../physics.js';

const TAU = Math.PI * 2;

export function drawPad(ctx, pad, time, active = true) {
  if (!pad) return;
  const x = pad.x;
  const y = pad.y;
  ctx.save();
  ctx.translate(x, y + 31);

  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 74);
  glow.addColorStop(0, `rgba(92, 244, 255, ${active ? 0.2 : 0.08})`);
  glow.addColorStop(1, 'rgba(60, 180, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 74, 0, TAU);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, 0, 54, 13, 0, 0, TAU);
  ctx.strokeStyle = `rgba(92, 244, 255, ${active ? 0.55 : 0.22})`;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.save();
  ctx.rotate(time * 0.45);
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 10, 0, 0, TAU);
  ctx.setLineDash([7, 13]);
  ctx.strokeStyle = `rgba(150, 250, 255, ${active ? 0.32 : 0.14})`;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 5, 0, 0, TAU);
  ctx.strokeStyle = `rgba(220, 255, 255, ${active ? 0.35 : 0.15})`;
  ctx.stroke();
  ctx.restore();
}

export function drawTrail(ctx, ball, alpha = 1) {
  const trail = ball.trail;
  if (!trail || trail.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    const t = (i + 1) / trail.length;
    ctx.globalAlpha = t * 0.3 * alpha;
    ctx.fillStyle = i > trail.length - 4 ? '#9ffcff' : '#ff9a3c';
    ctx.beginPath();
    ctx.arc(p.x, p.y, ball.r * (0.35 + t * 0.55), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBall(ctx, ball, { alpha = 1, streak = 0, powerups = null, ready = false, time = 0, ballId = 'classic' } = {}) {
  if (!ball) return;
  const x = ready ? ball.x : ball.px + (ball.x - ball.px) * alpha;
  const y = ready ? ball.y : ball.py + (ball.y - ball.py) * alpha;
  const r = ball.r;
  const hot = streak >= 3;
  const aura = powerups && powerups.has('blackHole')
    ? '#b07cff'
    : powerups && powerups.has('double')
      ? '#ffd166'
      : powerups && powerups.has('multiball')
        ? '#5cf4ff'
        : hot
          ? '#ff9a3c'
          : 'rgba(92,244,255,0.5)';

  ctx.save();
  ctx.globalAlpha = alpha;

  // outer aura
  const glow = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 3);
  glow.addColorStop(0, aura);
  glow.addColorStop(0.22, hot ? 'rgba(255, 150, 60, 0.22)' : 'rgba(92, 244, 255, 0.16)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha * 0.75;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 3, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = alpha;

  const ballDef = ballById(ballId);
  const skin = getBallImage(ballId);
  const hasSkin = !!(skin && skin.complete && skin.naturalWidth > 0);

  if (hasSkin) {
    // Use the supplied skin, clipped to the physics circle so every future
    // ball image keeps an identical collision footprint.
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(ball.rot || 0);
    ctx.drawImage(skin, -r, -r, r * 2, r * 2);
    ctx.restore();

    const shade = ctx.createRadialGradient(x - r * 0.34, y - r * 0.4, r * 0.12, x, y, r * 1.02);
    shade.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    shade.addColorStop(0.52, 'rgba(255, 255, 255, 0)');
    shade.addColorStop(1, 'rgba(24, 0, 0, 0.3)');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = shade;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r - 0.6, 0, TAU);
    ctx.strokeStyle = 'rgba(38, 8, 0, 0.32)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (ballDef?.kind === 'procedural') {
    drawProceduralBall(ctx, x, y, r, ballDef, ball.rot || 0);
  } else {
    // Immediate procedural fallback while the skin image decodes.
    const sphere = ctx.createRadialGradient(x - r * 0.36, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    sphere.addColorStop(0, '#ffe3b6');
    sphere.addColorStop(0.22, '#ffb35b');
    sphere.addColorStop(0.62, '#f2751c');
    sphere.addColorStop(1, '#8f2c04');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = sphere;
    ctx.fill();

    // seams
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 0.8, 0, TAU);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(ball.rot || 0);
    ctx.strokeStyle = 'rgba(72, 22, 2, 0.6)';
    ctx.lineWidth = 2.1;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.52, -r * 0.4, r * 0.52, r * 0.4, 0, r);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.bezierCurveTo(-r * 0.4, -r * 0.42, r * 0.4, -r * 0.42, r, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.86, -r * 0.5);
    ctx.bezierCurveTo(-r * 0.2, -r * 0.18, r * 0.2, r * 0.18, r * 0.86, r * 0.5);
    ctx.stroke();
    ctx.restore();

    // specular
    ctx.beginPath();
    ctx.ellipse(x - r * 0.33, y - r * 0.4, r * 0.3, r * 0.18, -0.6, 0, TAU);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fill();
  }

  // rim shadow
  ctx.beginPath();
  ctx.arc(x, y, r - 1.5, 0.55, 2.25);
  ctx.strokeStyle = 'rgba(90, 20, 0, 0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // readiness pulse
  if (ready) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 3.1);
    ctx.beginPath();
    ctx.arc(x, y, r + 7 + pulse * 3, 0, TAU);
    ctx.strokeStyle = `rgba(92, 244, 255, ${0.12 + pulse * 0.18})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * The arc a shot will really take, plus the portion the guide previews.
 *
 * The full arc ends where the ball next crosses the rim's height on the way
 * down (or where it leaves the arena, for a short shot). The preview is a
 * fraction of that trip measured along the curve, so it always reads as a
 * consistent slice of the shot instead of a fixed 300-unit stub.
 */
export function buildAimPath(x, y, vx, vy, plane, fraction = SHOT.guideFraction) {
  const raw = predictTrajectory(x, y, vx, vy, SHOT.guideHorizon, SHOT.guideSamples);

  let end = raw.length - 1;
  if (plane !== null && plane !== undefined) {
    for (let i = 0; i < raw.length; i++) {
      const prev = i === 0 ? { x, y } : raw[i - 1];
      if (prev.y <= plane && raw[i].y > plane) {
        end = i;
        break;
      }
    }
  }

  let total = 0;
  let cursor = { x, y };
  for (let i = 0; i <= end; i++) {
    const p = raw[i];
    total += Math.hypot(p.x - cursor.x, p.y - cursor.y);
    cursor = p;
  }

  const limit = total * fraction;
  const points = [{ x, y }];
  let traveled = 0;
  cursor = { x, y };
  for (let i = 0; i <= end; i++) {
    const p = raw[i];
    const step = Math.hypot(p.x - cursor.x, p.y - cursor.y);
    if (traveled + step >= limit) {
      const k = step > 0 ? (limit - traveled) / step : 0;
      const endPoint = { x: cursor.x + (p.x - cursor.x) * k, y: cursor.y + (p.y - cursor.y) * k };
      if (Math.hypot(endPoint.x - x, endPoint.y - y) > 0.5) points.push(endPoint);
      break;
    }
    points.push(p);
    traveled += step;
    cursor = p;
  }

  return { points, total, preview: limit };
}

export function drawAim(ctx, ball, aim, time, hoop = null, fraction = SHOT.guideFraction) {
  if (!ball || !aim) return;
  const x = ball.x;
  const y = ball.y;
  const r = ball.r;
  const valid = aim.valid;
  const color = valid ? '#9ffcff' : '#ff5c82';
  const plane = hoop ? hoop.cy : y + 240;
  const { points } = buildAimPath(x, y, aim.vx, aim.vy, plane, fraction);

  ctx.save();

  // Glowing guide curve behind the dots. This needs to survive the starfield
  // and remain readable on a 390px-wide portrait letterbox.
  const n = points.length;
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p = points[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = valid ? 'rgba(92, 244, 255, 0.22)' : 'rgba(255, 92, 130, 0.14)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // dotted path
  for (let i = 0; i < n; i += 2) {
    const t = i / Math.max(1, n - 1);
    const p = points[i];
    const pulse = 0.78 + 0.22 * Math.sin(time * 7 - t * 9);
    ctx.globalAlpha = (valid ? 0.94 : 0.4) * (1 - t * 0.5) * pulse;
    ctx.fillStyle = i < n * 0.38 ? '#ffffff' : color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7.2 * (1 - t) + 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // landing reticle: two arcs, a centre dot and four ticks
  if (valid && n > 3) {
    const last = points[n - 1];
    const spin = (time * 2.4) % TAU;
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 13, spin, spin + 1.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 13, spin + Math.PI, spin + Math.PI + 1.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3.2, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 1.8;
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI * 0.5 + spin;
      ctx.beginPath();
      ctx.moveTo(last.x + Math.cos(a) * 16, last.y + Math.sin(a) * 16);
      ctx.lineTo(last.x + Math.cos(a) * 21, last.y + Math.sin(a) * 21);
      ctx.stroke();
    }
  }

  ctx.globalCompositeOperation = 'source-over';

  // power ring
  const pr = r + 14;
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(x, y, pr, 0, TAU);
  ctx.strokeStyle = 'rgba(200, 240, 255, 0.55)';
  ctx.lineWidth = 2.6;
  ctx.stroke();

  if (aim.power > 0.001) {
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(x, y, pr, -Math.PI / 2, -Math.PI / 2 + aim.power * TAU);
    ctx.strokeStyle = valid ? (aim.power > 0.88 ? '#ffd166' : '#5cf4ff') : color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawShotBurst(ctx, x, y, color, amount = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp(amount, 0, 1) * 0.5;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 70);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 70, 0, TAU);
  ctx.fill();
  ctx.restore();
}
