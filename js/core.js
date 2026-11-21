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
const MAN = { hero: 12, enemies: 16, items: 8, tiles: 8 };
const IM = {};
function loadImg(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
async function loadAll(onp) {
  const list = [];
  for (const k in MAN) for (let i = 0; i < MAN[k]; i++) list.push([`${k}_${i}`, `assets/${k}_${i}.png`]);
  list.push(['boss', 'assets/boss.png']);
  ['bg1', 'bg2', 'bg3', 'bg4', 'bg5', 'bg6', 'bg7', 'bg8', 'bg9', 'title'].forEach(n => list.push([n, `assets/${n}.jpg`]));
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
  run: ['hero_0', 'hero_1', 'hero_2', 'hero_3', 'hero_4', 'hero_5', 'hero_6', 'hero_7'], jump: 'hero_8', fall: 'hero_9', idle: 'hero_10', hurt: 'hero_11',
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

/* ---------- audio: music (mp3 if present, else generated Hava Nagila arrangement) ---------- */
/* Melody offsets in semitones from A4, [note, length in eighths], null is a rest. Hava Nagila is a traditional folk tune. */
const HN_BARS = [
  [[-5, 2], [-5, 2], [null, 1], [-1, 1], [-4, 1], [-5, 1]],
  [[-1, 2], [-1, 2], [null, 1], [2, 1], [0, 1], [-1, 1]],
  [[0, 2], [0, 2], [null, 1], [3, 1], [2, 1], [0, 1]],
  [[-1, 1], [-1, 1], [0, 1], [-1, 1], [-4, 2], [-5, 2]],
];
const HN_BARS_B = [
  [[7, 1], [5, 1], [3, 1], [5, 1], [7, 2], [null, 2]],
  [[7, 1], [5, 1], [3, 1], [2, 1], [3, 2], [0, 2]],
  [[3, 1], [2, 1], [0, 1], [-1, 1], [0, 1], [-1, 1], [0, 2]],
  [[2, 1], [-1, 1], [0, 1], [-1, 1], [-4, 2], [-5, 2]],
];
function expandBars(bars, add) {
  const o = [];
  for (const bar of bars) { const st = []; for (const [n, l] of bar) { st.push(n === null ? null : n + add); for (let i = 1; i < l; i++) st.push('~'); } while (st.length < 8) st.push(null); o.push(st); }
  return o;
}
const CHORD_E = { bass: -17, fifth: -10, tri: [-5, -1, 2] }, CHORD_A = { bass: -12, fifth: -5, tri: [0, 3, 7] };
const BAR_CH = [CHORD_E, CHORD_E, CHORD_A, CHORD_E, CHORD_E, CHORD_E, CHORD_A, CHORD_E];
const TRK = {
  title: { bpm: 104, root: 0, lead: 'triangle', file: 'music/title.mp3' },
  l1: { bpm: 152, root: 0, lead: 'square', file: 'music/level1.mp3' },
  l2: { bpm: 144, root: -2, lead: 'square', file: 'music/level2.mp3' },
  l3: { bpm: 168, root: 2, lead: 'square', file: 'music/level3.mp3' },
  l4: { bpm: 176, root: -4, lead: 'sawtooth', file: 'music/boss.mp3' },
  l5: { bpm: 160, root: 5, lead: 'square', file: 'music/level5.mp3' },
  l6: { bpm: 138, root: 0, lead: 'triangle', file: 'music/level6.mp3' },
  l7: { bpm: 150, root: -3, lead: 'square', file: 'music/level7.mp3' },
  l8: { bpm: 156, root: 7, lead: 'sine', file: 'music/level8.mp3' },
  win: { bpm: 132, root: 3, lead: 'triangle', file: 'music/win.mp3' },
};
const Chip = {
  timer: null, step: 0, nextT: 0, tr: null, mel: [], gain: null,
  start(k) {
    if (!Snd.ctx) return; this.stop();
    this.tr = TRK[k];
    const A = expandBars(HN_BARS, 0), B = expandBars(HN_BARS_B, 0);
    this.mel = [].concat(...A, ...B);
    this.gain = Snd.ctx.createGain(); this.gain.gain.value = Snd.muted ? 0 : 1; this.gain.connect(Snd.master);
    this.step = 0; this.nextT = Snd.ctx.currentTime + .08;
    this.timer = setInterval(() => this.tick(), 60);
  },
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; if (this.gain) { try { this.gain.disconnect(); } catch (e) { } this.gain = null; } },
  tick() {
    const c = Snd.ctx, spb = 60 / this.tr.bpm / 2;
    if (!c || !this.gain) return;
    while (this.nextT < c.currentTime + .3) { this.play(this.step, this.nextT, spb); this.step = (this.step + 1) % 64; this.nextT += spb; }
  },
  osc(f, t, dur, type, vol, det) {
    const c = Snd.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f; if (det) o.detune.value = det;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + dur + .02);
  },
  hz(n) { return 440 * Math.pow(2, (this.tr.root + n) / 12); },
  play(s, t, spb) {
    const bar = Math.floor(s / 8), st = s % 8, ch = BAR_CH[bar], m = this.mel[s];
    if (m !== null && m !== '~') {
      let len = 1; for (let i = s + 1; i < 64 && this.mel[i] === '~'; i++) len++;
      const lead = this.tr.lead, dur = spb * len * .92;
      this.osc(this.hz(m), t, dur, lead, lead === 'sawtooth' ? .05 : .075);
      this.osc(this.hz(m), t, dur, 'square', .022, 8);
    }
    if (st === 0) this.osc(this.hz(ch.bass), t, spb * 1.8, 'triangle', .28);
    if (st === 4) this.osc(this.hz(ch.fifth), t, spb * 1.8, 'triangle', .24);
    if (st === 2 || st === 6) for (const n of ch.tri) this.osc(this.hz(n), t, spb * .8, 'square', .03);
    if (st === 0 || st === 4) this.osc(95, t, .12, 'sine', .3);
    if (st === 2 || st === 6) {
      const c = Snd.ctx, n = Math.floor(c.sampleRate * .05), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = c.createBufferSource(), g = c.createGain(); g.gain.value = .07; src.buffer = buf; src.connect(g); g.connect(this.gain); src.start(t);
    }
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
  { name: 'החוף', bg: 'bg5', music: 'l5', time: 270, theme: 'h', seed: 53,
    seq: ['flat', 'blocks', 'dune', 'spring', 'pit', 'awn', 'gaunt', 'crates', 'myst', 'pit', 'rest', 'awn2', 'hill', 'gaunt', 'spring', 'pit', 'stairs', 'gaunt', 'myst', 'flat'],
    story: 'הסיר ברח לחוף הים. סרטנים עם גישה, שחפים עם תוכניות וכדורי חוף שמתגלגלים בדיוק עליך. יוסי, תוריד נעליים רק בשבת. רוץ על החול, קפוץ על הקפיצים ותמשיך.' },
  { name: 'מירון', bg: 'bg6', music: 'l6', time: 280, theme: 'g', seed: 67,
    seq: ['flat', 'bonfire', 'blocks', 'pit', 'fires', 'awn', 'gaunt', 'bonfire', 'hill', 'myst', 'rest', 'pit', 'spring', 'fires', 'awn2', 'gaunt', 'bonfire', 'pit', 'crates', 'gaunt'],
    story: 'ל"ג בעומר, הלילה של המדורות. הסיר החליט שהוא חלק מהאירוע והתיישב על מדורה. תיזהר מהלהבות, אי אפשר לקפוץ עליהן. תקפוץ מעליהן, ותמשיך לרוץ.' },
  { name: 'בית המדרש', bg: 'bg7', music: 'l7', time: 290, theme: 'z', seed: 79,
    seq: ['flat', 'shelf', 'blocks', 'pit', 'crates', 'awn', 'gaunt', 'myst', 'shelf', 'hill', 'rest', 'pit', 'awn2', 'stairs', 'gaunt', 'spring', 'shelf', 'pit', 'myst', 'gaunt'],
    story: 'הסיר נכנס לבית המדרש כדי להתחבא בין הספרים. הספרים התעוררו והם לא אוהבים שמפריעים להם באמצע הלימוד. שששש, ותקפצו על הדפים הכועסים.' },
  { name: 'נמל התעופה', bg: 'bg8', music: 'l8', time: 300, theme: 'a', seed: 91,
    seq: ['flat', 'gate', 'blocks', 'pit', 'crates', 'gaunt', 'awn2', 'myst', 'dump', 'gate', 'rest', 'pit', 'spring', 'gaunt', 'hill', 'awn', 'pit', 'stairs', 'myst', 'gaunt'],
    story: 'הסיר קנה כרטיס לשער 42 בלי לשאול אף אחד. מזוודות עצבניות, רחפנים בביקורת ביטחון וקרוניות כבודה שנוסעות ישר עליך. תעבור בדיקה ותתפוס אותו לפני ההמראה.' },
  { name: 'ענני שבת', bg: 'bg9', music: 'l8', time: 320, theme: 'k', seed: 103,
    seq: ['flat', 'sky1', 'sky2', 'sky3', 'sky1', 'sky2', 'sky3', 'sky1', 'sky2', 'sky3', 'rest', 'sky1', 'sky3', 'sky2', 'sky1', 'sky3', 'sky2', 'sky1', 'sky3', 'flat'],
    story: 'הסיר עלה לשמיים ויוסי אחריו, מענן לענן. למטה אין כלום, למעלה רק ענני סערה עם מזג. אל תסתכל למטה, תסתכל על הנרות. השבת ממש קרובה.' },
  { name: 'הגג', bg: 'bg4', music: 'l4', time: 300, boss: true, theme: 'b', seed: 41,
    story: 'השמש נוגעת באופק. הסיר גדל לגודל של שני טנדרים, חם, עצבני ומתבשל. קפצו עליו חמש פעמים כדי להרגיע אותו ולהחזיר אותו הביתה. אפשר גם לזרוק עליו חלות.' },
];
const THEME = {
  n: { dirt: '#8a6a48', top: '#7ccf4f', hi: '#a6ec74', line: '#8a6a3e' },
  m: { dirt: '#9a6a44', top: '#e9a94c', hi: '#ffd37a', line: '#7b4a2a' },
  w: { dirt: '#7a3b66', top: '#efc44f', hi: '#fff0a0', line: '#3d1a38' },
  b: { dirt: '#8a4a3c', top: '#e0662c', hi: '#ffb072', line: '#3e1c18' },
  h: { dirt: '#e6c27a', top: '#f4dc9a', hi: '#fff1c4', line: '#b08a48', d0: '#c9a060', d1: '#9a7440', spr: false, a1: '#ff6a6a', a2: '#ffffff' },
  g: { dirt: '#3a3550', top: '#6a8a5a', hi: '#9ac07a', line: '#17142a', d0: '#2b2640', d1: '#14102a', spr: false, a1: '#7a4a2a', a2: '#c98a58' },
  z: { dirt: '#6a4528', top: '#b8864a', hi: '#e0b070', line: '#2e1a0c', d0: '#4a2e18', d1: '#2a180c', spr: false, a1: '#7a2a2a', a2: '#e6c070' },
  a: { dirt: '#6a7488', top: '#aab4c8', hi: '#dfe6f4', line: '#2a3040', d0: '#505a6e', d1: '#2c3342', spr: false, a1: '#2f7de1', a2: '#ffffff' },
  k: { dirt: '#cfd9f5', top: '#ffffff', hi: '#ffffff', line: '#98aee0', d0: '#e4ecff', d1: '#b4c4ee', spr: false, cloud: true, a1: '#ffffff', a2: '#cfe0ff' },
};
const CH = {
  flat: ['..............', '..............', '..............', '..............', '....ooo.......', '.........E....', '##############', '##############'],
  blocks: ['..............', '...ooooo......', '..............', '...?B?B?......', '..............', '.........E....', '##############', '##############'],
  pit: ['..............', '..............', '..............', '..............', '....ooooo.....', '..............', '#####...######', '#####...######'],
  stairs: ['..............', '..............', '..............', '..........E...', '..........BB..', '......BB..BB..', '##############', '##############'],
  dump: ['..............', '..............', '..............', '...oo.....oo..', '..DD......DD..', '..DD...E..DD..', '##############', '##############'],
  awn: ['..............', '..............', '..............', '...ooo..ooo...', '...AAA..AAA...', '..............', '##..........##', '##....W.....##'],
  gaunt: ['..............', '..............', '...........Y..', '..............', '..oo...oo.....', '.....E....E...', '##############', '##############'],
  crates: ['..............', '..............', '........c.....', '........C.....', '....C...C.....', '....C...CC.E..', '##############', '##############'],
  myst: ['..............', '...o..o..o....', '..............', '...?..?..?....', '..............', '...E.......E..', '##############', '##############'],
  awn2: ['..............', '.......ocoo...', '......AAAA....', '..............', '..AAAA........', '..........E...', '##############', '##############'],
  rest: ['..............', '..............', '..............', '..............', '.....oooo.....', '......c.......', '##############', '##############'],
  hill: ['..............', '..............', '......ooo.....', '.......E......', '......####....', '....########..', '##############', '##############'],
  dune: ['..............', '..............', '....ooo..ooo..', '.....E........', '....####..E...', '..#########...', '##############', '##############'],
  spring: ['.......ooo....', '.......ccc....', '.......AAA....', '..............', '..............', '.....E........', '####S#########', '##############'],
  bonfire: ['..............', '..............', '..............', '...oo.....oo..', '..............', '....H.....H...', '##############', '##############'],
  fires: ['..............', '..............', '.....ooooo....', '..............', '....AAAAAA....', '...H......E.H.', '##############', '##############'],
  shelf: ['..............', '..............', '..............', '....ooo.......', '...AAAAAA.....', '.CC.......E...', '##############', '##############'],
  gate: ['..............', '..............', '..oo......oo..', '..BBB....BBB..', '..............', '......E.......', '##############', '##############'],
  sky1: ['..............', '..............', '.....ooo...o..', '.....AAAA.....', '..E...........', '.AAA.....AAA..', '..............', '..............'],
  sky2: ['..............', '......ooo.....', '..........ooo.', '..E.........E.', '.AAA..AAA.AAA.', '..............', '..............', '..............'],
  sky3: ['..............', '..............', '........ooo...', '....AAA..AAA..', '..............', '.AA..........A', '..............', '..............'],
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
  crab: { spr: 'enemies_8', h: 56, w: 58, hh: 40, beh: 'walk', sp: 100 },
  gull: { spr: 'enemies_9', h: 70, w: 52, hh: 46, beh: 'fly', sp: 110 },
  ball: { spr: 'enemies_10', h: 58, w: 52, hh: 48, beh: 'roll', sp: 190 },
  flame: { spr: 'enemies_11', h: 78, w: 40, hh: 58, beh: 'static', hazard: true, sp: 0 },
  spark: { spr: 'enemies_11', h: 56, w: 36, hh: 44, beh: 'hop', sp: 110 },
  book: { spr: 'enemies_12', h: 62, w: 66, hh: 44, beh: 'fly', sp: 100 },
  case: { spr: 'enemies_13', h: 78, w: 46, hh: 62, beh: 'walk', sp: 90 },
  drone: { spr: 'enemies_14', h: 56, w: 70, hh: 40, beh: 'fly', sp: 125 },
  storm: { spr: 'enemies_15', h: 74, w: 60, hh: 54, beh: 'fly', sp: 95 },
};
const TH = {
  n: { E: ['cat', 'cat', 'cart'], Y: ['pigeon'], W: ['herring'] },
  m: { E: ['pickle', 'pickle', 'falafel'], Y: ['pigeon'], W: ['herring'] },
  w: { E: ['mop', 'cat', 'falafel'], Y: ['kugel'], W: ['herring'] },
  h: { E: ['crab', 'crab', 'ball'], Y: ['gull'], W: ['herring'], H: ['flame'] },
  g: { E: ['cat', 'spark', 'spark'], Y: ['pigeon'], W: ['herring'], H: ['flame'] },
  z: { E: ['mop', 'cat', 'pickle'], Y: ['book'], W: ['herring'], H: ['flame'] },
  a: { E: ['case', 'case', 'cart'], Y: ['drone'], W: ['herring'], H: ['flame'] },
  k: { E: ['cat', 'mop', 'cat'], Y: ['storm'], W: ['herring'], H: ['flame'] },
};
const POPS = ['בום!', 'סליחה!', 'יאללה!', 'בתיאבון!', 'אחי נו!', 'פאף!'];
const QUIPS = ['אוי ויי', 'רגע, שכחתי את הכובע', 'זה לא היה בתוכנית', 'הסיר צוחק עליך'];
const IDLEL = ['איפה הצ\'ולנט שלי?', 'השעה עוברת...', 'אני רעב', 'רגע, הסיר שם?'];
const SOLID = '#BC?UDS';
const isSolidCh = ch => SOLID.indexOf(ch) >= 0;

/* ---------- state ---------- */
let state = 'loading', loadP = 0, cfgI = 0, L = null, P = null, cam = 0, camT = 0;
let lives = 3, coins = 0, score = 0, coinsAtStart = 0, scoreAtStart = 0, best = 0;
let particles = [], popups = [], shake = 0, tAll = 0, stateT = 0, boss = null, shots = [], beans = [];
let stats = null, paused = false, deadQuip = '', carryTier = 0;
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
    else if (ch === 'E' || ch === 'Y' || ch === 'W' || ch === 'H') {
      const kind = th[ch][Math.floor(r() * th[ch].length)];
      out.enemies.push(mkEnemy(kind, x, yb)); g[rr][c] = '.';
    }
    else if (ch === '?') {
      let t = 'coin'; const q = r();
      if (firstBox) t = 'cholent'; else if (q < .4) t = 'coin'; else if (q < .52) t = 'coffee'; else if (q < .92) t = 'cholent'; else t = 'hat';
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
  P = { x: L.start.x, y: L.start.y, vx: 0, vy: 0, w: 40, h: 88, dir: 1, onGround: false, coyote: 0, buf: 0, anim: 0, sup: false, tier: 0, rs: 1, pop: 0, rg: null, inv: 0, boost: 0, dead: false, deadT: 0, idle: 0, say: '', sayT: 0, won: false, prevB: L.start.y, squash: 0 };
  if (i === 0 && !keepRetry) carryTier = 0;
  setTier(carryTier, true);
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
  P = { x: L.start.x, y: L.start.y, vx: 0, vy: 0, w: 40, h: 88, dir: 1, onGround: false, coyote: 0, buf: 0, anim: 0, sup: false, tier: 0, rs: 1, pop: 0, rg: null, inv: 1.5, boost: 0, dead: false, deadT: 0, idle: 0, say: '', sayT: 0, won: false, prevB: L.start.y, squash: 0 };
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
