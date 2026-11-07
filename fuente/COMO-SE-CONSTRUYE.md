# Código fuente de Bóveda de Notas

- `src/app.html`: toda la app (HTML, CSS y JS en un solo archivo). Aquí se edita. La versión está en `const APP_VERSION`.
- `src/qrcode.js`: librería de QR (Kazuhiko Arase, MIT), empaquetada.
- `build.py`: genera `dist/` (index.html, sw.js, manifest, version.json, qrcode.js). Los iconos PNG se generan con `pruebas/icons.js` (Playwright) desde `dist/icon.svg` y `maskable.svg`.
- `pruebas/test.js` y `pruebas/sync-test.js`: pruebas de extremo a extremo con Playwright (la segunda simula la API de GitHub para probar la sincronización). Las rutas dentro están escritas para /home/claude/boveda; ajústalas.

Flujo para publicar un cambio:
1. Editar `src/app.html` y subir `APP_VERSION`.
2. `python3 build.py`, y si hace falta regenerar iconos.
3. Pasar las pruebas.
4. Copiar `dist/*` a la raíz del repositorio (es lo que sirve GitHub Pages), commit y push a `main`.
