'use strict';
/* =====================================================================
   יוסי והצ'ולנט האבוד  |  Yossi and the Lost Cholent
   Canvas platformer, no dependencies.
   ===================================================================== */
const W = 1280, H = 720, T = 60, ROWS = 12;
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
cv.width = W; cv.height = H;
const QS = new URLSearchParams(location.search);

/* ---------- utils ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const HEB = /[֐-׿]/;
const FONT = "'Rubik','Arial Hebrew',Arial,sans-serif";

/* ---------- assets ---------- */
const MAN = { hero: 8, enemies: 8, items: 8, tiles: 8 };
const IM = {};
function loadImg(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
async function loadAll(onp) {
  const list = [];
  for (const k in MAN) for (let i = 0; i < MAN[k]; i++) list.push([`${k}_${i}`, `assets/${k}_${i}.png`]);
  list.push(['boss', 'assets/boss.png']);
  ['bg1', 'bg2', 'bg3', 'bg4', 'title'].forEach(n => list.push([n, `assets/${n}.jpg`]));
  let d = 0;
  await Promise.all(list.map(async ([n, s]) => { IM[n] = await loadImg(s); d++; onp(d / list.length); }));
}
function spr(name, x, y, h, flip = false, rot = 0, alpha = 1, center = false) {
  const im = IM[name];
  if (!im) { ctx.fillStyle = '#ff40a0'; ctx.fillRect(x - h * .3, center ? y - h / 2 : y - h, h * .6, h); return; }
  const w = im.width * h / im.height;
  ctx.save(); ctx.translate(x, y);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (rot) ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, -w / 2, center ? -h / 2 : -h, w, h);
  ctx.restore();
}
function sprBox(name, x, y, w, h, alpha = 1) {
  const im = IM[name];
  if (!im) { ctx.fillStyle = '#ff40a0'; ctx.fillRect(x, y, w, h); return; }
  if (alpha !== 1) { ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(im, x, y, w, h); ctx.restore(); } else ctx.drawImage(im, x, y, w, h);
}

/* ---------- sprite index map (from the generated sheets) ---------- */
const S = {
  run: ['hero_0', 'hero_1', 'hero_2', 'hero_3'], jump: 'hero_4', fall: 'hero_5', idle: 'hero_6', hurt: 'hero_7',
  coin: 'items_0', challah: 'items_1', hat: 'items_2', coffee: 'items_3', cholent: 'items_4', shofar: 'items_5', candles: 'items_6', juice: 'items_7',
  ground: 'tiles_1', brick: 'tiles_0', crate: 'tiles_2', mystery: 'tiles_3', dumpster: 'tiles_4', table: 'tiles_6', sign: 'tiles_7',
};

/* ---------- audio: sfx ---------- */
const Snd = {
  ctx: null, master: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : .55; this.master.connect(this.ctx.destination);
    } catch (e) { }
  },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : .55; Music.setMuted(m); },
  tone(f1, f2, dur, type = 'square', vol = .15, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t);
    if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .03);
  },
  noise(dur, vol = .2, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay, n = Math.floor(this.ctx.sampleRate * dur), b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(this.master); s.start(t);
  },
  jump() { this.tone(320, 760, .17); },
  coin() { this.tone(988, 988, .07); this.tone(1319, 1319, .22, 'square', .12, .06); },
  stomp() { this.noise(.1, .25); this.tone(240, 70, .12, 'triangle', .3); },
  bump() { this.tone(150, 95, .1, 'square', .22); },
  power() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, .11, 'square', .13, i * .07)); },
  oneup() { [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => this.tone(f, f, .11, 'square', .13, i * .08)); },
  hurt() { this.tone(520, 70, .55, 'sawtooth', .2); },
  throw() { this.tone(640, 320, .1, 'square', .1); },
  boss() { this.noise(.3, .35); this.tone(190, 45, .45, 'sawtooth', .28); },
  splat() { this.noise(.08, .2); this.tone(400, 150, .08, 'square', .12); },
  win() { [523, 659, 784, 659, 784, 1047, 988, 1047, 1319].forEach((f, i) => this.tone(f, f, .16, 'square', .14, i * .11)); },
  tick() { this.tone(900, 900, .05, 'square', .08); },
};

