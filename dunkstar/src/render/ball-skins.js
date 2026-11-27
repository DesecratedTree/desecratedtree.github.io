// Procedural neon ball skins. These are vector draws, not external assets, so
// the locker thumbnails and the live canvas ball use exactly the same art.
const TAU = Math.PI * 2;

function baseSphere(ctx, x, y, r, palette) {
  const g = ctx.createRadialGradient(x - r * 0.34, y - r * 0.42, r * 0.04, x, y, r * 1.05);
  g.addColorStop(0, palette.light);
  g.addColorStop(0.26, palette.mid);
  g.addColorStop(0.72, palette.base);
  g.addColorStop(1, '#01030a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function auroraPattern(ctx, r, palette) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.shadowBlur = r * 0.24;
  const bands = [
    { y: -r * 0.34, amp: r * 0.16, w: r * 0.14, a: 0.8, color: palette.edge },
    { y: r * 0.02, amp: r * 0.23, w: r * 0.06, a: 0.62, color: palette.light },
    { y: r * 0.38, amp: r * 0.12, w: r * 0.05, a: 0.58, color: palette.edge },
  ];
  for (const band of bands) {
    ctx.globalAlpha = band.a;
    ctx.strokeStyle = band.color;
    ctx.shadowColor = band.color;
    ctx.lineWidth = band.w;
    ctx.beginPath();
    ctx.moveTo(-r * 1.15, band.y);
    ctx.bezierCurveTo(-r * 0.42, band.y - band.amp, r * 0.16, band.y + band.amp, r * 1.15, band.y);
    ctx.stroke();
  }

  const stars = [
    [-0.48, -0.34, 0.045],
    [0.2, -0.56, 0.03],
    [0.5, 0.24, 0.04],
    [-0.15, 0.55, 0.028],
  ];
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = palette.light;
  ctx.shadowColor = palette.light;
  ctx.shadowBlur = r * 0.18;
  for (const [sx, sy, sr] of stars) {
    ctx.beginPath();
    ctx.arc(sx * r, sy * r, sr * r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function novaPattern(ctx, r, palette) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.shadowBlur = r * 0.2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const inner = r * 0.18;
    const outer = r * (0.58 + (i % 3) * 0.13);
    ctx.globalAlpha = 0.68 + (i % 2) * 0.18;
    ctx.strokeStyle = i % 3 === 0 ? palette.light : palette.edge;
    ctx.shadowColor = palette.edge;
    ctx.lineWidth = r * (i % 3 === 0 ? 0.06 : 0.03);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.light;
  ctx.shadowColor = palette.light;
  ctx.shadowBlur = r * 0.35;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.18, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = r * 0.035;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.42, 0.4, 2.2);
  ctx.stroke();
  ctx.restore();
}

function voidPattern(ctx, r, palette) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowBlur = r * 0.14;
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.68 - i * 0.13;
    ctx.strokeStyle = i === 1 ? palette.light : palette.edge;
    ctx.shadowColor = palette.edge;
    ctx.lineWidth = r * (0.035 - i * 0.006);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (0.62 + i * 0.17), r * (0.22 + i * 0.08), i * 0.62 - 0.3, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = '#01020a';
  ctx.shadowColor = palette.light;
  ctx.shadowBlur = r * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.23, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = palette.light;
  ctx.lineWidth = r * 0.045;
  ctx.stroke();

  const stars = [
    [-0.58, -0.2, 0.027],
    [0.5, -0.5, 0.033],
    [0.55, 0.42, 0.022],
    [-0.38, 0.55, 0.03],
  ];
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = palette.light;
  for (const [sx, sy, sr] of stars) {
    ctx.beginPath();
    ctx.arc(sx * r, sy * r, sr * r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function pulsarPattern(ctx, r, palette) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.rotate(-0.62);

  // Twin lighthouse beams, the signature of a pulsar.
  for (const dir of [-1, 1]) {
    const beam = ctx.createLinearGradient(0, 0, 0, dir * r * 1.15);
    beam.addColorStop(0, palette.light);
    beam.addColorStop(0.3, palette.edge);
    beam.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(-r * 0.09, 0);
    ctx.lineTo(-r * 0.4, dir * r * 1.15);
    ctx.lineTo(r * 0.4, dir * r * 1.15);
    ctx.lineTo(r * 0.09, 0);
    ctx.closePath();
    ctx.fill();
  }

  // Magnetic field arcs cut across the beam axis.
  ctx.strokeStyle = palette.light;
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.5 - i * 0.1;
    ctx.shadowColor = palette.edge;
    ctx.shadowBlur = r * 0.18;
    ctx.lineWidth = r * (0.022 + i * 0.006);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (0.82 - i * 0.12), r * (0.26 + i * 0.16), 0, 0, TAU);
    ctx.stroke();
  }

  // Pulsing core with a four-point flare.
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = palette.light;
  ctx.shadowColor = palette.light;
  ctx.shadowBlur = r * 0.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.13, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = palette.light;
  ctx.lineWidth = r * 0.035;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const len = r * (i % 2 === 0 ? 0.52 : 0.36);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function nebulaPattern(ctx, r, palette) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  // Three soft spiral arms instead of straight aurora bands.
  for (let arm = 0; arm < 3; arm++) {
    const offset = (arm / 3) * TAU;
    for (let layer = 0; layer < 2; layer++) {
      ctx.globalAlpha = layer === 0 ? 0.2 : 0.62;
      ctx.strokeStyle = layer === 0 ? palette.edge : palette.light;
      ctx.shadowColor = palette.edge;
      ctx.shadowBlur = layer === 0 ? r * 0.3 : r * 0.14;
      ctx.lineWidth = r * (layer === 0 ? 0.16 : 0.038);
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const a = offset + t * Math.PI * 2.15;
        const rad = r * (0.1 + t * 0.92);
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad * 0.88;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // Glowing nucleus.
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.34);
  core.addColorStop(0, palette.light);
  core.addColorStop(0.35, palette.mid);
  core.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.34, 0, TAU);
  ctx.fill();

  // Star cluster scattered across the arms.
  const stars = [
    [-0.62, -0.42, 0.04],
    [0.48, -0.58, 0.026],
    [0.66, 0.3, 0.035],
    [-0.3, 0.64, 0.024],
    [-0.52, 0.2, 0.02],
    [0.16, 0.48, 0.03],
  ];
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = palette.light;
  ctx.shadowColor = palette.light;
  ctx.shadowBlur = r * 0.16;
  for (const [sx, sy, sr] of stars) {
    ctx.beginPath();
    ctx.arc(sx * r, sy * r, sr * r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function prismPattern(ctx, r, palette) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Hard-edged gem crown: six chunky facets around a hexagonal core.
  const colors = [palette.light, palette.mid, palette.edge];
  const inner = r * 0.3;
  const gap = 0.03;
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * TAU + 0.26;
    const a1 = a0 + TAU / 6;
    ctx.globalAlpha = 0.3 + (i % 3) * 0.12;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(Math.cos(a0 + gap) * inner, Math.sin(a0 + gap) * inner);
    ctx.lineTo(Math.cos(a0 + gap) * r * 1.05, Math.sin(a0 + gap) * r * 1.05);
    ctx.lineTo(Math.cos(a1 - gap) * r * 1.05, Math.sin(a1 - gap) * r * 1.05);
    ctx.lineTo(Math.cos(a1 - gap) * inner, Math.sin(a1 - gap) * inner);
    ctx.closePath();
    ctx.fill();
  }

  // White hexagon bezel.
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = palette.edge;
  ctx.shadowBlur = r * 0.3;
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.26;
    const x = Math.cos(a) * r * 0.34;
    const y = Math.sin(a) * r * 0.34;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Facet seams.
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = palette.light;
  ctx.lineWidth = r * 0.018;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.26;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34);
    ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.09, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function eclipsePattern(ctx, r, palette) {
  ctx.save();
  const cx = r * 0.05;
  const cy = -r * 0.02;
  const disk = r * 0.52;

  // Wispy corona burning just outside the moon's edge.
  const corona = ctx.createRadialGradient(cx, cy, disk * 0.92, cx, cy, disk * 1.55);
  corona.addColorStop(0, 'rgba(0, 0, 0, 0)');
  corona.addColorStop(0.16, palette.light);
  corona.addColorStop(0.34, palette.edge);
  corona.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(cx, cy, disk * 1.55, 0, TAU);
  ctx.fill();

  // Thin ring of light.
  ctx.globalAlpha = 1;
  ctx.strokeStyle = palette.light;
  ctx.shadowColor = palette.light;
  ctx.shadowBlur = r * 0.3;
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(cx, cy, disk, 0, TAU);
  ctx.stroke();

  // The moon: a large black disk that swallows most of the sphere.
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#020104';
  ctx.beginPath();
  ctx.arc(cx, cy, disk - r * 0.012, 0, TAU);
  ctx.fill();

  // Solar prominences licking off the rim.
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = palette.edge;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = r * 0.038;
  ctx.lineCap = 'round';
  for (const [a, span] of [[-2.35, 0.5], [-0.85, 0.38], [2.6, 0.44]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, disk * 1.06, a - span, a + span);
    ctx.stroke();
  }

  // Diamond-ring flare.
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = palette.light;
  ctx.shadowBlur = r * 0.55;
  ctx.beginPath();
  ctx.arc(cx + disk * 0.18, cy - disk * 0.98, r * 0.075, 0, TAU);
  ctx.fill();

  // Faint stars in the darkened sky.
  const stars = [
    [-0.72, -0.3, 0.024],
    [0.68, -0.5, 0.02],
    [-0.4, 0.68, 0.022],
    [0.5, 0.6, 0.018],
  ];
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = palette.light;
  ctx.shadowBlur = r * 0.1;
  for (const [sx, sy, sr] of stars) {
    ctx.beginPath();
    ctx.arc(sx * r, sy * r, sr * r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function finishSphere(ctx, x, y, r, palette) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();

  const shade = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.76, 'rgba(0, 0, 0, 0.12)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.56)');
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();

  const shine = ctx.createRadialGradient(
    x - r * 0.36,
    y - r * 0.4,
    r * 0.02,
    x - r * 0.15,
    y - r * 0.26,
    r * 0.7
  );
  shine.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
  shine.addColorStop(0.4, 'rgba(255, 255, 255, 0.04)');
  shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 0.6, 0, TAU);
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.stroke();
  ctx.restore();
}

export function drawProceduralBall(ctx, x, y, r, ball, rotation = 0) {
  const palette = ball && ball.palette;
  if (!palette) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  baseSphere(ctx, x, y, r, palette);
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (ball.pattern === 'aurora') auroraPattern(ctx, r, palette);
  else if (ball.pattern === 'nova') novaPattern(ctx, r, palette);
  else if (ball.pattern === 'void') voidPattern(ctx, r, palette);
  else if (ball.pattern === 'pulsar') pulsarPattern(ctx, r, palette);
  else if (ball.pattern === 'nebula') nebulaPattern(ctx, r, palette);
  else if (ball.pattern === 'prism') prismPattern(ctx, r, palette);
  else if (ball.pattern === 'eclipse') eclipsePattern(ctx, r, palette);
  ctx.restore();

  finishSphere(ctx, x, y, r, palette);
}
