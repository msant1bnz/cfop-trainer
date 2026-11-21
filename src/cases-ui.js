// CFOP Trainer — Cross, casos (F2L, OLL, PLL), fichas y entrenadores
const SETS = {
  f2l: { title: 'F2L', badge: 'F2L', col: '#30D158', intro: 'Junta una esquina blanca con su arista arriba y mételas juntas en su ranura. Todos los casos se muestran con la ranura de adelante a la derecha (verde con naranjo). Lo gris no importa.' },
  oll2: { title: 'OLL en 2 pasos', badge: 'O2', col: '#FFD60A', intro: 'Primero haces la cruz amarilla (punto, L o línea) y después orientas las esquinas (7 casos). Solo importa dónde está el amarillo.' },
  pll2: { title: 'PLL en 2 pasos', badge: 'P2', col: '#FF9F0A', intro: 'Primero ubicas las esquinas (faros o diagonal) y después las aristas (4 casos). Las flechas muestran a dónde va cada pieza.' },
  oll: { title: 'OLL completo', badge: 'OLL', col: '#FFD60A', intro: 'Los 57 casos para orientar la última capa en un solo paso. Apréndelos de a poco; los 7 de la cruz ya los conoces del método en 2 pasos.' },
  pll: { title: 'PLL completo', badge: 'PLL', col: '#FF9F0A', intro: 'Los 21 casos para terminar el cubo en un solo paso. Seis ya los conoces del método en 2 pasos.' },
};
const SET_ORDER = ['f2l', 'oll2', 'pll2', 'oll', 'pll'];
const F2L_TIPS = {
  'Arriba, con el blanco al costado': 'La esquina y la arista están arriba y el blanco de la esquina mira hacia un costado. Júntalas en un bloque y mételas juntas.',
  'Arriba, con el blanco hacia arriba': 'Con el blanco hacia arriba no se pueden meter directo: primero hay que separarlas o girar la esquina.',
  'Esquina arriba, arista en su lugar': 'La arista ya está en la ranura (bien o volteada). Sácala junto con la esquina o aprovéchala para emparejarlas.',
  'Esquina abajo, arista arriba': 'La esquina está en su ranura (bien o girada). Sácala junto con la arista o lleva la arista a su lado.',
  'Las dos en su lugar': 'Las dos piezas están en la ranura pero mal puestas. Hay que sacarlas y volver a meterlas bien.',
};
const PLL_TIPS = {
  Aa: 'Solo se mueven 3 esquinas; las aristas ya están bien. Busca los faros en un costado.',
  Ab: 'El espejo de Aa: solo se mueven 3 esquinas, en el otro sentido.',
  E: 'Solo esquinas, sin faros en ningún costado.',
  Ua: 'Solo se mueven 3 aristas. Hay una barra completa en un costado.',
  Ub: 'El espejo de Ua: 3 aristas en el otro sentido, con una barra completa en un costado.',
  H: 'Se intercambian las aristas opuestas: cada costado tiene el centro del color contrario.',
  Z: 'Se intercambian aristas vecinas de a pares.',
  T: 'Faros a un lado y bloques de 2 adelante y atrás.',
  F: 'Una barra completa de 3 en un costado y faros en el lado contrario.',
  Ja: 'Un bloque grande de 2×3 a un lado; se cambian una esquina y una arista vecinas.',
  Jb: 'El espejo de Ja: bloque grande de 2×3, con el intercambio al otro lado.',
  Ra: 'Faros en un costado y un bloque de 2 al lado.',
  Rb: 'El espejo de Ra.',
  V: 'Esquinas en diagonal y un bloque de 2 en una esquina.',
  Y: 'Esquinas en diagonal y dos bloques de 2 en una esquina.',
  Na: 'Todo cambia en diagonal: dos barras de 2 en lados opuestos.',
  Nb: 'El espejo de Na.',
  Ga: 'Ciclo de 3 esquinas y 3 aristas. Busca los faros y el bloque de 2.',
  Gb: 'Ciclo de 3 esquinas y 3 aristas (espejo de Ga).',
  Gc: 'Ciclo de 3 esquinas y 3 aristas.',
  Gd: 'Ciclo de 3 esquinas y 3 aristas (espejo de Gc).',
};
const caseById = {}; for (const c of CASES) caseById[c.id] = c;
const casesOf = set => CASES.filter(c => c.set === set);
const recOf = id => db.cases[id] || null;
const stOf = id => (db.cases[id] && db.cases[id].st) || 'por aprender';
const masteredIn = set => casesOf(set).filter(c => stOf(c.id) === 'dominado').length;
const learningIn = set => casesOf(set).filter(c => stOf(c.id) === 'aprendiendo').length;
const dueIn = set => casesOf(set).filter(c => L.isDue(recOf(c.id))).length;
const allDue = () => CASES.filter(c => L.isDue(recOf(c.id)));
function caseTip(c) {
  if (c.set === 'f2l') return F2L_TIPS[c.group] || '';
  if (c.set === 'pll' || c.set === 'pll2') { const k = c.id.split('-')[1]; return PLL_TIPS[k] || (k === 'faros' ? 'Hay faros en un costado: dos esquinas iguales. Ponlos atrás y haz el T perm.' : 'Ningún costado tiene faros: las esquinas están cambiadas en diagonal.'); }
  if (c.mask === 'olledge') return 'Mira solo las aristas amarillas de arriba (las esquinas da lo mismo).';
  return `Grupo: ${c.group}. Fíjate en la forma que hace el amarillo arriba y en los costados.`;
}
function tokHTML(alg, cls = '', start = 0) {
  return L.parseAlg(alg).map((m, i) => `<span class="tok ${cls}" data-tok="${start + i}">${pretty(L.moveToString(m))}</span>`).join('');
}
function statusDot(id) {
  const st = stOf(id);
  if (st === 'dominado') return '<span class="sdot" style="background:var(--green)"></span>';
  if (st === 'aprendiendo') return '<span class="sdot" style="background:var(--accent)"></span>';
  return '';
}

