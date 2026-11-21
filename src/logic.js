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


// ---- Casos: estado inicial a partir del algoritmo (admite algoritmos que terminan con el cubo girado)
const ROTATIONS = ['', 'y', 'y2', "y'", 'x', 'x y', 'x y2', "x y'", 'x2', 'x2 y', 'x2 y2', "x2 y'", "x'", "x' y", "x' y2", "x' y'", 'z', 'z y', 'z y2', "z y'", "z'", "z' y", "z' y2", "z' y'"];
function faceOfNormal(n) { for (const f in FACE_NORMALS) if (FACE_NORMALS[f].join() === n.join()) return f; }
function centersHome(st) { return st.every(s => (s.p[0] !== 0) + (s.p[1] !== 0) + (s.p[2] !== 0) !== 1 || faceOfNormal(s.n) === s.c); }
const _caseCache = {};
const UPOW = ['', 'U', 'U2', "U'"];
function caseState(alg, k = 0) {
  const key = alg + '#' + k;
  if (_caseCache[key]) return _caseCache[key];
  const inv = invertAlg(alg);
  for (const r of ROTATIONS) {
    const t = applyAlg(solved(), [UPOW[k], r, inv].filter(Boolean).join(' '));
    if (centersHome(t)) return (_caseCache[key] = t);
  }
  return (_caseCache[key] = applyAlg(solved(), inv));
}
function displacedTop(st) {
  const g = {}; for (const s of st) if (s.p[1] === 1) { const k = s.p.join(','); (g[k] = g[k] || []).push(s); }
  let n = 0;
  for (const k in g) { if (g[k].length === 1) continue; if (g[k].some(s => s.c !== faceOfNormal(s.n))) n++; }
  return n;
}
// Para PLL se eligen los giros de U antes y después que dejan el diagrama más simple (como en las guías)
const _setupCache = {};
function caseSetup(c) {
  if (_setupCache[c.id]) return _setupCache[c.id];
  let best = { state: caseState(c.alg), pre: '', post: '', score: Infinity };
  if (c.set === 'pll' || c.set === 'pll2') {
    for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) {
      let st = caseState(c.alg, k);
      if (j) st = applyAlg(st, UPOW[j]);
      const score = displacedTop(st) * 10 + (j ? 1 : 0) + (k ? 1 : 0);
      if (score < best.score) best = { state: st, pre: j ? invertAlg(UPOW[j]) : '', post: k ? invertAlg(UPOW[k]) : '', score };
    }
  }
  best.full = [best.pre, c.alg, best.post].filter(Boolean).join(' ');
  return (_setupCache[c.id] = best);
}

