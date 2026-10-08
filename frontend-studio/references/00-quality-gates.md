# Quality gates

Evidence belongs to the implemented page, not to the skill's example page. Record check, environment, result, and evidence path. Static reports are risk signals, not visual or accessibility certification.

## Inspect the running page

At agreed viewport sizes, capture the initial page and important sections. Default sizes are 360/768/1280/1536; desktop-only tasks use 1280/1536 and declare mobile unverified. Open the images. Check one clear first-screen focal point, consistent roles, aligned comparable modules, natural heading breaks, sufficient whitespace, no nested decorative containers, no overlapping or clipped text, and useful visible actions.

Use a browser, Playwright, or the environment's renderer. A personal rendering kit is optional, never a dependency. Recheck after changes; screenshots from an earlier revision do not validate the final files.

## Functional and failure checks

Use Tab, Shift+Tab, Enter, Space, Escape, and expected arrow keys. Focus must be visible and remain logical during transitions. Check headings, labels, semantic controls, route links, forms, errors, and saved state. Exercise longest copy, empty/loading/error states, mixed scripts, long filenames, and 200% text enlargement. Test custom-font failure; system-only samples do not have a custom download to block.

For motion inspect initial/middle/end, reverse scrolling, rapid interactions, resize, reduced-motion changes, no JavaScript, simulated initialization failure, and cleanup. Main text/actions remain available. Interrupted transitions converge on the most recent request.

## Automated checks

Run the existing project's tests, build, and lint when applicable. Included tools can assist with token extraction, static UI audit, screenshots, and profiling. Static audit success cannot establish WCAG conformance, runtime font selection, or Core Web Vitals. Use browser inspection and appropriate measurement separately.

Deliver passed/failed/unrun checks and paths to inspected evidence, change rationale, runnable instructions, source records, and rollback. Never describe unrun Lighthouse, screen-reader, mobile, or physical-device tests as passed.
