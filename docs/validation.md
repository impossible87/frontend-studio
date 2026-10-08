# Validation and limits

The public edition adapts the Chinese working skill into an English entry and focused English guides. It retains the original specimen mechanisms and adds an English motion page with localized status feedback. The samples are authored prototypes, not independently generated production websites or a controlled comparison between skills/models.

## Development evidence (2026-10-08)

The retained specimens were tested in local headless Chromium on Windows at 1280 and 1536px. Twenty-one dynamic records and eight existing-page regression records were captured during development. This is a record count, not a benchmark score.

| Area | Observed result |
|---|---|
| Product mechanism | Scroll progress 0/.5/1, reverse scroll, direct buttons and keyboard select the matching demo state |
| Studio mechanism | Expansion/reflow snapshots at 0/220/440ms; rapid interruption converges to the last disclosure; focus is preserved |
| Research mechanism | Content-switch snapshots at 0/140/280ms; rapid switches, arrows/Home/End and focus behavior checked |
| Reduced motion | Initial and live preference changes simplify transitions while preserving actions |
| Failure fallback | No JavaScript and simulated animation-initialization failure keep the content readable and native disclosures usable |
| Resize/cleanup | Temporary reflow styles clear; teardown restores readable panels and cancels running work |
| Fonts | Actual Chromium platform-font inspection showed Microsoft YaHei/system use; no custom-font download was claimed |
| Existing pages | Static starter and typography specimen desktop regressions checked |
| Static audit | 12 asset code files; no static findings in the tested edition |
| Font-report tests | 10 passing regression cases covering stacks, roles, variables, weights, and unresolved declarations |

The [preview GIF](media/motion-preview.gif) and public state frames are captured from the English mechanism specimen. They are assembled from actual browser frames, including controlled Web Animations currentTime samples. It is not an unedited real-time screen recording or proof of physical-device smoothness. The [state sheet](media/state-sheet.png) shows start/middle/end at one width; individual retained frames are linked below.

- [Product initial](media/product-start.png), [middle](media/product-middle.png), [end](media/product-end.png)
- [Studio initial](media/studio-initial.png), [middle](media/studio-middle.png), [end](media/studio-end.png)
- [Research initial](media/research-initial.png), [middle](media/research-middle.png), [end](media/research-end.png)

Public packaging checks also verify local skills-CLI discovery, frontmatter validation, Markdown resource resolution, syntax, the existing font tests, and static asset audit. The final packaging results are recorded in [release-checks](release-checks.json). CI covers static package checks and font tests; it does not run the interactive browser matrix.

## Explicitly unverified

- This release did not optimize or accept mobile/touch behavior. Cross-browser and physical-device checks are unrun.
- Screen-reader evaluation, complete automated accessibility assessment, Lighthouse, and quantitative INP/LCP/CLS are unrun. Contrast/static success is not WCAG conformance.
- CPU 4× headless observations do not establish physical-display FPS. Local height/mask/SVG mechanisms still have layout/paint costs.
- Typography enlargement/fallback cases were checked in the preceding typography work; the complete motion lab was not revalidated at 200% in this development run. It uses system fonts, so a custom-font network-failure test does not apply.
- Gallery/original-site browser access failed during reference research. No third-party motion observation is claimed; public text/docs informed hypotheses, and these mechanisms were implemented locally.
- No controlled same-prompt generation benchmark, independent model evaluation, or guarantee of outcomes is provided. Codex installation/discovery was tested; other agent compatibility is unverified.

To validate a generated project, run that project's own checks and inspect its browser behavior; this specimen report cannot stand in for them. Public artifacts omit personal paths, credentials, raw client data, and development backups.
