"""Arma la app: index.html autosuficiente + manifest + sw.js + íconos en la raíz del repo (GitHub Pages)."""
import json, math, os, time
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
read = lambda f: open(os.path.join(SRC, f), encoding='utf-8').read()

def build_html(pwa=True):
    html = read('template.html')
    head = ('<link rel="manifest" href="manifest.webmanifest">\n'
            '<link rel="apple-touch-icon" href="icon-180.png">\n'
            '<link rel="icon" type="image/png" href="icon-192.png">') if pwa else ''
    html = html.replace('<!--PWA-->', head)
    for ph, f in [('/*CSS*/', 'styles.css'), ('/*LOGIC*/', 'logic.js'), ('/*CUBE3D*/', 'cube3d.js'), ('/*UI*/', 'ui.js')]:
        html = html.replace(ph, read(f))
    return html

def icon(size):
    S = 4 * size
    im = Image.new('RGB', (S, S), (0, 0, 0))
    d = ImageDraw.Draw(im)
    c30 = math.cos(math.pi / 6)
    scale = S * 0.235
    cx, cy = S / 2, S / 2 + S * 0.01
    def P(x, y, z):  # cubo de -1.5 a 1.5
        return (cx + (x - z) * c30 * scale / 1.5 * 1.0, cy + ((x + z) * 0.5 - y) * scale / 1.5)
    shades = {'U': (10, 132, 255), 'F': (8, 104, 204), 'R': (6, 76, 150)}
    gap = 0.08
    for face in 'UFR':
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                h = 0.5 - gap
                pts = []
                for da, db in [(-h, -h), (h, -h), (h, h), (-h, h)]:
                    if face == 'U': pts.append(P(a + da, 1.5, b + db))
                    elif face == 'F': pts.append(P(a + da, b + db, 1.5))
                    else: pts.append(P(1.5, b + db, a + da))
                d.polygon(pts, fill=shades[face])
    return im.resize((size, size), Image.LANCZOS)

def main():
    out = ROOT
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(build_html(True))
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    open(os.path.join(ROOT, 'dist', 'prueba.html'), 'w', encoding='utf-8').write(build_html(False))
    for s in (180, 192, 512):
        icon(s).save(os.path.join(out, f'icon-{s}.png'))
    manifest = {
        'name': 'CFOP Trainer', 'short_name': 'CFOP', 'lang': 'es-CL',
        'start_url': '.', 'scope': '.', 'display': 'standalone', 'orientation': 'portrait',
        'background_color': '#000000', 'theme_color': '#000000',
        'icons': [{'src': f'icon-{s}.png', 'sizes': f'{s}x{s}', 'type': 'image/png', 'purpose': 'any'} for s in (192, 512)],
    }
    json.dump(manifest, open(os.path.join(out, 'manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ver = time.strftime('%Y%m%d%H%M%S')
    sw = f"""// Red primero; si no hay señal, se usa la copia guardada.
const CACHE = 'cfop-{ver}';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); }});
self.addEventListener('activate', e => {{
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
}});
self.addEventListener('fetch', e => {{
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {{
    if (r.ok && new URL(e.request.url).origin === location.origin) {{ const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }}
    return r;
  }}).catch(() => caches.match(e.request, {{ ignoreSearch: true }}).then(r => r || caches.match('./index.html'))));
}});
"""
    open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8').write(sw)
    print('Listo: index.html, sw.js, manifest e íconos')

if __name__ == '__main__':
    main()