// ---------- lista de casos
function viewSet() {
  const set = ui.set, info = SETS[set], list = casesOf(set);
  const f = ui.setFilter || 'todos';
  const show = list.filter(c => f === 'todos' || stOf(c.id) === f);
  const groups = [];
  for (const c of show) { let g = groups.find(x => x.name === c.group); if (!g) groups.push(g = { name: c.group, items: [] }); g.items.push(c); }
  const pool = practicePool(set);
  return `<div class="screen">
    ${navbar(ui.tab === 'aprender' ? 'Aprender' : 'Volver', `${masteredIn(set)} de ${list.length} dominados`)}
    <h1>${info.title}</h1>
    <p class="muted" style="font-size:15px">${info.intro}</p>
    <div class="seg" role="group" aria-label="Filtro">
      ${[['todos', 'Todos'], ['aprendiendo', 'Aprendiendo'], ['por aprender', 'Pendientes'], ['dominado', 'Dominados']].map(([v, l]) => `<button class="${f === v ? 'on' : ''}" data-act="setFilter" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="row small muted" style="justify-content:flex-start;gap:14px"><span class="row" style="gap:6px"><span class="sdot static" style="background:var(--green)"></span>Dominado</span><span class="row" style="gap:6px"><span class="sdot static" style="background:var(--accent)"></span>Aprendiendo</span></div>
    ${groups.length ? groups.map(g => `<div class="row"><p class="eyebrow">${esc(g.name)}</p><span class="sub num">${g.items.length}</span></div>
      <div class="thumbs">${g.items.map(c => `<button class="thumb" data-act="openCase" data-v="${c.id}" aria-label="${esc(c.name)}">${statusDot(c.id)}${L.caseSVG(c, 92)}<span>${esc(c.name.replace(/^OLL /, ''))}</span></button>`).join('')}</div>`).join('')
      : `<p class="muted center">No hay casos con este filtro.</p>`}
    <button class="btn primary" data-act="practiceSet" ${pool.length ? '' : 'disabled'}>${pool.length ? `Practicar (${Math.min(pool.length, 12)} casos)` : 'Marca casos como "Aprendiendo" para practicar'}</button>
  </div>${tabbar()}`;
}
function practicePool(set) {
  const list = set ? casesOf(set) : CASES;
  const due = list.filter(c => L.isDue(recOf(c.id)));
  const learning = list.filter(c => stOf(c.id) === 'aprendiendo' && !due.includes(c));
  return [...due, ...learning];
}

// ---------- ficha de un caso
function viewCase() {
  const c = caseById[ui.caseId], su = L.caseSetup(c), rec = recOf(c.id), st = stOf(c.id);
  const pre = su.pre ? L.parseAlg(su.pre).length : 0, n = L.parseAlg(c.alg).length;
  const toks = (su.pre ? tokHTML(su.pre, 'auf', 0) : '') + tokHTML(c.alg, '', pre) + (su.post ? tokHTML(su.post, 'auf', pre + n) : '');
  const isLL = c.set !== 'f2l';
  const pct = rec && rec.n ? Math.round(rec.ok / rec.n * 100) : null;
  const next = rec && rec.st !== 'por aprender' ? (L.isDue(rec) ? 'hoy' : relDay(rec.due)) : null;
  return `<div class="screen" style="gap:14px">
    ${navbar(SETS[c.set].title, casePos(c))}
    <div class="row" style="align-items:flex-end"><div class="col"><p class="eyebrow">${esc(c.group)}</p><h1>${esc(c.name)}</h1></div>${isLL ? `<div style="flex:none">${L.caseSVG(c, 76)}</div>` : ''}</div>
    <div class="card" style="gap:12px;padding-top:6px">
      <div class="cubebox" id="cubeMount"><span class="cube-hint">Arrastra para girar · ⏮ vuelve al inicio</span></div>
      <div class="toks" id="toks">${toks}</div>
      ${su.pre || su.post ? `<span class="muted xs center">En gris: giros de U para alinear (pueden variar).</span>` : ''}
      <div class="row" style="justify-content:center;gap:12px">
        <button class="iconbtn" style="background:var(--card2)" data-act="pFirst" aria-label="Al inicio">${ic('first', 20)}</button>
        <button class="iconbtn" style="background:var(--card2)" data-act="pPrev" aria-label="Paso anterior">${ic('back', 20)}</button>
        <button class="iconbtn" id="pPlay" style="width:60px;height:60px;background:var(--accent);color:#000" data-act="pPlay" aria-label="Reproducir">${ic('play', 24)}</button>
        <button class="iconbtn" style="background:var(--card2)" data-act="pNext" aria-label="Paso siguiente">${ic('chev', 20)}</button>
        <button class="iconbtn" style="background:var(--card2)" data-act="pLast" aria-label="Al final">${ic('last', 20)}</button>
      </div>
    </div>
    <div class="card" style="gap:8px"><p class="eyebrow">Cómo reconocerlo</p><span style="font-size:15px">${esc(caseTip(c))}</span>
      ${c.alt ? `<p class="eyebrow" style="margin-top:6px">Alternativa</p><span class="alg">${pretty(c.alt)}</span>` : ''}</div>
    <div class="seg" role="group" aria-label="Estado">
      ${[['por aprender', 'Por aprender'], ['aprendiendo', 'Aprendiendo'], ['dominado', 'Dominado']].map(([v, l]) => `<button class="${st === v ? 'on' : ''}" data-act="setStatus" data-v="${v}">${l}</button>`).join('')}</div>
    ${rec && rec.n ? `<div class="grid3"><div class="stat"><span>Prácticas</span><b class="num">${rec.n}</b></div><div class="stat"><span>Aciertos</span><b class="num">${pct}%</b></div><div class="stat"><span>${rec.best ? 'Mejor' : 'Repaso'}</span><b class="num">${rec.best ? L.fmtTime(rec.best) : esc(next || '—')}</b></div></div>` : ''}
    <button class="btn primary" data-act="practiceCase">Practicar este caso</button>
  </div>${tabbar()}`;
}
function casePos(c) { const l = casesOf(c.set); return `${l.indexOf(c) + 1} de ${l.length}`; }
function relDay(ts) {
  const d = Math.round((new Date(ts).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return d <= 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`;
}

