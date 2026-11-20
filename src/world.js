// World state: balls, launch pads, power-ups, four backboard panels and the net.
import {
  ARENA,
  BALL,
  HOOP,
  PADS,
  PAD_JITTER,
  PAD_MIN_DIST,
  PAD_MIN_DX,
  POWERUPS,
  POWERUP_KEYS,
  SCORE,
  clamp,
  hoopFor,
  mirrorX,
} from './config.js';
import { basketValue } from './scoring.js';
import { stepBall } from './physics.js';

const STRANDS = 10;
const LEVELS = 5;

function anchorFor(hoop, s) {
  const a = (s / STRANDS) * Math.PI * 2;
  return {
    x: hoop.cx + Math.cos(a) * hoop.half,
    y: hoop.cy + Math.sin(a) * hoop.ry,
  };
}

function makeNet(hoop) {
  const strands = [];
  for (let s = 0; s < STRANDS; s++) {
    const top = anchorFor(hoop, s);
    const a = (s / STRANDS) * Math.PI * 2;
    const bottomX = hoop.cx + Math.cos(a) * hoop.half * 0.56;
    const bottomY = hoop.cy + hoop.netH;
    const nodes = [];
    for (let l = 0; l < LEVELS; l++) {
      const t = l / (LEVELS - 1);
      const x = top.x + (bottomX - top.x) * t;
      const y = top.y + (bottomY - top.y) * t;
      nodes.push({ x, y, px: x, py: y, s });
    }
    strands.push(nodes);
  }

  const restH = [];
  for (let l = 1; l < LEVELS; l++) {
    let sum = 0;
    for (let s = 0; s < STRANDS; s++) {
      const a = strands[s][l];
      const b = strands[(s + 1) % STRANDS][l];
      sum += Math.hypot(a.x - b.x, a.y - b.y);
    }
    restH.push(sum / STRANDS);
  }

  return {
    strands,
    levels: LEVELS,
    count: STRANDS,
    restV: hoop.netH / (LEVELS - 1),
    restH,
    time: 0,
  };
}

function updateNet(net, dt, hoop, time) {
  const g = 860;
  const damping = 0.9;

  for (let s = 0; s < net.count; s++) {
    const strand = net.strands[s];
    const anchor = anchorFor(hoop, s);
    const top = strand[0];
    top.x = anchor.x;
    top.y = anchor.y;
    top.px = anchor.x;
    top.py = anchor.y;

    for (let l = 1; l < net.levels; l++) {
      const n = strand[l];
      const vx = (n.x - n.px) * damping;
      const vy = (n.y - n.py) * damping;
      n.px = n.x;
      n.py = n.y;
      n.x += vx + Math.sin(time * 1.1 + s * 0.74 + l * 0.4) * 0.014;
      n.y += vy + g * dt * dt;
    }
  }

  for (let iter = 0; iter < 3; iter++) {
    for (let s = 0; s < net.count; s++) {
      const strand = net.strands[s];
      for (let l = 1; l < net.levels; l++) {
        const parent = strand[l - 1];
        const n = strand[l];
        let dx = n.x - parent.x;
        let dy = n.y - parent.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - net.restV) / d;
        n.x -= dx * diff;
        n.y -= dy * diff;
      }
      for (let l = 1; l < net.levels; l++) {
        const a = strand[l];
        const b = net.strands[(s + 1) % net.count][l];
        const rest = net.restH[l - 1];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = ((d - rest) / d) * 0.5 * 0.42;
        a.x += dx * diff;
        a.y += dy * diff;
        b.x -= dx * diff;
        b.y -= dy * diff;
      }
    }
  }
}

function netImpulse(net, x, y, strength = 1) {
  for (const strand of net.strands) {
    for (let l = 1; l < net.levels; l++) {
      const n = strand[l];
      const dx = n.x - x;
      const dy = n.y - y;
      const d = Math.hypot(dx, dy);
      if (d > 92) continue;
      const f = (1 - d / 92) * 90 * strength;
      n.px -= (dx / (d || 1)) * f * 0.012;
      n.py -= (dy / (d || 1)) * f * 0.012;
    }
  }
}

