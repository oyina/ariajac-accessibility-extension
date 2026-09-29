# AriaJac

AriaJac is a Jac-based accessibility assistant prototype with a
separate Chrome Manifest V3 extension. The extension extracts a bounded,
normalized page snapshot, requests deterministic audit findings, and can
briefly outline the element tied to a finding. It offers limited reversible CSS overrides for selected deterministic
barriers. It does not use an LLM or permanently remove page content.

## Project areas

- `main.jac` and `components/`: existing Jac web dashboard.
- `extension/`: Chrome extension, page extractor, local audit fallback,
  deployed API configuration, and deterministic tests.
- `engine/`: Jac OSP graph types, snapshot importer, audit endpoint, and
  walker modules.

## Audit API

The extension API base URL is centralized in
`extension/shared/api-config.js`. It currently targets the deployed
JacHammer application:

```text
https://preview-jac-sbx-49b6bda7e2764429b49a9e64f1df0715.jachammer.app
```

Audit endpoint:

```text
POST /function/ingest_snapshot_and_audit
Content-Type: application/json
```

Request body:

```json
{"snapshot": {"snapshotId": "...", "page": {}, "elements": [], "relationships": []}}
```

Jac's standard response envelope contains `data.result`, with the graph
summary, page metadata, severity totals, and typed `issues`. The extension
uses those findings when the API responds successfully. If the API is
unavailable, the worker returns locally computed deterministic findings
and the popup displays that fallback state. No credentials are sent.

The deployed API currently responds with
`Access-Control-Allow-Origin: *`. This is Jac's documented behavior for a
single-process server; this project does not set a wildcard header itself.
The extension host permission is restricted to the specific deployed
hostname. The POST is credential-free.

## Local development and checks

Run the web dashboard:

```sh
jac install
jac start --dev main.jac
```

The Chrome extension does not require a build step. Load the `extension/`
directory as an unpacked extension.

Run deterministic extension tests with Node.js:

```sh
node extension/tests/accessibility-audit.test.js
node extension/tests/dom-snapshot.test.js
node extension/tests/message-flow.test.js
```

Check Jac modules:

```sh
jac check main.jac engine/main.jac engine/snapshot_importer.jac engine/accessibility_audit.jac engine/walkers.jac
```

## Load unpacked in Chrome

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select this project's `extension/`
   directory.
3. Open an ordinary webpage and reload the extension after code changes.
4. Open the AriaJac popup. It scans automatically and displays findings,
   severity counts, the detection source, and element references.
5. Select a finding to scroll to and temporarily outline its element.
6. Use **Apply Safe Fixes** for the supported temporary CSS overrides;
   **Undo Last Fix** and **Undo All Fixes** restore prior marker state.
7. **Enable Focus Mode** only hides regions explicitly marked
   `data-ariajac-decorative="true"` or
   `data-ariajac-unrelated="true"`; regions containing controls or main
   content are skipped.

Safe fixes apply extension-owned classes and `data-ariajac-repair`
attributes for measured low contrast, small interactive targets, animation
metadata, and keyboard focus outline. The page's original inline styles and
content are not overwritten; overrides live in an injected stylesheet and
can be undone by removing the extension-owned attributes. Focus Mode is
manual and conservative; it does not infer that arbitrary sidebars are
unrelated.

The extractor limits snapshots to 350 visible matching elements and
bounds text per element. It records selected accessibility properties,
geometry, measured foreground/background contrast, and containment; it
does not copy the entire DOM.

## Verification boundary

The deployed HTTP endpoint has been exercised with the inaccessible
fixture and returned findings for contrast, missing image alt, missing
accessible names, and undersized controls. Node tests cover the local
audit, message flow, repeated scans, and highlight requests. Actual Chrome
installation/runtime behavior still requires manual verification.
