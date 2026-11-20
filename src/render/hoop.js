import { ARENA } from '../config.js';

const TAU = Math.PI * 2;

function rounded(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function drawMount(ctx, hoop) {
  const side = hoop.mirrored ? -1 : 1;
  const face = hoop.boardX;
  const back = face + side * 34;
  const top = hoop.panels[0].y0;
  const bottom = hoop.panels[hoop.panels.length - 1].y1;
  const wallX = side > 0 ? ARENA.W : 0;
  const midY = (top + bottom) / 2;

  ctx.save();
  // arms from the wall
  const g = ctx.createLinearGradient(face, midY, wallX, midY);
  g.addColorStop(0, 'rgba(36, 62, 88, 0.95)');
  g.addColorStop(1, 'rgba(8, 15, 27, 0.95)');
  ctx.fillStyle = g;

  for (const y of [top + 22, bottom - 22]) {
    ctx.beginPath();
    ctx.moveTo(face + side * 10, y - 6);
    ctx.lineTo(wallX, y - 11);
    ctx.lineTo(wallX, y + 11);
    ctx.lineTo(face + side * 10, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 210, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // vertical spine
  ctx.fillStyle = 'rgba(10, 21, 36, 0.98)';
  rounded(ctx, Math.min(back, back + side * 16), top - 4, 16, bottom - top + 8, 5);
  ctx.fill();

  // neon spine strip
  ctx.strokeStyle = 'rgba(92, 244, 255, 0.34)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(back + side * 4, top + 4);
  ctx.lineTo(back + side * 4, bottom - 4);
  ctx.stroke();

  // hub
  ctx.beginPath();
  ctx.arc(back + side * 12, midY, 8, 0, TAU);
  ctx.fillStyle = 'rgba(16, 34, 54, 1)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(92, 244, 255, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // decorative fan arcs
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#6fe8ff';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const p = hoop.panels[i];
    const y = (p.y0 + p.y1) / 2;
    ctx.beginPath();
    ctx.moveTo(back + side * 15, midY);
    ctx.quadraticCurveTo(
      back + side * 44,
      midY + (y - midY) * 0.4,
      face + side * 12,
      y
    );
    ctx.stroke();
  }
  ctx.setLineDash([3, 7]);
  ctx.beginPath();
  ctx.arc(back + side * 8, midY, 62, side > 0 ? Math.PI * 0.55 : -Math.PI * 0.45, side > 0 ? Math.PI * 1.45 : Math.PI * 0.45);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawBackboard(ctx, hoop, panels, panelPulse, time) {
  const side = hoop.mirrored ? -1 : 1;
  const face = hoop.boardX;
  const bodyX = side > 0 ? face - 3 : face - 31;
  const bodyW = 34;
  const top = hoop.panels[0].y0;
  const bottom = hoop.panels[hoop.panels.length - 1].y1;

  // frame
  ctx.save();
  rounded(ctx, bodyX - 5, top - 13, bodyW + 10, bottom - top + 26, 10);
  ctx.fillStyle = 'rgba(4, 11, 21, 0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(110, 210, 255, 0.24)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // glass sheen
  const sheen = ctx.createLinearGradient(bodyX, top, bodyX + bodyW, bottom);
  sheen.addColorStop(0, 'rgba(90, 190, 255, 0.08)');
  sheen.addColorStop(0.45, 'rgba(90, 190, 255, 0.01)');
  sheen.addColorStop(1, 'rgba(160, 230, 255, 0.05)');
  ctx.fillStyle = sheen;
  rounded(ctx, bodyX, top - 6, bodyW, bottom - top + 12, 7);
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < hoop.panels.length; i++) {
    const p = hoop.panels[i];
    const lit = !!panels[i];
    const pulse = panelPulse[i] || 0;
    const x = side > 0 ? face : face - 26;
    const y = p.y0 + 4;
    const h = p.y1 - p.y0 - 8;
    const w = 26;

    ctx.save();
    rounded(ctx, x, y, w, h, 4);
    if (lit || pulse > 0) {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, 'rgba(180, 254, 255, 0.96)');
      g.addColorStop(0.45, `rgba(92, 244, 255, ${0.48 + pulse * 0.4})`);
      g.addColorStop(1, 'rgba(28, 150, 220, 0.5)');
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(92, 244, 255, 0.9)';
      ctx.shadowBlur = 18 + pulse * 18;
    } else {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, 'rgba(14, 34, 52, 0.9)');
      g.addColorStop(1, 'rgba(6, 16, 28, 0.9)');
      ctx.fillStyle = g;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = lit ? 'rgba(225, 255, 255, 0.9)' : 'rgba(92, 160, 200, 0.24)';
    ctx.lineWidth = lit ? 1.4 : 1;
    ctx.stroke();

    // inner tick
    ctx.beginPath();
    ctx.moveTo(side > 0 ? x + 4 : x + w - 4, y + 4);
    ctx.lineTo(side > 0 ? x + 4 : x + w - 4, y + h - 4);
    ctx.strokeStyle = lit ? 'rgba(255,255,255,0.75)' : 'rgba(90, 170, 215, 0.16)';
    ctx.stroke();

    // panel number
    ctx.fillStyle = lit ? 'rgba(4, 24, 32, 0.75)' : 'rgba(125, 190, 225, 0.25)';
    ctx.font = '700 8px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`0${i + 1}`, x + w / 2, y + h / 2);
    ctx.restore();
  }

  // outer edge glow
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(face + side * 0.5, top - 10);
  ctx.lineTo(face + side * 0.5, bottom + 10);
  ctx.strokeStyle = 'rgba(92, 244, 255, 0.32)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawNet(ctx, hoop, net, netFlash) {
  if (!net) return;
  const { strands, levels, count } = net;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (netFlash > 0) {
    const glow = ctx.createRadialGradient(hoop.cx, hoop.cy + 28, 4, hoop.cx, hoop.cy + 28, 110);
    glow.addColorStop(0, `rgba(150, 255, 255, ${0.2 * netFlash})`);
    glow.addColorStop(1, 'rgba(80, 200, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(hoop.cx - 120, hoop.cy - 40, 240, 190);
  }

  // top ring
  ctx.beginPath();
  ctx.ellipse(hoop.cx, hoop.cy + 2, hoop.half, hoop.ry, 0, 0, TAU);
  ctx.strokeStyle = 'rgba(180, 240, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // verticals
  ctx.beginPath();
  for (let s = 0; s < count; s++) {
    const nodes = strands[s];
    ctx.moveTo(nodes[0].x, nodes[0].y);
    for (let l = 1; l < levels; l++) ctx.lineTo(nodes[l].x, nodes[l].y);
  }
  ctx.strokeStyle = `rgba(198, 244, 255, ${0.44 + netFlash * 0.3})`;
  ctx.lineWidth = 1.15;
  ctx.shadowColor = 'rgba(92, 244, 255, 0.5)';
  ctx.shadowBlur = netFlash > 0 ? 10 : 4;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // horizontal rings
  for (const l of [2, 4]) {
    ctx.beginPath();
    for (let s = 0; s < count; s++) {
      const n = strands[s][l];
      if (s === 0) ctx.moveTo(n.x, n.y);
      else ctx.lineTo(n.x, n.y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(150, 226, 255, ${l === 4 ? 0.24 : 0.15})`;
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawHoopBack(ctx, scene) {
  const { hoop, panels, panelPulse, net, netFlash, powerups, time } = scene;
  drawMount(ctx, hoop);

  if (powerups && powerups.has('bigRim')) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(hoop.cx, hoop.cy, hoop.half + 12, hoop.ry + 9, 0, 0, TAU);
    ctx.setLineDash([7, 9]);
    ctx.lineDashOffset = -time * 34;
    ctx.strokeStyle = 'rgba(193, 132, 255, 0.55)';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = 'rgba(193, 132, 255, 0.7)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();
  }

  drawBackboard(ctx, hoop, panels, panelPulse, time);

  // rim to board connector
  const side = hoop.mirrored ? -1 : 1;
  ctx.save();
  const edgeX = hoop.cx + side * hoop.half;
  ctx.beginPath();
  ctx.moveTo(edgeX, hoop.cy - 6);
  ctx.lineTo(hoop.boardX, hoop.cy - 7);
  ctx.lineTo(hoop.boardX, hoop.cy + 7);
  ctx.lineTo(edgeX, hoop.cy + 6);
  ctx.closePath();
  ctx.fillStyle = 'rgba(52, 30, 22, 0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 150, 70, 0.38)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // back half of the rim
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(hoop.cx, hoop.cy, hoop.half, hoop.ry, 0, Math.PI, TAU);
  ctx.strokeStyle = 'rgba(150, 60, 16, 0.55)';
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(hoop.cx, hoop.cy, hoop.half, hoop.ry, 0, Math.PI, TAU);
  ctx.strokeStyle = 'rgba(255, 126, 34, 0.5)';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();

  drawNet(ctx, hoop, net, netFlash || 0);
}

export function drawHoopFront(ctx, scene) {
  const { hoop, rimFlash, powerups, time } = scene;

  ctx.save();
  // front half of the rim
  const grad = ctx.createLinearGradient(hoop.cx - hoop.half, 0, hoop.cx + hoop.half, 0);
  grad.addColorStop(0, '#ffbd6b');
  grad.addColorStop(0.35, '#ff8a2b');
  grad.addColorStop(0.72, '#ef5d10');
  grad.addColorStop(1, '#b93c06');

  ctx.beginPath();
  ctx.ellipse(hoop.cx, hoop.cy, hoop.half, hoop.ry, 0, 0, Math.PI);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 11;
  ctx.shadowColor = 'rgba(255, 122, 30, 0.75)';
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.ellipse(hoop.cx, hoop.cy, hoop.half, hoop.ry, 0, 0.08, Math.PI - 0.08);
  ctx.strokeStyle = 'rgba(255, 224, 180, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // knobs
  for (const sx of [-1, 1]) {
    const x = hoop.cx + sx * hoop.half;
    const r = hoop.knobR;
    const kg = ctx.createRadialGradient(x - r * 0.3, hoop.cy - r * 0.35, 1, x, hoop.cy, r * 1.1);
    kg.addColorStop(0, '#fff2d7');
    kg.addColorStop(0.35, '#ffb35b');
    kg.addColorStop(0.8, '#ff7a1f');
    kg.addColorStop(1, '#9c3708');
    ctx.beginPath();
    ctx.arc(x, hoop.cy, r, 0, TAU);
    ctx.fillStyle = kg;
    ctx.shadowColor = 'rgba(255, 140, 40, 0.9)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(x - r * 0.3, hoop.cy - r * 0.35, r * 0.26, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fill();
  }

  if (rimFlash > 0) {
    ctx.beginPath();
    ctx.ellipse(hoop.cx, hoop.cy, hoop.half + 7, hoop.ry + 6, 0, 0, TAU);
    ctx.strokeStyle = `rgba(255, 210, 150, ${rimFlash * 0.7})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (powerups && powerups.has('double')) {
    ctx.beginPath();
    ctx.ellipse(hoop.cx, hoop.cy, hoop.half * 0.75, hoop.ry * 0.75, 0, 0, TAU);
    ctx.strokeStyle = `rgba(255, 209, 102, ${0.18 + 0.12 * Math.sin(time * 4)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}
