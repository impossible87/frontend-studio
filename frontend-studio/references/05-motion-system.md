# Motion serves content and state

Read page purpose first. High-frequency tools prioritize brief state feedback. Brand pages may compose one primary moment with supporting interactions. Narrative pages may connect scenes when reading remains controlled. Avoid a page-wide uniform fade-up treatment.

## Two gates

Frequency: how often will users trigger or wait through this? Frequent interactions should be shorter and quieter.

Purpose: what information, state, spatial relationship, or specific brand feeling does the motion convey? If no answer exists, remove it. A larger motion is justified by the mechanism, not by a blanket permission to animate.

## Starting points, not universal limits

Small hover/pressed feedback often starts around 100–180ms; local state changes around 180–280ms; a larger reveal/reflow around 280–500ms. Try a short translation around 8–16px and modest emphasis if appropriate. Tune according to distance, object, frequency, interruption, and content. Scroll narratives, masks, and timelines need their own timing model. Do not impose these numbers as hard caps or claim they guarantee quality.

An ease-out such as cubic-bezier(.22,1,.36,1) can work for entrances; exits often need less time. Linear is suitable for progress, not every natural movement. Springs need controlled overshoot; do not bounce ordinary controls by default. Text should remain legible, not continually scale or move under reading.

## Implementation choice

Reuse the existing animation capability. CSS, SVG, and native Web Animations cover simple mechanisms. Use Motion or GSAP for appropriate complex layout/timeline coordination after checking the installed version's official docs. Do not add engines by default or migrate frameworks. WebGL, 3D, and particles are outside the default upgrade.

Prefer transform/opacity for frequent animation. SVG drawing, local masks/blur, and height changes have costs to assess in the actual browser. `grid-template-rows` is still layout work. Keep costly changes localized; isolate layers only when profiling warrants it. Do not add will-change to every element. Avoid per-frame layout read/write loops; batch reads, write transforms afterward, and schedule scroll/pointer updates through rAF.

For expansion/reflow, retain spatial continuity with measured geometry and controlled transforms. Avoid scaling text. Coordinate entering content and container height without stale clipping. Interrupted transitions must cancel or retarget toward the most recent state. Resize must clear obsolete inline measurements. Clean up observers, listeners, rAF, and animations on unmount or teardown. In React, use framework-safe effects and verify StrictMode/SSR behavior against the engine's current docs.

## Access and failure

Keep HTML content usable before initialization. Only hide alternate panels after enhancement succeeds, and restore static content if it fails. Main text/actions never wait for a full intro. Scroll narratives need direct controls. Pointer or drag mechanisms need click/keyboard equivalents. Focus must not disappear when panels change. Tabs expose selection and implement their expected keyboard behavior.

Handle prefers-reduced-motion initially and when it changes. Preserve information and functional state changes while removing large travel, parallax, looping, and elaborate choreography. Do not simply hide content or disable actions. Avoid scroll hijacking.

## Validate before propagation

Run one representative section at agreed sizes. Inspect initial/middle/end, reverse and fast scrolling, rapid switches, keyboard, resize, reduced motion, no JS, initialization failure, and cleanup. Capture a real recording or controlled intermediate browser frames; static screenshots alone do not establish observed reference animation.

Use CPU throttling and performance profiling where available. Report environment and measured limits. Headless rAF timings are not a physical-device FPS certificate; do not invent CLS/INP results. If content or controls break, fix the mechanism before extending it.

The dependency-free motion lab demonstrates three mechanisms with direct controls and fallbacks. Adapt its relationships rather than distributing its exact composition across every project. See [Motion](https://motion.dev/docs), [GSAP](https://gsap.com/docs/v3/), and [Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) for current APIs.
