/* ---------- update: player ---------- */
const RUN = 330, RUNF = 470, ACC = 2800, FRIC = 2400, GRAV = 2500, JV = -1010;
function hurt() {
  if (P.inv > 0 || P.dead || P.won) return;
  if (P.tier > 0) { setTier(P.tier - 1); P.inv = 1.8; P.vy = -520; Snd.hurt(); addPop(P.x, P.y - 110, 'אוף!', '#ff7a7a', .8); burst(P.x, P.y - 60, 12, ['#fff', '#ff7a7a', '#ffd23f'], 320); return; }
  die();
}
function setTier(n, instant) {
  P.tier = n; P.w = TIERS[n].w; P.h = TIERS[n].h; P.sup = n >= 1;
  if (instant) P.rs = TIERS[n].s; else P.pop = .5;
}
function die(msg) {
  if (P.dead) return;
  P.dead = true; P.deadT = 0; P.vy = -900; P.vx = 0; deadQuip = msg || pick(QUIPS); Snd.hurt(); Music.stop();
  state = 'dead'; stateT = 0;
}
function updatePlayer(dt) {
  const p = P;
  p.prevB = p.y;
  const boost = p.boost > 0 ? 1.22 : 1;
  const maxV = (keys.run ? RUNF : RUN) * boost;
  const dirIn = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (dirIn) {
    p.dir = dirIn;
    const acc = (p.onGround ? ACC : 2300) * (dirIn !== Math.sign(p.vx) && p.vx ? 1.6 : 1);
    p.vx += dirIn * acc * dt;
    if (Math.abs(p.vx) > maxV) p.vx = Math.sign(p.vx) * Math.max(maxV, Math.abs(p.vx) - 3000 * dt);
    p.idle = 0;
  } else {
    const f = (p.onGround ? FRIC : 500) * dt;
    if (Math.abs(p.vx) <= f) p.vx = 0; else p.vx -= Math.sign(p.vx) * f;
  }
  if (jumpPressed) p.buf = .13;
  p.buf -= dt; p.coyote -= dt;
  if (p.onGround) p.coyote = .13;
  if (p.buf > 0 && p.coyote > 0) {
    p.vy = JV * (p.boost > 0 ? 1.1 : 1); p.onGround = false; p.coyote = 0; p.buf = 0; Snd.jump(); p.idle = 0;
    burst(p.x, p.y, 5, ['#fff', '#e8d9b0'], 120, 400);
  }
  if (p.vy >= 0 || p.onGround) p.spr = false;
  if (!keys.jump && p.vy < -300 && !p.spr) p.vy *= (1 - 9 * dt);
  p.vy = Math.min(p.vy + GRAV * dt, 1500);

  p.x += p.vx * dt;
  if (collideX(p, p.vx)) p.vx = 0;
  p.x = clamp(p.x, p.w / 2, L.cols * T - p.w / 2);
  p.onGround = false;
  const prevB = p.y;
  p.y += p.vy * dt;
  const res = collideY(p, p.vy, prevB);
  if (res && res.bump) bumpTile(res.bump.c, res.bump.r, res.bump.ch);
  if (p.onGround) {
    const sc = Math.floor(p.x / T), sr = Math.floor((p.y + 2) / T);
    if (chAt(sc, sr) === 'S') { p.spr = true; p.vy = keys.jump ? -1550 : -1250; p.onGround = false; p.coyote = 0; L.bump[sc + ',' + sr] = .18; Snd.tone(260, 900, .28, 'triangle', .22); burst(p.x, p.y, 8, ['#ff6a6a', '#fff', '#ffd23f'], 220, 300); }
  }
  if (p.onGround && !p.wasGround && p.lastVy > 420) { p.sq = .16; burst(p.x, p.y, 8, ['#f3e6c6', '#d8c196', '#fff'], 160, 300); }
  p.wasGround = p.onGround; p.lastVy = p.vy;
  if (p.sq > 0) p.sq -= dt;
  if (p.onGround && Math.abs(p.vx) > 170 && Math.random() < dt * 16) burst(p.x - p.dir * 14, p.y - 2, 1, ['#f3e6c6', '#d8c196'], 70, 260);
  p.anim += Math.abs(p.vx) * dt;
  if (p.inv > 0) p.inv -= dt;
  if (p.boost > 0) p.boost -= dt;
  if (!dirIn && p.onGround) { p.idle += dt; if (p.idle > 4 && !p.say) { p.say = pick(IDLEL); p.sayT = 2.2; } } else p.idle = 0;
  if (p.sayT > 0) { p.sayT -= dt; if (p.sayT <= 0) { p.say = ''; p.idle = 0; } }
  if (throwPressed && p.tier >= 1 && shots.length < (p.tier >= 2 ? 3 : 2)) {
    shots.push({ x: p.x + p.dir * 30, y: p.y - 60, vx: p.dir * 560 + p.vx * .3, vy: -240, rot: 0, life: 3 }); Snd.throw();
  }
  // fall into pit
  if (p.y > ROWS * T + 140) die('אוי ויי, הבור...');
  // checkpoint
  if (!L.cp && L.cpX && p.x > L.cpX) { L.cp = true; addPop(p.x, p.y - 140, 'נקודת שמירה!', '#7dff9b', 1.4); Snd.power(); }
}
function bumpTile(c, r, ch) {
  const key = c + ',' + r; L.bump[key] = .18; Snd.bump();
  if (ch === '?') {
    L.g[r][c] = 'U'; const t = L.boxes[key] || 'coin';
    if (t === 'coin') { addCoin(); score += 100; Snd.coin(); particles.push({ x: c * T + T / 2, y: r * T - 10, vx: 0, vy: -700, life: .55, max: .55, c: '#ffd23f', s: 14, g: 2200, coin: true }); }
    else L.items.push({ type: t, x: c * T + T / 2, y: r * T, vx: t === 'hat' ? 0 : 120, vy: -520, w: 40, h: 40, emerge: 0 });
  } else if (ch === 'B' && P.sup) {
    L.g[r][c] = '.'; burst(c * T + T / 2, r * T + T / 2, 14, ['#c98a58', '#8a5a34', '#e6b17c'], 360); addScore(50, c * T + T / 2, r * T); Snd.stomp();
  }
  // knock enemies standing above
  for (const e of L.enemies) if (!e.isDead && !e.k.hazard && Math.abs(e.x - (c * T + T / 2)) < T * .7 && Math.abs(e.y - r * T) < 8) { killEnemy(e, true); }
}