// Quita los giros de cubo (x, y, z) reescribiendo los movimientos siguientes; sirve para "preparar el caso"
function stripRotations(alg) {
  const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  let M = I.map(r => r.slice()); // columnas: dirección en el espacio de cada eje del que sostiene el cubo
  const col = (A, j) => [A[0][j], A[1][j], A[2][j]];
  const mul = (A, B) => A.map((r, i) => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const rotMat = (ax, q) => { const c = [0, 1, 2].map(j => rotVec(col(I, j), ax, q)); return [0, 1, 2].map(i => [c[0][i], c[1][i], c[2][i]]); };
  const out = [];
  for (const m of parseAlg(alg)) {
    const { ax, layers, q } = m.def;
    if (layers.length === 3) { M = mul(M, rotMat(ax, -q * m.turns)); continue; }
    const v = col(M, ax); const sax = v.findIndex(x => x !== 0), sg = v[sax];
    const L2 = layers.map(l => l * sg).sort().join(',');
    const qq = q * m.turns * sg;
    const base = Object.keys(MOVE_DEFS).find(b => MOVE_DEFS[b].ax === sax && MOVE_DEFS[b].layers.slice().sort().join(',') === L2);
    let t = ((qq / MOVE_DEFS[base].q) % 4 + 4) % 4;
    out.push(base + (t === 1 ? '' : t === 2 ? '2' : "'"));
  }
  return out.join(' ');
}
function simplify(alg) {
  const ms = parseAlg(alg); const out = [];
  for (const m of ms) {
    const last = out[out.length - 1];
    if (last && last.base === m.base) {
      const t = ((last.turns + m.turns) % 4 + 4) % 4;
      out.pop(); if (t) out.push({ base: m.base, turns: t === 3 ? -1 : t, def: m.def });
    } else out.push(m);
  }
  return out.map(moveToString).join(' ');
}
// Movimientos para dejar el caso desde un cubo armado (con un giro de U al azar)
function practiceSetup(c, extraU = 0) {
  const su = caseSetup(c);
  const seq = stripRotations(invertAlg(su.full)) + (extraU ? ' ' + UPOW[extraU] : '');
  const state = applyAlg(solved(), seq);
  return { moves: simplify(seq), state, pre: extraU ? invertAlg(UPOW[extraU]) : '' };
}

// ---- Máscaras de color (qué stickers se muestran grises)
const GRAY = '#48484A';
function pieceColorMap(st) { const g = {}; for (const s of st) { const k = s.p.join(','); (g[k] = g[k] || []).push(s.c); } return g; }
function maskColor(mode, s, pieceCols) {
  const hasU = pieceCols.includes('U');
  const isCorner = pieceCols.length === 3, isEdge = pieceCols.length === 2;
  if (mode === 'f2l') {
    const k = pieceCols.slice().sort().join('');
    if (hasU && k !== 'DFR' && k !== 'FR') return GRAY;
    return COLORS[s.c];
  }
  if (mode === 'oll' || mode === 'olledge') {
    if (!hasU) return COLORS[s.c];
    if (mode === 'olledge' && isCorner) return GRAY;
    return s.c === 'U' ? COLORS.U : GRAY;
  }
  if (mode === 'pllcorner') {
    if (hasU && isEdge) return s.c === 'U' ? COLORS.U : GRAY;
    return COLORS[s.c];
  }
  if (mode === 'cross') {
    // solo la cruz blanca y los centros
    const k = pieceCols.slice().sort().join('');
    if (pieceCols.length === 1) return COLORS[s.c];
    if (isEdge && pieceCols.includes('D')) return COLORS[s.c];
    return GRAY;
  }
  return COLORS[s.c];
}
function maskedColors(st, mode) {
  const g = pieceColorMap(st);
  return st.map(s => maskColor(mode, s, g[s.p.join(',')]));
}
const MASK_OF_SET = { f2l: 'f2l', oll: 'oll', oll2: 'oll', pll: null, pll2: null };
function caseMask(c) { return c.mask || MASK_OF_SET[c.set] || null; }

// ---- Diagramas SVG (texto), sin DOM
function isoSVG(st, mode, size = 96) {
  const cols = maskedColors(st, mode);
  const c30 = Math.cos(Math.PI / 6);
  const proj = (x, y, z) => [(x - z) * c30, (x + z) * 0.5 - y];
  const polys = [];
  st.forEach((s, i) => {
    const n = s.n;
    if (!((n[1] === 1) || (n[0] === 1) || (n[2] === 1))) return;
    const ax = n.findIndex(v => v !== 0);
    const center = s.p.slice(); center[ax] = 1.5;
    const t = [0, 1, 2].filter(j => j !== ax);
    const h = 0.43;
    const pts = [[-h, -h], [h, -h], [h, h], [-h, h]].map(([a, b]) => { const q = center.slice(); q[t[0]] += a; q[t[1]] += b; return proj(q[0], q[1], q[2]); });
    polys.push({ pts, col: cols[i], shade: n[1] === 1 ? 1 : n[2] === 1 ? 0.86 : 0.72 });
  });
  const minx = -1.5 * 2 * c30 - 0.25, maxx = 1.5 * 2 * c30 + 0.25, miny = -1.5 * 1 - 1.5 - 0.25, maxy = 1.5 + 1.5 + 0.25;
  const sc = size / (maxx - minx), H = (maxy - miny) * sc;
  const T = ([x, y]) => `${((x - minx) * sc).toFixed(1)},${((y - miny) * sc).toFixed(1)}`;
  const body = [proj(-1.5, 1.5, -1.5), proj(1.5, 1.5, -1.5), proj(1.5, -1.5, -1.5), proj(1.5, -1.5, 1.5), proj(-1.5, -1.5, 1.5), proj(-1.5, 1.5, 1.5)];
  let out = `<svg width="${size}" height="${H.toFixed(0)}" viewBox="0 0 ${size} ${H.toFixed(0)}" aria-hidden="true"><polygon points="${body.map(T).join(' ')}" fill="#0b0b0c"/>`;
  for (const p of polys) out += `<polygon points="${p.pts.map(T).join(' ')}" fill="${p.col}" style="filter:brightness(${p.shade})" stroke="#0b0b0c" stroke-width="0.6" stroke-linejoin="round"/>`;
  return out + '</svg>';
}

// Vista desde arriba (OLL/PLL): cara U + franjas laterales; PLL con flechas
function topSVG(st, mode, size = 96, arrows = false) {
  const cols = maskedColors(st, mode);
  const cell = size / 4.2, pad = cell * 0.6, gap = cell * 0.08;
  const X = x => pad + (x + 1) * cell, Y = z => pad + (z + 1) * cell;
  let out = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">`;
  st.forEach((s, i) => {
    if (s.p[1] !== 1) return;
    const [nx, ny, nz] = s.n; const [x, , z] = s.p;
    const col = cols[i];
    if (ny === 1) out += `<rect x="${(X(x) + gap).toFixed(1)}" y="${(Y(z) + gap).toFixed(1)}" width="${(cell - 2 * gap).toFixed(1)}" height="${(cell - 2 * gap).toFixed(1)}" rx="${(cell * .14).toFixed(1)}" fill="${col}"/>`;
    else {
      const th = pad * 0.55;
      let rx, ry, w, h;
      if (nz === 1) { rx = X(x) + gap; ry = Y(1) + cell + gap; w = cell - 2 * gap; h = th; }
      else if (nz === -1) { rx = X(x) + gap; ry = Y(-1) - gap - th; w = cell - 2 * gap; h = th; }
      else if (nx === 1) { rx = X(1) + cell + gap; ry = Y(z) + gap; w = th; h = cell - 2 * gap; }
      else { rx = X(-1) - gap - th; ry = Y(z) + gap; w = th; h = cell - 2 * gap; }
      out += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(th * .3).toFixed(1)}" fill="${col}"/>`;
    }
  });
  if (arrows) out += pllArrows(st, mode, X, Y, cell);
  return out + '</svg>';
}
function pllArrows(st, mode, X, Y, cell) {
  // a dónde tiene que ir cada pieza de la capa de arriba
  const g = {}; for (const s of st) if (s.p[1] === 1) { const k = s.p.join(','); (g[k] = g[k] || []).push(s); }
  const S0 = solved(); const home = {};
  for (const s of S0) if (s.p[1] === 1) { const k = s.p.join(','); (home[k] = home[k] || []).push(s.c); }
  const homeOf = cs => { const key = cs.slice().sort().join(''); for (const k in home) if (home[k].slice().sort().join('') === key) return k; };
  const moves = [];
  for (const k in g) {
    const cs = g[k].map(s => s.c); if (cs.length === 1) continue;
    if (mode === 'pllcorner' && cs.length === 2) continue;
    const h = homeOf(cs); if (h !== k) moves.push([k, h]);
  }
  const done = new Set(); let out = '';
  const c = k => { const [x, , z] = k.split(',').map(Number); return [X(x) + cell / 2, Y(z) + cell / 2]; };
  for (const [a, b] of moves) {
    const id = a + '>' + b; if (done.has(id)) continue;
    const both = moves.some(([p, q]) => p === b && q === a);
    if (both) done.add(b + '>' + a);
    done.add(id);
    let [x1, y1] = c(a), [x2, y2] = c(b);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, sh = cell * 0.22;
    x1 += ux * sh; y1 += uy * sh; x2 -= ux * sh; y2 -= uy * sh;
    const head = (x, y, vx, vy) => { const s = cell * 0.2; return `<polygon points="${(x).toFixed(1)},${(y).toFixed(1)} ${(x - vx * s - vy * s * .7).toFixed(1)},${(y - vy * s + vx * s * .7).toFixed(1)} ${(x - vx * s + vy * s * .7).toFixed(1)},${(y - vy * s - vx * s * .7).toFixed(1)}" fill="#000"/>`; };
    out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#000" stroke-width="${(cell * .09).toFixed(1)}" stroke-linecap="round"/>` + head(x2, y2, ux, uy) + (both ? head(x1, y1, -ux, -uy) : '');
  }
  return out;
}
function caseSVG(c, size = 96) {
  const st = caseSetup(c).state;
  if (c.set === 'f2l') return isoSVG(st, 'f2l', size);
  const isPll = c.set === 'pll' || c.set === 'pll2';
  return topSVG(st, caseMask(c), size, isPll);
}

