// Cubo 3D con CSS (26 piezas). Se gira arrastrando con el dedo y anima movimientos.
class Cube3D {
  constructor(opts = {}) {
    this.S = opts.size || 52;
    this.rx0 = -28; this.ry0 = -36;
    this.rx = this.rx0; this.ry = this.ry0;
    this.speed = 1;
    this.mask = null;
    this.state = Logic.solved();
    this.token = 0;
    this.el = document.createElement('div');
    this.el.className = 'cube-vp';
    this.scene = document.createElement('div');
    this.scene.className = 'cube-scene';
    this.scene.style.setProperty('--s', this.S + 'px');
    this.el.appendChild(this.scene);
    this.cubies = {};
    const h = this.S / 2;
    const faceT = {
      '0,0,1': `translateZ(${h}px)`, '0,0,-1': `rotateY(180deg) translateZ(${h}px)`,
      '1,0,0': `rotateY(90deg) translateZ(${h}px)`, '-1,0,0': `rotateY(-90deg) translateZ(${h}px)`,
      '0,1,0': `rotateX(90deg) translateZ(${h}px)`, '0,-1,0': `rotateX(-90deg) translateZ(${h}px)`,
    };
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (!x && !y && !z) continue;
      const c = document.createElement('div');
      c.className = 'cubie';
      const faces = {};
      for (const n in faceT) {
        const f = document.createElement('div');
        f.className = 'cface';
        f.style.transform = faceT[n];
        const i = document.createElement('i');
        f.appendChild(i);
        c.appendChild(f);
        faces[n] = i;
      }
      const k = [x, y, z].join(',');
      this.cubies[k] = { el: c, p: [x, y, z], faces, base: `translate3d(${x * this.S}px,${-y * this.S}px,${z * this.S}px)` };
      c.style.transform = this.cubies[k].base;
      this.scene.appendChild(c);
    }
    this.paint();
    this.applyView();
    this.bindDrag();
  }

  applyView() { this.scene.style.transform = `rotateX(${this.rx}deg) rotateY(${this.ry}deg)`; }
  resetView(smooth = false) {
    if (smooth) {
      // primero se normaliza el giro (sin animar) para volver por el camino más corto
      this.scene.style.transition = 'none';
      this.ry = ((this.ry - this.ry0) % 360 + 540) % 360 - 180 + this.ry0;
      this.applyView();
      void this.scene.offsetWidth;
      this.scene.style.transition = 'transform .45s cubic-bezier(.2,.9,.25,1)';
      clearTimeout(this._tv);
      this._tv = setTimeout(() => { this.scene.style.transition = ''; }, 500);
    }
    this.rx = this.rx0; this.ry = this.ry0; this.applyView();
  }
  // vista base: desde arriba (normal) o desde abajo (para ver la cruz blanca)
  setBaseView(rx, ry, smooth = false) { this.rx0 = rx; this.ry0 = ry; this.resetView(smooth); }

  bindDrag() {
    let sx = 0, sy = 0, rx0 = 0, ry0 = 0, id = null, lastTap = 0;
    this.el.addEventListener('pointerdown', e => {
      this.scene.style.transition = '';
      id = e.pointerId; sx = e.clientX; sy = e.clientY; rx0 = this.rx; ry0 = this.ry;
      try { this.el.setPointerCapture(id); } catch (_) {}
      const now = Date.now();
      if (now - lastTap < 300) this.resetView(true);
      lastTap = now;
    });
    this.el.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      this.ry = ry0 + (e.clientX - sx) * 0.6;
      this.rx = Math.max(-90, Math.min(90, rx0 - (e.clientY - sy) * 0.6));
      this.applyView();
    });
    const end = e => { if (e.pointerId === id) id = null; };
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', end);
  }

  paint() {
    for (const k in this.cubies) for (const n in this.cubies[k].faces) this.cubies[k].faces[n].style.background = 'transparent';
    const cols = this.mask ? Logic.maskedColors(this.state, this.mask) : null;
    this.state.forEach((s, i) => {
      const c = this.cubies[s.p.join(',')];
      if (c) c.faces[s.n.join(',')].style.background = cols ? cols[i] : Logic.COLORS[s.c];
    });
  }

  setState(st, mask) { this.token++; if (mask !== undefined) this.mask = mask; this.state = st; this.resetTransforms(); this.paint(); }
  reset() { this.setState(Logic.solved(), null); }
  stop() { this.token++; this.resetTransforms(); }

  resetTransforms() { for (const k in this.cubies) this.cubies[k].el.style.transform = this.cubies[k].base; }

  // Matriz de rotación en coordenadas del modelo → CSS (eje y invertido)
  static cssMatrix(ax, deg) {
    const t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
    let R;
    if (ax === 0) R = [[1, 0, 0], [0, c, -s], [0, s, c]];
    else if (ax === 1) R = [[c, 0, s], [0, 1, 0], [-s, 0, c]];
    else R = [[c, -s, 0], [s, c, 0], [0, 0, 1]];
    const P = [1, -1, 1];
    const M = R.map((row, i) => row.map((v, j) => P[i] * v * P[j]));
    // matrix3d es por columnas
    return `matrix3d(${M[0][0]},${M[1][0]},${M[2][0]},0,${M[0][1]},${M[1][1]},${M[2][1]},0,${M[0][2]},${M[1][2]},${M[2][2]},0,0,0,0,1)`;
  }

  animateMove(mv, token) {
    const m = typeof mv === 'string' ? Logic.parseMove(mv) : mv;
    const { ax, layers, q } = m.def;
    const qq = q * m.turns;
    const parts = Object.values(this.cubies).filter(c => layers.includes(c.p[ax]));
    const dur = (Math.abs(qq) === 2 ? 420 : 300) / this.speed;
    return new Promise(resolve => {
      const t0 = performance.now();
      const step = now => {
        if (token !== this.token) { resolve(false); return; }
        let k = Math.min(1, (now - t0) / dur);
        const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const mat = Cube3D.cssMatrix(ax, qq * 90 * e);
        for (const c of parts) c.el.style.transform = mat + ' ' + c.base;
        if (k < 1) requestAnimationFrame(step);
        else {
          this.state = Logic.applyMove(this.state, m);
          this.resetTransforms();
          this.paint();
          resolve(true);
        }
      };
      requestAnimationFrame(step);
    });
  }

  // Reproduce un algoritmo; onStep(i) se llama antes de cada movimiento.
  // En secuencias, cada movimiento parte 1,25 s después del anterior (a velocidad normal).
  async play(alg, onStep, interval = 1250) {
    const token = ++this.token;
    this.resetTransforms();
    const moves = typeof alg === 'string' ? Logic.parseAlg(alg) : alg;
    for (let i = 0; i < moves.length; i++) {
      if (onStep) onStep(i);
      const t0 = performance.now();
      const ok = await this.animateMove(moves[i], token);
      if (!ok) return false;
      if (i < moves.length - 1) {
        const wait = interval / this.speed - (performance.now() - t0);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
      }
      if (token !== this.token) return false;
    }
    if (onStep) onStep(moves.length);
    return true;
  }
}