/* ---------- update: enemies, items, etc ---------- */
function killEnemy(e, fling) {
  if (e.isDead) return;
  e.isDead = true; e.dT = fling ? 2 : .4; e.flung = !!fling; e.vy = fling ? -600 : 0; e.vx = fling ? (Math.random() < .5 ? -1 : 1) * 140 : 0;
  addScore(100, e.x, e.y - e.h); burst(e.x, e.y - e.h / 2, 10, ['#fff', '#ffd23f', '#ff8a3d'], 320);
  if (Math.random() < .5) addPop(e.x, e.y - e.h - 30, pick(POPS), '#ffe14d', .7);
  Snd.stomp();
}
function updateEnemies(dt) {
  for (const e of L.enemies) {
    if (e.isDead) {
      e.dT -= dt; if (e.flung) { e.vy += GRAV * dt; e.y += e.vy * dt; e.x += e.vx * dt; e.spin += dt * 8; }
      continue;
    }
    if (Math.abs(e.x - P.x) > W + 200) continue;
    e.t += dt; const b = e.k.beh;
    if (b === 'walk' || b === 'roll' || b === 'hop') {
      e.vy = Math.min(e.vy + GRAV * dt, 1400);
      e.x += e.dir * e.k.sp * dt * (b === 'hop' ? 1 : 1);
      if (collideX(e, e.dir)) e.dir *= -1;
      e.onGround = false; const pb = e.y; e.y += e.vy * dt; collideY(e, e.vy, pb);
      if (e.onGround && b === 'walk') {
        const ahead = Math.floor((e.x + e.dir * (e.w / 2 + 4)) / T), below = Math.floor((e.y + 4) / T);
        if (!solidAt(ahead, below) && chAt(ahead, below) !== 'A') e.dir *= -1;
      }
      if (b === 'hop' && e.onGround) { e.wait -= dt; if (e.wait <= 0) { e.vy = -680; e.wait = rnd(1, 1.8); } }
      if (e.y > ROWS * T + 200) { e.isDead = true; e.dT = 0; }
    } else if (b === 'fly') {
      e.x += e.dir * e.k.sp * dt; if (Math.abs(e.x - e.bx) > 200) e.dir *= -1;
      e.y = e.by + Math.sin(e.t * 3) * 36;
    } else if (b === 'leap') {
      e.vy += GRAV * dt * .9; e.y += e.vy * dt;
      if (e.y >= e.by + 100) { e.y = e.by + 100; e.vy = 0; e.wait -= dt; if (e.wait <= 0) { e.vy = -1250; e.wait = rnd(1.4, 2.6); } }
    }
    e.face = e.dir;
  }
  L.enemies = L.enemies.filter(e => !e.isDead || e.dT > 0);
}
function updateItems(dt) {
  for (const it of L.items) {
    it.vy = Math.min(it.vy + GRAV * dt * .7, 1000);
    it.x += it.vx * dt; if (collideX(it, it.vx)) it.vx *= -1;
    it.onGround = false; const pb = it.y; it.y += it.vy * dt; collideY(it, it.vy, pb);
    if (it.y > ROWS * T + 100) it.gone = true;
    if (!it.gone && Math.abs(it.x - P.x) < 36 && it.y > P.y - P.h - 10 && it.y - it.h < P.y) { it.gone = true; collectItem(it); }
  }
  L.items = L.items.filter(i => !i.gone);
}
function collectItem(it) {
  if (it.type === 'cholent') {
    if (P.tier >= 3) addScore(1000, P.x, P.y - 130);
    else { setTier(P.tier + 1); shake = .22; addPop(P.x, P.y - 140, ['', 'עכשיו אתה רב! אפשר לזרוק חלות', 'רב גדול ושחור יותר!', 'זקן ומשקפי שמש!'][P.tier], '#ffe14d', 2); burst(P.x, P.y - 70, 26, ['#ffd23f', '#fff', '#111'], 440); }
    Snd.power();
  }
  else if (it.type === 'coffee') { P.boost = 9; Snd.power(); addPop(P.x, P.y - 120, 'קפה! יותר מהיר', '#9ee8ff', 1.4); }
  else if (it.type === 'hat') { lives++; Snd.oneup(); addPop(P.x, P.y - 120, 'כובע, חיים נוספים!', '#7dff9b', 1.5); }
  burst(P.x, P.y - 50, 14, ['#ffd23f', '#fff', '#7dff9b'], 360);
}
function overlap(a, b) { return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && a.y > b.y - b.h && a.y - a.h < b.y; }
function updateInteractions(dt) {
  if (P.dead || P.won) return;
  for (const e of L.enemies) {
    if (e.isDead || !overlap(P, e)) continue;
    const stomp = P.vy > 80 && P.prevB <= e.y - e.h + 26;
    if (stomp && !e.k.hazard) { killEnemy(e, false); P.vy = keys.jump ? -820 : -560; P.onGround = false; }
    else if (P.tier >= 3 && !e.k.hazard && Math.abs(P.vx) > 300) { killEnemy(e, true); }
    else hurt();
  }
  for (const c of L.coins) if (!c.got && Math.abs(c.x - P.x) < 36 && c.y > P.y - P.h - 18 && c.y < P.y + 18) { c.got = true; addCoin(); addScore(50); Snd.coin(); burst(c.x, c.y, 6, ['#ffd23f', '#fff'], 200, 300); }
  for (const c of L.challahs) if (!c.got && Math.abs(c.x - P.x) < 40 && c.y > P.y - P.h - 20 && c.y < P.y + 20) { c.got = true; stats.ch++; addScore(500, c.x, c.y - 30); Snd.oneup(); burst(c.x, c.y, 18, ['#ffd23f', '#f5b25a', '#fff'], 380); }
  // shots
  for (const s of shots) {
    s.vy += 1500 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 12 * Math.sign(s.vx); s.life -= dt;
    const c = Math.floor(s.x / T), r = Math.floor((s.y + 14) / T);
    if (s.vy > 0 && solidAt(c, r)) { s.y = r * T - 14; s.vy = -420; }
    if (solidAt(Math.floor((s.x + Math.sign(s.vx) * 14) / T), Math.floor(s.y / T))) s.life = 0;
    for (const e of L.enemies) if (!e.isDead && Math.abs(e.x - s.x) < e.w / 2 + 16 && s.y > e.y - e.h - 16 && s.y < e.y + 16) { if (!e.k.hazard) killEnemy(e, true); s.life = 0; }
    if (boss && !boss.dead && boss.cd <= 0 && Math.abs(boss.x - s.x) < boss.w / 2 + 16 && s.y > boss.y - boss.h - 16 && s.y < boss.y) { damageBoss(); s.life = 0; }
  }
  shots = shots.filter(s => s.life > 0 && s.y < ROWS * T + 100);
  // goal
  if (L.goal && (!L.cfg.boss || (boss && boss.dead && boss.defT > 1.2))) {
    if (Math.abs(P.x - L.goal.x) < 64 && P.y > L.goal.y - 150 && P.y < L.goal.y + 10) levelDone();
  }
}
function levelDone() {
  P.won = true; carryTier = P.tier; state = 'complete'; stateT = 0; Snd.win();
  const tb = Math.floor(L.timeLeft) * 10; score += tb;
  stats.tb = tb; stats.time = Math.floor(L.timeLeft); stats.coins = coins - stats.coins0;
  const bst = Math.max(best, score); if (bst > best) { best = bst; try { localStorage.setItem('cholent_best', String(best)); } catch (e) { } }
  Music.stop();
}