// reproductor
function playerSeq() { const c = caseById[ui.caseId]; return L.parseAlg(L.caseSetup(c).full); }
function playerStateAt(i) { const c = caseById[ui.caseId]; return L.applyAlg(L.caseSetup(c).state, playerSeq().slice(0, i)); }
function playerMark(i) {
  ui.pi = i;
  document.querySelectorAll('#toks .tok').forEach(t => { const k = +t.dataset.tok; t.classList.toggle('done', k < i); t.classList.toggle('cur', k === i); });
  const b = $('#pPlay'); if (b) { b.innerHTML = ui.playing ? ic('pause', 24) : ic('play', 24); b.setAttribute('aria-label', ui.playing ? 'Pausar' : 'Reproducir'); }
}
function playerJump(i) {
  const c = caseById[ui.caseId], n = playerSeq().length;
  i = Math.max(0, Math.min(n, i));
  ui.playing = false;
  getCube().setState(playerStateAt(i), L.caseMask(c));
  playerMark(i);
}
async function playerPlay() {
  const cube = getCube(), seq = playerSeq();
  if (ui.playing) { ui.playing = false; playerJump(ui.pi); return; }
  if (ui.pi >= seq.length) playerJump(0);
  ui.playing = true; playerMark(ui.pi);
  const start = ui.pi;
  const done = await cube.play(seq.slice(start), i => { if (ui.playing) playerMark(start + i); });
  if (done) { ui.playing = false; playerMark(seq.length); }
}
async function playerStep() {
  const seq = playerSeq(); if (ui.pi >= seq.length) return;
  ui.playing = false;
  const i = ui.pi; playerMark(i);
  const ok = await getCube().play([seq[i]]);
  if (ok) playerMark(i + 1);
}

