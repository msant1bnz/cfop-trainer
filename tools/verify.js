const L = require('../src/logic.js');
const S = L.solved();
const pos = s => s.p.join(',') + '|' + s.n.join(',');
const solvedMap = {}; for (const s of S) solvedMap[pos(s)] = s.c;
const map = st => { const m = {}; for (const s of st) m[pos(s)] = s.c; return m; };
const caseState = alg => L.applyAlg(S, L.invertAlg(alg));
function pieceColors(st) { const g = {}; for (const s of st) (g[s.p.join(',')] = g[s.p.join(',')] || []).push(s.c); return g; }
// stickers that must be home
function f2lIntactExcept(st, exceptPieces) {
  const m = map(st);
  for (const k in solvedMap) {
    const p = k.split('|')[0].split(',').map(Number);
    if (p[1] === 1) continue; // U layer free
    if (exceptPieces.includes(p.join(','))) continue;
    if (m[k] !== solvedMap[k]) return false;
  }
  return true;
}
const U = st => L.applyMove(st, 'U');
// ---- OLL
function ollSig(st) {
  const m = map(st); const keys = Object.keys(m).filter(k => k.split('|')[0].split(',')[1] === '1').sort();
  let best = null; let s = st;
  for (let i = 0; i < 4; i++) { const mm = map(s); const sig = keys.map(k => mm[k] === 'U' ? '1' : '0').join(''); if (best === null || sig < best) best = sig; s = U(s); }
  return best;
}
// ---- PLL
const RING = ['F', 'R', 'B', 'L'];
function pllSig(st) {
  // side stickers of U layer in fixed order
  const sideKeys = [];
  for (const f of RING) { const n = L.FACE_NORMALS[f]; for (const s of S) if (s.n.join() === n.join() && s.p[1] === 1) sideKeys.push({ k: pos(s), f, s }); }
  // order within face consistently: sort by position along face
  let best = null; let s = st;
  for (let i = 0; i < 4; i++) {
    const mm = map(s);
    const d = sideKeys.map(o => (RING.indexOf(mm[o.k]) - RING.indexOf(o.f) + 4) % 4);
    for (let sh = 0; sh < 4; sh++) { const sig = d.map(x => (x + sh) % 4).join(''); if (best === null || sig < best) best = sig; }
    s = U(s);
  }
  return best;
}
function allTopYellow(st) { const m = map(st); return Object.keys(m).every(k => !(k.endsWith('|0,1,0')) || m[k] === 'U'); }
// ---- F2L: FR pair = corner 1,-1,1 edge 1,0,1
function locate(st, colors) {
  const g = {}; for (const s of st) (g[s.p.join(',')] = g[s.p.join(',')] || []).push(s);
  for (const p in g) { const cs = g[p].map(s => s.c).sort().join(''); if (cs === colors.slice().sort().join('')) { const w = g[p].find(s => s.c === colors[0]); return p + '/' + w.n.join(','); } }
}
function f2lSig(st) {
  let best = null; let s = st;
  for (let i = 0; i < 4; i++) {
    const sig = locate(s, ['D', 'F', 'R']) + ' ' + locate(s, ['F', 'R']);
    if (best === null || sig < best) best = sig;
    s = U(s);
  }
  return best;
}
module.exports = { L, S, caseState, f2lIntactExcept, ollSig, pllSig, allTopYellow, f2lSig, map, solvedMap };
