/* ---------- drawing ---------- */
function txt(s, x, y, size, color = '#fff', align = 'center', stroke = '#1a0f2e', weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.direction = HEB.test(s) ? 'rtl' : 'ltr';
  if (stroke) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function wrap(t, maxW, size, weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.direction = 'rtl';
  const words = t.split(' '), lines = []; let cur = '';
  for (const w of words) { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
  lines.push(cur); return lines;
}
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }


const TINT = { n: '255,214,150', m: '255,170,90', w: '205,150,255', b: '255,110,70', h: '255,225,170', g: '255,150,70', z: '255,200,120', a: '200,225,255', k: '255,230,255' };
let vigCache = null;
function atmosphere() {
  const tn = TINT[L.cfg.theme] || TINT.n;
  ctx.fillStyle = `rgba(${tn},.10)`; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = ((i * 330 - cam * .12 + tAll * 9) % (W + 500) + W + 500) % (W + 500) - 250;
    const g = ctx.createLinearGradient(x, 0, x - 240, H); g.addColorStop(0, `rgba(${tn},.16)`); g.addColorStop(1, `rgba(${tn},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 110, 0); ctx.lineTo(x - 130, H); ctx.lineTo(x - 240, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function motes() {
  const tn = TINT[L.cfg.theme] || TINT.n;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 34; i++) {
    const par = .25 + (i % 3) * .18, span = W + 80;
    const px = (((i * 137.5 + tAll * (5 + (i % 5) * 3) - cam * par) % span) + span) % span - 40;
    const py = (i * 61.7) % (H - 160) + 40 + Math.sin(tAll * .8 + i) * 18;
    const a = .25 + .25 * Math.sin(tAll * 2 + i * 1.7), r = 1.5 + (i % 4) * .9;
    ctx.fillStyle = `rgba(${tn},${a})`; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function vignette() {
  if (!vigCache) { const g = ctx.createRadialGradient(W / 2, H / 2, H * .42, W / 2, H / 2, H * .98); g.addColorStop(0, 'rgba(10,4,25,0)'); g.addColorStop(1, 'rgba(10,4,25,.5)'); vigCache = g; }
  ctx.fillStyle = vigCache; ctx.fillRect(0, 0, W, H);
}
function pill(x, y, w, h, hot) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, hot ? 'rgba(200,40,60,.9)' : 'rgba(58,28,92,.85)'); g.addColorStop(1, hot ? 'rgba(130,20,40,.9)' : 'rgba(26,12,50,.85)');
  ctx.fillStyle = g; rrect(x, y, w, h, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,120,.85)'; ctx.lineWidth = 3; rrect(x, y, w, h, 18); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; rrect(x + 4, y + 4, w - 8, h * .45, 14); ctx.stroke();
}
function drawBg(name, camx, dim = 0) {
  const im = IM[name];
  if (!im) { const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6ec6ff'); gr.addColorStop(1, '#ffe3a8'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); return; }
  const off = camx * .28, idx = Math.floor(off / W), px = -(off - idx * W);
  for (let k = 0; k < 2; k++) {
    const flip = ((idx + k) % 2 + 2) % 2 === 1, x0 = px + k * W;
    ctx.save(); if (flip) { ctx.translate(x0 + W, 0); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, W, H); } else ctx.drawImage(im, x0, 0, W, H); ctx.restore();
  }
  if (dim) { ctx.fillStyle = `rgba(10,5,25,${dim})`; ctx.fillRect(0, 0, W, H); }
}
function drawTiles() {
  const th = THEME[L.cfg.theme], c0 = Math.max(0, Math.floor(cam / T) - 1), c1 = Math.min(L.cols - 1, Math.floor((cam + W) / T) + 1);
  for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
    const ch = L.g[r][c]; if (ch === '.') continue;
    const x = c * T - cam, bump = L.bump[c + ',' + r] ? -Math.sin((L.bump[c + ',' + r] / .18) * Math.PI) * 14 : 0, y = r * T + bump;
    if (ch === '#') {
      if (!solidAt(c, r - 1) && IM.tiles_1 && th.spr !== false) { sprBox(S.ground, x, y - 4, T + 1, T + 5); continue; }
      if (solidAt(c, r - 1)) {
        const g = ctx.createLinearGradient(0, y, 0, y + T); g.addColorStop(0, th.d0 || '#6e4a2c'); g.addColorStop(1, th.d1 || '#3d2616');
        ctx.fillStyle = g; ctx.fillRect(x, y, T + 1, T + 1);
        const hs = (c * 73 + r * 31) % 7; ctx.fillStyle = 'rgba(255,220,170,.16)';
        for (let i = 0; i < 4; i++) { const px = x + ((hs * 11 + i * 19) % 52) + 4, py = y + ((hs * 7 + i * 13) % 44) + 6; ctx.beginPath(); ctx.ellipse(px, py, 5 + (i % 2) * 3, 3 + (i % 3), 0, 0, 7); ctx.fill(); }
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x, y, T + 1, 4);
        continue;
      }
      ctx.fillStyle = th.dirt; ctx.fillRect(x, y, T + 1, T + 1);
      ctx.strokeStyle = th.line; ctx.globalAlpha = .45; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3); ctx.globalAlpha = 1;
      if (!solidAt(c, r - 1)) { ctx.fillStyle = th.top; ctx.fillRect(x, y, T + 1, 16); ctx.fillStyle = th.hi; ctx.fillRect(x, y, T + 1, 5); ctx.fillStyle = th.line; ctx.fillRect(x, y + 16, T + 1, 3); }
      else { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x + 8, y + 10, 14, 8); ctx.fillRect(x + 32, y + 32, 16, 9); }
    } else if (ch === 'B') sprBox(S.brick, x, y, T + 1, T + 1);
    else if (ch === 'C') sprBox(S.crate, x, y, T + 1, T + 1);
    else if (ch === '?') { sprBox(S.mystery, x, y, T + 1, T + 1); }
    else if (ch === 'U') { sprBox(S.mystery, x, y, T + 1, T + 1, .5); ctx.fillStyle = 'rgba(40,20,30,.45)'; ctx.fillRect(x, y, T, T); }
    else if (ch === 'D') {
      if (chAt(c - 1, r) !== 'D' && chAt(c, r - 1) !== 'D') sprBox(S.dumpster, x - 4, y - 4, T * 2 + 8, T * 2 + 6);
    } else if (ch === 'S') {
      const q = L.bump[c + ',' + r] ? Math.sin((L.bump[c + ',' + r] / .18) * Math.PI) : 0, py = y + q * 16;
      ctx.fillStyle = th.dirt; ctx.fillRect(x, y + 18, T + 1, T - 17);
      ctx.strokeStyle = '#d8d8e8'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x + 12, py + 14);
      for (let i = 0; i < 5; i++) ctx.lineTo(x + (i % 2 ? 14 : T - 14), py + 14 + (i + 1) * (T - 34 - q * 6) / 5); ctx.stroke();
      ctx.fillStyle = '#ff5a5a'; rrect(x + 2, py + 2, T - 4, 16, 7); ctx.fill(); ctx.strokeStyle = '#4a1010'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x + 10, py + 6, T - 28, 4);
    } else if (ch === 'A' && th.cloud) {
      ctx.fillStyle = th.a1; ctx.strokeStyle = '#8aa0d8'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(x + T / 2, y + 12, T / 2 + 2, 16, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = th.a2; ctx.beginPath(); ctx.ellipse(x + T / 2, y + 22, T / 2 - 4, 10, 0, 0, 7); ctx.fill();
    } else if (ch === 'A') {
      const stripe = (c % 2 === 0), ca = th.a1 || '#2f7de1', cb = th.a2 || '#ffffff';
      ctx.fillStyle = stripe ? ca : cb; ctx.fillRect(x, y, T + 1, 18);
      ctx.fillStyle = stripe ? cb : ca; ctx.beginPath(); ctx.arc(x + T / 2, y + 18, T / 2, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = '#142a52'; ctx.lineWidth = 3; ctx.strokeRect(x, y, T + 1, 18); ctx.beginPath(); ctx.arc(x + T / 2, y + 18, T / 2 - 1, 0, Math.PI); ctx.stroke();
    }
  }
}
function drawGoal() {
  if (!L.goal) return;
  if (L.cfg.boss && !(boss && boss.dead)) return;
  const x = L.goal.x - cam, y = L.goal.y;
  spr(S.table, x, y, 130);
  const fl = Math.sin(tAll * 12) * 3;
  ctx.fillStyle = 'rgba(255,210,90,.35)'; ctx.beginPath(); ctx.arc(x - 24, y - 118, 26 + fl, 0, 7); ctx.arc(x + 24, y - 118, 26 - fl, 0, 7); ctx.fill();
  txt('שולחן שבת', x, y - 160, 22, '#ffe9a8');
}
function drawEnemy(e) {
  const k = e.k, x = e.x - cam;
  if (x < -150 || x > W + 150) return;
  if (k.beh === 'static') {
    const gl = ctx.createRadialGradient(x, e.y - 34, 4, x, e.y - 34, 70); gl.addColorStop(0, 'rgba(255,170,60,.45)'); gl.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - 80, e.y - 110, 160, 130);
    ctx.save(); ctx.translate(x, e.y); ctx.scale(1 + Math.sin(e.t * 10) * .05, 1 + Math.sin(e.t * 13) * .08); spr(k.spr, 0, 0, k.h); ctx.restore(); return;
  }
  if (e.isDead && !e.flung) { ctx.save(); ctx.translate(x, e.y); ctx.scale(1.2, .3); spr(k.spr, 0, 0, k.h, e.dir > 0); ctx.restore(); return; }
  if (e.flung) { spr(k.spr, x, e.y - k.hh / 2, k.h, e.dir > 0, e.spin, 1, true); return; }
  if (k.beh !== 'leap') shadow(e.x, e.y, k.w * 1.2, .25);
  const flip = e.dir > 0, bob = k.beh === 'walk' || k.beh === 'roll' ? Math.abs(Math.sin(e.t * 9)) * 4 : 0;
  if (k.beh === 'leap' && e.y > e.by + 60) return;
  const rot = k.beh === 'leap' ? clamp(e.vy / 1250, -1, 1) * -.5 : (k.beh === 'fly' ? Math.sin(e.t * 3) * .12 : 0);
  if (rot) spr(k.spr, x, e.y - k.hh / 2, k.h, flip, rot, 1, true); else spr(k.spr, x, e.y - bob, k.h, flip);
}
function groundBelow(x, y) {
  const c = Math.floor(x / T);
  for (let r = Math.max(0, Math.floor((y - 2) / T)); r < ROWS; r++) { const ch = chAt(c, r); if (isSolidCh(ch) || ch === 'A') return r * T; }
  return null;
}
function shadow(x, y, w, a = .3) {
  const gy = groundBelow(x, y); if (gy === null) return;
  const d = clamp((gy - y) / 260, 0, 1), k = 1 - d * .6;
  ctx.save(); ctx.fillStyle = `rgba(20,8,30,${a * k})`; ctx.beginPath(); ctx.ellipse(x - cam, gy + 3, w * k / 2, 8 * k, 0, 0, 7); ctx.fill(); ctx.restore();
}
function drawPlayer() {
  const p = P, x = p.x - cam, tr = TIERS[p.tier], figH = 112 * (p.rs || tr.s);
  const pop = p.pop > 0 ? (p.pop -= 1 / 60, p.pop) : 0;
  p.rs += (tr.s - p.rs) * .18;
  const pulse = pop > 0 ? 1 + Math.sin(pop / .5 * Math.PI) * .18 : 1;
  const pose = Rig.poseFor(p, tAll);
  if (!p.dead) shadow(p.x, p.y, 70 * p.rs);
  if (p.tier >= 3 || pop > 0) { const gl = ctx.createRadialGradient(x, p.y - figH * .5, 10, x, p.y - figH * .5, figH * .9); gl.addColorStop(0, `rgba(255,214,80,${p.tier >= 3 ? .38 : .5})`); gl.addColorStop(1, 'rgba(255,214,80,0)'); ctx.fillStyle = gl; ctx.fillRect(x - figH, p.y - figH * 1.5, figH * 2, figH * 2); }
  if (p.inv > 0 && !p.dead && Math.floor(tAll * 16) % 2 === 0) ctx.globalAlpha = .45;
  let sx = 1, sy = 1;
  if (p.sq > 0) { const t = p.sq / .16; sx = 1 + .16 * t; sy = 1 - .14 * t; }
  else if (!p.onGround && p.vy < -200) { sx = .94; sy = 1.08; }
  const o = { tier: p.tier, dir: p.dir, grounded: p.onGround && !p.dead, sx: sx * pulse, sy: sy * pulse, rs: p.rs, t: tAll, vx: p.vx, rot: p.dead ? tAll * 6 : 0, piv: figH * .45 };
  if (p.boost > 0 && Math.abs(p.vx) > 100) { for (let i = 3; i >= 1; i--) { ctx.globalAlpha = .12 * (4 - i); Rig.draw(x - p.dir * i * 24, p.y + 2, pose, o); } ctx.globalAlpha = 1; }
  Rig.draw(x, p.y + 2, pose, o);
  ctx.globalAlpha = 1;
  if (p.say) { const w = 24 + p.say.length * 15; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a0f2e'; ctx.lineWidth = 4; rrect(x - w / 2, p.y - figH - 36, w, 42, 14); ctx.fill(); ctx.stroke(); txt(p.say, x, p.y - figH - 15, 21, '#1a0f2e', 'center', null, 700); }
}
function drawBoss() {
  const b = boss; if (!b) return;
  const x = b.x - cam; let sc = 1;
  if (b.dead) sc = Math.max(.45, 1 - b.defT * .35);
  ctx.save();
  if (b.cd > 0 && Math.floor(tAll * 20) % 2 === 0) ctx.globalAlpha = .6;
  const squash = b.onGround ? 1 : 1.06;
  ctx.translate(x, b.y); ctx.scale(sc * (b.dir > 0 ? -1 : 1) * (1 / squash), sc * squash);
  const im = IM.boss, h = 270;
  if (im) { const w = im.width * h / im.height; ctx.drawImage(im, -w / 2, -h, w, h); } else { ctx.fillStyle = '#7a3a1a'; ctx.fillRect(-90, -230, 180, 230); }
  ctx.restore();
  if (b.state === 'stun' && !b.dead) { for (let i = 0; i < 4; i++) { const a = tAll * 5 + i * 1.57; txt('★', x + Math.cos(a) * 70, b.y - b.h - 20 + Math.sin(a) * 14, 28, '#ffe14d'); } }
  // hp bar
  if (!b.dead) { const bw = 360, bx = W / 2 - bw / 2; ctx.fillStyle = 'rgba(20,10,40,.7)'; rrect(bx - 6, 74, bw + 12, 28, 12); ctx.fill(); for (let i = 0; i < 5; i++) { ctx.fillStyle = i < b.hp ? '#ff6a30' : '#3c2a4a'; rrect(bx + i * (bw / 5) + 3, 79, bw / 5 - 6, 18, 8); ctx.fill(); } txt('הסיר הכועס', W / 2, 120, 22, '#ffd9a8'); }
  for (const s of beans) { ctx.fillStyle = '#6b3b1a'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(s.x - cam, s.y, s.r * 1.2, s.r, s.x * .05, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9a6a3a'; ctx.beginPath(); ctx.arc(s.x - cam - 4, s.y - 4, 4, 0, 7); ctx.fill(); }
}
function drawHUD() {
  ctx.save();
  pill(14, 12, 520, 54);
  spr(S.coin, 44, 40, 38, false, 0, 1, true); txt('x' + coins, 80, 40, 30, '#ffe14d', 'left');
  if (L.challahs.length) { spr(S.challah, 168, 40, 34, false, 0, 1, true); txt(stats.ch + '/' + L.challahs.length, 198, 40, 28, '#ffd7a0', 'left'); }
  spr(S.hat, 292, 40, 28, false, 0, 1, true); txt('x' + lives, 326, 40, 30, '#fff', 'left');
  txt('' + score, 520, 40, 30, '#fff', 'right');
  const m = Math.floor(L.timeLeft / 60), s = Math.floor(L.timeLeft % 60), low = L.timeLeft < 30;
  pill(W - 262, 12, 248, 54, low && Math.floor(tAll * 3) % 2 === 0);
  spr(S.candles, W - 232, 40, 40, false, 0, 1, true);
  txt(m + ':' + (s < 10 ? '0' : '') + s, W - 30, 40, 32, low ? '#ffd0d0' : '#fff', 'right');
  txt(`שלב ${cfgI + 1}: ${L.cfg.name}`, W / 2, 34, 26, '#ffffff');
  txt(TIERS[P.tier].name + (P.tier ? '   חלות: X' : ''), W / 2, 62, 20, '#ffe9a8');
  if (P.boost > 0) txt('קפה!', W / 2 + 150, 62, 20, '#9ee8ff');
  ctx.restore();
}
function drawWorld() {
  drawBg(L.cfg.bg, cam); atmosphere();
  ctx.save();
  if (shake > 0) ctx.translate(rnd(-8, 8) * shake * 2, rnd(-8, 8) * shake * 2);
  drawTiles(); drawGoal();
  for (const c of L.coins) if (!c.got) { const x = c.x - cam; if (x > -40 && x < W + 40) { const sq = Math.abs(Math.cos(tAll * 4 + c.ph)); ctx.save(); ctx.translate(x, c.y + Math.sin(tAll * 3 + c.ph) * 4); ctx.scale(.35 + .65 * sq, 1); ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 16; spr(S.coin, 0, 0, 42, false, 0, 1, true); ctx.restore(); } }
  for (const c of L.challahs) if (!c.got) { const x = c.x - cam; ctx.save(); ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 22; spr(S.challah, x, c.y + Math.sin(tAll * 3 + c.ph) * 6, 58, false, Math.sin(tAll * 2 + c.ph) * .15, 1, true); ctx.restore(); }
  for (const it of L.items) { shadow(it.x, it.y, 40, .22); const nm = it.type === 'cholent' ? S.cholent : it.type === 'coffee' ? S.coffee : S.hat; spr(nm, it.x - cam, it.y, 50); }
  for (const e of L.enemies) drawEnemy(e);
  drawBoss();
  for (const s of shots) spr(S.challah, s.x - cam, s.y, 34, false, s.rot, 1, true);
  drawPlayer();
  for (const p of particles) { if (p.coin) { spr(S.coin, p.x - cam, p.y, 36, false, 0, p.life / p.max, true); continue; } ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(p.x - cam - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  ctx.globalAlpha = 1;
  for (const p of popups) { ctx.globalAlpha = clamp(p.life / (p.max * .5), 0, 1); txt(p.text, p.x - cam, p.y, 30, p.color); }
  ctx.globalAlpha = 1;
  motes();
  ctx.restore();
  vignette();
}
function card(x, y, w, h) { ctx.fillStyle = 'rgba(255,248,230,.96)'; ctx.strokeStyle = '#2a1648'; ctx.lineWidth = 6; rrect(x, y, w, h, 26); ctx.fill(); ctx.stroke(); }
function btnHint(s, y) { if (Math.floor(tAll * 2) % 2 === 0) txt(s, W / 2, y, 30, '#fff'); }

function drawTitle() {
  const im = IM.title;
  if (im) ctx.drawImage(im, 0, 0, W, H); else drawBg('bg1', 0);
  const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(15,6,35,.72)'); gr.addColorStop(.38, 'rgba(15,6,35,0)'); gr.addColorStop(.8, 'rgba(15,6,35,0)'); gr.addColorStop(1, 'rgba(15,6,35,.8)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, 112); ctx.rotate(Math.sin(tAll * 1.6) * .015);
  txt('יוסי והצ\'ולנט האבוד', 0, 0, 92, '#ffe14d', 'center', '#3a1450', 900);
  ctx.restore();
  txt('Yossi and the Lost Cholent', W / 2, 192, 34, '#ffffff', 'center', '#3a1450', 800);
  btnHint('הקש או לחץ Enter כדי להתחיל', 640);
  txt('חצים לזוז  |  רווח לקפוץ  |  Shift לרוץ  |  X לזרוק חלה  |  M שקט', W / 2, 686, 22, '#e8dcff', 'center', '#1a0f2e', 600);
  if (best) txt('שיא: ' + best, W - 30, 36, 26, '#ffe14d', 'right');
}
function drawStory() {
  drawBg(L.cfg.bg, tAll * 30, .45);
  card(150, 90, 980, 540);
  txt(`שלב ${cfgI + 1}: ${L.cfg.name}`, W / 2, 148, 52, '#3a1450', 'center', null, 900);
  const lines = wrap(L.cfg.story, 720, 31);
  ctx.fillStyle = '#2a1648';
  lines.forEach((ln, i) => txt(ln, W / 2 + 80, 232 + i * 46, 31, '#2a1648', 'center', null, 600));
  Rig.figure(280, 600 - Math.abs(Math.sin(tAll * 4)) * 14, carryTier, 1, tAll, 2.0);
  if (cfgI === 0) txt('חצים לזוז, רווח לקפוץ, Shift לרוץ, X לזרוק חלה', W / 2 + 80, 560, 24, '#6a3c8a', 'center', null, 700);
  btnHint('הקש כדי להתחיל', 668);
}
function drawComplete() {
  ctx.fillStyle = 'rgba(15,6,35,.55)'; ctx.fillRect(0, 0, W, H);
  card(310, 130, 660, 470);
  txt('השלב הושלם!', W / 2, 200, 58, '#3a1450', 'center', null, 900);
  const rows = [['מטבעות', '' + stats.coins], ['חלות', stats.ch + ' / ' + L.challahs.length], ['שניות שנותרו', '' + stats.time], ['בונוס זמן', '+' + stats.tb], ['ניקוד', '' + score]];
  rows.forEach((r, i) => { txt(r[0], W / 2 + 280, 285 + i * 52, 30, '#2a1648', 'right', null, 700); txt(r[1], W / 2 - 280, 285 + i * 52, 32, '#c4570b', 'left', null, 900); });
  if (stateT > 1) btnHint(cfgI + 1 >= LV.length ? 'הקש כדי לראות את הסוף' : 'הקש להמשך', 668);
}
function drawGameOver() {
  drawBg(L ? L.cfg.bg : 'bg1', tAll * 20, .7);
  txt('הסיר ניצח הפעם', W / 2, 220, 80, '#ff8a6a', 'center', '#2a0a18', 900);
  txt('והצ\'ולנט התקרר', W / 2, 310, 54, '#ffe14d');
  txt('ניקוד: ' + score, W / 2, 400, 40, '#fff');
  Rig.figure(W / 2, 600, 0, 1, tAll, 2.0, 'hurt');
  btnHint('הקש לעוד ניסיון', 664);
}
function drawWin() {
  drawBg('bg4', tAll * 18, .1);
  ctx.fillStyle = 'rgba(20,8,40,.45)'; ctx.fillRect(0, 0, W, H);
  card(160, 70, 960, 580);
  txt('שבת שלום לכל העולם!', W / 2, 140, 60, '#3a1450', 'center', null, 900);
  const lines = wrap('הסיר נרגע ונכנס לשולחן בעצמו. יוסי הדליק את הנרות בדיוק בזמן. כולם נרגעו, כולם אכלו, ואף אחד לא שאל מי ברח.', 800, 32);
  lines.forEach((ln, i) => txt(ln, W / 2, 230 + i * 48, 32, '#2a1648', 'center', null, 600));
  txt('ניקוד סופי: ' + score, W / 2, 440, 46, '#c4570b', 'center', null, 900);
  if (score >= best && best) txt('שיא חדש!', W / 2, 496, 34, '#2b9a4a', 'center', null, 900);
  Rig.figure(360, 650, 3, 1, tAll, 1.7, 'cheer'); spr(S.table, W - 330, 640, 130);
  for (let i = 0; i < 18; i++) { const x = (i * 97 + tAll * 70) % W, y = (i * 53 + tAll * 110) % H; ctx.fillStyle = ['#ffd23f', '#ff6a8a', '#6ae0ff', '#9aff8a'][i % 4]; ctx.fillRect(x, y, 10, 14); }
  btnHint('הקש כדי לשחק שוב', 680);
}
function drawLoading() {
  ctx.fillStyle = '#120a24'; ctx.fillRect(0, 0, W, H);
  txt('יוסי והצ\'ולנט האבוד', W / 2, 260, 72, '#ffe14d', 'center', '#3a1450', 900);
  txt('מחממים את הסיר...', W / 2, 340, 30, '#e8dcff');
  ctx.fillStyle = '#2a1648'; rrect(W / 2 - 260, 400, 520, 30, 15); ctx.fill();
  ctx.fillStyle = '#ffb02e'; rrect(W / 2 - 260, 400, Math.max(30, 520 * loadP), 30, 15); ctx.fill();
}
function drawDead() {
  drawWorld(); drawHUD();
  ctx.fillStyle = `rgba(10,3,25,${Math.min(.55, stateT * .5)})`; ctx.fillRect(0, 0, W, H);
  if (stateT > .5) txt(deadQuip, W / 2, 330, 62, '#fff');
  if (stateT > .5) txt('חיים שנותרו: ' + Math.max(0, lives - 1), W / 2, 400, 30, '#ffe14d');
}
function draw() {
  if (state === 'loading') drawLoading();
  else if (state === 'title') drawTitle();
  else if (state === 'story') drawStory();
  else if (state === 'gameover') drawGameOver();
  else if (state === 'win') drawWin();
  else {
    drawWorld(); if (state === 'dead') { drawDead(); return; } drawHUD();
    if (state === 'complete') drawComplete();
    if (state === 'paused') { ctx.fillStyle = 'rgba(10,3,25,.6)'; ctx.fillRect(0, 0, W, H); txt('הפסקה', W / 2, 320, 90, '#fff'); txt('P להמשך', W / 2, 410, 32, '#ffe14d'); }
  }
}

/* ---------- loop ---------- */
let last = 0, acc = 0;
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (state === 'paused') { if (confirmPressed) { confirmPressed = false; togglePause(); } }
  else if (state === 'title') { tAll += dt; if (confirmPressed) { confirmPressed = false; Snd.init(); lives = 3; coins = 0; score = 0; startLevel(+QS.get('lv') > 0 ? +QS.get('lv') - 1 : 0); } }
  else if (state === 'story') { tAll += dt; stateT += dt; if (stateT > .4 && confirmPressed) { confirmPressed = false; beginPlay(); } }
  else if (state === 'gameover') { tAll += dt; stateT += dt; if (stateT > .8 && confirmPressed) { confirmPressed = false; lives = 3; coins = 0; score = 0; startLevel(0); } }
  else if (state === 'win') { tAll += dt; stateT += dt; if (stateT > 1.2 && confirmPressed) { confirmPressed = false; Music.stop(); lives = 3; coins = 0; score = 0; state = 'title'; Music.play('title'); } }
  else if (state !== 'loading') { acc += dt; while (acc >= 1 / 60) { update(1 / 60); acc -= 1 / 60; } }
  confirmPressed = false;
  document.getElementById('touch').style.visibility = (state === 'play' || state === 'dead' || state === 'paused') ? 'visible' : 'hidden';
  draw();
  requestAnimationFrame(frame);
}
Music.init();
loadAll(p => { loadP = p; }).then(() => {
  state = 'title'; stateT = 0;
  if (QS.has('lv')) { lives = 3; coins = 0; score = 0; startLevel(+QS.get('lv') - 1); if (QS.has('go')) beginPlay(); }
});
window.__dbg = { get state() { return state; }, get P() { return P; }, get L() { return L; }, get boss() { return boss; }, keys, set: (k, v) => { setKey(k, v); }, go: () => { confirmPressed = true; } };
requestAnimationFrame(frame);
