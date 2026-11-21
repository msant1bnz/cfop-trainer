const V = require('./verify.js'); const L = V.L;
const { OLL, PLL } = require('./algs_ll.js');
const F2L = require('./algs_f2l.js');
PLL.V = "R U' R U R' D R D' R U' D R2 U R2 D' R2";
const ROTS = ['', 'y', 'y2', "y'", 'x', 'x y', 'x y2', "x y'", 'x2', 'x2 y', 'x2 y2', "x2 y'", "x'", "x' y", "x' y2", "x' y'", 'z', 'z y', 'z y2', "z y'", "z'", "z' y", "z' y2", "z' y'"];
const centersHome = st => st.filter(s => s.p.filter(v => v).length === 1).every(s => Object.entries(L.FACE_NORMALS).find(([k, n]) => n.join() === s.n.join())[0] === s.c);
function caseState(alg) { for (const r of ROTS) { const t = L.applyAlg(r ? L.applyAlg(L.solved(), r) : L.solved(), L.invertAlg(alg)); if (centersHome(t)) return t; } throw alg; }
const out = [];
const pair = ['1,-1,1', '1,0,1'];
// ---- F2L
const f2lAlgs = [];
const seen = new Set();
for (let i = 1; i <= 41; i++) { const a = F2L[i]; const sig = V.f2lSig(caseState(a)); if (!seen.has(sig)) { seen.add(sig); f2lAlgs.push(a); } }
for (const a of ["R U' R' F' U2 F", "R U' R' F' U' F", "R F U R U' R' F' U' R'", "R U F R U R' U' F' R'"]) { const sig = V.f2lSig(caseState(a)); if (seen.has(sig)) throw 'dup ' + a; seen.add(sig); f2lAlgs.push(a); }
if (f2lAlgs.length !== 41) throw 'f2l ' + f2lAlgs.length;
function f2lGroup(st) {
  const g = {}; for (const s of st) (g[s.p.join(',')] = g[s.p.join(',')] || []).push(s);
  let corner, edge;
  for (const p in g) { const cs = g[p].map(s => s.c).sort().join(''); if (cs === 'DFR') corner = g[p]; if (cs === 'FR' && g[p].length === 2) edge = g[p]; }
  const cTop = corner[0].p[1] === 1, eTop = edge[0].p[1] === 1;
  const white = corner.find(s => s.c === 'D');
  if (cTop && eTop) return white.n[1] === 1 ? 1 : 0;
  if (cTop && !eTop) return 2;
  if (!cTop && eTop) return 3;
  return 4;
}
const F2L_GROUPS = ['Arriba, con el blanco al costado', 'Arriba, con el blanco hacia arriba', 'Esquina arriba, arista en su lugar', 'Esquina abajo, arista arriba', 'Las dos en su lugar'];
const f2lItems = f2lAlgs.map(a => ({ alg: a, g: f2lGroup(caseState(a)), len: L.parseAlg(a).length }));
f2lItems.sort((x, y) => x.g - y.g || x.len - y.len);
f2lItems.forEach((it, i) => out.push({ id: 'f2l-' + (i + 1), set: 'f2l', group: F2L_GROUPS[it.g], name: 'Caso ' + (i + 1), alg: it.alg }));
console.log('F2L grupos', F2L_GROUPS.map((g, i) => f2lItems.filter(x => x.g === i).length));
// ---- OLL
const OLLG = [['Punto', [1, 2, 3, 4, 17, 18, 19, 20]], ['Cruz (OCLL)', [21, 22, 23, 24, 25, 26, 27]], ['Esquinas listas', [28, 57]], ['Línea', [51, 52, 55, 56]], ['Forma de P', [31, 32, 43, 44]], ['Forma de T', [33, 45]], ['Forma de C', [34, 46]], ['Forma de W', [36, 38]], ['Forma de Z', [39, 40]], ['Pez', [9, 10, 35, 37]], ['Cuadrado', [5, 6]], ['Rayo', [7, 8, 11, 12]], ['Caballo', [13, 14, 15, 16]], ['Incómodos', [29, 30, 41, 42]], ['Forma de L', [47, 48, 49, 50, 53, 54]]];
const OCLL_NAMES = { 21: 'H', 22: 'Pi', 23: 'Faros', 24: 'T', 25: 'Corbatín', 26: 'Antisune', 27: 'Sune' };
const ollNum = {};
for (const [g, nums] of OLLG) for (const n of nums) ollNum[n] = g;
if (Object.keys(ollNum).length !== 57) throw 'oll groups';
for (const [g, nums] of OLLG) for (const n of nums) out.push({ id: 'oll-' + n, set: 'oll', group: g, name: 'OLL ' + n + (OCLL_NAMES[n] ? ' · ' + OCLL_NAMES[n] : ''), alg: OLL[n] });
// ---- OLL 2 pasos
const EO = [['Punto', "F R U R' U' F' f R U R' U' f'"], ['Línea', "F R U R' U' F'"], ['L', "f R U R' U' f'"]];
for (const [n, a] of EO) { const st = caseState(a); if (!V.f2lIntactExcept(st, [])) throw 'eo'; out.push({ id: 'oll2-' + n.toLowerCase().replace('í', 'i'), set: 'oll2', group: 'Paso 1 · cruz amarilla (aristas)', name: n, alg: a, mask: 'olledge' }); }
for (const n of [27, 26, 21, 22, 23, 24, 25]) out.push({ id: 'oll2-' + n, set: 'oll2', group: 'Paso 2 · esquinas', name: OCLL_NAMES[n], alg: OLL[n] });
// ---- PLL
const PLLG = [['Solo esquinas', ['Aa', 'Ab', 'E']], ['Solo aristas', ['Ua', 'Ub', 'H', 'Z']], ['Esquinas vecinas', ['T', 'F', 'Ja', 'Jb', 'Ra', 'Rb']], ['Esquinas en diagonal', ['V', 'Y', 'Na', 'Nb']], ['Perms G', ['Ga', 'Gb', 'Gc', 'Gd']]];
for (const [g, names] of PLLG) for (const n of names) out.push(Object.assign({ id: 'pll-' + n, set: 'pll', group: g, name: n + ' perm', alg: PLL[n] }, n === 'V' ? { alt: "R' U R' U' y R' F' R2 U' R' U R' F R F" } : {}));
if (out.filter(c => c.set === 'pll').length !== 21) throw 'pll';
out.push({ id: 'pll2-faros', set: 'pll2', group: 'Paso 1 · esquinas', name: 'Faros (T perm)', alg: PLL.T, mask: 'pllcorner' });
out.push({ id: 'pll2-diagonal', set: 'pll2', group: 'Paso 1 · esquinas', name: 'Diagonal (Y perm)', alg: PLL.Y, mask: 'pllcorner' });
for (const n of ['Ua', 'Ub', 'H', 'Z']) out.push({ id: 'pll2-' + n, set: 'pll2', group: 'Paso 2 · aristas', name: n + ' perm', alg: PLL[n] });
// verify every case: alg solves its case state
for (const c of out) {
  const st = caseState(c.alg);
  if (!L.isSolved(L.applyAlg(st, c.alg))) throw 'no resuelve ' + c.id;
  if (c.set === 'f2l' && !V.f2lIntactExcept(st, pair)) throw 'f2l ' + c.id;
  if (c.set !== 'f2l' && !V.f2lIntactExcept(st, [])) throw 'll ' + c.id;
}
const counts = {}; for (const c of out) counts[c.set] = (counts[c.set] || 0) + 1;
console.log(counts);
require('fs').writeFileSync(require('path').join(__dirname, '../src/cases.js'),
  '// Casos verificados con el simulador (tools/verify.js). Generado por tools/gen_cases.js (node tools/gen_cases.js)\nconst CASES = ' + JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n{') + ';\nif (typeof module !== "undefined") module.exports = CASES;\n');
