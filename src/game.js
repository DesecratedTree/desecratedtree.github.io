import {
  ARENA,
  BALL,
  SHOT,
  TIME,
  POWERUPS,
  clamp,
  formatScore,
} from './config.js';
import { World } from './world.js';
import { FIXED_DT, predictTrajectory } from './physics.js';
import { Input } from './input.js';
import { Storage } from './storage.js';
import { BALLS, DEFAULT_BALL, ballById, isBallUnlocked, preloadBallImages } from './balls.js';
import { Effects } from './render/fx.js';
import { createArenaRenderer, drawVignette } from './render/arena.js';
import { drawHoopBack, drawHoopFront } from './render/hoop.js';
import { drawAim, drawBall, drawPad, drawTrail } from './render/ball.js';

const TAU = Math.PI * 2;

export class Game {
  constructor({ canvas, ui, audio }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.audio = audio;

    this.world = new World();
    this.world.autoSpawn = false;
    this.arena = createArenaRenderer();
    this.effects = new Effects();
    this.best = Storage.getBest();
    const savedBall = ballById(Storage.getBallId());
    this.ballId = savedBall && isBallUnlocked(savedBall, this.best) ? savedBall.id : DEFAULT_BALL;
    preloadBallImages();

    this.state = 'title';
    this.paused = false;
    this.timeLeft = TIME.match;
    this.countdown = TIME.countdown;
    this.timeScale = 1;
    this.acc = 0;
    this.visualTime = 0;
    this.sx = 1;
    this.sy = 1;
    this.lastTimerSec = null;
    this.lastCountdown = null;
    this.lastStreak = -1;
    this.finalShotReady = false;
    this.finalShotTaken = false;
    this.finalShotInFlight = false;
    this.resultsDelay = -1;
    this.buzzerDelay = 0;
    this.aim = null;
    this.pointer = { x: 0, y: 0 };
    this.pointerTarget = { x: 0, y: 0 };

    this.events = {
      onRim: (ball, impact) => this.onRim(ball, impact),
      onPanel: (ball, i, impact, type) => this.onPanel(ball, i, impact, type),
      onScore: (ball, res) => this.onScore(ball, res),
      onMiss: (ball) => this.onMiss(ball),
      onPowerupEnd: () => this.ui.syncPowerups(this.world.powerups),
    };

    this.input = new Input(canvas, {
      onDown: (x, y) => this.pointerDown(x, y),
      onMove: (x, y) => this.pointerMove(x, y),
      onUp: (x, y) => this.pointerUp(x, y),
      onCancel: () => this.cancelAim(),
      onHover: (x, y) => this.pointerHover(x, y),
    });

    this.ui.setBest(this.best);
    this.ui.setMuted(this.audio.muted);
    this.ui.showTitle(this.best);
    this.ui.setBallButton(this.ballId);
  }

  // ------------------------------- lifecycle -------------------------------