function makeBall(x, y, ready = false) {
  return {
    x,
    y,
    px: x,
    py: y,
    vx: 0,
    vy: 0,
    r: BALL.r,
    rot: Math.random() * Math.PI * 2,
    spin: 0,
    age: 0,
    dead: false,
    scored: false,
    clean: false,
    touchedRim: false,
    touchedBoard: false,
    panelsHit: new Set(),
    scoredAt: 0,
    ready,
    trail: [],
    scoreX: 0,
    scoreY: 0,
  };
}

export class World {
  constructor() {
    this.hoop = hoopFor(false);
    this.net = makeNet(this.hoop);
    this.autoSpawn = true;
    this.reset();
  }

  reset() {
    this.time = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.baskets = 0;
    this.shots = 0;
    this.attempts = 0;
    this.panels = [false, false, false, false];
    this.panelPulse = [0, 0, 0, 0];
    this.panelResetTimer = 0;
    this.powerups = new Map();
    this.lastPowerup = null;
    this.balls = [];
    this.readyBall = null;
    this.respawnTimer = 0;
    this.padIndex = -1;
    this.pad = { x: 0, y: 0 };
    this.lastPadIndex = -1;
    this.rimFlash = 0;
    this.netFlash = 0;
    this.hoopHalf = HOOP.half;
    this.hoopCy = HOOP.cy;
    this.hoopChangePending = false;
    this.powerupBag = [];
    this.hoop = hoopFor(false, this.hoopHalf, this.hoopCy);
    this.net = makeNet(this.hoop);
    this.autoSpawn = true;
    this.spawnReady(true);
  }

  hasPowerup(type) {
    return this.powerups.has(type);
  }

  activePowerups() {
    return this.powerups;
  }

  refreshHoop() {
    const big = this.powerups.has('bigRim');
    this.hoop = hoopFor(big, this.hoopHalf, this.hoopCy);
    // The rope net is built from the hoop's radius. Rebuilding it avoids the
    // old net being pulled into a crown above the newly enlarged rim.
    this.net = makeNet(this.hoop);
  }

  /** Move the rim up/down and resize it inside the safe HOOP bounds. */
  randomizeHoop() {
    const halfDir = Math.random() < 0.5 ? -1 : 1;
    const halfStep = HOOP.sizeStepMin + Math.random() * (HOOP.sizeStepMax - HOOP.sizeStepMin);
    let half = this.hoopHalf + halfDir * halfStep;
    if (half < HOOP.halfMin || half > HOOP.halfMax) {
      half = this.hoopHalf - halfDir * halfStep;
    }
    half = clamp(half, HOOP.halfMin, HOOP.halfMax);

    const yDir = Math.random() < 0.5 ? -1 : 1;
    const yStep = HOOP.yStepMin + Math.random() * (HOOP.yStepMax - HOOP.yStepMin);
    let cy = this.hoopCy + yDir * yStep;
    if (cy < HOOP.cyMin || cy > HOOP.cyMax) {
      cy = this.hoopCy - yDir * yStep;
    }
    cy = clamp(cy, HOOP.cyMin, HOOP.cyMax);

    this.hoopHalf = half;
    this.hoopCy = cy;
    this.refreshHoop();
  }

