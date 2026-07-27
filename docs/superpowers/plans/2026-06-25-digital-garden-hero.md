# Digital Garden Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify only the first-screen “Digital Garden” hero for Yulia’s portfolio, with an original botanical water texture, real-time liquid mosaic distortion, magnetic pointer response, stable DOM copy, responsive behavior, and reduced-motion fallback.

**Architecture:** A Vite + React page owns accessible DOM content while a Three.js full-screen canvas renders the garden texture. A focused shader module handles water drift, irregular mosaic sampling, pointer distance-field distortion, and text-safe attenuation; a small interaction state module normalizes pointer velocity and motion preferences so its behavior can be tested without WebGL.

**Tech Stack:** React, TypeScript, Vite, Three.js, Vitest, Testing Library, CSS.

---

## File map

- `package.json`: scripts and dependencies.
- `vite.config.ts`: Vite and Vitest configuration.
- `tsconfig.json`: TypeScript configuration.
- `index.html`: application entry document.
- `src/main.tsx`: React bootstrap.
- `src/App.tsx`: first-screen composition only.
- `src/styles.css`: hero typography, navigation, overlays, responsive and reduced-motion styles.
- `src/components/DigitalGardenHero.tsx`: accessible DOM hero content and canvas mount.
- `src/components/DigitalGardenScene.tsx`: Three.js lifecycle, resize and pointer wiring.
- `src/garden/interaction.ts`: pure pointer normalization, velocity and safe-zone calculations.
- `src/garden/shaders.ts`: vertex and fragment shader strings.
- `src/garden/scene.ts`: renderer, uniforms and animation-loop construction.
- `src/garden/content.ts`: bilingual first-screen copy candidates and active initial copy.
- `src/assets/digital-garden-hero.png`: generated original source texture.
- `src/test/setup.ts`: DOM test setup.
- `src/garden/interaction.test.ts`: pointer and safe-zone behavior.
- `src/components/DigitalGardenHero.test.tsx`: content, accessibility and reduced-motion behavior.

### Task 1: Bootstrap the tested application shell

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/test/setup.ts`
- Create: `src/main.tsx`
- Test: `src/components/DigitalGardenHero.test.tsx`

- [ ] Write a failing component test that expects Yulia’s name, role, navigation labels, and a canvas fallback label.
- [ ] Run the isolated test and confirm it fails because the application files do not exist.
- [ ] Add the smallest Vite/React shell and test configuration required to render the component.
- [ ] Run the test and confirm the shell is green.

### Task 2: Implement testable interaction math

**Files:**
- Create: `src/garden/interaction.test.ts`
- Create: `src/garden/interaction.ts`

- [ ] Write failing tests for normalized pointer coordinates, clamped velocity, radial falloff, and reduced influence inside the text safe zone.
- [ ] Run the tests and confirm each fails due to missing exports.
- [ ] Implement pure functions with deterministic inputs and no DOM dependency.
- [ ] Run the tests and confirm all interaction tests pass.

### Task 3: Build the first-screen DOM layer

**Files:**
- Create: `src/garden/content.ts`
- Create: `src/components/DigitalGardenHero.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Modify: `src/components/DigitalGardenHero.test.tsx`

- [ ] Extend the component test to verify the active English headline, `UI/UX Designer`, language control, scroll cue, and no Projects/About content.
- [ ] Run the test and confirm the missing hero structure fails.
- [ ] Implement the first-screen DOM hierarchy with stable semantic text above the canvas.
- [ ] Add responsive typography, a local quiet-zone overlay, navigation and focus-visible states.
- [ ] Run component tests and confirm they pass.

### Task 4: Implement the real-time digital garden scene

**Files:**
- Create: `src/garden/shaders.ts`
- Create: `src/garden/scene.ts`
- Create: `src/components/DigitalGardenScene.tsx`
- Modify: `src/components/DigitalGardenHero.tsx`
- Add: `src/assets/digital-garden-hero.png`

- [ ] Extend tests with a mocked WebGL boundary to verify the scene pauses for reduced motion and cleans up on unmount.
- [ ] Run tests and confirm the lifecycle expectations fail.
- [ ] Copy the generated project-bound texture into `src/assets/digital-garden-hero.png`.
- [ ] Implement a full-screen plane with cover-cropped texture UVs.
- [ ] Add slow dual-frequency water displacement, irregular cell sizing, per-cell scale/exposure variance, pointer magnetic displacement, and velocity-driven ripple.
- [ ] Attenuate distortion in the left-center text safe zone.
- [ ] Cap DPR at 2 and pause animation when the page is hidden.
- [ ] Run all tests and confirm they pass.

### Task 5: Verify production behavior and visual quality

**Files:**
- Modify only files implicated by verification findings.

- [ ] Run unit and component tests.
- [ ] Run a production build and confirm no TypeScript or bundling errors.
- [ ] Start the local site and inspect desktop at 1440×900 and 1280×720.
- [ ] Inspect mobile at 390×844.
- [ ] Verify pointer response, quiet-zone readability, resizing, reduced motion and WebGL fallback.
- [ ] Capture a final screenshot for review.

### Task 6: Multi-agent review

**Files:**
- Review only; fixes remain in the owning implementation files.

- [ ] Dispatch a UI/UX reviewer to assess first impression, hierarchy, readability and whether the result feels like a digital garden rather than a decorative flower video.
- [ ] Dispatch a performance/accessibility reviewer to assess rendering cost, reduced motion, fallback and input behavior.
- [ ] Dispatch a code-quality reviewer to assess lifecycle cleanup, shader boundaries and maintainability.
- [ ] Resolve P0/P1 findings, rerun verification, and request re-review when necessary.

## Self-review

- Scope is limited to the first screen.
- The generated image is a source texture, not the finished visual effect.
- Text remains accessible DOM and never depends on WebGL.
- Projects and About are explicitly excluded.
- Pointer interaction has a non-hover mobile/reduced-motion fallback.
- Tests cover behavior that can be deterministic; browser verification covers visual shader output.

