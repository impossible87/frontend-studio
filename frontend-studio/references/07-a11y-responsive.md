# Accessibility and layout resilience

Use native semantics first: landmarks, logical headings, buttons for actions, links for navigation, labeled inputs, fieldsets for related controls, appropriate image descriptions, and real table headers for data. Add ARIA only for needed relationships and states; it does not replace behavior.

Check keyboard navigation with visible focus, logical order, no unintended trap, Escape where appropriate, and focus restoration after dialogs. Tabs need expected arrow/Home/End behavior and consistent selected state. Disclosure controls expose expanded state. Pointer-only interactions require equivalent controls. Announce meaningful asynchronous feedback without excessive live-region chatter.

Check ordinary text contrast at 4.5:1 and large text/necessary UI contrast at 3:1. Avoid color as the sole indicator. Check supported themes and states. Inspect 200% enlargement and user text-spacing overrides; preserve information and actions. Test reduced motion initially and during use. Automated audits cover only part of accessibility; record unrun screen-reader checks.

## Viewport scope

Normally inspect 360, 768, 1280, and 1536. If the user specifies desktop-only, check 1280/1536 and state mobile unverified. Reflow layout, reduce columns, and adjust meaningful breaks rather than shrinking core text. Content determines breakpoint changes, not a screenshot target alone.

Use real text, em/ic measure for Chinese, flexible grid/flex constraints, max-inline-size, min-width:0 where justified, and suitable overflow-wrap for long unbreakable input. Do not conceal defects through global overflow:hidden or truncating important information. Tables and diagrams may require explicit usable overflow controls. Inspect containers and controls as well as body scrollWidth.

Check loading, empty, error, longest content, mixed languages, dynamic data, failed custom fonts, no JS, and initialization failure. Refer to [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and the [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) for current criteria/patterns. A sample passing these checks is not a blanket conformance claim for generated sites.
