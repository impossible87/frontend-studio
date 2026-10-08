# Typography: roles, language, and rendered evidence

Select type according to theme, audience, reading task, language coverage, and real font resources. Common fonts are not inherently bad. One family is a valid system; a second needs a clear purpose. Unspecified themes start with a neutral system sans; heading/display families inherit body by default.

## Token interface

`type-display`, `type-headline`, `type-title`, `type-lead`, `type-body`, `type-label`, and `type-caption` are the sole size source. Each role has `weight-*`, `leading-*`, and `tracking-*`. Map components to roles rather than maintaining a second local scale.

`font-body` serves text and controls, `font-heading` ordinary headings, `font-display` only explicit `.type-display`. Do not automatically assign display typography to every h1–h4. Navigation, forms, buttons, and data prioritize stable reading.

`data-type-profile="brand|interface|reading"` can appear on html or a container. Brand is the default scale, interface starts at 16px body, reading at 18px/1.8 with a 34em measure. Profiles set scale, not industry style or font choice.

Legacy `step-*` aliases map -1→caption, 0→body, 1→lead, 2→title, 3→headline, 4/5→display. Keep them for compatibility; do not create new components using them. Verify changed appearance when migrating a project.

## Chinese and mixed-script typography

Start Chinese display headings at zero tracking and about 1.2 line-height; ordinary heading roles may be more open. Body normally starts at 16–18px with about 1.7 line-height and 25–40 Chinese characters per line. Compact interfaces may differ when their density supports the task; record the reason.

Use actual copy and `em`/`ic` for Chinese measure; `ch` is not a Chinese character count. `.type-line` can mark semantic lines and `.type-phrase` can retain short phrases, but an overlong phrase must still wrap. Do not disable wrapping for every character or use global hard breaks. Check short/long headings, complex glyphs, Latin words, punctuation, numbers, filenames, and dynamic user input. Use tabular numerals where comparison needs them.

## Fonts and loading

When custom fonts are justified, obtain real authorized files and needed weights; avoid synthetic bold as a substitute for supplied weights. Check language coverage, including dynamic text, before subsetting Chinese. Do not ship only the sample's characters if users can enter other characters. Document the exact license for distributed files.

Choose font-display according to loading requirements. Swap does not guarantee zero layout shift; optional may retain fallback. Preload only genuinely critical resources. Derive size-adjust and metric overrides from measurement rather than invented values.

Inspect successful network loads and actual rendered font/weight/glyphs in browser tooling. Computed font-family is a declaration, not proof of use; FontFaceSet checks need specific text and rendered evidence. If files cannot be obtained, use an explicit system fallback and say the custom font was not loaded.

## Validation

Compare real copy candidates unless a font is already specified and verified. Inspect hierarchy, heading breaks, control readability, 200% enlargement, user text-spacing overrides, failure fallback, and agreed viewports. The WCAG text-spacing criterion concerns resilience to overrides, not a mandatory default style. Static small-size flags alone do not establish failure.

Use `assets/examples/typography-lab.html` for three scales and mixed-script cases, not as a fixed composition. Primary references: [Material type](https://m3.material.io/styles/typography/applying-type), [Source Han Sans](https://github.com/adobe-fonts/source-han-sans), [Noto CJK](https://github.com/notofonts/noto-cjk), [font-display](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display), [text resize](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).
