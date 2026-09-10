# Juegos UCI

Sitio estático para publicar la clasificación de los Juegos UCI. Los resultados no se editan en componentes: Git es la fuente de verdad y Cloudflare Pages publica cada push a `main`.

## Requisitos y comandos

- Node.js `22.16.0` (ver `.nvmrc`)
- npm

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

`npm run check` valida los datos, revisa Astro y genera el build. No publiques cambios de resultados sin ejecutarlo.

## Actualizar resultados

1. Abre `src/data/games.json`.
2. Cambia puntajes dentro de `categories[].scores` y, si aplica, los resultados en `categories[].results`.
3. Actualiza `lastUpdated` con fecha ISO 8601 y zona horaria, por ejemplo `2026-09-10T18:42:00-03:00`.
4. Ejecuta `npm run check`, revisa con `npm run dev`, realiza commit y push a `main`.

Los puntos generales se calculan automáticamente como la suma de los puntos de cada categoría. No existe un campo de total general para editar.

## Administración habitual

- Facultades, abreviaturas y colores: `src/data/games.json` → `teams`.
- Deportes, estados, puntajes y resultados: `src/data/games.json` → `categories`.
- Logo opcional de una facultad: agrega el archivo a `public/assets/teams/` y usa su ruta `/assets/teams/archivo.svg` en `teams[].logo`.
- Nombre del evento, edición, fechas, URL y metadatos: `src/config/site.ts`.
- Imagen social y favicon: `public/social/og.png` y `public/favicon.svg`.

El archivo `scripts/validate-games.mjs` bloquea IDs repetidos, referencias inválidas, puntajes incorrectos, colores inválidos, fechas sin zona horaria y logos inexistentes.

## Cloudflare Pages

Conecta el repositorio GitHub desde Cloudflare Pages y configura:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: usa `.nvmrc` o define `NODE_VERSION=22.16.0`

Después, agrega `juegosuci.jesareko.com` en **Custom domains**. Los pushes a `main` publican producción; las ramas y PR pueden usar Preview Deployments. Para volver atrás, selecciona un deployment de producción anterior en Pages y usa **Rollback**.
