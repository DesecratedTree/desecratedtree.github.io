import { ARENA, MIRROR } from '../config.js';

const TAU = Math.PI * 2;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function offscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function makeStars(seed, count) {
  const c = offscreen(ARENA.W, ARENA.H);
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  const colors = ['#ffffff', '#dff2ff', '#bfe4ff', '#ffeccd', '#a8ccff'];

  for (let i = 0; i < count; i++) {
    const x = rnd() * ARENA.W;
    const y = rnd() * ARENA.H;
    const r = 0.5 + Math.pow(rnd(), 2.4) * 1.9;
    const a = 0.32 + rnd() * 0.68;
    g.globalAlpha = a;
    g.fillStyle = colors[Math.floor(rnd() * colors.length)];
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();

    if (r > 1.25 && rnd() > 0.55) {
      g.globalAlpha = a * 0.28;
      g.strokeStyle = g.fillStyle;
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(x - r * 5, y);
      g.lineTo(x + r * 5, y);
      g.moveTo(x, y - r * 5);
      g.lineTo(x, y + r * 5);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  return c;
}

function makeNebula() {
  const c = offscreen(ARENA.W, ARENA.H);
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'lighter';

  const blobs = [
    { x: ARENA.W * 0.12, y: ARENA.H * 0.3, r: ARENA.H * 0.58, color: 'rgba(58, 122, 220, 0.3)' },
    { x: ARENA.W * 0.55, y: ARENA.H * 0.22, r: ARENA.H * 0.5, color: 'rgba(140, 48, 168, 0.24)' },
    { x: ARENA.W * 0.86, y: ARENA.H * 0.14, r: ARENA.H * 0.45, color: 'rgba(26, 140, 190, 0.2)' },
    { x: ARENA.W * 0.72, y: ARENA.H * 0.82, r: ARENA.H * 0.52, color: 'rgba(180, 58, 118, 0.17)' },
    { x: ARENA.W * 0.3, y: ARENA.H * 0.58, r: ARENA.H * 0.68, color: 'rgba(44, 96, 178, 0.2)' },
  ];

  for (const b of blobs) {
    const grad = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    grad.addColorStop(0, b.color);
    grad.addColorStop(0.55, b.color.replace(/[\d.]+\)$/, '0.09)'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }

  g.globalCompositeOperation = 'source-over';
  return c;
}

function paintBlob(g, x, y, rx, ry, rot, fill) {
  for (const off of [-1024, 0, 1024]) {
    g.save();
    g.translate(x + off, y);
    g.rotate(rot);
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, TAU);
    g.fillStyle = fill;
    g.fill();
    g.restore();
  }
}

function makePlanet() {
  const w = 1024;
  const h = 512;
  const map = offscreen(w, h);
  const g = map.getContext('2d');
  const rnd = mulberry32(20100712);

  const ocean = g.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, '#155078');
  ocean.addColorStop(0.45, '#0e3a5c');
  ocean.addColorStop(1, '#0a2740');
  g.fillStyle = ocean;
  g.fillRect(0, 0, w, h);

  const greens = ['#2f8a6a', '#3ba37e', '#49b98f', '#3f9f7c', '#57c49a'];
  for (let c = 0; c < 14; c++) {
    const cx = rnd() * w;
    const cy = 70 + rnd() * (h - 150);
    const radius = 26 + rnd() * 54;
    const color = greens[Math.floor(rnd() * greens.length)];
    const rot = rnd() * TAU;
    for (let b = 0; b < 18; b++) {
      const a = rnd() * TAU;
      const d = rnd() * radius;
      const rx = 10 + rnd() * 40;
      const ry = 8 + rnd() * 30;
      paintBlob(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, rx, ry, rot + rnd(), color);
    }
    // dry interior
    if (rnd() > 0.45) {
      for (let b = 0; b < 5; b++) {
        paintBlob(
          g,
          cx + (rnd() * 2 - 1) * radius,
          cy + (rnd() * 2 - 1) * radius * 0.6,
          12 + rnd() * 26,
          8 + rnd() * 18,
          rnd() * TAU,
          'rgba(128, 116, 74, 0.35)'
        );
      }
    }
  }

  // small island chains
  for (let i = 0; i < 70; i++) {
    paintBlob(
      g,
      rnd() * w,
      60 + rnd() * (h - 120),
      2 + rnd() * 8,
      1.5 + rnd() * 5,
      rnd() * TAU,
      'rgba(58, 128, 96, 0.8)'
    );
  }

  // ice caps
  const north = g.createLinearGradient(0, 0, 0, 72);
  north.addColorStop(0, 'rgba(226, 246, 255, 0.9)');
  north.addColorStop(1, 'rgba(226, 246, 255, 0)');
  g.fillStyle = north;
  g.fillRect(0, 0, w, 72);

  const south = g.createLinearGradient(0, h - 84, 0, h);
  south.addColorStop(0, 'rgba(220, 244, 255, 0)');
  south.addColorStop(1, 'rgba(220, 244, 255, 0.95)');
  g.fillStyle = south;
  g.fillRect(0, h - 84, w, 84);

  // speckle texture
  for (let i = 0; i < 420; i++) {
    g.globalAlpha = 0.05 + rnd() * 0.08;
    g.fillStyle = rnd() > 0.5 ? '#c6f4ff' : '#02101d';
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  g.globalAlpha = 1;

  const clouds = offscreen(w, h);
  const c = clouds.getContext('2d');
  for (let i = 0; i < 46; i++) {
    const x = rnd() * w;
    const y = 40 + rnd() * (h - 80);
    const r = 16 + rnd() * 58;
    for (const off of [-1024, 0, 1024]) {
      const grad = c.createRadialGradient(x + off, y, 0, x + off, y, r);
      grad.addColorStop(0, 'rgba(238, 252, 255, 0.24)');
      grad.addColorStop(0.6, 'rgba(238, 252, 255, 0.08)');
      grad.addColorStop(1, 'rgba(238, 252, 255, 0)');
      c.fillStyle = grad;
      c.beginPath();
      c.ellipse(x + off, y, r * 1.9, r * 0.62, rnd() * 0.4, 0, TAU);
      c.fill();
    }
  }

  // City lights sampled only from land pixels.
  const cities = [];
  try {
    const data = g.getImageData(0, 0, w, h).data;
    for (let tries = 0; tries < 400 && cities.length < 80; tries++) {
      const x = Math.floor(rnd() * w);
      const y = Math.floor(60 + rnd() * (h - 130));
      const i = (y * w + x) * 4;
      const r = data[i];
      const gg = data[i + 1];
      const b = data[i + 2];
      if (gg > b + 14 && gg > 42 && r < gg + 30) {
        cities.push({ u: x / w, v: y / h, phase: rnd() * TAU });
      }
    }
  } catch {
    /* texture sampling is optional */
  }

  return { map, clouds, cities };
}

function makeAsteroids() {
  const rnd = mulberry32(77);
  const list = [];
  for (let i = 0; i < 7; i++) {
    const points = [];
    const n = 8 + Math.floor(rnd() * 4);
    for (let p = 0; p < n; p++) {
      const a = (p / n) * TAU;
      const r = 0.6 + rnd() * 0.45;
      points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    list.push({
      // Stored as fractions so the belt still spans the arena after a resize.
      fx: rnd(),
      fy: 0.16 + rnd() * 0.66,
      scale: 12 + rnd() * 26,
      rot: rnd() * TAU,
      spin: (rnd() * 2 - 1) * 0.06,
      speed: (rnd() * 2 - 1) * 4.2,
      near: i % 3 === 0,
      points,
      crater: rnd(),
    });
  }
  return list;
}

function drawPlanet(ctx, planet, time, ox, oy) {
  const R = ARENA.H * 0.34;
  const cx = (MIRROR ? ARENA.W * 0.74 : ARENA.W * 0.26) + ox;
  const cy = ARENA.H * 0.95 + oy;

  // outer atmosphere
  const halo = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.34);
  halo.addColorStop(0, 'rgba(90, 200, 255, 0.3)');
  halo.addColorStop(0.45, 'rgba(60, 160, 255, 0.11)');
  halo.addColorStop(1, 'rgba(30, 90, 180, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.34, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();

  ctx.fillStyle = '#0b2a44';
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // The map is 2:1. Draw it at 2R tall and 4R wide so the visible disc
  // shows half the map and the continents keep their proportions.
  const mapW = R * 4;
  const scroll = (((time * 10) % mapW) + mapW) % mapW;
  ctx.drawImage(planet.map, cx - R - scroll, cy - R, mapW, R * 2);
  ctx.drawImage(planet.map, cx - R - scroll + mapW, cy - R, mapW, R * 2);

  const cloudScroll = (((time * 6.2) % mapW) + mapW) % mapW;
  ctx.globalAlpha = 0.55;
  ctx.drawImage(planet.clouds, cx - R - cloudScroll, cy - R, mapW, R * 2);
  ctx.drawImage(planet.clouds, cx - R - cloudScroll + mapW, cy - R, mapW, R * 2);
  ctx.globalAlpha = 1;

  const shade = ctx.createRadialGradient(
    cx - R * 0.42,
    cy - R * 0.48,
    R * 0.08,
    cx,
    cy,
    R * 1.05
  );
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  shade.addColorStop(0.32, 'rgba(255, 255, 255, 0.05)');
  shade.addColorStop(0.6, 'rgba(0, 5, 14, 0.18)');
  shade.addColorStop(0.85, 'rgba(0, 3, 10, 0.5)');
  shade.addColorStop(1, 'rgba(0, 2, 7, 0.72)');
  ctx.fillStyle = shade;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // city lights
  for (const city of planet.cities) {
    const bx = cx - R + ((((city.u * mapW - scroll) % mapW) + mapW) % mapW);
    const by = cy - R + city.v * R * 2;
    const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.7 + city.phase));
    const darkSide = bx > cx ? 1 : 0.35;
    ctx.globalAlpha = 0.45 * twinkle * darkSide;
    ctx.fillStyle = '#ffd08a';
    ctx.beginPath();
    ctx.arc(bx, by, 1.15, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // inner limb glow
  const limb = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R);
  limb.addColorStop(0, 'rgba(70, 190, 255, 0)');
  limb.addColorStop(0.86, 'rgba(90, 210, 255, 0.07)');
  limb.addColorStop(1, 'rgba(140, 235, 255, 0.34)');
  ctx.fillStyle = limb;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  ctx.restore();

  // limb light
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R - 1, Math.PI * 1.06, Math.PI * 1.52);
  ctx.strokeStyle = 'rgba(170, 244, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(90, 210, 255, 0.8)';
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.strokeStyle = 'rgba(80, 190, 255, 0.16)';
  ctx.lineWidth = 9;
  ctx.shadowColor = 'rgba(60, 170, 255, 0.55)';
  ctx.shadowBlur = 30;
  ctx.stroke();
  ctx.restore();
}

function drawAsteroids(ctx, asteroids, time, near) {
  for (const a of asteroids) {
    if (a.near !== near) continue;
    let x = a.fx * ARENA.W + (time * a.speed) % (ARENA.W + 280);
    x = ((x + 140) % (ARENA.W + 280)) - 140;
    const y = a.fy * ARENA.H + Math.sin(time * 0.18 + a.rot) * 14;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a.rot + time * a.spin);
    ctx.scale(a.scale, a.scale);
    ctx.beginPath();
    a.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = near ? 'rgba(18, 34, 56, 0.95)' : 'rgba(12, 24, 42, 0.97)';
    ctx.fill();
    ctx.strokeStyle = near ? 'rgba(120, 200, 245, 0.4)' : 'rgba(105, 180, 230, 0.26)';
    ctx.lineWidth = 0.11;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-0.18, -0.1, 0.22 + a.crater * 0.15, 0, TAU);
    ctx.fillStyle = 'rgba(16, 32, 50, 0.9)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-0.55, -0.35);
    ctx.lineTo(-0.2, -0.6);
    ctx.strokeStyle = 'rgba(150, 220, 255, 0.2)';
    ctx.lineWidth = 0.06;
    ctx.stroke();
    ctx.restore();
  }
}

