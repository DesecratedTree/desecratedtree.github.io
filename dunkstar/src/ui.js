import { POWERUPS, DIFFICULTY, formatScore, formatTime } from './config.js';
import { ballById } from './balls.js';
import { drawProceduralBall } from './render/ball-skins.js';
import { streakMultiplier } from './scoring.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.hud = $('hud');
    this.timer = $('timer');
    this.score = $('score');
    this.bestHud = $('best-hud');
    this.hudDiff = $('hud-diff');
    this.diffButtons = [...document.querySelectorAll('.diff-btn')];
    this.streak = $('streak');
    this.streakName = $('streak-name');
    this.streakMult = $('streak-mult');
    this.streakFill = $('streak-fill');
    this.pips = [...document.querySelectorAll('#pips i')];
    this.powerups = $('powerups');
    this.hint = $('hint');
    this.hintText = this.hint.querySelector('span:last-child');
    this.calloutEl = $('callout');
    this.calloutMain = $('callout-main');
    this.calloutSub = $('callout-sub');
    this.flashEl = $('flash');

    this.title = $('title-screen');
    this.results = $('results-screen');
    this.pause = $('pause-screen');
    this.ballsScreen = $('balls-screen');
    this.ballGrid = $('ball-grid');
    this.ballNote = $('ball-note');
    this.ballButton = $('btn-balls');
    this.bestTitle = $('best-title');
    this.btnMute = $('btn-mute');
    this.ballSelect = null;

    this.resultScore = $('result-score');
    this.newBest = $('new-best');
    this.statBaskets = $('stat-baskets');
    this.statAccuracy = $('stat-accuracy');
    this.statStreak = $('stat-streak');
    this.statBest = $('stat-best');

    this.puEls = new Map();
    this.puKey = '';
    this.calloutTimer = null;
    this.calloutToken = 0;
    this.scoreTimer = null;
    this.flashTimer = null;
    this.lastScore = -1;
    this.lastPanels = '';
    this.lastHint = null;
  }

  bind(handlers) {
    $('btn-play').addEventListener('click', () => handlers.play());
    $('btn-again').addEventListener('click', () => handlers.play());
    $('btn-menu').addEventListener('click', () => handlers.menu());
    $('btn-resume').addEventListener('click', () => handlers.resume());
    $('btn-quit').addEventListener('click', () => handlers.quit());
    $('btn-pause').addEventListener('click', () => handlers.pause());
    $('btn-mute').addEventListener('click', () => handlers.mute());
    $('btn-balls').addEventListener('click', () => handlers.balls());
    $('btn-balls-back').addEventListener('click', () => handlers.closeBalls());
    for (const btn of this.diffButtons) {
      btn.addEventListener('click', () => handlers.difficulty(btn.dataset.difficulty));
    }
  }

  showTitle(best) {
    this.title.classList.remove('hidden');
    this.results.classList.add('hidden');
    this.pause.classList.add('hidden');
    this.hideBalls();
    this.hud.classList.add('hidden');
    this.hideCallout();
    this.bestTitle.textContent = formatScore(best);
    this.setHint(null);
  }

  showGame() {
    this.title.classList.add('hidden');
    this.results.classList.add('hidden');
    this.pause.classList.add('hidden');
    this.hideBalls();
    this.hud.classList.remove('hidden');
  }

  showPause() {
    this.pause.classList.remove('hidden');
    this.hideBalls();
    this.setHint(null);
  }

  hidePause() {
    this.pause.classList.add('hidden');
  }

  showResults(stats, best, isBest) {
    this.title.classList.add('hidden');
    this.pause.classList.add('hidden');
    this.hideBalls();
    this.results.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.hideCallout();
    const resultText = formatScore(stats.score);
    this.resultScore.textContent = resultText;
    this.resultScore.classList.toggle('long', resultText.length > 6);
    this.statBaskets.textContent = formatScore(stats.baskets);
    this.statAccuracy.textContent = `${Math.round(stats.accuracy * 100)}%`;
    this.statStreak.textContent = formatScore(stats.bestStreak);
    this.statBest.textContent = formatScore(best);
    this.newBest.classList.toggle('hidden', !isBest);
  }

  setBest(best) {
    this.bestHud.textContent = `BEST ${formatScore(best)}`;
    this.bestTitle.textContent = formatScore(best);
  }

  setMuted(muted) {
    this.btnMute.classList.toggle('muted', muted);
    this.btnMute.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  }

  setDifficulty(key) {
    const def = DIFFICULTY[key] || DIFFICULTY.normal;
    for (const btn of this.diffButtons) {
      const active = btn.dataset.difficulty === key;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (this.hudDiff) this.hudDiff.textContent = def.label;
  }

  showBalls(balls, selected, best, onSelect) {
    this.ballSelect = onSelect;
    this.refreshBalls(balls, selected, best);
    this.ballsScreen.classList.remove('hidden');
  }

  hideBalls() {
    this.ballsScreen.classList.add('hidden');
  }

  refreshBalls(balls, selected, best) {
    this.ballGrid.replaceChildren();
    for (const ball of balls) {
      const unlocked = best >= (ball.unlockAt || 0);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ball-card';
      card.classList.toggle('selected', ball.id === selected);
      card.classList.toggle('locked', !unlocked);
      card.disabled = !unlocked;
      card.setAttribute('aria-pressed', ball.id === selected ? 'true' : 'false');
      card.setAttribute(
        'aria-label',
        unlocked
          ? `${ball.name} ball${ball.id === selected ? ', equipped' : ''}`
          : `${ball.name} ball, locked until best score ${formatScore(ball.unlockAt || 0)}`
      );

      const art = document.createElement('span');
      art.className = 'ball-card-art';
      art.style.setProperty('--ball-glow', ball.glow || 'rgba(92, 244, 255, 0.3)');
      art.style.setProperty('--ball-tint', ball.tint || 'rgba(92, 244, 255, 0.14)');
      if (ball.src) {
        const img = document.createElement('img');
        img.src = ball.src;
        img.alt = '';
        img.draggable = false;
        art.appendChild(img);
      } else {
        const canvas = document.createElement('canvas');
        canvas.className = 'ball-card-canvas';
        canvas.width = 200;
        canvas.height = 200;
        drawProceduralBall(canvas.getContext('2d'), 100, 100, 94, ball, 0.35);
        art.appendChild(canvas);
      }
      if (!unlocked) {
        const lock = document.createElement('span');
        lock.className = 'ball-lock';
        lock.textContent = 'LOCKED';
        art.appendChild(lock);
      }

      const name = document.createElement('span');
      name.className = 'ball-card-name';
      name.textContent = ball.name;

      const status = document.createElement('span');
      status.className = 'ball-card-status';
      status.textContent = !unlocked
        ? `BEST ${formatScore(ball.unlockAt || 0)}`
        : ball.id === selected
          ? 'EQUIPPED'
          : 'TAP TO EQUIP';

      card.append(art, name, status);
      card.addEventListener('click', () => {
        if (unlocked) this.ballSelect?.(ball.id);
      });
      this.ballGrid.appendChild(card);
    }

    const locked = balls.filter((ball) => best < (ball.unlockAt || 0)).length;
    this.ballNote.textContent = locked
      ? 'EARN BEST SCORES TO UNLOCK MORE BALLS'
      : 'MORE BALLS COMING SOON';
  }

  setBallButton(id) {
    const ball = ballById(id);
    if (!ball || !this.ballButton) return;
    const img = this.ballButton.querySelector('img');
    if (!img) return;
    if (ball.src) {
      img.src = ball.src;
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    drawProceduralBall(canvas.getContext('2d'), 64, 64, 60, ball, 0.35);
    img.src = canvas.toDataURL('image/png');
  }

  setScore(value, bump = false) {
    if (this.lastScore === value && !bump) return;
    this.lastScore = value;
    const text = formatScore(value);
    this.score.textContent = text;
    this.score.classList.toggle('long', text.length > 5 && text.length <= 7);
    this.score.classList.toggle('longer', text.length > 7);
    if (bump) {
      this.score.classList.remove('bump');
      void this.score.offsetWidth;
      this.score.classList.add('bump');
      clearTimeout(this.scoreTimer);
      this.scoreTimer = setTimeout(() => this.score.classList.remove('bump'), 240);
    }
  }

  setTimer(seconds, low = false) {
    this.timer.textContent = formatTime(seconds);
    this.timer.classList.toggle('low', low);
  }

  setStreak(streak) {
    const mult = streakMultiplier(streak);
    this.streakName.textContent = streak > 0 ? `MAKE STREAK × ${streak}` : 'MAKE STREAK';
    this.streakMult.textContent = `× ${mult.toFixed(1)}`;
    this.streakFill.style.width = `${Math.min(100, (streak / 19) * 100)}%`;
    this.streak.classList.toggle('hot', streak >= 3);
  }

  setPanels(panels) {
    const key = panels.map((p) => (p ? '1' : '0')).join('');
    if (key === this.lastPanels) return;
    this.lastPanels = key;
    panels.forEach((lit, i) => this.pips[i].classList.toggle('lit', !!lit));
    this.pips.forEach((el, i) => {
      if (!el.parentElement) return;
      if (i === 0) {
        el.parentElement.setAttribute(
          'aria-label',
          `Backboard panels lit: ${panels.filter(Boolean).length} of 4`
        );
      }
    });
  }

  syncPowerups(map) {
    const entries = [...map.entries()];
    const key = entries.map(([k]) => k).sort().join(',');
    if (key !== this.puKey) {
      this.puKey = key;
      this.powerups.textContent = '';
      this.puEls.clear();
      for (const [type] of entries) {
        const def = POWERUPS[type];
        if (!def) continue;
        const chip = document.createElement('div');
        chip.className = 'pu-chip';
        chip.style.setProperty('--accent', def.color);

        const top = document.createElement('div');
        top.className = 'pu-top';
        const tag = document.createElement('span');
        tag.className = 'pu-tag';
        tag.textContent = def.tag;
        const label = document.createElement('span');
        label.className = 'pu-label';
        label.textContent = def.label;
        top.append(tag, label);

        const bar = document.createElement('div');
        bar.className = 'pu-bar';
        const fill = document.createElement('i');

        bar.appendChild(fill);
        chip.append(top, bar);
        this.powerups.appendChild(chip);
        this.puEls.set(type, fill);
      }
    }

    for (const [type, remaining] of entries) {
      const fill = this.puEls.get(type);
      const def = POWERUPS[type];
      if (!fill || !def) continue;
      fill.style.width = `${Math.max(0, Math.min(1, remaining / def.duration)) * 100}%`;
    }
  }

  setHint(text) {
    if (text === this.lastHint) return;
    this.lastHint = text;
    if (!text) {
      this.hint.classList.add('hidden');
      return;
    }
    this.hint.classList.remove('hidden');
    this.hintText.textContent = text;
  }

  callout(main, sub = '', ms = 900, mode = '', color = '') {
    this.calloutToken += 1;
    const token = this.calloutToken;
    clearTimeout(this.calloutTimer);

    this.calloutEl.className = 'callout';
    if (mode) this.calloutEl.classList.add(`mode-${mode}`);
    this.calloutEl.style.setProperty('--callout-color', color || 'var(--cyan)');
    this.calloutMain.textContent = main;
    this.calloutSub.textContent = sub;
    this.calloutMain.style.animation = 'none';
    void this.calloutMain.offsetWidth;
    this.calloutMain.style.animation = '';
    this.calloutEl.classList.add('pop');

    this.calloutTimer = setTimeout(() => {
      if (token !== this.calloutToken) return;
      this.calloutEl.classList.add('fade');
      setTimeout(() => {
        if (token !== this.calloutToken) return;
        this.calloutEl.classList.add('hidden');
      }, 280);
    }, ms);
  }

  hideCallout() {
    this.calloutToken += 1;
    clearTimeout(this.calloutTimer);
    this.calloutEl.classList.add('hidden');
    this.calloutEl.classList.remove('fade', 'pop');
  }

  flash(color = '#5cf4ff') {
    this.flashEl.style.background = color;
    this.flashEl.classList.remove('on');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('on');
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.flashEl.classList.remove('on'), 420);
  }
}
