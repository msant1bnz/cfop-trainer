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
