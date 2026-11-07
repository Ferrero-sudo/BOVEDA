"""Builds the hostable PWA (dist/) and the preview fragment from src/app.html."""
import json, pathlib, shutil

root = pathlib.Path(__file__).parent
src = (root / "src" / "app.html").read_text(encoding="utf-8")
import re
APP_VERSION = re.search(r"const APP_VERSION = '([^']+)'", src).group(1)
dist = root / "dist"
dist.mkdir(exist_ok=True)

head_extra = """<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#ECF0EE" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0D1412" media="(prefers-color-scheme: dark)">
<meta name="description" content="Notas privadas cifradas en tu dispositivo, con huella o PIN.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Bóveda">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://api.github.com https://fonts.googleapis.com https://fonts.gstatic.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}html,body{height:100%}</style>
"""
# Split the fragment: <title>…<style>…</style> go to head, the rest to body.
cut = src.index("</style>") + len("</style>")
head_part, body_part = src[:cut], src[cut:]
body_part = body_part.replace("<script>", '<script src="qrcode.js"></script>\n<script>', 1)
page = f"<!doctype html>\n<html lang=\"es\">\n<head>\n{head_extra}{head_part}\n</head>\n<body>\n{body_part}\n</body>\n</html>\n"
(dist / "index.html").write_text(page, encoding="utf-8")

manifest = {
    "name": "Bóveda de Notas", "short_name": "Bóveda", "lang": "es",
    "description": "Notas privadas cifradas en tu dispositivo, con huella o PIN.",
    "start_url": "./", "scope": "./", "display": "standalone", "orientation": "any",
    "background_color": "#ECF0EE", "theme_color": "#0D6B5B",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        {"src": "icon.svg", "sizes": "any", "type": "image/svg+xml"},
    ],
}
(dist / "manifest.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

sw = """// Bóveda de Notas: funciona sin conexión. Solo guarda en caché el código de la app, nunca tus notas.
const VERSION = 'boveda-__V__';
const SHELL = ['./', 'index.html', 'qrcode.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Red primero para recibir actualizaciones; caché si no hay conexión.
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
  } else if (/fonts\\.(googleapis|gstatic)\\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })));
  }
});
"""
(dist / "sw.js").write_text(sw.replace("__V__", APP_VERSION), encoding="utf-8")
shutil.copy(root / "src" / "qrcode.js", dist / "qrcode.js")
(dist / "version.json").write_text(json.dumps({"version": APP_VERSION}), encoding="utf-8")

icon = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="{rx}" fill="#0D6B5B"/>
<g transform="translate({o} {o}) scale({sc})" fill="none" stroke="#FFFFFF" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z"/><path d="M6 3v18M4 7h2M4 12h2M4 17h2"/><circle cx="12.5" cy="10.5" r="2.2"/><path d="M12.5 12.7V16"/>
</g></svg>"""
(dist / "icon.svg").write_text(icon.format(rx=112, o=88, sc=14), encoding="utf-8")
(root / "maskable.svg").write_text(icon.format(rx=0, o=136, sc=10), encoding="utf-8")

(root / "preview.html").write_text(src, encoding="utf-8")
print("built", [p.name for p in dist.iterdir()])
