# Color and token structure

Retain the three layers in `assets/css/tokens.css`: primitives (palette/scale), semantic roles (surface/text/border/action), and component usage. Components use semantic variables. Theme changes should mostly affect tokens, not scattered colors. Preserve an existing project system rather than importing an unrelated one.

Build neutral surfaces with controlled chroma and a deliberate accent for meaningful actions or emphasis. Semantic success/warning/error colors have functional roles. Decorative gradients, glass, huge shadows, and many competing accent colors require a content reason. OKLCH can help organize a palette; its use does not guarantee contrast.

Define foreground/background, muted text, raised/subtle surfaces, borders, action hover/active, focus, and status roles. Check computed color pairs for actual states. Ordinary text needs 4.5:1, large text and necessary UI boundaries 3:1. Check focus visibility, disabled states, dark/light themes, overlays, and image-backed text. Muted labels are still readable text.

Keep spacing, radii, shadow, typography, and motion variables in the same system. Use stable title→explanation→action spacing and consistent alignment across related modules. Section spacing expresses groups; do not give every section a new style. Dark mode should maintain hierarchy and contrast, not simply invert the palette.

`extract_tokens.mjs` distinguishes declared palettes from ad hoc literals and declared font stacks from fallback candidates. Use its findings to investigate drift. Static color math and token extraction cannot prove the rendered page is coherent; inspect the browser.