/* ---------- audio: music (mp3 if present, else generated klezmer-ish chiptune) ---------- */
const FREY = [0, 1, 4, 5, 7, 8, 10];
const d2s = d => FREY[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
const TRK = {
  title: { bpm: 112, root: -5, seed: 11, file: 'music/title.mp3' },
  l1: { bpm: 148, root: 0, seed: 21, file: 'music/level1.mp3' },
  l2: { bpm: 138, root: -2, seed: 33, file: 'music/level2.mp3' },
  l3: { bpm: 170, root: 2, seed: 47, file: 'music/level3.mp3' },
  l4: { bpm: 164, root: -3, seed: 59, file: 'music/boss.mp3' },
  win: { bpm: 140, root: 0, seed: 71, file: 'music/win.mp3' },
};
const Chip = {
  timer: null, step: 0, nextT: 0, tr: null, mel: [], gain: null,
  start(k) {
    if (!Snd.ctx) return; this.stop();
    const tr = this.tr = TRK[k], r = mulberry(tr.seed);
    this.mel = []; let d = 4;
    for (let s = 0; s < 32; s++) {
      if (s % 8 === 7 && r() < .5) { this.mel.push(-99); continue; }
      d = clamp(d + [-2, -1, -1, 0, 1, 1, 2][Math.floor(r() * 7)], 0, 11);
      if (s % 16 === 15) d = 0; if (s % 16 === 0 && s) d = 4;
      this.mel.push(r() < .84 ? d : -99);
    }
    this.gain = Snd.ctx.createGain(); this.gain.gain.value = Snd.muted ? 0 : 1; this.gain.connect(Snd.master);
    this.step = 0; this.nextT = Snd.ctx.currentTime + .08;
    this.timer = setInterval(() => this.tick(), 60);
  },
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; if (this.gain) { try { this.gain.disconnect(); } catch (e) { } this.gain = null; } },
  tick() {
    const c = Snd.ctx, spb = 60 / this.tr.bpm / 2;
    if (!c || !this.gain) return;
    while (this.nextT < c.currentTime + .3) { this.play(this.step, this.nextT, spb); this.step = (this.step + 1) % 32; this.nextT += spb; }
  },
  osc(f, t, dur, type, vol) {
    const c = Snd.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + dur + .02);
  },
  play(s, t, spb) {
    const b = this.tr.root, bar = Math.floor(s / 8) % 4, chord = [0, 0, 3, 4][bar];
    const m = this.mel[s];
    if (m !== -99) this.osc(440 * Math.pow(2, (b + 12 + d2s(m)) / 12), t, spb * .9, 'square', .055);
    if (s % 2 === 0) this.osc(440 * Math.pow(2, (b - 12 + d2s(chord + (s % 4 === 2 ? 4 : 0))) / 12), t, spb * 1.6, 'triangle', .2);
    if (s % 4 === 1 || s % 4 === 3) {
      const c = Snd.ctx, n = Math.floor(c.sampleRate * .04), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = c.createBufferSource(), g = c.createGain(); g.gain.value = .05; src.buffer = buf; src.connect(g); g.connect(this.gain); src.start(t);
    }
    if (s % 4 === 0) this.osc(110, t, .12, 'sine', .3);
  },
};
const Music = {
  el: {}, cur: null, muted: false,
  init() {
    for (const k in TRK) {
      const a = new Audio(); a.loop = true; a.preload = 'auto'; a.volume = .6; a._ok = false; a._bad = false;
      a.addEventListener('canplaythrough', () => { a._ok = true; if (this.cur === k && Chip.timer) { Chip.stop(); this.tryPlay(a); } });
      a.addEventListener('error', () => { a._bad = true; });
      a.src = TRK[k].file; this.el[k] = a;
    }
  },
  tryPlay(a) { const p = a.play(); if (p && p.catch) p.catch(() => { }); },
  play(k) {
    if (this.cur === k) return;
    this.stop(); this.cur = k;
    const a = this.el[k];
    if (a && a._ok) { a.currentTime = 0; a.muted = this.muted; this.tryPlay(a); } else Chip.start(k);
  },
  stop() { if (this.cur && this.el[this.cur]) { try { this.el[this.cur].pause(); } catch (e) { } } Chip.stop(); this.cur = null; },
  setMuted(m) { this.muted = m; for (const k in this.el) this.el[k].muted = m; if (Chip.gain) Chip.gain.gain.value = m ? 0 : 1; },
};

