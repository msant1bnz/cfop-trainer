// CFOP Trainer — interfaz
const L = Logic;
const VERSION = '1.0 · etapa 1';
const STORE = 'cfop.v1';

// ---------- datos
function defaultDb() {
  return { v: 1, notation: {}, quizzes: [], solves: [], settings: { inspection: false, speed: 1 } };
}
let db = load();
function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) { const d = JSON.parse(raw); return normalize(d); }
  } catch (_) {}
  return defaultDb();
}
function normalize(d) {
  const base = defaultDb();
  if (!d || typeof d !== 'object') return base;
  return {
    v: 1,
    notation: d.notation && typeof d.notation === 'object' ? d.notation : {},
    quizzes: Array.isArray(d.quizzes) ? d.quizzes : [],
    solves: Array.isArray(d.solves) ? d.solves.filter(s => s && typeof s.ms === 'number') : [],
    settings: Object.assign(base.settings, d.settings || {}),
  };
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(db)); } catch (_) {} }

// ---------- estado temporal
const ui = {
  tab: 'aprender', sub: null, from: null,
  nota: { move: 'R', suf: '' },
  quizCfg: { mode: 'ver', pool: 'caras', n: 20 },
  quiz: null,
  scr: L.scramble(),
  timer: null, // {phase:'idle'|'hold'|'ready'|'insp'|'run', ...}
  sheet: null,
  toast: null,
};
let cube = null;
function getCube() {
  if (!cube) cube = new Cube3D({ size: 50 });
  cube.speed = db.settings.speed || 1;
  return cube;
}

// ---------- utilidades
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pretty = m => esc(m).replace(/'/g, '′');
const $ = s => document.querySelector(s);

const IC = {
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M8 7h7"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/>',
  gear: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4h4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  shuffle: '<path d="M4 7h3c4 0 6 10 10 10h3"/><path d="M4 17h3c1.5 0 2.7-1.4 3.7-3.2"/><path d="M13.3 10.2C14.3 8.4 15.5 7 17 7h3"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
};
const ic = (n, s = 22, sw = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

function relDate(ts) {
  const d = new Date(ts), now = new Date();
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const hm = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diff === 0) return 'Hoy ' + hm;
  if (diff === 1) return 'Ayer ' + hm;
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) + ' ' + hm;
}

// ---------- notación: progreso
const FACE_VARIANTS = L.allVariants(L.FACE_MOVES);
function masteredCount(list = FACE_VARIANTS) { return list.filter(m => L.moveMastered(db.notation[m])).length; }
function notationDone() { return masteredCount() >= FACE_VARIANTS.length; }

// ---------- navegación
const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastScreenKey = '';
function nav(fn, dir) {
  if (cube) cube.stop();
  const run = () => { fn(); render(true, dir); };
  if (document.startViewTransition && !reduceMotion()) {
    if (dir) document.documentElement.dataset.nav = dir;
    const t = document.startViewTransition(run);
    t.finished.finally(() => { delete document.documentElement.dataset.nav; });
  } else run();
}
function go(sub) { nav(() => { ui.from = ui.sub; ui.sub = sub; window.scrollTo(0, 0); }, 'push'); }
function back(to = null) { nav(() => { ui.sub = to; ui.quiz = null; window.scrollTo(0, 0); }, 'pop'); }
function setTab(t) {
  if (t === ui.tab && !ui.sub) return;
  nav(() => { ui.tab = t; ui.sub = null; ui.quiz = null; window.scrollTo(0, 0); }, null);
}