// ---- Cruz: tabla de distancias (BFS sobre las 4 aristas blancas)
const CROSS = (() => {
  // 24 "lugares" = 12 aristas x 2 stickers; cada arista blanca se describe por dónde está su sticker blanco
  const S0 = solved();
  const edgeStk = S0.filter(s => (s.p[0] !== 0) + (s.p[1] !== 0) + (s.p[2] !== 0) === 2);
  const keyOf = s => s.p.join(',') + '|' + s.n.join(',');
  const slots = edgeStk.map(keyOf); const slotIdx = {}; slots.forEach((k, i) => slotIdx[k] = i);
  const faceMoves = []; for (const f of 'UDRLFB') for (const suf of ['', "'", '2']) faceMoves.push(f + suf);
  const table = faceMoves.map(m => {
    const pm = parseMove(m), { ax, layers, q } = pm.def, qq = q * pm.turns;
    return edgeStk.map(s => layers.includes(s.p[ax]) ? slotIdx[rotVec(s.p, ax, qq).join(',') + '|' + rotVec(s.n, ax, qq).join(',')] : slotIdx[keyOf(s)]);
  });
  const partners = ['F', 'R', 'B', 'L'];
  function stateOf(st) {
    const byPos = {}; for (const s of st) { const k = s.p.join(','); (byPos[k] = byPos[k] || []).push(s); }
    return partners.map(c => {
      for (const k in byPos) { const g = byPos[k]; if (g.length === 2 && g.some(s => s.c === 'D') && g.some(s => s.c === c)) return slotIdx[keyOf(g.find(s => s.c === 'D'))]; }
    });
  }
  const enc = a => ((a[0] * 24 + a[1]) * 24 + a[2]) * 24 + a[3];
  let dist = null;
  function build() {
    if (dist) return dist;
    dist = new Int8Array(331776).fill(-1);
    const start = stateOf(S0); dist[enc(start)] = 0;
    let frontier = [start];
    for (let d = 0; frontier.length; d++) {
      const nf = [];
      for (const s of frontier) for (const t of table) {
        const n = [t[s[0]], t[s[1]], t[s[2]], t[s[3]]], e = enc(n);
        if (dist[e] < 0) { dist[e] = d + 1; nf.push(n); }
      }
      frontier = nf;
    }
    return dist;
  }
  function solutions(st, limit = 3) {
    const D = build(); const s0 = stateOf(st); const res = [];
    const path = [];
    (function rec(s, last) {
      if (res.length >= limit) return;
      const d = D[enc(s)];
      if (d === 0) { res.push(path.join(' ')); return; }
      for (let i = 0; i < table.length; i++) {
        const m = faceMoves[i]; if (last && last[0] === m[0]) continue;
        const t = table[i], n = [t[s[0]], t[s[1]], t[s[2]], t[s[3]]];
        if (D[enc(n)] === d - 1) { path.push(m); rec(n, m); path.pop(); if (res.length >= limit) return; }
      }
    })(s0, null);
    return res;
  }
  function optimal(st) { return build()[enc(stateOf(st))]; }
  return { build, solutions, optimal };
})();
function crossScramble(level, rnd = Math.random) {
  const ok = { facil: d => d <= 4, normal: d => d === 5 || d === 6, dificil: d => d >= 7 }[level] || (() => true);
  for (let i = 0; i < 400; i++) {
    const scr = scramble(20, rnd); const st = applyAlg(solved(), scr); const d = CROSS.optimal(st);
    if (ok(d)) return { scr, st, opt: d };
  }
  const scr = scramble(20, rnd); const st = applyAlg(solved(), scr); return { scr, st, opt: CROSS.optimal(st) };
}

