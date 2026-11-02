# Langton's Ant website

Interactive WebGL Langton's ant simulator built with Next.js (static export), React, TypeScript, Tailwind CSS and
[Base UI](https://base-ui.com/).

## Development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Static build

```bash
npm run build
```

The static site is written to `out/`.

For GitHub Pages project sites, set the base path while building:

```bash
NEXT_PUBLIC_BASE_PATH=/langtons-ant npm run build
```

PowerShell:

```powershell
$env:NEXT_PUBLIC_BASE_PATH = "/langtons-ant"; npm run build
```

`NEXT_PUBLIC_BASE_PATH` is inlined into the client bundle so the shader files and `_next` assets resolve under the
repository subpath. Leave it unset for local development or a custom domain.

## Type checking

```bash
npm run typecheck
```
