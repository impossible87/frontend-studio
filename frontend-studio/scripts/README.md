# Helper tools

Run from the repository/project root with Node 22+. Commands and JSON fields are stable; some inherited diagnostics remain Chinese. Core extraction/audit/profile helpers use built-in Node modules. Browser helpers require optional Playwright and Chromium:

```bash
npm install --no-save playwright
npx playwright install chromium
```

This is optional development tooling, not a runtime requirement for the specimens or skill.

## Font and design-token declarations

```bash
node frontend-studio/scripts/extract_tokens.mjs --dir frontend-studio/assets --out reports/tokens.json
node --test frontend-studio/scripts/extract_tokens.test.mjs
```

Create `reports/` before choosing an output inside it. The font report distinguishes declared stacks, fallback candidates, variable references, unresolved values, and weight declarations. It does not count the stack's fallback names as actually rendered families. Inspect real fonts and glyph coverage in the browser separately. Palette declarations are distinct from scattered literals; findings remain review signals.

## Static sample audit

```bash
node frontend-studio/scripts/audit_ui.mjs --dir frontend-studio/assets
node frontend-studio/scripts/audit_ui.mjs --dir frontend-studio/assets --theme dark
```

Reports typography/color/layout risks and resolvable token contrast. It is not an accessibility or performance certificate. The standalone command prints findings; it does not turn every finding into a nonzero exit status. The root package check additionally rejects blocker/high sample findings.

## Site profiling

```bash
node frontend-studio/scripts/ingest_site.mjs --dir ./src --out site-profile.json
node frontend-studio/scripts/ingest_site.mjs --url https://example.com --out site-profile.json
```

The URL helper fetches markup; use browser observation to inspect animation, rendered fonts, state, and script-rendered content. Preserve sensitive/client material locally and redact it before sharing.

## Browser screenshots and contrast

Serve the root first with `python -m http.server 8000`, then:

```bash
node frontend-studio/scripts/shoot.mjs --url http://localhost:8000/frontend-studio/assets/examples/motion-lab.html --out shots --widths 1280,1536 --motion
node frontend-studio/scripts/contrast_ui.mjs --url http://localhost:8000/frontend-studio/assets/examples/motion-lab.html
```

`shoot` defaults to 360/768/1280/1536 and reduced motion; `--motion` enables and traverses reveal behavior. Use agreed widths, inspect the resulting PNGs, and test intermediate/interruption states separately. Contrast automation cannot resolve every layered/gradient/transparent context or establish full WCAG conformance.

## Repository checks

`npm test` runs the 10 meaningful font-report regression cases. `npm run check` verifies package metadata, relative Markdown resources, script syntax, and no blocker/high static sample findings. CI runs these checks. It does not execute the interactive browser scenarios or promise creative outcomes.