// ---- Repetición espaciada (cajas de Leitner)
const DAY = 86400000;
const BOX_DAYS = [0, 1, 2, 4, 7, 14, 30];
function srUpdate(rec, ok, now = Date.now()) {
  rec = Object.assign({ st: 'aprendiendo', box: 0, due: 0, n: 0, ok: 0 }, rec || {});
  rec.n++;
  if (ok) { rec.ok++; rec.box = Math.min(BOX_DAYS.length - 1, rec.box + 1); }
  else rec.box = Math.max(0, rec.box - 2);
  rec.due = now + BOX_DAYS[rec.box] * DAY - (ok ? 0 : 0);
  if (rec.st === 'por aprender') rec.st = 'aprendiendo';
  if (ok && rec.box >= 4) rec.st = 'dominado';
  if (!ok && rec.st === 'dominado') rec.st = 'aprendiendo';
  return rec;
}
function isDue(rec, now = Date.now()) { return !!rec && rec.st !== 'por aprender' && (rec.due || 0) <= now; }

const Logic = {
  COLORS, FACE_NORMALS, MOVE_DEFS, rotVec, solved, parseMove, parseAlg, moveToString, applyMove, applyAlg,
  invertAlg, sameState, isSolved, scramble, effTime, fmtTime, fmtSolve, avgOf, bestOf, bestAvg,
  FACE_MOVES, NOTATION_GROUPS, MOVE_INFO, suffixText, allVariants, quizOptions, moveMastered,
  caseState, caseSetup, stripRotations, simplify, practiceSetup, centersHome, maskedColors, caseMask, isoSVG, topSVG, caseSVG, CROSS, crossScramble, srUpdate, isDue, BOX_DAYS, GRAY,
};
if (typeof module !== 'undefined') module.exports = Logic;
