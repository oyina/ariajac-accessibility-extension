# Demo Lab Sprint Journal

## Delivered

- Added the separate `/demo` route and a dashboard link to it.
- Added Mixed, Low Vision, Color Vision, Motor, Cognitive, and Motion
  scenarios with scenario-dependent content rendering.
- Added stable `data-ariajac-demo` instrumentation markers. Audit logic
  does not inspect these markers.
- Kept scenario controls outside the sample article with accessible
  names, keyboard focus styling, and adequate targets.
- Added a visible stop control for the Motion scenario.
- Added component metadata regression assertions.

## Verification

- `node components/tests/demo-lab.test.js` passed.
- Jac checks for `main.jac`, `components/DemoLab.jac`, and
  `components/AccessibilityAudit.jac` completed without compile errors;
  existing React Router/import and generic typing warnings remain.
- The JacHammer-managed app server reports ready and serves SPA HTML at
  `/` and `/demo`.
- Browser validation could not hydrate either route in the provided
  preview session: it displays the JacHammer "Almost there..." startup
  screen with no interactive elements. This appears to be a managed
  preview/runtime issue; scenario interaction is not claimed as verified
  in the browser.
- Extension audit and repair behavior against `/demo` still requires
  manual Chrome verification.

## Existing work preserved

The existing dashboard route, Chrome extension, deployed Jac audit API,
local fallback audit, and reversible repair controls were not replaced.
No AI, automatic semantic repairs, ElevenLabs, or profile features were
added.
