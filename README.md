# Juegos UCI

Sitio estático de resultados para los Juegos UCI. Git es la fuente de verdad: los puntos generales se calculan desde posiciones oficiales, perfiles de puntuación y ajustes reglamentarios; nunca se escriben manualmente en componentes.

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

`npm run check` valida los datos, ejecuta las pruebas de puntuación, revisa Astro y genera el build. Úsalo antes de cada publicación.

## Archivo operativo

La edición completa vive en `src/data/edition.json`.

- `edition`: año, estado, indicador de demostración y fecha ISO con zona horaria.
- `regulation`: versión de reglamento y desempates generales.
- `faculties`: participantes confirmados, abreviaturas, colores y logos locales opcionales.
- `scoringProfiles`: puntos por posición, participación y empate.
- `groups`: disciplinas, ramas, modalidades y posiciones oficiales.
- `adjustments`: descuentos oficiales; deben ser negativos, tener motivo y referencia reglamentaria.

Para publicar un resultado, actualiza las `placements` de la disciplina, marca su estado como `official` y actualiza `edition.lastUpdated`. El sistema asigna los puntos mediante `profileId`.

En Atletismo, carga posiciones en cada `athleticsEvents[]`. Solo cuando la disciplina finalice, marca Atletismo como `official` y completa `finalPlacements`; ese paso publica su premio general.

## Nueva edición o reglamento vigente

El contenido actual es una referencia demostrativa basada en el reglamento 2023. Antes de publicar una edición real:

1. Confirma la lista oficial de facultades/unidades.
2. Reemplaza disciplinas, ramas y modalidades habilitadas.
3. Actualiza perfiles de puntuación y `generalTieBreakers` según el reglamento vigente.
4. Cambia `regulation.status` a `official`, `edition.status` a `active` y `edition.isDemo` a `false`.

No cambies `src/lib/ranking.ts` para adaptar un reglamento: los cambios habituales deben vivir en `edition.json`.

## Administración adicional

- Logos: `public/assets/teams/`, referenciados como `/assets/teams/archivo.svg`.
- Nombre, dominio y metadatos: `src/config/site.ts`.
- Imagen social y favicon: `public/social/og.png` y `public/favicon.svg`.

El validador `scripts/validate-edition.mjs` bloquea IDs repetidos, perfiles inexistentes, posiciones inválidas, facultades no registradas, empates mal declarados, ajustes no justificados y cierres de atletismo incompletos.

## Cloudflare Pages

Conecta el repositorio GitHub y usa:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: `.nvmrc` o `NODE_VERSION=22.16.0`

Los pushes a `main` publican producción. Las ramas y PR pueden usar Preview Deployments; para volver atrás, selecciona un deployment de producción anterior y usa **Rollback**.
