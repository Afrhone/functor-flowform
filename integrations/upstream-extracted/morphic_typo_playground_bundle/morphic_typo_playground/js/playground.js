import { glyphs, lerp, resampleStroke, pathFromPoints, glyphToSvgPaths } from './glyphs.js';

const canvas = document.querySelector('#stage');
const ctx = canvas.getContext('2d');
const ui = {
  glyphSelect: document.querySelector('#glyphSelect'),
  morph: document.querySelector('#morph'),
  energy: document.querySelector('#energy'),
  speed: document.querySelector('#speed'),
  tension: document.querySelector('#tension'),
  functionMode: document.querySelector('#functionMode'),
  strokeWeight: document.querySelector('#strokeWeight'),
  showPoints: document.querySelector('#showPoints'),
  pause: document.querySelector('#pause'),
  randomize: document.querySelector('#randomize'),
  exportSvg: document.querySelector('#exportSvg'),
  reset: document.querySelector('#reset'),
  gallery: document.querySelector('#gallery'),
  source: document.querySelector('#source'),
  readout: document.querySelector('#readout'),
  specimen: document.querySelector('#specimen')
};

const state = {
  t: 0,
  playing: true,
  glyphIndex: 0,
  pointer: { x: 0.5, y: 0.5, down: false },
  lastW: 0,
  lastH: 0,
  particles: []
};

function init() {
  glyphs.forEach((g, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `${g.short} · ${g.label}`;
    ui.glyphSelect.appendChild(option);

    const card = document.createElement('button');
    card.className = 'glyph-card';
    card.type = 'button';
    card.setAttribute('aria-label', `Select ${g.label}`);
    card.innerHTML = `<span class="glyph-mark">${g.short}</span><small>${g.label}</small>`;
    card.addEventListener('click', () => selectGlyph(i));
    ui.gallery.appendChild(card);
  });

  ui.glyphSelect.addEventListener('change', e => selectGlyph(Number(e.target.value)));
  ui.pause.addEventListener('click', () => {
    state.playing = !state.playing;
    ui.pause.textContent = state.playing ? 'Pause kinetics' : 'Resume kinetics';
  });
  ui.randomize.addEventListener('click', randomize);
  ui.reset.addEventListener('click', reset);
  ui.exportSvg.addEventListener('click', exportSvg);

  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerdown', e => { state.pointer.down = true; updatePointer(e); });
  window.addEventListener('pointerup', () => { state.pointer.down = false; });
  window.addEventListener('resize', resize);

  seedParticles();
  selectGlyph(0);
  resize();
  requestAnimationFrame(loop);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.lastW = rect.width;
  state.lastH = rect.height;
}

function updatePointer(e) {
  const r = canvas.getBoundingClientRect();
  state.pointer.x = (e.clientX - r.left) / r.width;
  state.pointer.y = (e.clientY - r.top) / r.height;
}

function seedParticles() {
  state.particles = Array.from({ length: 72 }, (_, i) => ({
    a: i * 0.61803398875 * Math.PI * 2,
    r: 0.10 + (i % 18) / 18 * 0.78,
    z: 0.3 + ((i * 13) % 23) / 23,
    s: 0.2 + ((i * 7) % 17) / 17
  }));
}

function selectGlyph(index) {
  state.glyphIndex = (index + glyphs.length) % glyphs.length;
  ui.glyphSelect.value = String(state.glyphIndex);
  [...ui.gallery.children].forEach((el, i) => el.classList.toggle('active', i === state.glyphIndex));
  const g = glyphs[state.glyphIndex];
  ui.source.textContent = `${g.short} ${g.label} — ${g.source}`;
  renderSpecimen();
}

function randomize() {
  selectGlyph(Math.floor(Math.random() * glyphs.length));
  ui.morph.value = Math.random().toFixed(2);
  ui.energy.value = (0.2 + Math.random() * 1.8).toFixed(2);
  ui.speed.value = (0.25 + Math.random() * 1.8).toFixed(2);
  ui.tension.value = (0.25 + Math.random() * 0.95).toFixed(2);
  ui.strokeWeight.value = (1.4 + Math.random() * 5.8).toFixed(2);
  ui.functionMode.value = ['sine', 'phi', 'rho', 'lambda', 'zeta'][Math.floor(Math.random()*5)];
}

function reset() {
  ui.morph.value = 0.33;
  ui.energy.value = 0.78;
  ui.speed.value = 0.85;
  ui.tension.value = 0.56;
  ui.strokeWeight.value = 3.6;
  ui.functionMode.value = 'phi';
  selectGlyph(0);
}

function currentNumbers() {
  return {
    morph: Number(ui.morph.value),
    energy: Number(ui.energy.value),
    speed: Number(ui.speed.value),
    tension: Number(ui.tension.value),
    mode: ui.functionMode.value,
    weight: Number(ui.strokeWeight.value),
    points: ui.showPoints.checked
  };
}

