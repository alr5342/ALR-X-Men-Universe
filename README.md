# ALR X-Men Universe

A cinematic, read-only story bible for a personal five-film X-Men saga. The V5.5 website includes film treatments organized around fifteen Blake Snyder beats, character biographies, grouped World references, creator notes, and search.

Built with Astro, TypeScript, React islands, and plain CSS. Content lives in `src/content/`, reusable views in `src/components/`, and website artwork in `public/`. Production output is static.

## Run locally

Install Node.js 24 LTS and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open http://localhost:4321. In PowerShell, use `npm.cmd` if execution policy blocks `npm`.

## Check and build

```sh
npm run check
npm run build
npm run preview
```

The build writes to ignored `dist/`; preview serves the production build locally. `npm run browser` optionally tests the running site using installed Chrome or Edge and saves screenshots to ignored `.preview/` (default origin: http://localhost:4321; override with `SITE_URL`).

The owner's additional `npm run verify` audit requires the private sibling file `../PROJECT_RESEARCH/BEAT_SHEET_REVIEW.md`. That research is intentionally excluded from this repository and is unnecessary for running or building the website.

## Content and repository scope

Edit structured Markdown and JSON in `src/content/` through source code. Characters and World use independently expandable groups; film beats retain stable anchors and intentionally blank unsupported sections. Internal event records support existing content but do not generate public pages or search destinations.

This repository contains only the website source, website content, supplied artwork copies, configuration, package files, and scripts. Original writing documents, research documents, dependencies, build output, local environment files, and credentials are excluded. No hosting or GitHub Pages deployment is configured.