  resize(cssW, cssH, dpr) {
    const bw = Math.max(1, Math.round(cssW * dpr));
    const bh = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== bw) this.canvas.width = bw;
    if (this.canvas.height !== bh) this.canvas.height = bh;
    this.sx = bw / ARENA.W;
    this.sy = bh / ARENA.H;
  }

  startRun() {
    this.audio.unlock();
    this.ui.hideBalls();
    this.world.reset();
    this.world.autoSpawn = true;
    this.state = 'countdown';
    this.paused = false;
    this.timeLeft = TIME.match;
    this.countdown = TIME.countdown;
    this.lastCountdown = null;
    this.lastTimerSec = null;
    this.lastStreak = -1;
    this.timeScale = 1;
    this.acc = 0;
    this.finalShotReady = false;
    this.finalShotTaken = false;
    this.finalShotInFlight = false;
    this.resultsDelay = -1;
    this.buzzerDelay = 0;
    this.aim = null;
    this.effects.clear();

    this.ui.showGame();
    this.ui.hideCallout();
    this.ui.setScore(0);
    this.ui.setTimer(TIME.match);
    this.ui.setStreak(0);
    this.ui.setPanels(this.world.panels);
    this.ui.syncPowerups(this.world.powerups);
    this.ui.setHint(null);
    this.ui.setBest(this.best);

    this.audio.startMusic();
  }

  beginPlay() {
    if (this.state === 'play') return;
    this.state = 'play';
    this.timeLeft = TIME.match;
    this.lastTimerSec = null;
    this.updateTimerUI(true);
    this.ui.callout('GO', '', 520, 'go');
    this.audio.play('go');
    this.ui.setHint('DRAG TO AIM · RELEASE TO SHOOT');
  }

  enterBuzzer() {
    if (this.state === 'buzzer' || this.state === 'results') return;
    this.state = 'buzzer';
    this.timeLeft = 0;
    this.timeScale = 1;
    this.finalShotReady = false;
    this.finalShotTaken = false;
    this.finalShotInFlight = false;
    this.resultsDelay = -1;
    this.buzzerDelay = 0.68;
    this.world.autoSpawn = true;
    this.cancelAim();
    this.updateTimerUI(true);
    this.ui.setHint(null);
    this.ui.callout('BUZZER', '', 850, 'final');
    this.audio.play('buzzer');
    this.effects.shake(10);
  }

  endRun() {
    if (this.state === 'results') return;
    this.state = 'results';
    this.timeScale = 1;
    this.paused = false;
    this.acc = 0;
    this.aim = null;
    this.finalShotReady = false;
    this.finalShotInFlight = false;
    this.world.autoSpawn = false;
    this.input.cancel();
    this.audio.stopMusic();

    const score = this.world.score;
    const accuracy = this.world.shots ? this.world.baskets / this.world.shots : 0;
    const isBest = score > this.best;
    if (isBest) {
      this.best = score;
      Storage.setBest(score);
    }

    this.ui.setBest(this.best);
    this.ui.showResults(
      {
        score,
        baskets: this.world.baskets,
        accuracy,
        bestStreak: this.world.bestStreak,
      },
      this.best,
      isBest
    );
    this.ui.setHint(null);
  }

  quitToMenu() {
    this.state = 'title';
    this.paused = false;
    this.timeScale = 1;
    this.aim = null;
    this.acc = 0;
    this.audio.stopMusic();
    this.world.reset();
    this.world.autoSpawn = false;
    this.effects.clear();
    this.ui.hidePause();
    this.ui.showTitle(this.best);
  }

  pause() {
    if (this.paused) return;
    if (!['play', 'buzzer', 'countdown'].includes(this.state)) return;
    this.paused = true;
    this.aim = null;
    this.input.cancel();
    this.acc = 0;
    this.audio.stopMusic();
    this.ui.showPause();
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.acc = 0;
    this.audio.unlock();
    if (this.state === 'play' || this.state === 'buzzer' || this.state === 'countdown') {
      this.audio.startMusic();
    }
    this.ui.hidePause();
  }

  togglePause() {
    if (this.paused) this.resume();
    else this.pause();
  }

  openBalls() {
    if (this.state !== 'title') return;
    this.ui.showBalls(BALLS, this.ballId, this.best, (id) => {
      this.audio.play('ui');
      this.selectBall(id);
    });
  }

  closeBalls() {
    this.ui.hideBalls();
  }

  selectBall(id) {
    const ball = ballById(id);
    if (!ball || !isBallUnlocked(ball, this.best)) return false;
    this.ballId = ball.id;
    Storage.setBallId(ball.id);
    this.ui.refreshBalls(BALLS, ball.id, this.best);
    this.ui.setBallButton(ball.id);
    return true;
  }

  toggleMute() {
    const muted = !this.audio.muted;
    this.audio.setMuted(muted);
    this.ui.setMuted(muted);
    if (!muted && (this.state === 'play' || this.state === 'buzzer')) this.audio.startMusic();
  }

  handleHidden() {
    if (document.hidden) this.pause();
  }

  // -------------------------------- input ---------------------------------

  pointerDown(x, y) {
    this.audio.unlock();
    this.updatePointer(x, y);
    if (!this.canShoot()) return;
    this.aim = { sx: x, sy: y, x, y, power: 0, valid: false, vx: 0, vy: 0 };
    this.updateAim();
    this.ui.setHint(null);
  }

  pointerMove(x, y) {
    this.updatePointer(x, y);
    if (!this.aim) return;
    this.aim.x = x;
    this.aim.y = y;
    this.updateAim();
  }

  pointerUp(x, y) {
    if (!this.aim) return;
    this.aim.x = x;
    this.aim.y = y;
    this.updateAim();
    const aim = this.aim;
    this.aim = null;
    if (!aim.valid) {
      this.ui.setHint(this.hintForState());
      return;
    }
    this.executeLaunch(aim.vx, aim.vy);
  }

  pointerHover(x, y) {
    this.updatePointer(x, y);
  }

  updatePointer(x, y) {
    this.pointerTarget.x = clamp((x / ARENA.W) * 2 - 1, -1, 1);
    this.pointerTarget.y = clamp((y / ARENA.H) * 2 - 1, -1, 1);
  }

  updateAim() {
    const a = this.aim;
    if (!a) return;
    const dx = a.x - a.sx;
    const dy = a.y - a.sy;
    const len = Math.hypot(dx, dy);
    a.len = len;
    a.power = clamp((len - SHOT.dragMin) / (SHOT.dragMax - SHOT.dragMin), 0, 1);
    const upward = len > 0 ? -dy / len : 0;
    a.valid = len >= SHOT.dragMin && upward >= SHOT.minUp;

    if (len > 4) {
      const nx = dx / len;
      const ny = dy / len;
      const speed = SHOT.minSpeed + a.power * (SHOT.maxSpeed - SHOT.minSpeed);
      a.vx = nx * speed;
      a.vy = ny * speed;
    } else {
      a.vx = 0;
      a.vy = 0;
    }
  }

  cancelAim() {
    this.aim = null;
  }

  canShoot() {
    if (this.paused) return false;
    if (!this.world.canLaunch()) return false;
    if (this.state === 'play') return true;
    if (this.state === 'buzzer') return this.finalShotReady && !this.finalShotTaken;
    return false;
  }

  executeLaunch(vx, vy) {
    if (!this.canShoot()) return false;
    const balls = this.world.launch(vx, vy);
    if (!balls.length) return false;

    const origin = balls[0];
    this.audio.play('launch');
    this.effects.burst(origin.x, origin.y, {
      count: 8,
      colors: ['#9ffcff', '#ffffff'],
      speed: 170,
      gravity: -120,
      size: 2.4,
      life: 0.4,
    });
    this.effects.shake(1.8);
    this.aim = null;
    this.ui.setHint(null);

    if (this.state === 'buzzer') {
      this.finalShotReady = false;
      this.finalShotTaken = true;
      this.finalShotInFlight = true;
      this.resultsDelay = TIME.resultsDelay;
      this.timeScale = 0.55;
      this.world.autoSpawn = false;
      this.ui.callout('FINAL SHOT', 'MAKE IT COUNT', 1300, 'final');
    }
    return true;
  }

  hintForState() {
    if (this.state === 'play') {
      return this.world.canLaunch() ? 'DRAG TO AIM · RELEASE TO SHOOT' : null;
    }
    if (this.state === 'buzzer') {
      return this.finalShotReady && !this.finalShotTaken ? 'FINAL SHOT · SWIPE TO LAUNCH' : null;
    }
    return null;
  }

  // -------------------------------- events --------------------------------

  onRim(ball, impact) {
    this.audio.play('rim', { impact });
    this.effects.burst(ball.x, ball.y, {
      count: 7,
      colors: ['#ffc46b', '#fff1cf', '#ff8a2b'],
      speed: 220,
      gravity: 500,
      size: 2.2,
      life: 0.5,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.2,
    });
    this.effects.shake(Math.min(4, impact / 320));
  }

  onPanel(ball, i, impact, type) {
    this.audio.play('board');
    this.effects.burst(ball.x, ball.y, {
      count: 10,
      colors: ['#5cf4ff', '#d7ffff', '#3ec8ff'],
      speed: 260,
      gravity: 300,
      size: 2.6,
      life: 0.55,
      angle: Math.PI,
      spread: Math.PI,
    });
    this.effects.shake(3.6);
    if (type) this.announcePowerup(type);
  }

  onScore(ball, res) {
    const hoop = this.world.hoop;
    const clean = res.clean;
    this.audio.play('score', { clean, streak: res.streak });
    this.effects.ring(ball.scoreX, hoop.cy + 12, clean ? '#9ffcff' : '#ffb347', clean ? 150 : 112, 3, 0.6);
    this.effects.burst(ball.scoreX, hoop.cy + 8, {
      count: clean ? 26 : 16,
      colors: clean ? ['#9ffcff', '#ffffff', '#5cf4ff'] : ['#ffc46b', '#ff8a2b', '#ffffff'],
      speed: 430,
      angle: Math.PI / 2,
      spread: Math.PI * 1.75,
      gravity: 430,
      size: 3.2,
      life: 0.85,
    });
    this.effects.float(
      ball.scoreX,
      hoop.cy - 24,
      `+${formatScore(res.points)}`,
      clean ? '#c8ffff' : '#ffd9a3',
      clean ? 34 : 30,
      1.0
    );
    if (clean) {
      this.effects.float(
        ball.scoreX,
        hoop.cy - 62,
        res.mult > 1 ? `SWISH ×${res.mult.toFixed(1)}` : 'SWISH',
        '#ffd166',
        18,
        1.05,
        -42
      );
    }
    if (res.power > 1) {
      this.effects.float(ball.scoreX, hoop.cy - 96, 'DOUBLE', '#ffd166', 16, 0.9, -30);
    }
    this.effects.shake(clean ? 6 : 3.5);
    this.ui.setScore(this.world.score, true);
    this.ui.setStreak(this.world.streak);
    this.lastStreak = this.world.streak;
  }

  onMiss(ball) {
    this.audio.play('miss');
    if (ball) {
      this.effects.float(
        clamp(ball.x, 60, ARENA.W - 60),
        clamp(ball.y, 220, ARENA.H - 150),
        'MISS',
        'rgba(255,120,140,0.8)',
        18,
        0.7,
        -40
      );
    }
    this.ui.setStreak(this.world.streak);
    this.lastStreak = this.world.streak;
  }

  announcePowerup(type) {
    const def = POWERUPS[type];
    if (!def) return;
    const hoop = this.world.hoop;
    this.audio.play('power');
    this.ui.flash(def.color);
    this.ui.callout(def.label, `${def.duration}s`, 1250, 'power', def.color);
    this.effects.ring(hoop.cx, hoop.cy, def.color, 200, 4, 0.8);
    this.effects.burst(hoop.cx, hoop.cy, {
      count: 30,
      colors: [def.color, '#ffffff'],
      speed: 420,
      spread: TAU,
      gravity: 140,
      size: 3.4,
      life: 0.9,
    });
    this.ui.syncPowerups(this.world.powerups);
  }

  // -------------------------------- update --------------------------------

  frame(rawDt) {
    const dt = Math.min(rawDt, 0.05);
    this.visualTime += dt;

    if (!this.paused && (this.state === 'play' || this.state === 'buzzer' || this.state === 'countdown')) {
      const scaled = dt * this.timeScale;
      this.acc += scaled;
      let steps = 0;
      while (this.acc >= FIXED_DT && steps < 6) {
        this.step(FIXED_DT);
        this.acc -= FIXED_DT;
        steps += 1;
      }
      if (steps === 6) this.acc = Math.min(this.acc, FIXED_DT);
      this.effects.update(scaled);
      this.updateVisual(scaled);
    } else if (this.state === 'title' || this.state === 'results') {
      this.world.updateAmbient(Math.min(dt, 0.033));
      this.effects.update(dt);
    }

    this.render(this.acc / FIXED_DT);
  }

  step(dt) {
    if (this.state === 'countdown') {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      if (n !== this.lastCountdown) {
        this.lastCountdown = n;
        if (n > 0) {
          this.ui.callout(String(n), 'GET READY', 780, 'count');
          this.audio.play('count');
        }
      }
      if (this.countdown <= 0) this.beginPlay();
      this.world.updateAmbient(dt);
      return;
    }

    if (this.state === 'play') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.enterBuzzer();
        this.world.update(dt, this.events);
        return;
      }
      this.updateTimerUI();
      this.world.update(dt, this.events);
      return;
    }

    if (this.state === 'buzzer') {
      this.world.update(dt, this.events);
      if (this.buzzerDelay > 0) {
        this.buzzerDelay = Math.max(0, this.buzzerDelay - dt);
        return;
      }

      if (!this.finalShotTaken && !this.finalShotInFlight) {
        if (this.world.balls.length === 0 && this.world.readyBall) {
          if (!this.finalShotReady) {
            this.finalShotReady = true;
            this.ui.callout('FINAL SHOT', 'ONE LAST LOOK', 1500, 'final');
            this.ui.setHint('FINAL SHOT · SWIPE TO LAUNCH');
            this.audio.play('final');
          }
        }
      }

      if (this.finalShotInFlight && this.world.balls.length === 0) {
        this.resultsDelay -= dt;
        if (this.resultsDelay <= 0) this.endRun();
      }
    }
  }

  updateTimerUI(force = false) {
    const sec = Math.max(0, Math.ceil(this.timeLeft));
    if (!force && sec === this.lastTimerSec) return;
    this.lastTimerSec = sec;
    this.ui.setTimer(this.timeLeft, sec <= 10);
  }

  updateVisual(dt) {
    const lerp = Math.min(1, dt * 5);
    this.pointer.x += (this.pointerTarget.x - this.pointer.x) * lerp;
    this.pointer.y += (this.pointerTarget.y - this.pointer.y) * lerp;

    this.ui.setScore(this.world.score);
    this.ui.setPanels(this.world.panels);
    this.ui.syncPowerups(this.world.powerups);
    if (this.world.streak !== this.lastStreak) {
      this.lastStreak = this.world.streak;
      this.ui.setStreak(this.world.streak);
    }
    this.ui.setHint(this.aim ? null : this.hintForState());
  }

  render(alpha) {
    const ctx = this.ctx;
    const canvas = this.canvas;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#04060f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(this.sx, 0, 0, this.sy, 0, 0);

    const shake = this.effects.offset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    this.arena.draw(ctx, { time: this.visualTime, pointer: this.pointer });

    const hoop = this.world.hoop;
    drawHoopBack(ctx, {
      hoop,
      panels: this.world.panels,
      panelPulse: this.world.panelPulse,
      net: this.world.net,
      netFlash: this.world.netFlash,
      powerups: this.world.powerups,
      time: this.visualTime,
    });

    // The title screen is a menu, not a playable court: keep the stray ready
    // ball and its pad out of the how-to row behind the title copy.
    const showReady = this.state !== 'title';
    if (this.aim && this.world.readyBall && showReady) {
      drawAim(ctx, this.world.readyBall, this.aim, this.visualTime);
    }

    for (const ball of this.world.balls) {
      const x = ball.px + (ball.x - ball.px) * alpha;
      const y = ball.py + (ball.y - ball.py) * alpha;
      const last = ball.trail[ball.trail.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 2) {
        ball.trail.push({ x, y });
        if (ball.trail.length > BALL.trail) ball.trail.shift();
      }
      drawTrail(ctx, ball, 1);
      drawBall(ctx, ball, {
        alpha,
        streak: this.world.streak,
        powerups: this.world.powerups,
        ballId: this.ballId,
      });
    }

    if (this.world.readyBall && showReady) {
      drawPad(ctx, this.world.pad, this.visualTime, true);
      drawBall(ctx, this.world.readyBall, {
        alpha: 1,
        streak: this.world.streak,
        powerups: this.world.powerups,
        ballId: this.ballId,
        ready: true,
        time: this.visualTime,
      });
    }

    drawHoopFront(ctx, {
      hoop,
      rimFlash: this.world.rimFlash,
      powerups: this.world.powerups,
      time: this.visualTime,
    });

    this.effects.draw(ctx);
    drawVignette(ctx);

    ctx.restore();
  }

  // --------------------------------- debug --------------------------------

  debugShootAt(tx, ty) {
    const ball = this.world.readyBall || this.world.forceReady();
    if (!ball) return false;
    const hoop = this.world.hoop;
    let best = null;

    for (let time = 0.62; time <= 1.16; time += 0.02) {
      const vx = (tx - ball.x) / time;
      const vy = (ty - ball.y - 0.5 * BALL.gravity * time * time) / time;
      const speed = Math.hypot(vx, vy);
      if (speed < 1050 || speed > 3000) continue;

      const pts = predictTrajectory(ball.x, ball.y, vx, vy, 1.5, 100);
      let prev = { x: ball.x, y: ball.y };
      for (const p of pts) {
        if (prev.y <= hoop.cy && p.y > hoop.cy) {
          const k = (hoop.cy - prev.y) / (p.y - prev.y || 1);
          const x = prev.x + (p.x - prev.x) * k;
          const err = Math.abs(x - tx);
          if (!best || err < best.err) best = { vx, vy, err, time };
          break;
        }
        prev = p;
      }
    }

    if (!best) return false;
    return this.executeLaunch(best.vx, best.vy);
  }

  debugLaunchAtPoint(tx, ty, time = 0.9) {
    const ball = this.world.readyBall || this.world.forceReady();
    if (!ball) return false;
    const vx = (tx - ball.x) / time;
    const vy = (ty - ball.y - 0.5 * BALL.gravity * time * time) / time;
    return this.executeLaunch(vx, vy);
  }

  debugHitPanel(i) {
    const type = this.world.forcePanel(i);
    this.ui.setPanels(this.world.panels);
    if (type) this.announcePowerup(type);
    return type;
  }

  debugGrantPowerup(type) {
    const granted = this.world.grantPowerup(type);
    if (granted) this.announcePowerup(granted);
    return granted;
  }

  debugSetTime(t) {
    this.timeLeft = t;
    this.updateTimerUI(true);
    if (this.state === 'play' && t <= 0) this.enterBuzzer();
  }

  debugSummary() {
    const w = this.world;
    return {
      state: this.state,
      ballId: this.ballId,
      paused: this.paused,
      timeLeft: Math.round(this.timeLeft * 100) / 100,
      timeScale: this.timeScale,
      best: this.best,
      final: {
        ready: this.finalShotReady,
        taken: this.finalShotTaken,
        inFlight: this.finalShotInFlight,
      },
      canShoot: this.canShoot(),
      aim: this.aim
        ? {
            power: Math.round(this.aim.power * 100) / 100,
            valid: this.aim.valid,
            vx: Math.round(this.aim.vx),
            vy: Math.round(this.aim.vy),
          }
        : null,
      world: w.summary(),
      balls: w.balls.map((b) => ({
        x: Math.round(b.x),
        y: Math.round(b.y),
        vx: Math.round(b.vx),
        vy: Math.round(b.vy),
        scored: b.scored,
        clean: b.clean,
        rim: b.touchedRim,
        board: b.touchedBoard,
        panels: [...b.panelsHit],
        age: Math.round(b.age * 100) / 100,
      })),
      hud: {
        score: this.ui.score.textContent,
        timer: this.ui.timer.textContent,
        streak: this.ui.streakName.textContent,
        mult: this.ui.streakMult.textContent,
        hint: this.ui.hint.classList.contains('hidden') ? null : this.ui.hintText.textContent,
        panels: this.ui.pips.map((p) => p.classList.contains('lit')),
        powerups: [...this.ui.powerups.children].map((c) => c.querySelector('.pu-label')?.textContent),
      },
    };
  }
}