function modulatePoint(p, i, strokeIndex, time, cfg) {
  const [x, y] = p;
  const cx = x - 0.5;
  const cy = y - 0.5;
  const r = Math.hypot(cx, cy) + 0.001;
  const angle = Math.atan2(cy, cx);
  const e = cfg.energy * 0.035;
  const px = (state.pointer.x - 0.5) * 0.08 * (state.pointer.down ? 1.9 : 1.0);
  const py = (state.pointer.y - 0.5) * 0.08 * (state.pointer.down ? 1.9 : 1.0);
  const phase = time + i * 0.11 + strokeIndex * 0.73;

  if (cfg.mode === 'sine') {
    return [x + Math.sin(phase * 2.0 + y * 8.0) * e + px, y + Math.cos(phase * 1.6 + x * 9.0) * e * 0.65 + py];
  }

  if (cfg.mode === 'rho') {
    const ripple = Math.sin(r * 22.0 - phase * 2.5) * e * 1.65;
    return [x + Math.cos(angle) * ripple + px, y + Math.sin(angle) * ripple + py];
  }

  if (cfg.mode === 'lambda') {
    const fold = Math.sign(cx || 1) * Math.pow(Math.abs(cx), 0.55) * e * 1.4;
    return [x + fold + Math.sin(phase + y * 11) * e * .35 + px, y + Math.abs(cx) * e * 1.2 + py];
  }

  if (cfg.mode === 'zeta') {
    const swirl = angle + Math.sin(phase + r * 7.0) * e * 8.0;
    return [0.5 + Math.cos(swirl) * r + Math.sin(y * 9 + phase) * e * 0.7 + px, 0.5 + Math.sin(swirl) * r + Math.cos(x * 6 - phase) * e * 0.7 + py];
  }

  // phi default: golden rotational bloom
  const golden = 2.3999632297;
  const theta = angle + (0.35 + cfg.morph * 0.85) * e * 6.0 * Math.sin(phase * 0.75 + r * golden * 7.0);
  const rr = r * (1 + Math.sin(phase + r * 12.0) * e * 1.1);
  return [0.5 + Math.cos(theta) * rr + px, 0.5 + Math.sin(theta) * rr + py];
}

function morphStroke(gA, gB, strokeIndex, cfg) {
  const a = gA.strokes[strokeIndex % gA.strokes.length];
  const b = gB.strokes[strokeIndex % gB.strokes.length];
  const count = 56;
  const ra = resampleStroke(a, count);
  const rb = resampleStroke(b, count);
  return ra.map((p, i) => [lerp(p[0], rb[i][0], cfg.morph), lerp(p[1], rb[i][1], cfg.morph)]);
}

