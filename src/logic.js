// CFOP Trainer — lógica pura (sin DOM). Se puede probar con node.
// Orientación de armado: U amarillo, D blanco, F verde, B azul, R naranjo, L rojo.
// Coordenadas: x hacia la derecha (R), y hacia arriba (U), z hacia el frente (F).

const COLORS = { U: '#FFD60A', D: '#FFFFFF', F: '#30D158', B: '#0A84FF', R: '#FF9F0A', L: '#FF453A' };
const FACE_NORMALS = { U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] };

// Cada movimiento: eje (0=x,1=y,2=z), capas afectadas (coordenada en ese eje)
// y cuartos de vuelta en sentido antihorario (regla de la mano derecha) para la versión "horaria".
const MOVE_DEFS = {
  R: { ax: 0, layers: [1], q: -1 }, L: { ax: 0, layers: [-1], q: 1 },
  U: { ax: 1, layers: [1], q: -1 }, D: { ax: 1, layers: [-1], q: 1 },
  F: { ax: 2, layers: [1], q: -1 }, B: { ax: 2, layers: [-1], q: 1 },
  M: { ax: 0, layers: [0], q: 1 }, E: { ax: 1, layers: [0], q: 1 }, S: { ax: 2, layers: [0], q: -1 },
  x: { ax: 0, layers: [-1, 0, 1], q: -1 }, y: { ax: 1, layers: [-1, 0, 1], q: -1 }, z: { ax: 2, layers: [-1, 0, 1], q: -1 },
  r: { ax: 0, layers: [0, 1], q: -1 }, l: { ax: 0, layers: [-1, 0], q: 1 },
  u: { ax: 1, layers: [0, 1], q: -1 }, d: { ax: 1, layers: [-1, 0], q: 1 },
  f: { ax: 2, layers: [0, 1], q: -1 }, b: { ax: 2, layers: [-1, 0], q: 1 },
};

function rotVec(v, ax, q) {
  let [x, y, z] = v;
  q = ((q % 4) + 4) % 4;
  for (let i = 0; i < q; i++) {
    if (ax === 0) [y, z] = [-z, y];
    else if (ax === 1) [z, x] = [-x, z];
    else [x, y] = [-y, x];
  }
  return [x, y, z];
}

function solved() {
  const st = [];
  for (const f of Object.keys(FACE_NORMALS)) {
    const n = FACE_NORMALS[f];
    const ax = n.findIndex(v => v !== 0);
    const others = [0, 1, 2].filter(i => i !== ax);
    for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) {
      const p = [0, 0, 0];
      p[ax] = n[ax]; p[others[0]] = a; p[others[1]] = b;
      st.push({ p, n: n.slice(), c: f });
    }
  }
  return st;
}