// ---------- entrenador de casos
function startTraining(ids, reps = 1) {
  let list = [];
  for (let r = 0; r < reps; r++) list.push(...ids);
  if (reps === 1) for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  ui.tr = { ids: list.slice(0, 12), i: 0, ok: 0, fails: [], phase: 'setup', showCase: false };
  prepTrain();
}
function prepTrain() {
  const t = ui.tr; const c = caseById[t.ids[t.i]];
  t.extraU = Math.floor(Math.random() * 4);
  t.setup = L.practiceSetup(c, t.extraU);
  t.phase = 'setup'; t.showCase = false; t.ms = null;
}
function viewTrainer() {
  const t = ui.tr;
  if (!t) return `<div class="screen">${navbar('Volver')}<p class="muted">Nada que practicar.</p></div>`;
  if (t.phase === 'done') {
    const fails = [...new Set(t.fails)].map(id => caseById[id]);
    return `<div class="screen">
      ${navbar('Volver')}
      <p class="eyebrow">Resultado</p><h1 class="num">${t.ok} de ${t.ids.length}</h1>
      <div class="bar"><i style="width:${t.ok / t.ids.length * 100}%"></i></div>
      ${fails.length ? `<div class="card"><p class="eyebrow">Para repasar</p><div class="thumbs">${fails.map(c => `<button class="thumb" data-act="openCase" data-v="${c.id}">${L.caseSVG(c, 92)}<span>${esc(c.name.replace(/^OLL /, ''))}</span></button>`).join('')}</div><span class="muted small">Volverán a aparecer en tu repaso de hoy.</span></div>`
        : `<div class="banner">${ic('check', 22, 2.2)}<span>¡Todos bien! Los casos acertados se repasan cada vez más espaciados.</span></div>`}
      <button class="btn primary" data-act="trAgain">Otra ronda</button>
    </div>`;
  }
  const c = caseById[t.ids[t.i]];
  const head = `${navbar('Salir', `${t.i + 1} de ${t.ids.length}`)}<div class="bar"><i style="width:${t.i / t.ids.length * 100}%"></i></div>`;
  if (t.phase === 'setup') {
    return `<div class="screen" style="gap:14px">${head}
      <p class="eyebrow">${SETS[c.set].title}</p><h1>Prepara el caso</h1>
      <div class="card" style="gap:10px"><span class="muted small">Parte con el cubo armado: amarillo arriba y verde al frente. Luego haz:</span>
        <div class="toks" style="justify-content:flex-start">${tokHTML(t.setup.moves)}</div></div>
      ${t.showCase ? `<div class="card" style="padding-top:6px"><div class="cubebox sm" id="cubeMount"></div></div>` : `<button class="btn" data-act="trShow">${ic('cube', 20)}Ver cómo debe quedar</button>`}
      <button class="btn primary big" data-act="trGo">Listo, empezar</button>
      <span class="muted small center">Al empezar corre el tiempo. Reconoce el caso y resuélvelo.</span>
    </div>`;
  }
  if (t.phase === 'run') {
    return `<button class="timer-full" data-act="trStop" aria-label="Detener"><b class="timer-big" data-since="${t.t0}">0,00</b><span class="muted small">Toca la pantalla al terminar</span></button>`;
  }
  // grade
  const su = L.caseSetup(c);
  const full = [t.setup.pre, su.full].filter(Boolean).join(' ');
  return `<div class="screen" style="gap:14px">${head}
    <div class="row" style="align-items:flex-end"><div class="col"><p class="eyebrow">${esc(c.group)}</p><h1>${esc(c.name)}</h1></div><b class="num" style="font-size:28px;font-weight:300">${L.fmtTime(t.ms)}</b></div>
    <div class="card" style="gap:10px;padding-top:6px">
      <div class="cubebox sm" id="cubeMount"></div>
      <div class="toks" id="toks">${tokHTML(L.simplify(full))}</div>
      <button class="btn" data-act="trPlay">${ic('play', 16)}Ver el algoritmo en 3D</button>
    </div>
    <div class="grid2"><button class="btn" style="color:var(--red);min-height:56px" data-act="trGrade" data-v="0">${ic('x', 20)}Me equivoqué</button>
      <button class="btn primary" data-act="trGrade" data-v="1">${ic('check', 20, 2.2)}Me salió</button></div>
  </div>`;
}