/* ---------- input ---------- */
const keys = { left: false, right: false, jump: false, run: false, throw: false };
let jumpPressed = false, throwPressed = false, confirmPressed = false;
const KM = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', ShiftLeft: 'run', ShiftRight: 'run', KeyZ: 'run', KeyX: 'throw', KeyK: 'throw' };
addEventListener('keydown', e => {
  if (e.code in KM) { e.preventDefault(); const k = KM[e.code]; if (!keys[k]) { if (k === 'jump') jumpPressed = true; if (k === 'throw') throwPressed = true; } keys[k] = true; }
  if (e.code === 'Enter' || e.code === 'Space') confirmPressed = true;
  if (e.code === 'KeyM') { Snd.init(); Snd.setMuted(!Snd.muted); }
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  Snd.init();
});
addEventListener('keyup', e => { if (e.code in KM) keys[KM[e.code]] = false; });
function setKey(k, v) {
  if (k === 'mute') { if (v) { Snd.init(); Snd.setMuted(!Snd.muted); document.getElementById('bm').textContent = Snd.muted ? '🔇' : '🔊'; } return; }
  if (v && !keys[k]) { if (k === 'jump') jumpPressed = true; if (k === 'throw') throwPressed = true; }
  keys[k] = v;
}
document.querySelectorAll('.tb').forEach(b => {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); Snd.init(); b.classList.add('down'); setKey(k, true); };
  const off = e => { e.preventDefault(); b.classList.remove('down'); setKey(k, false); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});
if ('ontouchstart' in window || QS.has('touch')) document.getElementById('touch').classList.add('on');
cv.addEventListener('pointerdown', e => { Snd.init(); confirmPressed = true; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (state === 'play') togglePause(true); });
document.addEventListener('visibilitychange', () => { if (Snd.ctx) { if (document.hidden) Snd.ctx.suspend(); else Snd.ctx.resume(); } });

function resize() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', resize); resize();

