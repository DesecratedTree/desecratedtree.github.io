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
  ctx.restore();

  finishSphere(ctx, x, y, r, palette);
}