// ---------- toast y diálogos
let toastTimer = null;
function toast(msg) {
  ui.toast = msg;
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.style.display = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2200);
}
let sheetResolve = null;
function ask({ title, text = '', buttons }) {
  return new Promise(res => {
    sheetResolve = res;
    ui.sheet = { kind: 'ask', title, text, buttons };
    renderSheet();
  });
}
function closeSheet(val) {
  const s = $('.sheet'), sc = $('.scrim');
  const r = sheetResolve; sheetResolve = null;
  if (s && !reduceMotion()) { s.classList.add('closing'); sc && sc.classList.add('closing'); }
  setTimeout(() => { ui.sheet = null; renderSheet(); if (r) r(val); }, reduceMotion() ? 0 : 200);
}
function renderSheet() {
  let host = $('#sheethost');
  if (!host) { host = document.createElement('div'); host.id = 'sheethost'; document.body.appendChild(host); }
  const s = ui.sheet;
  if (!s) { host.innerHTML = ''; return; }
  let inner = '';
  if (s.kind === 'ask') {
    inner = `<h2 id="shT">${esc(s.title)}</h2>${s.text ? `<p class="muted">${esc(s.text)}</p>` : ''}
      <div class="col" style="gap:8px">${s.buttons.map((b, i) => `<button class="btn ${b.kind === 'primary' ? 'primary' : ''}" style="${b.kind === 'danger' ? 'color:var(--red)' : ''}" data-act="ask" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>`;
  } else if (s.kind === 'solve') {
    const sv = db.solves.find(x => x.id === s.id);
    if (!sv) { ui.sheet = null; host.innerHTML = ''; return; }
    const pen = sv.penalty === 'dnf' ? 'dnf' : sv.penalty === 2 ? '2' : '0';
    inner = `<div class="row"><div class="col"><span class="eyebrow">${esc(relDate(sv.at))}</span><b class="num" id="shT" style="font-size:44px;font-weight:300;letter-spacing:-.02em">${L.fmtSolve(sv)}</b></div></div>
      <div class="seg" role="group" aria-label="Penalización">
        <button class="${pen === '0' ? 'on' : ''}" data-act="pen" data-v="0">Normal</button>
        <button class="${pen === '2' ? 'on' : ''}" data-act="pen" data-v="2">+2</button>
        <button class="${pen === 'dnf' ? 'on' : ''}" data-act="pen" data-v="dnf">DNF</button></div>
      <div class="card" style="background:var(--card2);gap:6px"><span class="eyebrow">Mezcla</span><span class="alg scr">${pretty(sv.scr)}</span></div>
      <button class="btn danger" data-act="delSolve">${ic('trash', 20)}Borrar este tiempo</button>
      <button class="btn" data-act="closeSheet">Listo</button>`;
  }
  host.innerHTML = `<div class="scrim" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="shT"><div class="grab"></div>${inner}</div>`;
}

// ---------- pantallas
function tabbar() {
  const t = [['aprender', 'book', 'Aprender'], ['entrenar', 'target', 'Entrenar'], ['crono', 'timer', 'Cronómetro'], ['ajustes', 'gear', 'Ajustes']];
  return `<nav class="tabbar" aria-label="Pestañas">${t.map(([id, i, l]) => `<button class="${ui.tab === id ? 'on' : ''}" data-act="tab" data-v="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}>${ic(i, 26)}<span>${l}</span></button>`).join('')}</nav>`;
}
function navbar(label, right = '') {
  return `<div class="nav"><button class="btn ghost" data-act="back">${ic('back', 22)}${esc(label)}</button><span class="muted small num">${right}</span></div>`;
}

function viewHome() {
  const n = masteredCount(), total = FACE_VARIANTS.length;
  const stages = [
    { id: 'nota', ab: 'Aa', col: '#8E8E93', name: 'Notación', sub: 'R, U′, F2… y giros del cubo', prog: `${n} de ${total}`, pct: n / total * 100, ready: true, done: notationDone() },
    { ab: '+', col: '#FFFFFF', name: 'Cross', sub: 'La cruz blanca, intuitiva' },
    { ab: 'F2L', col: '#30D158', name: 'F2L', sub: '41 casos' },
    { ab: 'O2', col: '#FFD60A', name: 'OLL en 2 pasos', sub: '10 algoritmos' },
    { ab: 'P2', col: '#FF9F0A', name: 'PLL en 2 pasos', sub: '6 algoritmos' },
    { ab: 'OLL', col: '#FFD60A', name: 'OLL completo', sub: '57 casos', locked: true },
    { ab: 'PLL', col: '#FF9F0A', name: 'PLL completo', sub: '21 casos', locked: true },
  ];
  const rows = stages.map(s => {
    if (s.ready) return `<button class="li" data-act="go" data-v="nota"><span class="badge" style="background:${s.col}">${s.ab}</span>
      <span class="grow"><span class="row"><span style="font-weight:600">${s.name}</span><span class="sub num">${s.prog}</span></span><span class="bar"><i style="width:${s.pct}%"></i></span></span>
      <span class="chev" style="${s.done ? 'color:var(--green)' : ''}">${ic(s.done ? 'check' : 'chev', 20, s.done ? 2.2 : 1.8)}</span></button>`;
    return `<div class="li" aria-disabled="true"><span class="badge off">${s.ab}</span>
      <span class="grow"><span style="font-weight:600;color:var(--muted)">${s.name}</span><span class="sub">${s.locked ? 'Se abre al dominar la versión en 2 pasos' : s.sub + ' · próxima versión'}</span></span>
      <span class="chev">${s.locked ? ic('lock', 18) : ''}</span></div>`;
  }).join('');
  const cont = notationDone()
    ? `<p class="eyebrow">Notación lista</p><h2>Dominaste los 18 giros de caras</h2><span class="muted small">Sigue practicando las capas del medio y los giros del cubo. Cross llega en la próxima versión.</span><button class="btn primary" data-act="go" data-v="quiz">Practicar notación</button>`
    : `<p class="eyebrow">Continuar</p><div class="row"><div class="col"><h2>Notación</h2><span class="muted small">Aprende a leer los algoritmos</span></div><span class="muted small num">${n} de ${total}</span></div><button class="btn primary" data-act="go" data-v="nota">Seguir aprendiendo</button>`;
  return `<div class="screen">
    <p class="eyebrow">CFOP Trainer</p>
    <h1>Aprender</h1>
    <div class="card">${cont}</div>
    <p class="eyebrow">Tu ruta</p>
    <div class="list">${rows}</div>
    <p class="muted small">Esta primera versión trae la notación y el cronómetro. Cross, F2L, OLL y PLL llegan en las próximas.</p>
  </div>${tabbar()}`;
}

function viewNotation() {
  const { move, suf } = ui.nota;
  const full = move + suf;
  const [name, desc] = L.MOVE_INFO[move];
  const groups = L.NOTATION_GROUPS.map(g => `<p class="eyebrow">${g.title}</p>
    <div class="notegrid">${g.moves.map(m => {
      const done = ['', "'", '2'].every(s => L.moveMastered(db.notation[m + s]));
      return `<button class="chip ${m === move ? 'on' : done ? 'done' : ''}" data-act="pickMove" data-v="${m}" aria-pressed="${m === move}">${m}</button>`;
    }).join('')}</div>`).join('');
  return `<div class="screen">
    ${navbar(ui.tab === 'aprender' ? 'Aprender' : 'Volver')}
    <h1>Notación</h1>
    <div class="card" style="gap:12px;padding-top:8px">
      <div class="cubebox" id="cubeMount"><span class="cube-hint">Arrastra para girar · doble toque para centrar</span></div>
      <div class="row" style="align-items:flex-end"><div style="display:flex;align-items:baseline;gap:12px"><b class="bigmove alg">${pretty(full)}</b><span class="muted">${esc(name)}</span></div>
        <button class="iconbtn" style="background:var(--card2)" data-act="replay" aria-label="Repetir el giro">${ic('replay', 22)}</button></div>
      <div class="seg" role="group" aria-label="Variante">
        <button class="${suf === '' ? 'on' : ''}" data-act="pickSuf" data-v="">${move}</button>
        <button class="${suf === "'" ? 'on' : ''}" data-act="pickSuf" data-v="'">${move}′ al revés</button>
        <button class="${suf === '2' ? 'on' : ''}" data-act="pickSuf" data-v="2">${move}2 doble</button></div>
      <p style="font-size:15px;color:#EBEBF5">${esc(desc)} <span class="muted">${esc(L.suffixText(suf))}</span></p>
    </div>
    ${groups}
    <div class="card" style="gap:8px"><p class="eyebrow">Para recordar</p>
      <span style="font-size:15px">Cada letra es una cara: <b>R</b> derecha, <b>L</b> izquierda, <b>U</b> arriba, <b>D</b> abajo, <b>F</b> frente, <b>B</b> atrás. Sola es horario mirando esa cara de frente; con <b>′</b> es al revés y con <b>2</b> es media vuelta.</span></div>
    <button class="btn primary" data-act="go" data-v="quiz">Practicar notación</button>
  </div>${tabbar()}`;
}

function poolMoves(pool) {
  if (pool === 'caras') return FACE_VARIANTS;
  if (pool === 'medio') return L.allVariants([...L.FACE_MOVES, 'M', 'E', 'S']);
  return L.allVariants(L.NOTATION_GROUPS.flatMap(g => g.moves));
}
function startQuiz() {
  const pool = poolMoves(ui.quizCfg.pool);
  const qs = [];
  for (let i = 0; i < ui.quizCfg.n; i++) {
    let m, tries = 0;
    do {
      const weights = pool.map(x => L.moveMastered(db.notation[x]) ? 1 : 3);
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      m = pool[weights.findIndex(w => (r -= w) < 0)] || pool[0];
    } while (qs.length && qs[qs.length - 1] === m && tries++ < 10);
    qs.push(m);
  }
  ui.quiz = { mode: ui.quizCfg.mode, pool, qs, i: 0, ok: 0, wrong: [], answered: null, opts: null, revealed: false };
  prepQuestion();
}
function prepQuestion() {
  const q = ui.quiz; const m = q.qs[q.i];
  q.answered = null; q.revealed = false;
  q.opts = q.mode === 'ver' ? L.quizOptions(m, q.pool) : null;
}
function recordAnswer(move, ok) {
  const r = db.notation[move] || (db.notation[move] = { n: 0, ok: 0, streak: 0 });
  r.n++; if (ok) { r.ok++; r.streak++; } else r.streak = 0;
  save();
}
function viewQuiz() {
  const q = ui.quiz;
  if (!q) {
    const c = ui.quizCfg;
    return `<div class="screen">
      ${navbar('Volver')}
      <h1>Practicar notación</h1>
      <div class="card"><p class="eyebrow">Modo</p>
        <div class="seg" role="group" aria-label="Modo">
          <button class="${c.mode === 'ver' ? 'on' : ''}" data-act="cfg" data-k="mode" data-v="ver">Ver el giro → letra</button>
          <button class="${c.mode === 'hacer' ? 'on' : ''}" data-act="cfg" data-k="mode" data-v="hacer">Letra → hacerlo</button></div>
        <span class="muted small">${c.mode === 'ver' ? 'El cubo hace un giro y eliges qué letra es.' : 'Ves una letra, la haces en tu cubo y después compruebas con la animación.'}</span>
        <p class="eyebrow">Giros</p>
        <div class="seg" role="group" aria-label="Giros">
          <button class="${c.pool === 'caras' ? 'on' : ''}" data-act="cfg" data-k="pool" data-v="caras">Caras</button>
          <button class="${c.pool === 'medio' ? 'on' : ''}" data-act="cfg" data-k="pool" data-v="medio">+ M E S</button>
          <button class="${c.pool === 'todo' ? 'on' : ''}" data-act="cfg" data-k="pool" data-v="todo">Todo</button></div>
        <p class="eyebrow">Preguntas</p>
        <div class="seg" role="group" aria-label="Cantidad">
          ${[10, 20, 30].map(n => `<button class="${c.n === n ? 'on' : ''}" data-act="cfg" data-k="n" data-v="${n}">${n}</button>`).join('')}</div>
      </div>
      <div class="list"><div class="li"><span class="grow"><span>Giros de caras dominados</span><span class="sub">Un giro queda dominado con 3 aciertos seguidos</span></span><b class="num">${masteredCount()} / 18</b></div></div>
      <button class="btn primary" data-act="startQuiz">Empezar</button>
    </div>${ui.tab === 'aprender' || ui.tab === 'entrenar' ? tabbar() : ''}`;
  }
  if (q.i >= q.qs.length) {
    const pct = Math.round(q.ok / q.qs.length * 100);
    const wrong = [...new Set(q.wrong)];
    return `<div class="screen">
      ${navbar('Volver')}
      <p class="eyebrow">Resultado</p>
      <h1 class="num">${q.ok} de ${q.qs.length}</h1>
      <div class="bar"><i style="width:${pct}%"></i></div>
      ${wrong.length ? `<div class="card"><p class="eyebrow">Para repasar</p><div class="chips">${wrong.map(m => `<button class="chip alg" data-act="study" data-v="${esc(m)}">${pretty(m)}</button>`).join('')}</div><span class="muted small">Toca uno para verlo en la guía.</span></div>`
        : `<div class="banner">${ic('check', 22, 2.2)}<span>Sin errores. Los giros que aciertas 3 veces seguidas quedan dominados.</span></div>`}
      <div class="list"><div class="li"><span class="grow">Giros de caras dominados</span><b class="num">${masteredCount()} / 18</b></div></div>
      <button class="btn primary" data-act="startQuiz">Otra ronda</button>
      <button class="btn" data-act="quizSetup">Cambiar modo</button>
    </div>`;
  }
  const m = q.qs[q.i];
  const head = `${navbar('Salir', `${q.i + 1} de ${q.qs.length} · ${q.ok} bien`)}
    <div class="bar"><i style="width:${q.i / q.qs.length * 100}%"></i></div>`;
  if (q.mode === 'ver') {
    const opts = q.opts.map(o => {
      let cls = '';
      if (q.answered) { if (o === m) cls = 'ok'; else if (o === q.answered) cls = 'bad'; }
      return `<button class="btn alg ${cls}" data-act="answer" data-v="${esc(o)}" ${q.answered ? 'disabled style="opacity:1"' : ''}>${pretty(o)}</button>`;
    }).join('');
    return `<div class="screen" style="gap:14px">${head}
      <h1>¿Qué giro es?</h1>
      <div class="card" style="gap:8px;padding-top:8px">
        <div class="cubebox sm" id="cubeMount"></div>
        <button class="btn" data-act="qReplay">${ic('replay', 20)}Ver de nuevo</button></div>
      <div class="qopts">${opts}</div>
      ${q.answered && q.answered !== m ? `<p class="small center" style="color:#EBEBF5">Era <b>${pretty(m)}</b>. ${esc(L.MOVE_INFO[L.parseMove(m).base][1])} <span class="muted">${esc(L.suffixText(m.slice(L.parseMove(m).base.length)))}</span></p><button class="btn primary" data-act="next">Siguiente</button>`
        : `<p class="muted small center">Fíjate en qué cara se mueve y hacia dónde, mirándola de frente.</p>`}
    </div>`;
  }
  return `<div class="screen" style="gap:14px">${head}
    <h1>Hazlo en tu cubo</h1>
    <div class="card" style="align-items:center;gap:6px">
      <b class="bigmove alg" style="font-size:88px">${pretty(m)}</b>
      <span class="muted">${esc(L.MOVE_INFO[L.parseMove(m).base][0])}</span></div>
    ${q.revealed ? `<div class="card" style="gap:8px;padding-top:8px"><div class="cubebox sm" id="cubeMount"></div>
        <button class="btn" data-act="qReplay">${ic('replay', 20)}Ver de nuevo</button></div>
      <div class="grid2"><button class="btn" style="color:var(--red)" data-act="selfGrade" data-v="0">${ic('x', 20)}Me equivoqué</button>
        <button class="btn primary" style="min-height:48px" data-act="selfGrade" data-v="1">${ic('check', 20, 2.2)}Me salió</button></div>`
      : `<p class="muted small center">Parte con el cubo armado, amarillo arriba y verde al frente.</p>
         <button class="btn primary" data-act="reveal">Mostrar cómo es</button>`}
  </div>`;
}

function viewTrain() {
  const last = db.quizzes[db.quizzes.length - 1];
  const soon = (ab, col, name, sub) => `<div class="li" aria-disabled="true"><span class="badge off">${ab}</span><span class="grow" style="gap:2px"><span style="font-weight:600;color:var(--muted)">${name}</span><span class="sub">${sub} · próxima versión</span></span></div>`;
  return `<div class="screen">
    <p class="eyebrow">CFOP Trainer</p>
    <h1>Entrenar</h1>
    <div class="card">
      <p class="eyebrow">Notación</p>
      <div class="row"><div class="col"><h2 class="num">${masteredCount()} de 18</h2><span class="muted small">giros de caras dominados${last ? ` · última ronda ${last.ok}/${last.total}` : ''}</span></div></div>
      <button class="btn primary" data-act="go" data-v="quiz">Practicar notación</button>
    </div>
    <p class="eyebrow">Por etapa</p>
    <div class="list">
      ${soon('+', '#fff', 'Cross', 'Mezcla real, inspección y solución más corta')}
      ${soon('F2L', '#30D158', 'F2L', 'Casos con repetición espaciada')}
      ${soon('OLL', '#FFD60A', 'OLL', 'Primero en 2 pasos')}
      ${soon('PLL', '#FF9F0A', 'PLL', 'Primero en 2 pasos')}
    </div>
    <button class="btn tint" data-act="tab" data-v="crono">${ic('timer', 20)}Ir al cronómetro</button>
  </div>${tabbar()}`;
}

function viewCrono() {
  const sv = db.solves;
  const last = sv[0];
  const best = L.bestOf(sv), a5 = L.avgOf(sv, 5), a12 = L.avgOf(sv, 12);
  const t = ui.timer;
  const phase = t ? t.phase : 'idle';
  const shown = last && !t ? L.fmtSolve(last) : '0,00';
  const list = sv.slice(0, 100).map(s => {
    const isBest = best !== null && L.effTime(s) === best;
    return `<button class="li" data-act="solve" data-v="${s.id}" style="min-height:48px"><span class="num" style="font-weight:600;${isBest ? 'color:var(--gold)' : ''}">${L.fmtSolve(s)}</span><span class="grow"></span><span class="sub">${esc(relDate(s.at))}</span></button>`;
  }).join('');
  return `<div class="screen" style="gap:14px">
    <p class="eyebrow">CFOP Trainer</p>
    <h1>Cronómetro</h1>
    <div class="card" style="gap:8px">
      <div class="row"><p class="eyebrow">Mezcla</p><button class="btn ghost" style="min-height:36px;font-size:15px" data-act="newScr">${ic('shuffle', 18)}Otra</button></div>
      <span class="alg num scr">${pretty(ui.scr)}</span>
      <span class="muted xs">Amarillo arriba · verde al frente</span>
    </div>
    <div class="timer-zone ${phase === 'hold' ? 'hold' : phase === 'ready' ? 'ready' : ''}" id="tzone" role="button" tabindex="0" aria-label="Cronómetro: mantén presionado y suelta para partir">
      <b class="timer-big" id="tbig">${shown}</b>
      <span class="muted small">${db.settings.inspection ? 'Toca para empezar la inspección de 15 s' : 'Mantén el dedo aquí y suelta para partir'}</span>
    </div>
    ${last ? `<div class="row" style="justify-content:center;gap:8px">
      <button class="btn sm" data-act="lastPen" data-v="2" aria-pressed="${last.penalty === 2}" style="${last.penalty === 2 ? 'background:#fff;color:#000' : ''}">+2</button>
      <button class="btn sm" data-act="lastPen" data-v="dnf" aria-pressed="${last.penalty === 'dnf'}" style="${last.penalty === 'dnf' ? 'background:#fff;color:#000' : ''}">DNF</button>
      <button class="btn sm" data-act="solve" data-v="${last.id}">Detalle</button></div>` : ''}
    <div class="grid3">
      <div class="stat"><span>Mejor</span><b class="num" style="${best !== null ? 'color:var(--gold)' : ''}">${best === null ? '—' : L.fmtTime(best)}</b></div>
      <div class="stat"><span>Prom. 5</span><b class="num">${a5 === null ? '—' : L.fmtTime(a5)}</b></div>
      <div class="stat"><span>Prom. 12</span><b class="num">${a12 === null ? '—' : L.fmtTime(a12)}</b></div>
    </div>
    ${sv.length ? `<div class="row"><p class="eyebrow">Armadas</p><span class="sub num">${sv.length}</span></div><div class="list">${list}</div>` : `<p class="muted small center">Aquí aparecerán tus tiempos.</p>`}
  </div>${tabbar()}`;
}

function viewSettings() {
  const s = db.settings;
  return `<div class="screen">
    <p class="eyebrow">CFOP Trainer</p>
    <h1>Ajustes</h1>
    <div class="list">
      <label class="li"><span class="grow"><span>Inspección de 15 s</span><span class="sub">En el cronómetro, como en competencias</span></span><input type="checkbox" class="switch" data-ch="insp" ${s.inspection ? 'checked' : ''} aria-label="Inspección de 15 segundos"></label>
      <div class="li" style="flex-direction:column;align-items:stretch;gap:10px;padding:12px 14px"><span>Velocidad de las animaciones</span>
        <div class="seg" role="group" aria-label="Velocidad">${[[0.6, 'Lenta'], [1, 'Normal'], [1.6, 'Rápida']].map(([v, l]) => `<button class="${s.speed === v ? 'on' : ''}" data-act="speed" data-v="${v}">${l}</button>`).join('')}</div></div>
    </div>
    <p class="eyebrow">Respaldo</p>
    <div class="list">
      <button class="li" data-act="export"><span class="grow"><span>Exportar respaldo</span><span class="sub">Archivo con todo tu avance y tus tiempos</span></span><span class="chev">${ic('up', 20)}</span></button>
      <label class="li" style="cursor:pointer"><span class="grow"><span>Importar respaldo</span><span class="sub">Reemplaza los datos de este teléfono</span></span><span class="chev">${ic('down', 20)}</span><input type="file" accept="application/json,.json" data-ch="import" style="display:none"></label>
      <button class="li" data-act="csv"><span class="grow"><span>Exportar tiempos a Excel</span><span class="sub">CSV con fecha, tiempo, penalización y mezcla</span></span><span class="chev">${ic('up', 20)}</span></button>
    </div>
    <div class="list">
      <button class="li" data-act="wipeTimes" style="color:var(--red)">Borrar tiempos</button>
      <button class="li" data-act="wipeAll" style="color:var(--red)">Borrar todos los datos</button>
    </div>
    <p class="muted small center">CFOP Trainer · versión ${VERSION}<br>Tus datos se guardan solo en este teléfono.</p>
  </div>${tabbar()}`;
}

// ---------- render
function screenKey() { return ui.tab + '/' + (ui.sub || ''); }
function render(animate = false, dir = null) {
  let html;
  if (ui.sub === 'nota') html = viewNotation();
  else if (ui.sub === 'quiz') html = viewQuiz();
  else if (ui.tab === 'aprender') html = viewHome();
  else if (ui.tab === 'entrenar') html = viewTrain();
  else if (ui.tab === 'crono') html = viewCrono();
  else html = viewSettings();
  const app = $('#app');
  app.innerHTML = html;
  const key = screenKey();
  if (animate && key !== lastScreenKey && !document.startViewTransition) {
    const first = app.firstElementChild;
    if (first) first.classList.add(dir === 'push' ? 'anim-push' : dir === 'pop' ? 'anim-pop' : 'anim-fade');
  }
  lastScreenKey = key;
  const mount = $('#cubeMount');
  if (mount) mount.prepend(getCube().el);
}

// ---------- acciones
function playNotation() {
  const c = getCube();
  c.reset();
  setTimeout(() => c.play(ui.nota.move + ui.nota.suf), 120);
}
function quizShow() {
  const q = ui.quiz; if (!q) return;
  const c = getCube(); c.reset(); c.resetView();
  setTimeout(() => c.play(q.qs[q.i]), 250);
}
function nextQuestion() {
  const q = ui.quiz;
  q.i++;
  if (q.i >= q.qs.length) {
    db.quizzes.push({ at: Date.now(), mode: q.mode, total: q.qs.length, ok: q.ok });
    if (db.quizzes.length > 200) db.quizzes = db.quizzes.slice(-200);
    save();
    render();
    return;
  }
  prepQuestion();
  render();
  if (q.mode === 'ver') quizShow();
}

const actions = {
  tab: el => setTab(el.dataset.v),
  go: el => {
    const v = el.dataset.v;
    if (v === 'quiz') ui.quiz = null;
    go(v);
    if (v === 'nota') setTimeout(playNotation, 450);
  },
  back: () => {
    if (ui.sub === 'quiz' && ui.quiz && ui.quiz.i < ui.quiz.qs.length && ui.quiz.i > 0) {
      ask({ title: '¿Salir de la práctica?', text: 'Lo que respondiste ya quedó guardado.', buttons: [{ label: 'Salir', kind: 'primary', val: 1 }, { label: 'Seguir practicando', val: 0 }] })
        .then(v => { if (v) back(ui.sub === 'quiz' && ui.from === 'nota' ? 'nota' : null); });
      return;
    }
    const to = ui.sub === 'quiz' && ui.from === 'nota' ? 'nota' : null;
    if (to === 'nota') ui.from = null;
    back(to);
  },
  pickMove: el => { ui.nota.move = el.dataset.v; render(); playNotation(); },
  pickSuf: el => { ui.nota.suf = el.dataset.v; render(); playNotation(); },
  replay: () => playNotation(),
  cfg: el => { const k = el.dataset.k; ui.quizCfg[k] = k === 'n' ? +el.dataset.v : el.dataset.v; render(); },
  startQuiz: () => { startQuiz(); render(); if (ui.quiz.mode === 'ver') quizShow(); },
  quizSetup: () => { ui.quiz = null; render(); },
  qReplay: () => quizShow(),
  answer: el => {
    const q = ui.quiz; if (!q || q.answered) return;
    const m = q.qs[q.i], a = el.dataset.v, ok = a === m;
    q.answered = a; if (ok) q.ok++; else q.wrong.push(m);
    recordAnswer(m, ok);
    render();
    if (ok) setTimeout(() => { if (ui.quiz === q && q.answered) nextQuestion(); }, 650);
  },
  next: () => nextQuestion(),
  reveal: () => { ui.quiz.revealed = true; render(); quizShow(); },
  selfGrade: el => {
    const q = ui.quiz, m = q.qs[q.i], ok = el.dataset.v === '1';
    if (ok) q.ok++; else q.wrong.push(m);
    recordAnswer(m, ok);
    nextQuestion();
  },
  study: el => {
    const m = L.parseMove(el.dataset.v);
    ui.nota.move = m.base; ui.nota.suf = m.turns === -1 ? "'" : m.turns === 2 ? '2' : '';
    ui.quiz = null; ui.from = 'quiz';
    nav(() => { ui.sub = 'nota'; window.scrollTo(0, 0); }, 'push');
    setTimeout(playNotation, 450);
  },
  newScr: () => { ui.scr = L.scramble(); render(); },
  solve: el => { ui.sheet = { kind: 'solve', id: el.dataset.v }; renderSheet(); },
  lastPen: el => {
    const s = db.solves[0]; if (!s) return;
    const v = el.dataset.v === 'dnf' ? 'dnf' : 2;
    s.penalty = s.penalty === v ? 0 : v; save(); render();
  },
  pen: el => {
    const s = db.solves.find(x => x.id === ui.sheet.id); if (!s) return;
    const v = el.dataset.v; s.penalty = v === 'dnf' ? 'dnf' : v === '2' ? 2 : 0;
    save(); renderSheet(); render();
  },
  delSolve: () => {
    const id = ui.sheet.id;
    closeSheet();
    setTimeout(() => ask({ title: '¿Borrar este tiempo?', text: 'No se puede deshacer.', buttons: [{ label: 'Borrar', kind: 'danger', val: 1 }, { label: 'Cancelar', val: 0 }] })
      .then(v => { if (v) { db.solves = db.solves.filter(x => x.id !== id); save(); render(); toast('Tiempo borrado'); } }), 230);
  },
  closeSheet: () => closeSheet(null),
  ask: el => { const b = ui.sheet.buttons[+el.dataset.i]; closeSheet(b.val); },
  speed: el => { db.settings.speed = +el.dataset.v; save(); if (cube) cube.speed = db.settings.speed; render(); },
  export: () => exportFile(`cfop-trainer-respaldo-${dateTag()}.json`, JSON.stringify(db, null, 1), 'application/json'),
  csv: () => {
    if (!db.solves.length) { toast('Aún no hay tiempos'); return; }
    const rows = [['Fecha', 'Hora', 'Tiempo (s)', 'Penalización', 'Tiempo final', 'Mezcla']];
    for (const s of [...db.solves].reverse()) {
      const d = new Date(s.at);
      rows.push([d.toLocaleDateString('es-CL'), d.toLocaleTimeString('es-CL'), (s.ms / 1000).toFixed(2).replace('.', ','),
        s.penalty === 'dnf' ? 'DNF' : s.penalty === 2 ? '+2' : '', L.fmtSolve(s), s.scr]);
    }
    const csv = '﻿' + rows.map(r => r.map(c => /[;"\n]/.test(c) ? `"${String(c).replace(/"/g, '""')}"` : c).join(';')).join('\r\n');
    exportFile(`cfop-trainer-tiempos-${dateTag()}.csv`, csv, 'text/csv');
  },
  wipeTimes: async () => {
    const n = db.solves.length;
    if (!n) { toast('No hay tiempos guardados'); return; }
    const v = await ask({ title: '¿Borrar todos los tiempos?', text: `Se borrarán ${n} ${n === 1 ? 'tiempo' : 'tiempos'}. Tu avance en notación se mantiene.`, buttons: [{ label: 'Borrar tiempos', kind: 'danger', val: 1 }, { label: 'Cancelar', val: 0 }] });
    if (!v) return;
    db.solves = []; save(); render(); toast('Tiempos borrados');
  },
  wipeAll: async () => {
    const v = await ask({ title: '¿Borrar todos los datos?', text: 'Se borra tu avance, tus prácticas y tus tiempos de este teléfono.', buttons: [{ label: 'Exportar respaldo primero', kind: 'primary', val: 'exp' }, { label: 'Borrar todo', kind: 'danger', val: 1 }, { label: 'Cancelar', val: 0 }] });
    if (v === 'exp') { actions.export(); return; }
    if (!v) return;
    const v2 = await ask({ title: '¿Seguro?', text: `Se perderán ${db.solves.length} tiempos y el avance de ${Object.keys(db.notation).length} giros. No se puede deshacer.`, buttons: [{ label: 'Sí, borrar todo', kind: 'danger', val: 1 }, { label: 'Cancelar', val: 0 }] });
    if (!v2) return;
    db = defaultDb(); save(); render(); toast('Datos borrados');
  },
};