/* ---------- game data ---------- */
const LV = [
  { name: 'השכונה', bg: 'bg1', music: 'l1', time: 240, theme: 'n', seed: 5,
    seq: ['flat', 'blocks', 'flat', 'pit', 'hill', 'blocks', 'dump', 'gaunt', 'pit', 'stairs', 'rest', 'awn', 'gaunt', 'crates', 'myst', 'flat', 'awn2', 'pit', 'gaunt'],
    story: 'יום שישי, שתיים וחצי בצהריים. יוסי הכין בבוקר סיר צ\'ולנט עם הרבה אהבה והרבה פלפל. בטעות הסיר התעורר לחיים, קם על שתי רגליים ובעט את הדלת. הוא רץ לכיוון השכונה וצעק: אני לא נאכל היום! יוסי חייב להחזיר אותו לשולחן לפני הדלקת הנרות. יאללה, רצים!' },
  { name: 'השוק', bg: 'bg2', music: 'l2', time: 260, theme: 'm', seed: 17,
    seq: ['flat', 'myst', 'gaunt', 'pit', 'dump', 'awn', 'blocks', 'hill', 'gaunt', 'rest', 'stairs', 'pit', 'crates', 'awn2', 'gaunt', 'blocks', 'pit', 'awn', 'gaunt'],
    story: 'הסיר התחבא בשוק. מלפפונים חמוצים עם מזג, פלאפלים חריפים וקרפיונים שקפצו מהדוכן. יוסי, תיזהר מהפירות ומהמחירים. תקפוץ על כולם ותמשיך לרוץ.' },
  { name: 'האולם', bg: 'bg3', music: 'l3', time: 280, theme: 'w', seed: 29,
    seq: ['flat', 'blocks', 'awn', 'gaunt', 'pit', 'hill', 'myst', 'gaunt', 'dump', 'awn2', 'rest', 'pit', 'stairs', 'gaunt', 'crates', 'awn', 'pit', 'myst', 'gaunt', 'flat'],
    story: 'החתונה של השנה! הסיר פרץ לריקודים ובינתיים הבופה פתוח. קוגלים מעופפים, דליי סמרטוט בתפקיד המלצרים והרבה חתולים בין הרגליים. אל תעצרו לרקוד, השקיעה מתקרבת.' },
  { name: 'הגג', bg: 'bg4', music: 'l4', time: 300, boss: true, theme: 'b', seed: 41,
    story: 'השמש נוגעת באופק. הסיר גדל לגודל של שני טנדרים, חם, עצבני ומתבשל. קפצו עליו חמש פעמים כדי להרגיע אותו ולהחזיר אותו הביתה. אפשר גם לזרוק עליו חלות.' },
];
const THEME = {
  n: { dirt: '#8a6a48', top: '#7ccf4f', hi: '#a6ec74', line: '#8a6a3e' },
  m: { dirt: '#9a6a44', top: '#e9a94c', hi: '#ffd37a', line: '#7b4a2a' },
  w: { dirt: '#7a3b66', top: '#efc44f', hi: '#fff0a0', line: '#3d1a38' },
  b: { dirt: '#8a4a3c', top: '#e0662c', hi: '#ffb072', line: '#3e1c18' },
};
const CH = {
  flat: ['..............', '..............', '..............', '..............', '....ooo.......', '.........E....', '##############', '##############'],
  blocks: ['..............', '...ooooo......', '..............', '...?B?B?......', '..............', '.........E....', '##############', '##############'],
  pit: ['..............', '..............', '..............', '..............', '....ooooo.....', '..............', '#####....#####', '#####....#####'],
  stairs: ['..............', '..............', '..............', '..........E...', '..........BB..', '......BB..BB..', '##############', '##############'],
  dump: ['..............', '..............', '..............', '...oo.....oo..', '..DD......DD..', '..DD...E..DD..', '##############', '##############'],
  awn: ['..............', '..............', '..............', '...ooo..ooo...', '...AAA..AAA...', '..............', '##..........##', '##....W.....##'],
  gaunt: ['..............', '..............', '...........Y..', '..............', '..oo...oo.....', '.....E....E...', '##############', '##############'],
  crates: ['..............', '..............', '........c.....', '........C.....', '....C...C.....', '....C...CC.E..', '##############', '##############'],
  myst: ['..............', '...o..o..o....', '..............', '...?..?..?....', '..............', '...E.......E..', '##############', '##############'],
  awn2: ['..............', '.......ocoo...', '......AAAA....', '..............', '..AAAA........', '..........E...', '##############', '##############'],
  rest: ['..............', '..............', '..............', '..............', '.....oooo.....', '......c.......', '##############', '##############'],
  hill: ['..............', '..............', '......ooo.....', '.......E......', '......####....', '....########..', '##############', '##############'],
};
const EK = {
  cat: { spr: 'enemies_0', h: 64, w: 50, hh: 44, beh: 'walk', sp: 85 },
  pigeon: { spr: 'enemies_1', h: 68, w: 48, hh: 46, beh: 'fly', sp: 95 },
  cart: { spr: 'enemies_2', h: 64, w: 62, hh: 46, beh: 'roll', sp: 215 },
  pickle: { spr: 'enemies_3', h: 82, w: 38, hh: 66, beh: 'walk', sp: 70 },
  kugel: { spr: 'enemies_4', h: 56, w: 60, hh: 42, beh: 'fly', sp: 90 },
  falafel: { spr: 'enemies_5', h: 72, w: 50, hh: 54, beh: 'hop', sp: 90 },
  herring: { spr: 'enemies_6', h: 74, w: 48, hh: 60, beh: 'leap', sp: 0 },
  mop: { spr: 'enemies_7', h: 76, w: 52, hh: 58, beh: 'walk', sp: 60 },
};
const TH = {
  n: { E: ['cat', 'cat', 'cart'], Y: ['pigeon'], W: ['herring'] },
  m: { E: ['pickle', 'pickle', 'falafel'], Y: ['pigeon'], W: ['herring'] },
  w: { E: ['mop', 'cat', 'falafel'], Y: ['kugel'], W: ['herring'] },
};
const POPS = ['בום!', 'סליחה!', 'יאללה!', 'בתיאבון!', 'אחי נו!', 'פאף!'];
const QUIPS = ['אוי ויי', 'רגע, שכחתי את הכובע', 'זה לא היה בתוכנית', 'הסיר צוחק עליך'];
const IDLEL = ['איפה הצ\'ולנט שלי?', 'השעה עוברת...', 'אני רעב', 'רגע, הסיר שם?'];
const SOLID = '#BC?UD';
const isSolidCh = ch => SOLID.indexOf(ch) >= 0;