// "R'" → {base:'R', turns:-1}; acepta ' ’ ′ y Rw como r
function parseMove(tok) {
  let t = tok.trim().replace(/[’′`]/g, "'");
  let m = /^([RLUDFBMESxyz])(w?)(2'|2|'|)$/.exec(t) || /^([rludfb])()(2'|2|'|)$/.exec(t);
  if (!m) throw new Error('Movimiento no válido: ' + tok);
  let base = m[1];
  if (m[2] === 'w') base = base.toLowerCase();
  const suf = m[3];
  const turns = suf === "'" ? -1 : (suf === '2' || suf === "2'") ? 2 : 1;
  return { base, turns, def: MOVE_DEFS[base] };
}

function parseAlg(alg) {
  return alg.trim().split(/\s+/).filter(Boolean).map(parseMove);
}

function moveToString(m) {
  return m.base + (m.turns === -1 ? "'" : m.turns === 2 ? '2' : '');
}

function applyMove(st, mv) {
  const m = typeof mv === 'string' ? parseMove(mv) : mv;
  const { ax, layers, q } = m.def;
  const qq = q * m.turns;
  return st.map(s => layers.includes(s.p[ax])
    ? { p: rotVec(s.p, ax, qq), n: rotVec(s.n, ax, qq), c: s.c }
    : s);
}

function applyAlg(st, alg) {
  for (const m of (typeof alg === 'string' ? parseAlg(alg) : alg)) st = applyMove(st, m);
  return st;
}

function invertAlg(alg) {
  return parseAlg(alg).reverse().map(m => moveToString({ base: m.base, turns: m.turns === 2 ? 2 : -m.turns })).join(' ');
}

function key(s) { return s.p.join(',') + '|' + s.n.join(','); }
function stateMap(st) { const m = {}; for (const s of st) m[key(s)] = s.c; return m; }
function sameState(a, b) {
  const ma = stateMap(a), mb = stateMap(b);
  return Object.keys(ma).every(k => ma[k] === mb[k]);
}
function isSolved(st) {
  // resuelto si cada cara tiene un solo color (admite cubo girado)
  const byFace = {};
  for (const s of st) { const k = s.n.join(','); (byFace[k] = byFace[k] || new Set()).add(s.c); }
  return Object.values(byFace).every(set => set.size === 1);
}

// Mezcla aleatoria de caras (sin repetir cara ni A B A con caras opuestas)
const OPP = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };
function scramble(len = 20, rnd = Math.random) {
  const faces = 'UDRLFB', sufs = ['', "'", '2'];
  const out = [];
  while (out.length < len) {
    const f = faces[Math.floor(rnd() * 6)];
    const last = out[out.length - 1], prev = out[out.length - 2];
    if (last && last[0] === f) continue;
    if (last && prev && OPP[f] === last[0] && prev[0] === f) continue;
    out.push(f + sufs[Math.floor(rnd() * 3)]);
  }
  return out.join(' ');
}

// ---- Tiempos (ms). penalty: 0 | 2 (+2) | 'dnf'
function effTime(s) {
  if (s.penalty === 'dnf') return Infinity;
  return s.ms + (s.penalty === 2 ? 2000 : 0);
}
function fmtTime(ms) {
  if (ms === Infinity) return 'DNF';
  if (ms == null || isNaN(ms)) return '—';
  const cs = Math.floor(ms / 10);
  const m = Math.floor(cs / 6000), s = Math.floor((cs % 6000) / 100), c = cs % 100;
  const cc = String(c).padStart(2, '0');
  return m > 0 ? `${m}:${String(s).padStart(2, '0')},${cc}` : `${s},${cc}`;
}
function fmtSolve(s) {
  if (s.penalty === 'dnf') return 'DNF';
  return fmtTime(effTime(s)) + (s.penalty === 2 ? '+' : '');
}
// Promedio de n (WCA): se quitan el mejor y el peor (5% en ambos extremos, mínimo 1)
function avgOf(solves, n) {
  if (solves.length < n) return null;
  const t = solves.slice(0, n).map(effTime).sort((a, b) => a - b);
  const cut = Math.max(1, Math.ceil(n * 0.05));
  const mid = t.slice(cut, n - cut);
  if (mid.some(v => v === Infinity)) return Infinity;
  return mid.reduce((a, b) => a + b, 0) / mid.length;
}
function bestOf(solves) {
  let b = null;
  for (const s of solves) { const e = effTime(s); if (e !== Infinity && (b === null || e < b)) b = e; }
  return b;
}
function bestAvg(solves, n) {
  let best = null;
  for (let i = 0; i + n <= solves.length; i++) {
    const a = avgOf(solves.slice(i), n);
    if (a !== null && a !== Infinity && (best === null || a < best)) best = a;
  }
  return best;
}

// ---- Notación
const FACE_MOVES = ['R', 'L', 'U', 'D', 'F', 'B'];
const NOTATION_GROUPS = [
  { id: 'caras', title: 'Caras', moves: FACE_MOVES },
  { id: 'medio', title: 'Capas del medio', moves: ['M', 'E', 'S'] },
  { id: 'giros', title: 'Girar el cubo completo', moves: ['x', 'y', 'z'] },
  { id: 'dobles', title: 'Dos capas (minúscula o w)', moves: ['r', 'l', 'u', 'd', 'f', 'b'] },
];
const MOVE_INFO = {
  R: ['Derecha', 'Gira la cara derecha en sentido horario, mirándola de frente: la columna derecha sube.'],
  L: ['Izquierda', 'Gira la cara izquierda en sentido horario, mirándola de frente: la columna izquierda baja.'],
  U: ['Arriba', 'Gira la cara de arriba en sentido horario, mirándola desde arriba: la fila de adelante se va hacia la izquierda.'],
  D: ['Abajo', 'Gira la cara de abajo en sentido horario, mirándola desde abajo: la fila de adelante se va hacia la derecha.'],
  F: ['Frente', 'Gira la cara del frente en sentido horario, como un volante hacia la derecha.'],
  B: ['Atrás', 'Gira la cara de atrás en sentido horario, mirándola desde atrás: la fila de arriba se va hacia la izquierda.'],
  M: ['Medio (M)', 'La capa del medio entre R y L. Gira igual que L: la columna del medio baja.'],
  E: ['Ecuador (E)', 'La capa horizontal del medio. Gira igual que D: la fila del medio se va hacia la derecha.'],
  S: ['Standing (S)', 'La capa del medio entre F y B. Gira igual que F.'],
  x: ['Girar en x', 'Gira el cubo completo igual que R: el frente pasa a ser la cara de arriba.'],
  y: ['Girar en y', 'Gira el cubo completo igual que U: la cara derecha pasa al frente.'],
  z: ['Girar en z', 'Gira el cubo completo igual que F: la cara de arriba pasa a la derecha.'],
  r: ['Doble derecha', 'Las dos capas de la derecha juntas (R más la del medio). También se escribe Rw.'],
  l: ['Doble izquierda', 'Las dos capas de la izquierda juntas (L más la del medio). También se escribe Lw.'],
  u: ['Doble arriba', 'Las dos capas de arriba juntas (U más la del medio). También se escribe Uw.'],
  d: ['Doble abajo', 'Las dos capas de abajo juntas (D más la del medio). También se escribe Dw.'],
  f: ['Doble frente', 'Las dos capas del frente juntas (F más la del medio). También se escribe Fw.'],
  b: ['Doble atrás', 'Las dos capas de atrás juntas (B más la del medio). También se escribe Bw.'],
};
function suffixText(suf) {
  return suf === "'" ? 'Al revés: sentido antihorario.' : suf === '2' ? 'Media vuelta (180°). Da lo mismo el sentido.' : 'Sentido horario.';
}
function allVariants(moves) { const out = []; for (const m of moves) out.push(m, m + "'", m + '2'); return out; }

// Opciones confundibles para la práctica: mismo movimiento al revés, cara opuesta, etc.
function quizOptions(move, pool, rnd = Math.random) {
  const m = parseMove(move);
  const base = m.base, suf = move.slice(base.length);
  const cands = new Set();
  const inv = suf === "'" ? '' : suf === '2' ? "'" : "'";
  cands.add(base + inv);
  const opp = { R: 'L', L: 'R', U: 'D', D: 'U', F: 'B', B: 'F', M: 'L', E: 'D', S: 'F', x: 'R', y: 'U', z: 'F', r: 'R', l: 'L', u: 'U', d: 'D', f: 'F', b: 'B' }[base];
  if (opp) cands.add(opp + suf);
  if (opp) cands.add(opp + inv);
  for (const p of pool) if (cands.size < 8) cands.add(p);
  cands.delete(move);
  const arr = [...cands];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  const opts = [move, ...arr.slice(0, 3)];
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return opts;
}

// Un movimiento está "dominado" con 3 aciertos seguidos
function moveMastered(rec) { return !!rec && rec.streak >= 3; }

const Logic = {
  COLORS, FACE_NORMALS, MOVE_DEFS, rotVec, solved, parseMove, parseAlg, moveToString, applyMove, applyAlg,
  invertAlg, sameState, isSolved, scramble, effTime, fmtTime, fmtSolve, avgOf, bestOf, bestAvg,
  FACE_MOVES, NOTATION_GROUPS, MOVE_INFO, suffixText, allVariants, quizOptions, moveMastered,
};
if (typeof module !== 'undefined') module.exports = Logic;