function dateTag() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
async function exportFile(name, text, type) {
  const blob = new Blob([text], { type });
  try {
    const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function importFile(input) {
  const f = input.files && input.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d || d.v !== 1) throw new Error('formato');
    const nd = normalize(d);
    const v = await ask({ title: '¿Importar este respaldo?', text: `Trae ${nd.solves.length} tiempos y el avance de ${Object.keys(nd.notation).length} giros. Reemplaza lo que hay en este teléfono.`, buttons: [{ label: 'Importar', kind: 'primary', val: 1 }, { label: 'Cancelar', val: 0 }] });
    if (v) { db = nd; save(); render(); toast('Respaldo importado'); }
  } catch (_) { toast('Ese archivo no es un respaldo válido'); }
  input.value = '';
}

// ---------- cronómetro
let raf = null;
function timerOverlay() {
  let el = $('#tfull');
  if (!el) { el = document.createElement('div'); el.id = 'tfull'; el.className = 'timer-full'; el.setAttribute('role', 'timer'); document.body.appendChild(el); }
  return el;
}
function paintOverlay() {
  const t = ui.timer, el = timerOverlay();
  el.className = 'timer-full ' + (t.phase === 'insp' ? (t.hold ? (t.ready ? 'ready' : 'hold') : 'insp') : t.phase === 'hold' ? 'hold' : t.phase === 'ready' ? 'ready' : '');
  let big = '', hint = '';
  if (t.phase === 'insp') {
    const left = 15 - Math.floor((performance.now() - t.inspStart) / 1000);
    big = left > 0 ? String(left) : left > -2 ? '+2' : 'DNF';
    hint = t.hold ? (t.ready ? 'Suelta para partir' : 'Mantén…') : 'Inspección · mantén el dedo y suelta para partir';
  } else if (t.phase === 'run') {
    big = L.fmtTime(performance.now() - t.start);
    hint = 'Toca para detener';
  }
  el.innerHTML = `<b class="timer-big">${big}</b><span class="muted small">${hint}</span>`;
}
function loop() {
  if (!ui.timer || (ui.timer.phase !== 'run' && ui.timer.phase !== 'insp')) { raf = null; return; }
  paintOverlay();
  raf = requestAnimationFrame(loop);
}
function removeOverlay() { const el = $('#tfull'); if (el) el.remove(); }
function startRun() {
  const t = ui.timer;
  let penalty = 0;
  if (t.inspStart) {
    const used = (performance.now() - t.inspStart) / 1000;
    penalty = used > 17 ? 'dnf' : used > 15 ? 2 : 0;
  }
  ui.timer = { phase: 'run', start: performance.now(), penalty };
  paintOverlay();
  if (!raf) raf = requestAnimationFrame(loop);
}
function stopRun() {
  const t = ui.timer;
  const ms = Math.round(performance.now() - t.start);
  db.solves.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ms, penalty: t.penalty, scr: ui.scr, at: Date.now() });
  save();
  ui.timer = null; ui.scr = L.scramble();
  removeOverlay(); render();
  const prevBest = L.bestOf(db.solves.slice(1));
  if (db.solves.length > 1 && t.penalty !== 'dnf' && (prevBest === null || L.effTime(db.solves[0]) < prevBest)) toast('¡Nuevo mejor tiempo!');
}
const HOLD_MS = 350;
function timerDown(e) {
  const t = ui.timer;
  if (t && t.phase === 'run') { e.preventDefault(); suppressClickUntil = Date.now() + 400; stopRun(); return; }
  if (t && t.phase === 'insp') {
    e.preventDefault();
    t.hold = true; t.ready = false;
    clearTimeout(t.holdTimer);
    t.holdTimer = setTimeout(() => { if (ui.timer === t && t.hold) { t.ready = true; paintOverlay(); } }, HOLD_MS);
    paintOverlay();
    return;
  }
  if (!e.target.closest('#tzone')) return;
  e.preventDefault();
  if (db.settings.inspection) { ui.timer = { phase: 'armInsp' }; return; }
  ui.timer = { phase: 'hold' };
  const z = $('#tzone'); z.classList.add('hold');
  const me = ui.timer;
  me.holdTimer = setTimeout(() => { if (ui.timer === me) { me.phase = 'ready'; z.classList.remove('hold'); z.classList.add('ready'); } }, HOLD_MS);
}
function timerUp(e) {
  const t = ui.timer; if (!t) return;
  if (t.phase === 'armInsp') {
    ui.timer = { phase: 'insp', inspStart: performance.now(), hold: false };
    paintOverlay(); if (!raf) raf = requestAnimationFrame(loop);
    return;
  }
  if (t.phase === 'insp') {
    clearTimeout(t.holdTimer);
    if (t.ready) { const st = t.inspStart; startRunFromInsp(st); }
    else { t.hold = false; paintOverlay(); }
    return;
  }
  if (t.phase === 'hold') { clearTimeout(t.holdTimer); ui.timer = null; const z = $('#tzone'); if (z) z.classList.remove('hold'); return; }
  if (t.phase === 'ready') { ui.timer = { phase: 'ready' }; timerOverlay(); startRun(); }
}
function startRunFromInsp(inspStart) { ui.timer.inspStart = inspStart; startRun(); }

