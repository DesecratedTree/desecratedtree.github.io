import { ARENA, clamp } from './config.js';

export class Input {
  constructor(el, handlers) {
    this.el = el;
    this.handlers = handlers;
    this.pointerId = null;
    this.active = false;
    this.rect = null;

    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onContext = (e) => e.preventDefault();

    el.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove, { passive: false });
    window.addEventListener('pointerup', this.onUp, { passive: false });
    window.addEventListener('pointercancel', this.onCancel);
    el.addEventListener('contextmenu', this.onContext);
  }

  toArena(e) {
    const r = this.el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / (r.width || 1)) * ARENA.W;
    const y = ((e.clientY - r.top) / (r.height || 1)) * ARENA.H;
    return { x: clamp(x, -90, ARENA.W + 90), y: clamp(y, -130, ARENA.H + 130) };
  }

  onDown(e) {
    if (this.pointerId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.pointerId = e.pointerId;
    this.active = true;
    this.rect = this.el.getBoundingClientRect();
    const p = this.toArena(e);
    this.handlers.onDown?.(p.x, p.y);
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    e.preventDefault();
  }

  onMove(e) {
    const p = this.toArena(e);
    this.handlers.onHover?.(p.x, p.y);
    if (!this.active || e.pointerId !== this.pointerId) return;
    this.handlers.onMove?.(p.x, p.y);
    e.preventDefault();
  }

  onUp(e) {
    if (!this.active || e.pointerId !== this.pointerId) return;
    const p = this.toArena(e);
    this.active = false;
    this.pointerId = null;
    this.handlers.onUp?.(p.x, p.y);
    e.preventDefault();
  }

  onCancel(e) {
    if (!this.active) return;
    if (e && e.pointerId !== this.pointerId) return;
    this.active = false;
    this.pointerId = null;
    this.handlers.onCancel?.();
  }

  /** Drop an in-progress drag (auto-pause, tab hide, results, etc.). */
  cancel() {
    if (!this.active && this.pointerId === null) return;
    this.active = false;
    this.pointerId = null;
    this.handlers.onCancel?.();
  }

  destroy() {
    this.el.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel);
    this.el.removeEventListener('contextmenu', this.onContext);
  }
}