/* ---------- state ---------- */
let state = 'loading', loadP = 0, cfgI = 0, L = null, P = null, cam = 0, camT = 0;
let lives = 3, coins = 0, score = 0, coinsAtStart = 0, scoreAtStart = 0, best = 0;
let particles = [], popups = [], shake = 0, tAll = 0, stateT = 0, boss = null, shots = [], beans = [];
let stats = null, paused = false, deadQuip = '';
try { best = +localStorage.getItem('cholent_best') || 0; } catch (e) { }

/* ---------- level builder ---------- */
function buildLevel(i) {
  const cfg = LV[i], r = mulberry(cfg.seed);
  const g = Array.from({ length: ROWS }, () => []);
  const out = { cfg, g, enemies: [], coins: [], challahs: [], items: [], boxes: {}, bump: {}, start: { x: 150, y: 600 }, goal: null, cpX: 0, cols: 0, retry: 0, timeLeft: cfg.time, cp: false };
  const addChunk = ch => {
    const w = ch[0].length;
    for (let rr = 0; rr < ROWS; rr++) {
      const line = rr < 4 ? '.'.repeat(w) : ch[rr - 4];
      if (line.length !== w) throw new Error('bad chunk width ' + line);
      for (const c of line) g[rr].push(c);
    }
    return g[0].length - w;
  };
  if (cfg.boss) {
    const cols = 42, rows = [];
    for (let rr = 0; rr < ROWS; rr++) { let line = ''; for (let c = 0; c < cols; c++) line += rr >= 10 ? '#' : '.'; rows.push(line.split('')); }
    const plat = (rr, c0, c1, ch) => { for (let c = c0; c <= c1; c++) rows[rr][c] = ch; };
    plat(8, 7, 10, 'A'); plat(8, 31, 34, 'A'); plat(6, 17, 24, 'A'); plat(6, 19, 22, 'A');
    for (let rr = 0; rr < ROWS; rr++) g[rr] = rows[rr];
    out.start = { x: 3 * T, y: 10 * T };
    out.goalCol = 38;
    out.cpX = 0;
  } else {
    addChunk(['..........', '..........', '..........', '..........', '..........', '..@.......', '##########', '##########']);
    const mid = Math.floor(cfg.seq.length / 2);
    cfg.seq.forEach((k, ix) => { const x0 = addChunk(CH[k]); if (ix === mid) out.cpX = x0 * T; });
    const gx = addChunk(['....................', '....................', '....................', '....................', '....................', '........F...........', '####################', '####################']);
  }
  out.cols = g[0].length;
  const th = TH[cfg.theme];
  let firstBox = true;
  for (let rr = 0; rr < ROWS; rr++) for (let c = 0; c < out.cols; c++) {
    const ch = g[rr][c], x = c * T + T / 2, yb = (rr + 1) * T;
    if (ch === '@') { out.start = { x, y: yb }; g[rr][c] = '.'; }
    else if (ch === 'F') { out.goal = { x, y: yb }; g[rr][c] = '.'; }
    else if (ch === 'o') { out.coins.push({ x, y: rr * T + T / 2, got: false, ph: r() * 6 }); g[rr][c] = '.'; }
    else if (ch === 'c') { out.challahs.push({ x, y: rr * T + T / 2, got: false, ph: r() * 6 }); g[rr][c] = '.'; }
    else if (ch === 'E' || ch === 'Y' || ch === 'W') {
      const kind = th[ch][Math.floor(r() * th[ch].length)];
      out.enemies.push(mkEnemy(kind, x, yb)); g[rr][c] = '.';
    }
    else if (ch === '?') {
      let t = 'coin'; const q = r();
      if (firstBox && i === 0) t = 'cholent'; else if (q < .5) t = 'coin'; else if (q < .68) t = 'coffee'; else if (q < .9) t = 'cholent'; else t = 'hat';
      firstBox = false; out.boxes[c + ',' + rr] = t;
    }
  }
  if (cfg.boss) { out.goal = { x: out.goalCol * T, y: 10 * T }; }
  return out;
}
function mkEnemy(kind, x, y) {
  const k = EK[kind];
  return { kind, k, x, y, bx: x, by: y, vx: 0, vy: 0, dir: -1, t: Math.random() * 3, isDead: false, dT: 0, flung: false, w: k.w, h: k.hh, wait: rnd(1, 2.5), spin: 0 };
}