function drawSmooth(points, x, y, size, cfg, strokeIndex = 0, alpha = 1) {
  if (!points.length) return;
  const modded = points.map((p, i) => modulatePoint(p, i, strokeIndex, state.t, cfg));
  ctx.beginPath();
  ctx.moveTo(x + modded[0][0] * size, y + modded[0][1] * size);
  for (let i = 0; i < modded.length - 1; i++) {
    const p0 = modded[Math.max(0, i - 1)];
    const p1 = modded[i];
    const p2 = modded[i + 1];
    const p3 = modded[Math.min(modded.length - 1, i + 2)];
    const cp1 = [p1[0] + (p2[0] - p0[0]) * cfg.tension / 6, p1[1] + (p2[1] - p0[1]) * cfg.tension / 6];
    const cp2 = [p2[0] - (p3[0] - p1[0]) * cfg.tension / 6, p2[1] - (p3[1] - p1[1]) * cfg.tension / 6];
    ctx.bezierCurveTo(
      x + cp1[0] * size, y + cp1[1] * size,
      x + cp2[0] * size, y + cp2[1] * size,
      x + p2[0] * size, y + p2[1] * size
    );
  }
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (cfg.points) {
    ctx.save();
    ctx.globalAlpha = 0.38;
    for (const p of modded.filter((_, i) => i % 7 === 0)) {
      ctx.beginPath();
      ctx.arc(x + p[0] * size, y + p[1] * size, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawBackground(w, h, cfg) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#fff8ee');
  grad.addColorStop(0.44, '#f7f1ff');
  grad.addColorStop(1, '#e9fff6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#251f3d';
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    const y = h * (0.10 + k * 0.095) + Math.sin(state.t * 0.6 + k) * 18;
    ctx.moveTo(-40, y);
    for (let x = -40; x < w + 80; x += 90) {
      const yy = y + Math.sin(x * 0.008 + state.t + k) * (18 + cfg.energy * 10);
      ctx.quadraticCurveTo(x + 45, yy - 32, x + 90, yy);
    }
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  for (const p of state.particles) {
    const a = p.a + state.t * 0.1 * (0.3 + p.s) + cfg.morph * 2.0;
    const rr = p.r * Math.min(w, h) * 0.52;
    const x = w * 0.5 + Math.cos(a) * rr * (0.9 + p.z * 0.2);
    const y = h * 0.52 + Math.sin(a * 1.3) * rr * 0.55;
    ctx.globalAlpha = 0.06 + p.z * 0.08;
    ctx.beginPath();
    ctx.arc(x, y, 2 + p.z * 7, 0, Math.PI * 2);
    ctx.fillStyle = p.z > 0.66 ? '#ffd166' : p.z > 0.43 ? '#81f4c9' : '#bfa6ff';
    ctx.fill();
  }
  ctx.restore();
}

function draw() {
  const cfg = currentNumbers();
  const w = state.lastW || canvas.clientWidth;
  const h = state.lastH || canvas.clientHeight;
  drawBackground(w, h, cfg);

  const gA = glyphs[state.glyphIndex];
  const gB = glyphs[(state.glyphIndex + 1) % glyphs.length];
  const size = Math.min(w, h) * 0.58;
  const x = w * 0.5 - size / 2;
  const y = h * 0.51 - size / 2;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // glowing under-stroke
  ctx.strokeStyle = 'rgba(120, 92, 255, .20)';
  ctx.lineWidth = cfg.weight * 4.2;
  const maxStrokes = Math.max(gA.strokes.length, gB.strokes.length);
  for (let s = 0; s < maxStrokes; s++) drawSmooth(morphStroke(gA, gB, s, cfg), x, y, size, cfg, s, 0.88);

  ctx.strokeStyle = '#171124';
  ctx.fillStyle = '#171124';
  ctx.lineWidth = cfg.weight;
  for (let s = 0; s < maxStrokes; s++) drawSmooth(morphStroke(gA, gB, s, cfg), x, y, size, cfg, s, 1);

  // orbit annotation inspired by page notes
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([8, 10]);
  ctx.strokeRect(x + size * 0.84, y + size * 0.04, size * 0.20, size * 0.82);
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  ctx.font = `600 ${Math.max(13, Math.min(22, size * 0.055))}px ui-rounded, system-ui, sans-serif`;
  ctx.fillText(`${gA.label} → ${gB.label}`, x + size * 0.02, y + size * 1.04);
  ctx.font = `400 ${Math.max(11, Math.min(17, size * 0.04))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(`mode:${cfg.mode} · morph:${cfg.morph.toFixed(2)} · tension:${cfg.tension.toFixed(2)}`, x + size * 0.02, y + size * 1.095);
  ctx.restore();

  ui.readout.textContent = `φ=${cfg.morph.toFixed(2)}  E=${cfg.energy.toFixed(2)}  v=${cfg.speed.toFixed(2)}  τ=${cfg.tension.toFixed(2)}  ${cfg.mode}`;
}

function renderSpecimen() {
  const g = glyphs[state.glyphIndex];
  const paths = glyphToSvgPaths(g, 0, 0, 180, 0.62);
  ui.specimen.innerHTML = `
    <svg viewBox="0 0 180 180" role="img" aria-label="${g.label} specimen">
      <defs>
        <filter id="soft"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>
      <g fill="none" stroke="#9f7aea" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" opacity=".18" filter="url(#soft)">${paths}</g>
      <g fill="none" stroke="#141022" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
    </svg>`;
}

function exportSvg() {
  const cfg = currentNumbers();
  const gA = glyphs[state.glyphIndex];
  const gB = glyphs[(state.glyphIndex + 1) % glyphs.length];
  const maxStrokes = Math.max(gA.strokes.length, gB.strokes.length);
  const size = 720;
  const paths = [];
  for (let s = 0; s < maxStrokes; s++) {
    const pts = morphStroke(gA, gB, s, cfg);
    const d = pathFromPoints(pts, 80, 80, 560, cfg.tension, (p, i) => modulatePoint(p, i, s, state.t, cfg));
    paths.push(`<path d="${d}"/>`);
  }
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">\n  <rect width="100%" height="100%" rx="44" fill="#fff8ee"/>\n  <g fill="none" stroke="#9f7aea" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" opacity="0.18">\n    ${paths.join('\n    ')}\n  </g>\n  <g fill="none" stroke="#141022" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">\n    ${paths.join('\n    ')}\n  </g>\n  <text x="80" y="680" font-size="26" font-family="ui-rounded, system-ui, sans-serif" fill="#141022">${gA.label} → ${gB.label} · ${cfg.mode}</text>\n</svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `morphic-${gA.id}-to-${gB.id}.svg`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

function loop(now) {
  const cfg = currentNumbers();
  if (state.playing) state.t += 0.012 * cfg.speed;
  draw();
  requestAnimationFrame(loop);
}

init();
