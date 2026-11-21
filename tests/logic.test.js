const L = require('../src/logic.js');
const assert = require('assert');
const S = L.solved();
const id = (alg) => L.sameState(L.applyAlg(S, alg), S);
// orden de movimientos
for (const m of ['R','L','U','D','F','B','M','E','S','x','y','z','r','l','u','d','f','b']) {
  assert(!id(m), m + ' no debe ser identidad');
  assert(id(`${m} ${m} ${m} ${m}`), m + '^4');
  assert(id(`${m} ${m}'`), m + ' inverso');
  assert(L.sameState(L.applyAlg(S, `${m}2`), L.applyAlg(S, `${m} ${m}`)), m + '2');
}
assert(id("R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'"), 'sexy x6');
const T = "R U R' U' R' F R2 U' R' U' R U R' F'";
assert(id(T + ' ' + T), 'T-perm^2');
// equivalencias de capas
const eq = (a, b, msg) => assert(L.sameState(L.applyAlg(S, a), L.applyAlg(S, b)), msg);
eq('r', "R M'", 'r = R M\'');
eq('l', 'L M', 'l = L M');
eq('u', "U E'", 'u = U E\'');
eq('d', 'D E', 'd = D E');
eq('f', 'F S', 'f = F S');
eq('b', "B S'", 'b = B S\'');
eq('x', "R M' L'", 'x = R M\' L\'');
eq('y', "U E' D'", 'y = U E\' D\'');
eq('z', "F S B'", 'z = F S B\'');
eq('Rw', 'r', 'Rw = r');
// sentido de R: el sticker del frente derecho medio pasa a arriba
const afterR = L.applyMove(S, 'R');
const upFR = afterR.find(s => s.p.join() === '1,1,0' && s.n.join() === '0,1,0');
assert.strictEqual(upFR.c, 'F', 'R sube el frente');
const afterU = L.applyMove(S, 'U');
const lf = afterU.find(s => s.p.join() === '-1,1,0' && s.n.join() === '-1,0,0');
assert.strictEqual(lf.c, 'F', 'U lleva el frente a la izquierda');
// invertir
assert(id(T + ' ' + L.invertAlg(T)));
assert(L.isSolved(L.applyAlg(S, 'x y2')), 'cubo girado sigue resuelto');
assert(!L.isSolved(L.applyAlg(S, 'R')));
// mezcla
for (let i = 0; i < 200; i++) {
  const s = L.scramble().split(' ');
  assert.strictEqual(s.length, 20);
  for (let j = 1; j < s.length; j++) assert(s[j][0] !== s[j-1][0]);
}
// tiempos
assert.strictEqual(L.fmtTime(84630), '1:24,63');
assert.strictEqual(L.fmtTime(9870), '9,87');
assert.strictEqual(L.fmtTime(Infinity), 'DNF');
const mk = (arr) => arr.map(x => typeof x === 'object' ? x : { ms: x, penalty: 0 });
assert.strictEqual(L.avgOf(mk([10000, 20000, 30000, 40000, 50000]), 5), 30000);
assert.strictEqual(L.avgOf(mk([10000, 20000, 30000, 40000, { ms: 1, penalty: 'dnf' }]), 5), 30000);
assert.strictEqual(L.avgOf(mk([{ ms: 1, penalty: 'dnf' }, 20000, 30000, 40000, { ms: 1, penalty: 'dnf' }]), 5), Infinity);
assert.strictEqual(L.avgOf(mk([10000, 20000]), 5), null);
assert.strictEqual(L.fmtSolve({ ms: 10000, penalty: 2 }), '12,00+');
assert.strictEqual(L.bestOf(mk([30000, { ms: 1000, penalty: 'dnf' }, 25000])), 25000);
// quiz
for (let i = 0; i < 100; i++) {
  const o = L.quizOptions("R'", L.allVariants(L.FACE_MOVES));
  assert.strictEqual(o.length, 4); assert(o.includes("R'")); assert.strictEqual(new Set(o).size, 4);
}
console.log('OK: todas las pruebas pasaron');

// ---- etapas 2-4
const CASES = require('../src/cases.js');
const counts = {}; for (const c of CASES) counts[c.set] = (counts[c.set] || 0) + 1;
assert.deepStrictEqual(counts, { f2l: 41, oll: 57, oll2: 10, pll: 21, pll2: 6 });
assert.strictEqual(new Set(CASES.map(c => c.id)).size, CASES.length);
for (const c of CASES) {
  const st = L.caseSetup(c).state;
  assert(L.centersHome(st), 'centros ' + c.id);
  assert(L.isSolved(L.applyAlg(st, L.caseSetup(c).full)), 'el algoritmo resuelve ' + c.id);
  assert(!L.isSolved(st), 'no está resuelto ' + c.id);
  assert(L.caseSVG(c).startsWith('<svg'));
}
// cruz
let t0 = Date.now(); L.CROSS.build(); const ms = Date.now() - t0;
const st = L.applyAlg(S, "U' F U' R' U' B2 D' L F' D' B2 D L B2 D2 R L2 D B2 U2");
assert.strictEqual(L.CROSS.optimal(st), 5);
const sols = L.CROSS.solutions(st, 3);
assert(sols.includes("U' R2 D R' F"), sols.join('|'));
for (const sol of sols) {
  const after = L.applyAlg(st, sol);
  for (const s of after) if (s.p[1] === -1 && (s.p[0] === 0) !== (s.p[2] === 0) || (s.p[1] === -1 && s.p[0] === 0 && s.p[2] === 0)) {}
  const cross = after.filter(s => s.c === 'D' && s.p[1] === -1 && (s.p[0] === 0 || s.p[2] === 0));
  assert.strictEqual(cross.length, 5, 'cruz blanca abajo con ' + sol);
}
for (const lv of ['facil', 'normal', 'dificil']) { const r = L.crossScramble(lv); assert(lv === 'facil' ? r.opt <= 4 : lv === 'normal' ? r.opt >= 5 && r.opt <= 6 : r.opt >= 7); }
// repetición espaciada
let rec = L.srUpdate(null, true, 0); assert.strictEqual(rec.box, 1); assert.strictEqual(rec.due, L.BOX_DAYS[1] * 86400000);
rec = L.srUpdate(rec, false, 0); assert.strictEqual(rec.box, 0);
for (let i = 0; i < 5; i++) rec = L.srUpdate(rec, true, 0);
assert.strictEqual(rec.st, 'dominado');
for (const c of CASES) for (const u of [0, 1, 2, 3]) {
  const ps = L.practiceSetup(c, u);
  assert(!/[xyz]/.test(ps.moves), 'sin giros ' + c.id);
  const st0 = L.applyAlg(L.solved(), ps.moves);
  assert(L.centersHome(st0));
  if (!u && true) assert(L.sameState(st0, L.caseSetup(c).state), 'setup = caso ' + c.id);
  assert(L.isSolved(L.applyAlg(st0, (ps.pre ? ps.pre + ' ' : '') + L.caseSetup(c).full)), 'resuelve tras setup ' + c.id + ' ' + u);
}
assert.strictEqual(L.stripRotations("y R"), 'B');
console.log('OK etapas 2-4 · tabla de la cruz en', ms, 'ms');