// ---------- Cross
function viewCrossInfo() {
  const tips = [
    ['La meta', 'Armar la cruz blanca abajo, con cada arista alineada con el centro de su color. Una buena cruz se hace en 8 movimientos o menos.'],
    ['Planifica en la inspección', 'Ubica las 4 aristas blancas antes de girar e intenta planificar la cruz completa. Al principio, con 2 aristas está bien.'],
    ['Hazla abajo, directo', 'No la armes arriba para después darla vuelta: acostúmbrate a resolverla en la cara de abajo, mirando de reojo.'],
    ['El orden importa', 'Parte por las aristas que se resuelven en 1 o 2 movimientos y cuida que las siguientes no desarmen las anteriores. Si dos quedan cambiadas entre sí, gira D y arregla una.'],
  ];
  const s = crossStats();
  return `<div class="screen">
    ${navbar('Aprender')}
    <h1>Cross</h1>
    ${tips.map(([h, p], i) => `<div class="card" style="gap:6px"><p class="eyebrow">${i + 1} · ${h}</p><span style="font-size:15px">${p}</span></div>`).join('')}
    ${s ? `<div class="grid3"><div class="stat"><span>Cruces</span><b class="num">${s.n}</b></div><div class="stat"><span>Tiempo prom.</span><b class="num">${L.fmtTime(s.ms)}</b></div><div class="stat"><span>Mov. extra</span><b class="num">${s.extra === null ? '—' : '+' + s.extra.toFixed(1).replace('.', ',')}</b></div></div>` : ''}
    <button class="btn primary" data-act="goCross">Entrenar la cruz</button>
  </div>${tabbar()}`;
}
function crossStats() {
  const l = db.cross.slice(-12); if (!l.length) return null;
  const ms = l.reduce((a, b) => a + b.ms, 0) / l.length;
  const wu = l.filter(x => x.used); const extra = wu.length ? wu.reduce((a, b) => a + (b.used - b.opt), 0) / wu.length : null;
  return { n: db.cross.length, ms, extra };
}
function newCross() {
  const lvl = ui.cxLvl || 'todas';
  const r = L.crossScramble(lvl);
  ui.cx = { scr: r.scr, st: r.st, opt: r.opt, phase: 'ready', used: null, sols: null, saved: false };
}
function viewCross() {
  if (!ui.cx) newCross();
  const x = ui.cx, lvl = ui.cxLvl || 'todas';
  const scrCard = `<div class="card" style="gap:8px"><div class="row"><p class="eyebrow">Mezcla</p><span class="muted xs">Amarillo arriba · verde al frente</span></div><span class="alg num scr">${pretty(x.scr)}</span></div>`;
  if (x.phase === 'ready') {
    const s = crossStats();
    return `<div class="screen" style="gap:14px">
      ${navbar('Volver')}
      <h1>Entrenar la cruz</h1>
      <div class="seg" role="group" aria-label="Dificultad">${[['todas', 'Todas'], ['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']].map(([v, l]) => `<button class="${lvl === v ? 'on' : ''}" data-act="cxLvl" data-v="${v}">${l}</button>`).join('')}</div>
      <span class="muted small">${{ todas: 'Mezclas al azar.', facil: 'Cruces de 4 movimientos o menos.', normal: 'Cruces de 5 o 6 movimientos.', dificil: 'Cruces de 7 u 8 movimientos.' }[lvl]}</span>
      ${scrCard}
      <button class="btn primary big" data-act="cxInsp">Ya mezclé · empezar inspección</button>
      <button class="btn ghost" style="align-self:center" data-act="cxNew">${ic('shuffle', 18)}Otra mezcla</button>
      ${s ? `<div class="grid3"><div class="stat"><span>Cruces</span><b class="num">${s.n}</b></div><div class="stat"><span>Tiempo prom.</span><b class="num">${L.fmtTime(s.ms)}</b></div><div class="stat"><span>Mov. extra</span><b class="num">${s.extra === null ? '—' : '+' + s.extra.toFixed(1).replace('.', ',')}</b></div></div><span class="muted xs">Promedios de tus últimas 12 cruces. "Mov. extra" es cuántos movimientos usas de más respecto de la solución más corta.</span>` : ''}
    </div>`;
  }
  if (x.phase === 'insp') {
    return `<button class="timer-full insp" data-act="cxGo" aria-label="Empezar a armar"><span class="eyebrow">Inspección</span><b class="timer-big" data-countdown="${x.inspStart}">15</b><span class="muted small" style="max-width:300px;text-align:center">Busca las 4 aristas blancas y planifica la cruz. Toca la pantalla para empezar a armar (a los 15 s parte solo).</span></button>`;
  }
  if (x.phase === 'run') {
    return `<button class="timer-full" data-act="cxStop" aria-label="Terminé la cruz"><b class="timer-big" data-since="${x.t0}">0,00</b><span class="muted small">Toca la pantalla al terminar la cruz</span></button>`;
  }
  // done
  const used = x.used == null ? x.opt : x.used;
  return `<div class="screen" style="gap:14px">
    ${navbar('Volver')}
    <div class="row"><h1>Cruz lista</h1><b class="num" style="font-size:34px;font-weight:300">${L.fmtTime(x.ms)}</b></div>
    ${x.sols ? '' : `<div class="card" style="gap:10px"><span>¿Cuántos movimientos usaste?</span>
      <div class="row" style="justify-content:center;gap:16px"><button class="iconbtn" style="background:var(--card2)" data-act="cxUsed" data-v="-1" aria-label="Menos">${ic('minus', 22)}</button><b class="num" style="font-size:40px;min-width:60px;text-align:center">${used}</b><button class="iconbtn" style="background:var(--card2)" data-act="cxUsed" data-v="1" aria-label="Más">${ic('plus', 22)}</button></div>
      <span class="muted xs center">Cuenta cada giro de cara como uno (R2 también cuenta uno).</span></div>
      <button class="btn primary" data-act="cxReveal">Ver la solución más corta</button>`}
    ${x.sols ? `<div class="card" style="gap:10px;padding-top:6px">
      <div class="cubebox sm" id="cubeMount"></div>
      <span class="muted xs center" style="margin-top:-6px">Vista desde abajo, para ver la cruz blanca</span>
      <div class="row"><p class="eyebrow">Solución más corta</p><span class="small" style="color:var(--accent);font-weight:600">${x.opt} movimientos${x.used != null ? ` · tú ${x.used}` : ''}</span></div>
      ${x.sols.map((s, i) => `<button class="li" style="padding:6px 0" data-act="cxPlay" data-v="${i}"><span class="toks" style="justify-content:flex-start;flex:1">${tokHTML(s)}</span><span class="chev">${ic('play', 16)}</span></button>`).join('')}
      <span class="muted xs">Toca una solución para verla en 3D sobre tu mezcla.</span></div>
      <button class="btn primary" data-act="cxNext">Siguiente mezcla</button>` : ''}
  </div>`;
}
function saveCross() {
  const x = ui.cx; if (!x || x.saved || x.ms == null) return;
  db.cross.push({ at: Date.now(), ms: x.ms, opt: x.opt, used: x.used == null ? null : x.used, scr: x.scr });
  if (db.cross.length > 500) db.cross = db.cross.slice(-500);
  x.saved = true; save();
}