/* ---------- boss ---------- */
function damageBoss() {
  if (boss.cd > 0 || boss.dead) return;
  boss.hp--; boss.cd = 1.3; boss.stun = 1.5; boss.state = 'stun'; shake = .5; Snd.boss();
  burst(boss.x, boss.y - boss.h + 20, 24, ['#8a4a22', '#e0a050', '#fff', '#ff6a30'], 480);
  addScore(500, boss.x, boss.y - boss.h - 20); addPop(boss.x, boss.y - boss.h - 60, boss.hp > 0 ? 'עוד ' + boss.hp + '!' : 'נרגע!', '#ffe14d', 1.2);
  if (boss.hp <= 0) { boss.dead = true; boss.defT = 0; addPop(boss.x, boss.y - boss.h - 90, 'הסיר נרגע! רוץ לשולחן', '#7dff9b', 3); Snd.win(); for (let i = 0; i < 12; i++) L.coins.push({ x: boss.x + rnd(-200, 200), y: 10 * T - rnd(80, 280), got: false, ph: Math.random() * 6 }); }
}
function updateBoss(dt) {
  const b = boss; if (!b) return;
  if (b.dead) { b.defT += dt; b.vy += GRAV * dt; b.y = Math.min(b.y + b.vy * dt, 10 * T); if (b.y >= 10 * T) b.vy = 0; return; }
  b.cd -= dt; const rage = 1 + .22 * (5 - b.hp);
  b.vy += GRAV * dt; b.y += b.vy * dt;
  if (b.y >= 10 * T) { if (!b.onGround && b.vy > 700) { shake = .35; Snd.boss(); for (const d of [-1, 1]) beans.push({ x: b.x + d * 90, y: 10 * T - 16, vx: d * 380 * rage, vy: 0, r: 16, roll: true, life: 5 }); } b.y = 10 * T; b.vy = 0; b.onGround = true; } else b.onGround = false;
  if (b.state === 'stun') { b.stun -= dt; b.vx = 0; if (b.stun <= 0) { b.state = 'walk'; b.t = 1.2; } }
  else {
    b.t -= dt; b.throwT -= dt;
    if (b.onGround) { b.dir = P.x < b.x ? -1 : 1; b.vx = b.dir * 130 * rage; }
    b.x = clamp(b.x + b.vx * dt, 5 * T, (L.cols - 5) * T);
    if (b.t <= 0 && b.onGround) { b.vy = -1250; b.vx = b.dir * 260 * rage; b.t = rnd(2.2, 3.4) / rage; }
    if (b.throwT <= 0) { b.throwT = rnd(1.8, 2.8) / rage; const dx = P.x - b.x, tt = clamp(Math.abs(dx) / 520, .5, 1.4); beans.push({ x: b.x, y: b.y - b.h, vx: dx / tt, vy: -tt * 700 * .5 - 200, r: 15, roll: false, life: 5 }); Snd.splat(); }
    if (!b.onGround) b.x = clamp(b.x + b.vx * dt, 5 * T, (L.cols - 5) * T);
  }
  // player vs boss
  if (!P.dead && !P.won) {
    const bb = { x: b.x, y: b.y, w: b.w, h: b.h };
    if (overlap(P, bb)) {
      const stomp = P.vy > 60 && P.prevB <= b.y - b.h + 50;
      if (stomp) { if (b.cd <= 0) damageBoss(); P.vy = -900; P.onGround = false; }
      else if (b.state !== 'stun') hurt();
    }
  }
  for (const s of beans) {
    s.vy += (s.roll ? 0 : 1500) * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (!s.roll && s.y > 10 * T - s.r) { s.y = 10 * T - s.r; s.vy = 0; s.vx *= .5; s.roll = true; }
    if (!P.dead && !P.won && Math.abs(s.x - P.x) < s.r + 20 && s.y > P.y - P.h - s.r && s.y < P.y + s.r) { hurt(); s.life = 0; burst(s.x, s.y, 8, ['#8a4a22', '#e0a050'], 250); }
  }
  beans = beans.filter(s => s.life > 0 && s.x > 0 && s.x < L.cols * T);
}

