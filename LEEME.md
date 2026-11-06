# Bóveda de Notas

Notas privadas cifradas en tu dispositivo, con huella o PIN de 4 dígitos.

## Publicarla gratis (una sola vez)

La huella y la instalación necesitan que la app esté en una dirección **https** propia.

**Opción A: GitHub Pages**
1. Crea una cuenta en github.com y un repositorio nuevo (por ejemplo `boveda`).
2. Pulsa "Add file" > "Upload files" y sube **todos** los archivos de esta carpeta (no la carpeta).
3. Ve a Settings > Pages, en "Branch" elige `main` y `/ (root)` y guarda.
4. En 1 o 2 minutos tendrás la dirección `https://TU-USUARIO.github.io/boveda/`.

**Opción B: Netlify Drop**
1. Entra en app.netlify.com/drop, crea una cuenta gratuita y arrastra esta carpeta.
2. Te da una dirección `https://algo.netlify.app`.

En el servidor solo está el código de la app. Tus notas nunca salen del dispositivo.

## Instalarla

- **Android (Chrome):** abre la dirección, menú ⋮ > "Instalar aplicación" o "Añadir a pantalla de inicio".
- **iPhone (Safari):** botón Compartir > "Añadir a pantalla de inicio".
- **Ordenador (Chrome o Edge):** icono de instalar en la barra de direcciones.

## Huella

Al crear el PIN, la app ofrece activar la huella (también en Ajustes). Usa una llave de acceso
(passkey) con la extensión PRF para descifrar. Funciona en Android con Chrome y en iPhone con iOS 18 o
posterior; en el ordenador depende del navegador y de Windows Hello o Touch ID. Si el navegador no lo
admite, la app te lo dice y sigues con el PIN.

## Pasar notas entre el móvil y el ordenador

Cada dispositivo tiene su propia bóveda. Ajustes > Exportar copia crea un archivo cifrado; en el otro
dispositivo, Ajustes > Importar copia y escribe el PIN que tenías al exportarla.

## Seguridad, en claro

- Cifrado AES-256-GCM con una clave aleatoria. Esa clave se guarda envuelta por el PIN
  (PBKDF2-SHA256, 600.000 iteraciones) y, si la activas, por la huella.
- Tras 5 PIN fallidos hay esperas crecientes (30 s, 1 min, 2 min… hasta 15 min).
- Límite honesto: un PIN de 4 dígitos solo tiene 10.000 combinaciones. Protege bien frente a quien
  coja el móvil, pero alguien que copie los datos del navegador con un ordenador potente podría
  probarlas todas. Guarda las copias exportadas en un sitio seguro.
- Si borras los datos del navegador o desinstalas la app, las notas se pierden. Exporta copias.

## Atajos (ordenador)

`/` o `Ctrl K` buscar · `N` nueva nota · `Esc` cerrar · `Alt L` bloquear · `#etiqueta` en la búsqueda filtra.

## Para el calendario (siguiente paso)

Cada nota ya guarda `date` (AAAA-MM-DD), `time` (HH:MM), `calendarEventId` y `tags`. El calendario
irá dentro de la misma app para leer la bóveda cifrada sin sacar los datos.
