const BEST_KEY = 'dunkstar.best';
const MUTE_KEY = 'dunkstar.muted';
const BALL_KEY = 'dunkstar.ball';
const DIFFICULTY_KEY = 'dunkstar.difficulty';

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* private mode / storage disabled */
  }
}

export const Storage = {
  getBest() {
    const n = Number(read(BEST_KEY, 0));
    return Number.isFinite(n) && n > 0 ? n : 0;
  },
  setBest(score) {
    write(BEST_KEY, Math.round(score));
  },
  getMuted() {
    return read(MUTE_KEY, '0') === '1';
  },
  setMuted(muted) {
    write(MUTE_KEY, muted ? '1' : '0');
  },
  getBallId() {
    return read(BALL_KEY, '');
  },
  setBallId(id) {
    write(BALL_KEY, id);
  },
  getDifficulty() {
    return read(DIFFICULTY_KEY, 'normal');
  },
  setDifficulty(key) {
    write(DIFFICULTY_KEY, key);
  },
};