// ---------- montaje del cubo según la pantalla
function setupCubeFor() {
  const cube = getCube();
  if (ui.sub === 'case') {
    cube.setBaseView(-28, -36);
    playerJump(ui.pi || 0);
  } else if (ui.sub === 'cross' && ui.cx && ui.cx.sols) {
    cube.setBaseView(30, -36);
    if (!ui.cx.cubeReady) { cube.setState(ui.cx.st, 'cross'); ui.cx.cubeReady = true; }
  } else if (ui.sub === 'train' && ui.tr) {
    cube.setBaseView(-28, -36);
    const c = caseById[ui.tr.ids[ui.tr.i]];
    if (!ui.tr.cubeReady) { cube.setState(ui.tr.setup.state, L.caseMask(c)); ui.tr.cubeReady = true; }
  } else {
    if (cube.rx0 !== -28) cube.setBaseView(-28, -36);
    if (cube.mask) cube.setState(cube.state, null);
  }
}

// ---------- relojes en vivo
setInterval(() => {
  document.querySelectorAll('[data-since]').forEach(el => { el.textContent = L.fmtTime(performance.now() - +el.dataset.since); });
  document.querySelectorAll('[data-countdown]').forEach(el => {
    const left = 15 - Math.floor((performance.now() - +el.dataset.countdown) / 1000);
    el.textContent = String(Math.max(0, left));
    if (left <= 0 && ui.cx && ui.cx.phase === 'insp') actions2.cxGo();
  });
}, 50);

