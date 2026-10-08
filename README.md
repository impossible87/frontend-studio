# Frontend Studio

**Deliberate typography. Original components. Motion you actually verify.**

An agent skill for building and improving frontends—with particular care for Chinese and mixed-script text. It guides the agent from a real brief through reference observation and creative component decisions to a running, inspected result.

[简体中文](README.zh-CN.md) · [Skill instructions](frontend-studio/SKILL.md) · [Validation and limits](docs/validation.md)

![Three original mechanisms: product scroll states, expanding studio work, and research tabs](docs/media/motion-preview.gif)

*Browser-frame capture from the included English mechanism specimen; a Chinese version is also included. Fictional demo content; these are authored mechanism prototypes, not generated production sites or a benchmark.*

## Install in Codex

Using the [skills CLI](https://github.com/vercel-labs/skills) (current CLI requires Node 22.20+):

```bash
npx skills add impossible87/frontend-studio --skill frontend-studio -g -a codex
```

Then start a new Codex chat and invoke `$frontend-studio`:

```text
Use $frontend-studio to redesign this product page.
Keep the framework, real copy, routes, and forms.
Find relevant references, choose an original component mechanism,
and verify it at 1280 and 1536px, including keyboard and reduced motion.
```

To inspect a downloaded copy without installing:

```bash
npx skills add ./frontend-studio --list
```

Manual alternative: copy the entire `frontend-studio/` skill folder into your user skills directory, usually `~/.agents/skills/`, then start a new chat. Do not copy only SKILL.md. Codex skill discovery has been tested locally; independent model-quality evaluation has not been run. Other agents that support SKILL.md may work but have not been verified in this release.

## What it helps the agent do

- **Build a type system:** display, headline, title, lead, body, label, and caption roles; brand/interface/reading scales; Chinese line breaks, mixed scripts, real font loading, and fallback checks. A single font family is welcome.
- **Find and transform references:** automatically search for substantial design work, inspect up to three useful references, distinguish observations from guesses, compare two concepts, and choose an original implementation. Small fixes skip the research pipeline.
- **Make purposeful components:** synchronize product explanation and demo states, preserve continuity when work expands, or switch evidence views without losing focus. Pick the mechanism that suits the content, rather than applying one effect everywhere.
- **Verify what runs:** agreed-size screenshots, intermediate animation states, reverse/rapid input, keyboard, reduced motion, failed initialization, and relevant project checks. State unrun checks explicitly.
- **Preserve the project:** retain the framework, actual facts, routes, forms, and user state; profile and plan before redesigning.

It provides instructions, original specimens, tokens, and helper scripts. It does not supply a hosted design service, guarantee a particular generated result, or replace browser judgment.

## Try the specimens

Clone/download this repository and serve its root:

```bash
python -m http.server 8000
```

Open:

- `http://localhost:8000/frontend-studio/assets/examples/motion-lab.en.html` — English mechanism lab: scroll-linked product states, work expansion/reflow, research tabs, SVG and pointer feedback.
- `http://localhost:8000/frontend-studio/assets/examples/motion-lab.html` — Chinese version of the mechanism lab.
- `http://localhost:8000/frontend-studio/assets/examples/typography-lab.html` — three typography scales and Chinese/Latin/numeric copy.
- `http://localhost:8000/frontend-studio/assets/starters/static/index.html` — neutral static starter.

Skill instructions and current guides are English. Both English and Chinese motion specimens are included. Typography/starter sample text and some inherited helper diagnostics/comments remain Chinese intentionally or from the working edition; examples exercise mixed-script typography. No custom fonts or third-party component code are bundled.

## Checks and compatibility

Node 22+ runs the dependency-free font tests and package checks:

```bash
npm test
npm run check
```

Browser helpers optionally require Playwright. See the [tool guide](docs/tools.md). Static CI checks syntax, package links/metadata, font-report regressions, and sample audit risks; it does not certify generated pages.

The specimens were checked in Chromium on Windows at 1280/1536px, including interruptible interaction, keyboard, reduced motion, and content fallbacks. This desktop release does **not** claim mobile, cross-browser, screen-reader, Lighthouse, or measured Core Web Vitals validation. See [the report](docs/validation.md).

## Contribute a useful failure case

Share a minimal reproducible page, the task/prompt, actual result, and a redacted screenshot. Typography edge cases, interruption bugs, and content-specific component ideas are especially useful. See [CONTRIBUTING](CONTRIBUTING.md).

If this improves your workflow, a star helps others find it. Feedback and reproducible examples help improve it.

MIT for this project's original material. Referenced resources keep their own licenses; see [LICENSE](LICENSE) and [sources](frontend-studio/SOURCES.md).