/* ---------- update main ---------- */
function update(dt) {
  tAll += dt; stateT += dt;
  if (shake > 0) shake -= dt;
  for (const k in L ? L.bump : {}) { L.bump[k] -= dt; if (L.bump[k] <= 0) delete L.bump[k]; }
  if (state === 'play') {
    L.timeLeft -= dt;
    if (L.timeLeft <= 0) { L.timeLeft = 0; die('השמש שקעה!'); }
    else if (L.timeLeft < 20 && Math.floor(L.timeLeft) !== Math.floor(L.timeLeft + dt)) Snd.tick();
    updatePlayer(dt); updateEnemies(dt); updateItems(dt); updateBoss(dt); updateInteractions(dt);
  } else if (state === 'dead') {
    P.deadT += dt;
    if (P.deadT > .45) { P.vy += GRAV * dt; P.y += P.vy * dt; } else P.vy = 0;
    if (stateT > 2.1) restartFromDeath();
  } else if (state === 'complete') {
    P.vx *= .9; if (P.onGround) { P.vy = 0; } P.vy += GRAV * dt; P.y += P.vy * dt; const pb = P.y; collideY(P, 1, pb - 1);
    if (stateT > 1 && confirmPressed) { nextLevel(); }
  }
  if (state === 'play' || state === 'dead' || state === 'complete') {
    const target = clamp(P.x - W * .4 + P.vx * .15, 0, L.cols * T - W);
    cam += (target - cam) * Math.min(1, dt * 7);
  }
  for (const p of particles) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  particles = particles.filter(p => p.life > 0);
  for (const p of popups) { p.y -= 40 * dt; p.life -= dt; }
  popups = popups.filter(p => p.life > 0);
  jumpPressed = false; throwPressed = false;
}
function nextLevel() {
  confirmPressed = false;
  if (cfgI + 1 >= LV.length) { state = 'win'; stateT = 0; Music.play('win'); return; }
  startLevel(cfgI + 1);
}