/* ---------- tiles ---------- */
function chAt(c, r) { if (r < 0) return '.'; if (r >= ROWS) return '.'; if (c < 0 || c >= L.cols) return '#'; return L.g[r][c]; }
function solidAt(c, r) { return isSolidCh(chAt(c, r)); }

function collideX(e, dx) {
  const hw = e.w / 2, top = e.y - e.h, bot = e.y;
  const c0 = Math.floor((e.x - hw) / T), c1 = Math.floor((e.x + hw - .01) / T), r0 = Math.floor(top / T), r1 = Math.floor((bot - .01) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (solidAt(c, r)) { if (dx > 0) e.x = c * T - hw; else if (dx < 0) e.x = (c + 1) * T + hw; return true; }
  }
  return false;
}
function collideY(e, dy, prevBottom) {
  const hw = e.w / 2, top = e.y - e.h;
  const c0 = Math.floor((e.x - hw + 1) / T), c1 = Math.floor((e.x + hw - 1.01) / T), r0 = Math.floor(top / T), r1 = Math.floor((e.y - .01) / T);
  let hit = null;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const ch = chAt(c, r);
    if (dy >= 0) {
      if (isSolidCh(ch) || (ch === 'A' && prevBottom <= r * T + 2)) { e.y = r * T; e.vy = 0; e.onGround = true; return { land: true }; }
    } else if (isSolidCh(ch)) { e.y = (r + 1) * T + e.h; e.vy = 0; if (!hit) hit = { c, r, ch }; }
  }
  return hit ? { bump: hit } : null;
}

