# Performance: measure the running mechanism

Preserve the existing framework and avoid unnecessary runtime dependencies. Static content may need only HTML/CSS and small native scripts. Reuse the project's motion engine before introducing another. Split noncritical functionality when the project supports it; avoid increasing first-load work for decorative features.

Use appropriately sized/compressed images, explicit dimensions/aspect ratios, modern formats when supported, and lazy loading for noncritical below-fold assets. Do not lazy-load the critical first-screen image blindly. Obtain actual licensed font files/weights, control language coverage, and preload only critical resources. System-only typography requires no fabricated font download.

During motion prefer transform/opacity, batch measurements, avoid layout reads after per-frame writes, and localize expensive masks/blur/height changes. Clean up listeners/observers/rAF/animations. Interrupted state changes must not leave temporary styles or timers running. `will-change` everywhere wastes resources; optimize based on evidence.

Inspect console/network errors, asset loads, layout shift, event responsiveness, and main-thread work. Use Lighthouse, DevTools, or relevant project tooling when available. Record tested browser/version, viewport, throttling, run conditions, and measured values. Headless CPU/rAF observations are limited evidence, not physical-device FPS or interaction-field data.

Use current [Core Web Vitals guidance](https://web.dev/articles/vitals) when measuring. The familiar good thresholds LCP≤2.5s, INP≤200ms, and CLS≤0.1 describe the documented metrics; they are not implied by static CSS or a single demo screenshot. Check current definitions before reporting. Clearly label lab results, field data, and unrun checks.

If tooling is unavailable, report observed risks and what remains unmeasured. Do not claim improved accessibility, FPS, INP, or CLS without comparison evidence. Prioritize readable content and working controls over a fragile decorative sequence.
