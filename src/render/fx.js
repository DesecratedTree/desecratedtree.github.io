const TAU = Math.PI * 2;

export class Effects {
  constructor() {
    this.particles = [];
    this.floaters = [];
    this.rings = [];
    this.shakeAmount = 0;
    this.maxShake = 0;
  }

  clear() {
    this.particles.length = 0;
    this.floaters.length = 0;
    this.rings.length = 0;
    this.shakeAmount = 0;
    this.maxShake = 0;
  }

  shake(amount) {
    this.maxShake = Math.max(this.maxShake, amount);
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  burst(x, y, { count = 12, colors = ['#ffb347'], speed = 320, spread = TAU, angle = 0, gravity = 700, size = 3.5, life = 0.7 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.35 + Math.random() * 0.9);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        gravity,
        life,
        max: life * (0.7 + Math.random() * 0.6),
        size: size * (0.55 + Math.random() * 0.9),
        color: colors[Math.floor(Math.random() * colors.length)],
        kind: Math.random() > 0.55 ? 'streak' : 'dot',
      });
    }
    this.trimParticles();
  }

  ring(x, y, color, radius = 90, width = 3, life = 0.5) {
    this.rings.push({ x, y, color, radius, width, life, max: life });
  }

  float(x, y, text, color = '#ffffff', size = 30, life = 0.95, vy = -58) {
    this.floaters.push({ x, y, text, color, size, life, max: life, vy });
  }

  trimParticles() {
    if (this.particles.length > 560) this.particles.splice(0, this.particles.length - 560);
    if (this.floaters.length > 14) this.floaters.splice(0, this.floaters.length - 14);
    if (this.rings.length > 12) this.rings.splice(0, this.rings.length - 12);
  }

  update(dt) {
    const step = Math.min(dt, 0.033);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= step;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vx *= 0.985;
      p.vy *= 0.99;
    }

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= step;
      if (f.life <= 0) {
        this.floaters.splice(i, 1);
        continue;
      }
      f.y += f.vy * step;
      f.vy *= 0.96;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= step;
      if (r.life <= 0) this.rings.splice(i, 1);
    }

    this.shakeAmount = Math.max(0, this.shakeAmount - 30 * step);
    this.maxShake = Math.max(0, this.maxShake - 20 * step);
  }

  offset() {
    if (this.shakeAmount <= 0.05) return { x: 0, y: 0 };
    const a = this.shakeAmount;
    return {
      x: (Math.random() * 2 - 1) * a,
      y: (Math.random() * 2 - 1) * a,
    };
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      const t = Math.max(0, p.life / p.max);
      ctx.globalAlpha = t;
      ctx.strokeStyle = p.color;
      ctx.fillStyle = p.color;
      if (p.kind === 'streak') {
        ctx.beginPath();
        ctx.lineWidth = p.size * 0.65;
        ctx.lineCap = 'round';
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + t * 0.6), 0, TAU);
        ctx.fill();
      }
    }

    for (const r of this.rings) {
      const t = 1 - r.life / r.max;
      const ease = 1 - Math.pow(1 - t, 2.2);
      ctx.globalAlpha = (1 - t) * 0.65;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - t * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + r.radius * ease, 0, TAU);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floaters) {
      const t = f.life / f.max;
      ctx.globalAlpha = Math.min(1, t * 1.8);
      ctx.fillStyle = f.color;
      const family = /[0-9]/.test(f.text)
        ? "'Bahnschrift', 'Segoe UI', system-ui, sans-serif"
        : 'Orbitron, sans-serif';
      ctx.font = `800 ${f.size}px ${family}`;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 16;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