// ---------- eventos
let suppressClickUntil = 0;
document.addEventListener('click', e => {
  if (Date.now() < suppressClickUntil) { e.preventDefault(); e.stopPropagation(); return; }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-ch]'); if (!el) return;
  if (el.dataset.ch === 'insp') { db.settings.inspection = el.checked; save(); }
  if (el.dataset.ch === 'import') importFile(el);
});
document.addEventListener('pointerdown', e => {
  if (ui.tab === 'crono' && !ui.sub && !ui.sheet) timerDown(e);
}, { passive: false });
document.addEventListener('pointerup', e => { if (ui.tab === 'crono' && !ui.sub) timerUp(e); });
document.addEventListener('pointercancel', e => {
  const t = ui.timer;
  if (t && (t.phase === 'hold' || t.phase === 'ready' || t.phase === 'armInsp')) { ui.timer = null; render(); }
});
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || ui.tab !== 'crono' || ui.sub) return;
  e.preventDefault();
  if (ui.timer && ui.timer.phase === 'run') { stopRun(); return; }
  if (!e.repeat && !ui.timer) { ui.timer = { phase: 'ready' }; timerOverlay(); startRun(); }
});

// respuesta al tocar
const PRESS = '.btn,.iconbtn,.chip,.tabbar button,.li,.seg button';
let pressed = null, px = 0, py = 0;
document.addEventListener('pointerdown', e => {
  const el = e.target.closest(PRESS);
  if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
  pressed = el; px = e.clientX; py = e.clientY; el.classList.add('pressed');
});
document.addEventListener('pointermove', e => {
  if (pressed && Math.hypot(e.clientX - px, e.clientY - py) > 10) { pressed.classList.remove('pressed'); pressed = null; }
});
const release = () => { if (pressed) { pressed.classList.remove('pressed'); pressed = null; } };
document.addEventListener('pointerup', release);
document.addEventListener('pointercancel', release);

// arranque
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