  spawnReady(force = false) {
    if (this.readyBall) return this.readyBall;
    if (!this.autoSpawn && !force) return null;

    // A made basket moves and resizes the rim before the next ball appears.
    // Doing it here, rather than mid-flight, keeps the target stable for the
    // shot that is still being resolved.
    if (this.hoopChangePending) {
      this.hoopChangePending = false;
      this.randomizeHoop();
    }

    // Only pads with a clear runway to the rim are eligible. The guard runs
    // against the current hoop, so a big-rim power-up cannot pull the hoop
    // onto a launch pad either.
    const valid = [];
    for (let i = 0; i < PADS.length; i++) {
      const padX = mirrorX(PADS[i].x);
      const dx = Math.abs(padX - this.hoop.cx);
      const dist = Math.hypot(dx, PADS[i].y - this.hoop.cy);
      if (dx >= PAD_MIN_DX && dist >= PAD_MIN_DIST) valid.push(i);
    }
    const pool = valid.length ? valid : PADS.map((_, i) => i);
    let choices = pool.filter((i) => i !== this.lastPadIndex);
    if (!choices.length) choices = pool;
    const index = choices[Math.floor(Math.random() * choices.length)];
    this.lastPadIndex = index;
    this.padIndex = index;

    const base = PADS[index];
    const x = mirrorX(base.x) + (Math.random() * 2 - 1) * PAD_JITTER.x;
    const y = base.y + (Math.random() * 2 - 1) * PAD_JITTER.y;
    this.pad = { x, y };
    const ball = makeBall(clamp(x, 50, ARENA.W - 50), y, true);
    this.readyBall = ball;
    this.netFlash = 0;
    return ball;
  }

  canLaunch() {
    return !!this.readyBall && this.balls.every((b) => b.scored);
  }

  launch(vx, vy) {
    if (!this.canLaunch()) return [];
    const origin = this.readyBall;
    const speed = Math.hypot(vx, vy) || 1;
    const baseAngle = Math.atan2(vy, vx);
    const angles = this.hasPowerup('multiball')
      ? [baseAngle - 0.028, baseAngle, baseAngle + 0.028]
      : [baseAngle];

    const spawned = [];
    for (let i = 0; i < angles.length; i++) {
      const a = angles[i];
      const perp = a + Math.PI / 2;
      const offset = (i - (angles.length - 1) / 2) * 5;
      const ball = makeBall(
        origin.x + Math.cos(perp) * offset,
        origin.y + Math.sin(perp) * offset,
        false
      );
      ball.vx = Math.cos(a) * speed;
      ball.vy = Math.sin(a) * speed;
      ball.spin = clamp(-ball.vx / 55, -14, 14);
      spawned.push(ball);
    }

    this.balls.push(...spawned);
    this.readyBall = null;
    this.respawnTimer = 0;
    this.attempts += 1;
    this.shots += spawned.length;
    return spawned;
  }

  awardBasket(clean) {
    this.baskets += 1;
    if (clean) {
      this.streak += 1;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    } else {
      this.streak = 0;
    }
    const res = basketValue(clean, this.streak, this.hasPowerup('double'));
    this.score += res.points;
    this.hoopChangePending = true;
    return {
      points: res.points,
      mult: res.mult,
      power: res.power,
      clean,
      streak: this.streak,
      score: this.score,
    };
  }