/* ---------- start / flow ---------- */
function startLevel(i, keepRetry) {
  cfgI = i;
  const prevRetry = keepRetry && L ? L.retry : 0;
  L = buildLevel(i); L.retry = prevRetry;
  const respawnAtCp = keepRetry && L.cp;
  P = { x: L.start.x, y: L.start.y, vx: 0, vy: 0, w: 40, h: 88, dir: 1, onGround: false, coyote: 0, buf: 0, anim: 0, sup: false, inv: 0, boost: 0, dead: false, deadT: 0, idle: 0, say: '', sayT: 0, won: false, prevB: L.start.y, squash: 0 };
  cam = 0; particles = []; popups = []; shots = []; beans = []; shake = 0; boss = null;
  if (L.cfg.boss) boss = { x: 34 * T, y: 10 * T, vx: -120, vy: 0, hp: 5, state: 'walk', t: 1.5, stun: 0, cd: 0, dir: -1, w: 190, h: 232, throwT: 2.5, dead: false, defT: 0, onGround: true };
  coinsAtStart = coins; scoreAtStart = score;
  stats = { coins0: coins, ch: 0 };
  state = 'story'; stateT = 0;
  Music.play(L.cfg.music);
}
function beginPlay() { state = 'play'; stateT = 0; if (L.cfg.boss) addPop(P.x, P.y - 160, 'קפוץ על הסיר!', '#ffe14d', 2); }
function restartFromDeath() {
  lives--;
  if (lives <= 0) { state = 'gameover'; stateT = 0; Music.stop(); return; }
  const keepCp = L.cp ? L.cpX : 0, retry = L.retry + 1;
  coins = coinsAtStart; score = scoreAtStart;
  L = buildLevel(cfgI); L.retry = retry; L.timeLeft = LV[cfgI].time; stats.ch = 0;
  P = { x: L.start.x, y: L.start.y, vx: 0, vy: 0, w: 40, h: 88, dir: 1, onGround: false, coyote: 0, buf: 0, anim: 0, sup: false, inv: 1.5, boost: 0, dead: false, deadT: 0, idle: 0, say: '', sayT: 0, won: false, prevB: L.start.y, squash: 0 };
  if (keepCp) { P.x = keepCp + 80; P.y = 10 * T - 400; L.cp = true; L.enemies = L.enemies.filter(e => e.x > keepCp + 500); }
  cam = clamp(P.x - W * .4, 0, L.cols * T - W);
  particles = []; popups = []; shots = []; beans = [];
  if (L.cfg.boss) boss = { x: 34 * T, y: 10 * T, vx: -120, vy: 0, hp: 5, state: 'walk', t: 1.5, stun: 0, cd: 0, dir: -1, w: 190, h: 232, throwT: 2.5, dead: false, defT: 0, onGround: true };
  state = 'play'; stateT = 0; Music.play(L.cfg.music);
}
function togglePause(force) {
  if (state !== 'play' && state !== 'paused') return;
  if (state === 'play') { state = 'paused'; Music.setMuted(true); } else if (!force) { state = 'play'; Music.setMuted(Snd.muted); }
}

/* ---------- fx helpers ---------- */
function addPop(x, y, text, color = '#fff', life = 1) { popups.push({ x, y, text, color, life, max: life }); }
function burst(x, y, n, colors, sp = 300, g = 900) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(.3, 1) * sp; particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * .4, life: rnd(.4, .8), max: .8, c: pick(colors), s: rnd(4, 9), g }); } }
function addScore(n, x, y) { score += n; if (x !== undefined) addPop(x, y, '+' + n, '#fff', .8); }
function addCoin(n = 1) { coins += n; if (coins >= 100) { coins -= 100; lives++; Snd.oneup(); addPop(P.x, P.y - 120, 'חיים נוספים!', '#7dff9b', 1.4); } }