const actions2 = {
  openSet: el => { ui.set = el.dataset.v; ui.setFilter = 'todos'; go('set'); },
  setFilter: el => { ui.setFilter = el.dataset.v; render(); },
  openCase: el => { ui.caseId = el.dataset.v; ui.pi = 0; ui.playing = false; go('case'); },
  setStatus: el => {
    const id = ui.caseId, v = el.dataset.v;
    const r = db.cases[id] || (db.cases[id] = { st: 'por aprender', box: 0, due: 0, n: 0, ok: 0 });
    r.st = v;
    if (v === 'aprendiendo' && !r.n) { r.box = 0; r.due = 0; }
    if (v === 'dominado') { r.box = Math.max(r.box, 4); r.due = Date.now() + L.BOX_DAYS[r.box] * 86400000; }
    if (v === 'por aprender') { r.box = 0; r.due = 0; }
    save(); render();
  },
  pFirst: () => playerJump(0),
  pLast: () => playerJump(playerSeq().length),
  pPrev: () => playerJump((ui.pi || 0) - 1),
  pNext: () => playerStep(),
  pPlay: () => playerPlay(),
  practiceSet: () => { const p = practicePool(ui.set); if (!p.length) return; startTraining(p.slice(0, 12).map(c => c.id)); go('train'); },
  practiceCase: () => {
    const r = db.cases[ui.caseId];
    if (!r || r.st === 'por aprender') { db.cases[ui.caseId] = Object.assign(r || { box: 0, due: 0, n: 0, ok: 0 }, { st: 'aprendiendo' }); save(); }
    startTraining([ui.caseId], 3); go('train');
  },
  review: () => { const p = allDue(); if (!p.length) { toast('No tienes repasos pendientes'); return; } startTraining(p.slice(0, 15).map(c => c.id)); go('train'); },
  trShow: () => { ui.tr.showCase = true; ui.tr.cubeReady = false; render(); },
  trGo: () => { const t = ui.tr; t.phase = 'run'; t.t0 = performance.now(); render(); },
  trStop: () => { const t = ui.tr; t.ms = Math.round(performance.now() - t.t0); t.phase = 'grade'; t.cubeReady = false; suppressClickUntil = Date.now() + 350; render(); },
  trPlay: async () => {
    const t = ui.tr, c = caseById[t.ids[t.i]], cube = getCube();
    const full = L.simplify([t.setup.pre, L.caseSetup(c).full].filter(Boolean).join(' '));
    cube.setState(t.setup.state, L.caseMask(c)); cube.resetView(true);
    await new Promise(r => setTimeout(r, 350));
    cube.play(full, i => document.querySelectorAll('#toks .tok').forEach(el => { const k = +el.dataset.tok; el.classList.toggle('done', k < i); el.classList.toggle('cur', k === i); }));
  },
  trGrade: el => {
    const t = ui.tr, id = t.ids[t.i], ok = el.dataset.v === '1';
    const r = L.srUpdate(db.cases[id], ok);
    if (ok && t.ms && (!r.best || t.ms < r.best)) r.best = t.ms;
    db.cases[id] = r; save();
    if (ok) t.ok++; else t.fails.push(id);
    t.i++;
    if (t.i >= t.ids.length) { t.phase = 'done'; render(); return; }
    prepTrain(); render();
  },
  trAgain: () => { const ids = [...new Set(ui.tr.ids)]; startTraining(ids, ids.length === 1 ? 3 : 1); render(); },
  goCross: () => { ui.cx = null; go('cross'); },
  cxLvl: el => { ui.cxLvl = el.dataset.v; newCross(); render(); },
  cxNew: () => { newCross(); render(); },
  cxInsp: () => { ui.cx.phase = 'insp'; ui.cx.inspStart = performance.now(); render(); },
  cxGo: () => { const x = ui.cx; if (!x || x.phase !== 'insp') return; x.phase = 'run'; x.t0 = performance.now(); suppressClickUntil = Date.now() + 250; render(); },
  cxStop: () => { const x = ui.cx; x.ms = Math.round(performance.now() - x.t0); x.phase = 'done'; x.used = null; suppressClickUntil = Date.now() + 350; render(); },
  cxUsed: el => { const x = ui.cx; x.used = Math.max(1, Math.min(30, (x.used == null ? x.opt : x.used) + +el.dataset.v)); render(); },
  cxReveal: () => { const x = ui.cx; if (x.used == null) x.used = x.opt; x.sols = L.CROSS.solutions(x.st, 3); x.cubeReady = false; saveCross(); render(); },
  cxPlay: async el => {
    const x = ui.cx, cube = getCube();
    cube.setState(x.st, 'cross'); cube.resetView(true);
    await new Promise(r => setTimeout(r, 350));
    cube.play(x.sols[+el.dataset.v]);
  },
  cxNext: () => { saveCross(); newCross(); render(); window.scrollTo(0, 0); },
};