  rollPowerup() {
    // Shuffle a fresh bag every time it empties, so each four-panel award is
    // random while all three rewards still appear regularly.
    if (!this.powerupBag || this.powerupBag.length === 0) {
      this.powerupBag = [...POWERUP_KEYS];
      for (let i = this.powerupBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.powerupBag[i], this.powerupBag[j]] = [this.powerupBag[j], this.powerupBag[i]];
      }
    }
    return this.powerupBag.pop();
  }

  grantPowerup(type) {
    if (!POWERUPS[type]) return null;
    this.powerups.set(type, POWERUPS[type].duration);
    this.lastPowerup = type;
    if (type === 'bigRim') this.refreshHoop();
    return type;
  }

  lightPanel(i) {
    if (i < 0 || i > 3 || this.panels[i]) return null;
    this.panels[i] = true;
    this.panelPulse[i] = 1;
    if (this.panels.every(Boolean)) {
      const type = this.rollPowerup();
      this.grantPowerup(type);
      this.panelResetTimer = SCORE.panelResetDelay;
      return type;
    }
    return null;
  }

  getPowerupList() {
    const out = [];
    for (const type of POWERUP_KEYS) {
      const remaining = this.powerups.get(type);
      if (remaining === undefined) continue;
      out.push({ type, remaining, duration: POWERUPS[type].duration, ...POWERUPS[type] });
    }
    return out;
  }

  update(dt, events = {}) {
    this.time += dt;
    this.rimFlash = Math.max(0, this.rimFlash - dt * 3.2);
    this.netFlash = Math.max(0, this.netFlash - dt * 2.4);
    for (let i = 0; i < 4; i++) this.panelPulse[i] = Math.max(0, this.panelPulse[i] - dt * 2.6);

    for (const [type, remaining] of [...this.powerups]) {
      const next = remaining - dt;
      if (next <= 0.0001) {
        this.powerups.delete(type);
        if (type === 'bigRim') this.refreshHoop();
        events.onPowerupEnd?.(type);
      } else {
        this.powerups.set(type, next);
      }
    }

    if (this.panelResetTimer > 0) {
      this.panelResetTimer -= dt;
      if (this.panelResetTimer <= 0) this.panels.fill(false);
    }

    updateNet(this.net, dt, this.hoop, this.time);

    const cb = {
      onRim: (ball, impact) => {
        this.rimFlash = 1;
        if (!ball.scored) events.onRim?.(ball, impact);
      },
      onPanel: (ball, i, impact) => {
        if (ball.scored) return;
        const type = this.lightPanel(i);
        events.onPanel?.(ball, i, impact, type);
        if (type) events.onPowerup?.(type);
      },
      onScore: (ball, clean) => {
        ball.scoredAt = this.time;
        this.netFlash = 1;
        netImpulse(this.net, ball.scoreX, this.hoop.cy + 18, 1.25);
        const res = this.awardBasket(clean);
        events.onScore?.(ball, res);
      },
    };

    const hoop = this.hoop;
    for (const ball of this.balls) {
      if (ball.dead) continue;
      if (ball.scored && this.time - ball.scoredAt > 1.2) {
        ball.dead = true;
        continue;
      }
      stepBall(ball, dt, hoop, cb);
      if (ball.dead) {
        if (!ball.scored) {
          this.streak = 0;
          events.onMiss?.(ball);
        }
      }
    }

    if (this.balls.some((b) => b.dead)) {
      this.balls = this.balls.filter((b) => !b.dead);
    }

    const live = this.balls.some((b) => !b.scored);
    if (!live && !this.readyBall) {
      if (this.autoSpawn) {
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) this.spawnReady();
      }
    } else {
      this.respawnTimer = SCORE.panelResetDelay * 0.3;
    }

    for (const ball of this.balls) {
      if (!ball.scored) continue;
      if (ball.y > this.hoop.cy - 10 && ball.y < this.hoop.cy + this.hoop.netH + 24) {
        netImpulse(this.net, ball.x, ball.y, 0.08);
      }
    }
  }

  updateAmbient(dt) {
    this.time += dt;
    updateNet(this.net, dt, this.hoop, this.time);
    if (this.panelResetTimer > 0) {
      this.panelResetTimer -= dt;
      if (this.panelResetTimer <= 0) this.panels.fill(false);
    }
  }

  killBalls() {
    for (const b of this.balls) b.dead = true;
    this.balls = [];
    if (this.autoSpawn) this.spawnReady(true);
  }

  forceReady() {
    if (!this.readyBall) this.spawnReady(true);
    return this.readyBall;
  }

  forcePanel(i) {
    return this.lightPanel(i);
  }

  summary() {
    return {
      score: this.score,
      streak: this.streak,
      bestStreak: this.bestStreak,
      baskets: this.baskets,
      shots: this.shots,
      attempts: this.attempts,
      panels: [...this.panels],
      powerups: Object.fromEntries([...this.powerups].map(([k, v]) => [k, Math.round(v * 100) / 100])),
      balls: this.balls.length,
      ready: !!this.readyBall,
      pad: { ...this.pad },
      hoop: { cx: this.hoop.cx, cy: this.hoop.cy, half: this.hoop.half },
      accuracy: this.shots ? this.baskets / this.shots : 0,
      time: Math.round(this.time * 100) / 100,
    };
  }
}