export function createArenaRenderer() {
  const far = makeStars(3, 240);
  const near = makeStars(11, 110);
  const nebula = makeNebula();
  const planet = makePlanet();
  const asteroids = makeAsteroids();

  function draw(ctx, { time = 0, pointer = { x: 0, y: 0 } } = {}) {
    const px = pointer.x || 0;
    const py = pointer.y || 0;

    ctx.fillStyle = '#060b19';
    ctx.fillRect(0, 0, ARENA.W, ARENA.H);

    // The star/nebula plates are painted once at the arena size they were
    // built for; stretching them keeps the full-bleed backdrop seamless after
    // the arena is re-sized to a new viewport shape.
    ctx.drawImage(nebula, 0, 0, ARENA.W, ARENA.H);

    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(far, px * 3 - 8, py * 2 - 8, ARENA.W + 16, ARENA.H + 16);
    ctx.restore();

    drawAsteroids(ctx, asteroids, time, false);
    drawPlanet(ctx, planet, time, px * 8, py * 6);

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(near, -px * 4 - 8, -py * 3 - 8, ARENA.W + 16, ARENA.H + 16);
    ctx.restore();

    drawAsteroids(ctx, asteroids, time, true);

    // distant orbital arc
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.strokeStyle = '#6fdcff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(ARENA.W * 0.55, ARENA.H * 0.95, ARENA.W * 0.45, ARENA.H * 0.55, -0.12, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  return { draw };
}


