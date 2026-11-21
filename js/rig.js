'use strict';
/* =====================================================================
   Rig: procedural skeletal character engine.
   Hero units: feet at (0,0), up is negative y. One unit is one pixel of the
   424x466 hero sprite, scaled by K * tier scale when drawn.
   Four forms: Yossi, the Rav, the big black Rav, the Rav with beard and shades.
   ===================================================================== */
const TIERS = [
  { s: 1.00, w: 40, h: 88, name: 'יוסי' },
  { s: 1.12, w: 44, h: 98, name: 'הרב' },
  { s: 1.26, w: 48, h: 106, name: 'הרב הגדול' },
  { s: 1.38, w: 52, h: 112, name: 'הרב עם משקפי השמש' },
];
const Rig = {
  head: null, K: 0.251, STRIDE: 120,
  init() {
    const im = IM.hero_10; if (!im || this.head) return;
    const c = document.createElement('canvas'); c.width = 264; c.height = 212;
    c.getContext('2d').drawImage(im, 88, 16, 264, 212, 0, 0, 264, 212);
    this.head = c;
  },
  /* pose vector: [a0,a1, k0,k1, b0,b1, e0,e1, lean, headTilt, breathe]
     a thigh angle, k knee bend, b upper arm angle, e elbow bend (all radians, forward positive) */
  target(mode, ph, sp, t) {
    const S = Math.sin, C = Math.cos, M = Math.max;
    if (mode === 'run') {
      const A = .62 + .28 * sp, kf = .5 + .85 * sp, v = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < 2; i++) {
        const p = ph + i * Math.PI;
        v[i] = A * S(p);
        v[2 + i] = .1 + kf * Math.pow(M(0, C(p)), 1.3) + .35 * sp * M(0, -S(p));
      }
      v[4] = -A * 1.05 * S(ph); v[5] = A * 1.05 * S(ph);
      v[6] = .45 + .6 * sp + .35 * M(0, -S(ph)); v[7] = .45 + .6 * sp + .35 * M(0, S(ph));
      v[8] = .05 + .17 * sp; v[9] = -.1 * sp + S(ph * 2) * .02; v[10] = Math.abs(S(ph)) * 5 * (.4 + sp);
      return v;
    }
    if (mode === 'jump') return [.95, -.35, 1.5, .9, 2.4, -1.1, .3, .5, .1, -.05, 0];
    if (mode === 'fall') return [.45, -.35, .5, .25, 1.6 + S(t * 18) * .12, -1.2 - S(t * 18) * .12, .4, .4, 0, .05, 0];
    if (mode === 'hurt') return [.35, -.35, .3, .3, 2.7, -2.5, .2, .2, -.15, -.2, 0];
    if (mode === 'cheer') return [.3, -.3, .4, .4, 2.9 + S(t * 10) * .2, -2.7 - S(t * 10) * .2, .3, .3, 0, 0, 0];
    return [.07, -.06, .03, .03, .1 + S(t * 2) * .04, -.07 - S(t * 2) * .04, .14, .12, 0, S(t * 1.3) * .03, S(t * 2.2) * 2.5];
  },
  poseFor(p, t) {
    const rg = p.rg || (p.rg = { mode: '', t0: 0, from: null, cur: null });
    let mode;
    if (p.dead || (p.inv > 1.3 && state === 'play')) mode = 'hurt';
    else if (p.won) mode = 'cheer';
    else if (!p.onGround) mode = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 25) mode = 'run';
    else mode = 'idle';
    const tr = TIERS[p.tier || 0], sp = clamp(Math.abs(p.vx) / 470, 0, 1);
    const ph = p.anim / (this.STRIDE * tr.s) * Math.PI * 2;
    const tg = this.target(mode, ph, sp, t);
    if (!rg.cur) { rg.cur = tg.slice(); rg.from = tg.slice(); rg.mode = mode; rg.t0 = -9; }
    if (mode !== rg.mode) { rg.from = rg.cur.slice(); rg.mode = mode; rg.t0 = t; }
    const w = clamp((t - rg.t0) / (mode === 'run' ? .08 : .13), 0, 1), e = w * w * (3 - 2 * w);
    for (let i = 0; i < tg.length; i++) rg.cur[i] = rg.from[i] + (tg[i] - rg.from[i]) * e;
    return rg.cur;
  },
  limb(pts, w, col) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = '#0b0510'; ctx.lineWidth = w + 9; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
  },
  rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); },
  shoe(ax, ay, ang) {
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
    this.rr(-17, -8, 62, 25, 12); ctx.fillStyle = '#17171f'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#0b0510'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; this.rr(6, -4, 28, 6, 3); ctx.fill();
    ctx.restore();
  },
  hand(x, y) { ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fillStyle = '#ffb858'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#0b0510'; ctx.stroke(); },
  arm(sx, sy, b, e, col, cuff, far) {
    const U = 42, F = 40, ex = sx + U * Math.sin(b), ey = sy + U * Math.cos(b), fa = b + e, hx = ex + F * Math.sin(fa), hy = ey + F * Math.cos(fa);
    const c = far ? this.shade(col, .72) : col;
    this.limb([[sx, sy], [ex, ey], [hx, hy]], 30, c);
    if (cuff) { ctx.beginPath(); ctx.arc(hx - 6 * Math.sin(fa), hy - 6 * Math.cos(fa), 15, 0, 7); ctx.fillStyle = '#f4f4f0'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#0b0510'; ctx.stroke(); }
    this.hand(hx + 4 * Math.sin(fa), hy + 4 * Math.cos(fa));
  },
  shade(hex, k) { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.round((n >> 16 & 255) * k)},${Math.round((n >> 8 & 255) * k)},${Math.round((n & 255) * k)})`; },
  /* draw a character with feet at screen (x,y).
     o: { tier, dir, grounded, sx, sy, rot, rs (render scale), t, vx } */
  draw(x, y, pose, o) {
    this.init(); if (!this.head) return;
    const tier = o.tier || 0, tr = TIERS[tier], s = o.rs || tr.s, K = this.K * s, t = o.t || 0;
    const [a0, a1, k0, k1, b0, b1, e0, e1, lean, hd, br] = pose;
    const col = [
      { coat: '#f2f2ee', pants: '#1d1d28', sleeve: '#f2f2ee' },
      { coat: '#1a1a24', pants: '#101016', sleeve: '#1a1a24' },
      { coat: '#0a0a0e', pants: '#07070a', sleeve: '#0a0a0e' },
      { coat: '#050507', pants: '#050507', sleeve: '#050507' },
    ][tier];
    const W2 = [104, 112, 126, 134][tier];
    ctx.save(); ctx.translate(x, y); if (o.rot) { ctx.translate(0, -(o.piv || 0)); ctx.rotate(o.rot); ctx.translate(0, (o.piv || 0)); }
    ctx.scale(K * (o.dir || 1) * (o.sx || 1), K * (o.sy || 1));
    ctx.lineJoin = ctx.lineCap = 'round';
    const L1 = 50, L2 = 50, hipX = -4, hipY = -117;
    const leg = i => {
      const a = i ? a1 : a0, k = i ? k1 : k0, kx = hipX + L1 * Math.sin(a), ky = hipY + L1 * Math.cos(a), sa = a - k;
      return { a, sa, kx, ky, ax: kx + L2 * Math.sin(sa), ay: ky + L2 * Math.cos(sa) };
    };
    const lg = [leg(0), leg(1)];
    let dy = 0;
    if (o.grounded) dy = -(Math.max(lg[0].ay, lg[1].ay) + 17);
    ctx.translate(0, dy);
    const drawLeg = (g, far) => {
      this.limb([[hipX, hipY], [g.kx, g.ky], [g.ax, g.ay]], 36, far ? this.shade(col.pants, .75) : col.pants);
      this.shoe(g.ax, g.ay, clamp(-g.a * .55 + (g.a - g.sa) * .15, -.6, .7));
    };
    // far arm and far leg
    this.arm(10, -198 - br * .3, b1, e1, col.sleeve, tier > 0, true);
    drawLeg(lg[1], true);
    drawLeg(lg[0], false);
    // upper body, leaning from the hip
    ctx.save(); ctx.translate(hipX, hipY + br * .3); ctx.rotate(lean); ctx.translate(-hipX, -hipY);
    // torso
    if (tier === 0) {
      this.rr(-W2 / 2, -207, W2, 92, 30); ctx.fillStyle = '#f2f2ee'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#0b0510'; ctx.stroke();
      this.rr(-6, -200, 56, 80, 22); ctx.fillStyle = '#17171f'; ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
      ctx.fillStyle = '#f2f2ee'; ctx.beginPath(); ctx.moveTo(14, -200); ctx.lineTo(36, -200); ctx.lineTo(25, -160); ctx.closePath(); ctx.fill();
    } else {
      this.rr(-W2 / 2, -207, W2, 94, 32); ctx.fillStyle = col.coat; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#0b0510'; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-W2 / 2 + 12, -190); ctx.quadraticCurveTo(-W2 / 2 + 8, -160, -W2 / 2 + 16, -130); ctx.stroke();
      ctx.fillStyle = '#f2f2ee'; ctx.beginPath(); ctx.moveTo(10, -208); ctx.lineTo(34, -208); ctx.lineTo(22, -176); ctx.closePath(); ctx.fill();
      if (tier >= 2) { this.rr(-W2 / 2 + 2, -152, W2 - 4, 13, 5); ctx.fillStyle = tier === 3 ? '#e8c050' : '#d8d2bd'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#0b0510'; ctx.stroke(); }
      if (tier === 3) { ctx.strokeStyle = '#e8c050'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-20, -200); ctx.quadraticCurveTo(10, -168, 34, -198); ctx.stroke(); }
      // coat skirt, hem follows the legs
      const hem = tier === 1 ? -84 : -76, fx = clamp(o.vx || 0, -470, 470) / 470 * -22, wv = Math.sin(t * 9) * 3;
      ctx.beginPath(); ctx.moveTo(-W2 / 2 + 2, -142); ctx.lineTo(W2 / 2 - 2, -142);
      ctx.lineTo(W2 / 2 + 10 + a0 * 24 + fx, hem + wv); ctx.quadraticCurveTo(0, hem + 14 - wv, -W2 / 2 - 10 + a1 * 24 + fx, hem - wv); ctx.closePath();
      ctx.fillStyle = col.coat; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#0b0510'; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-8, -138); ctx.lineTo(-10 + fx * .5, hem + 6); ctx.stroke();
      // tzitzit
      ctx.strokeStyle = '#f6f6ee'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(30 + i * 5, -142); ctx.quadraticCurveTo(32 + i * 5 + Math.sin(t * 7 + i) * 6 + fx * .5, -118, 30 + i * 5 + Math.sin(t * 6 + i) * 8 + fx, -92 + i * 4); ctx.stroke(); }
    }
    // head
    ctx.save(); ctx.translate(2, -218 - br); ctx.rotate(hd);
    ctx.drawImage(this.head, -137, -212);
    if (tier === 3) this.faceGear();
    ctx.restore();
    ctx.restore();
    // near arm
    ctx.save(); ctx.translate(hipX, hipY + br * .3); ctx.rotate(lean); ctx.translate(-hipX, -hipY);
    this.arm(-6, -198, b0, e0, col.sleeve, tier > 0, false);
    ctx.restore();
    ctx.restore();
  },
  /* beard and sunglasses, in crop coordinates (crop origin top-left, pivot at 137,212) */
  faceGear() {
    ctx.save(); ctx.translate(-137, -212);
    // beard
    ctx.beginPath(); ctx.moveTo(112, 138);
    ctx.bezierCurveTo(106, 190, 128, 226, 176, 242); ctx.bezierCurveTo(222, 244, 252, 214, 254, 176);
    ctx.bezierCurveTo(238, 186, 214, 184, 196, 180); ctx.bezierCurveTo(166, 184, 140, 170, 122, 146); ctx.closePath();
    ctx.fillStyle = '#0c0c10'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#0b0510'; ctx.stroke();
    ctx.strokeStyle = 'rgba(190,190,205,.55)'; ctx.lineWidth = 3.5;
    for (const [x0, y0, x1, y1] of [[150, 196, 156, 228], [186, 200, 188, 236], [222, 196, 224, 224], [130, 176, 138, 204]]) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + 3, (y0 + y1) / 2, x1, y1); ctx.stroke(); }
    // sunglasses
    const lens = (cx, cy, rx, ry) => {
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fillStyle = '#08080c'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#0b0510'; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - rx * .55, cy - ry * .15); ctx.lineTo(cx - rx * .1, cy - ry * .6); ctx.stroke();
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - rx * .65, cy + ry * .25); ctx.lineTo(cx - rx * .42, cy + ry * .02); ctx.stroke();
    };
    ctx.strokeStyle = '#08080c'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(142, 98); ctx.lineTo(116, 94); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(186, 104); ctx.lineTo(196, 106); ctx.stroke();
    lens(164, 108, 29, 31); lens(216, 112, 27, 30);
    ctx.restore();
  },
  /* static figure for menus: x,y feet, h pixel height of the whole figure */
  figure(x, y, tier, dir, t, mult, mode) {
    const tr = TIERS[tier || 0], pose = this.target(mode || 'idle', 0, 0, t);
    this.draw(x, y, pose, { tier: tier || 0, dir: dir || 1, grounded: mode !== 'cheer' && mode !== 'hurt', rs: tr.s * (mult || 1), t });
  },
};
