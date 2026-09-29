# AriaJac

AriaJac is a Jac-based accessibility assistant prototype with a
separate Chrome Manifest V3 extension. The extension extracts a bounded,
normalized snapshot of accessibility-relevant page structure. It does
not analyze accessibility, call an LLM, or modify the page.

## Project areas

- `main.jac` and `components/`: existing Jac web dashboard.
- `extension/`: unpacked Chrome extension, DOM snapshot normalizer, and
  deterministic tests.
- `engine/`: Jac OSP graph types and the snapshot ingestion endpoint.

## Local development and checks

From the project root, install dependencies and run the web dashboard:

```sh
jac install
jac start --dev main.jac
```

Check the Jac app and engine, and run the standalone engine entry point:

```sh
jac check main.jac engine/main.jac
jac run engine/main.jac
```

Run both deterministic extension tests with Node.js (no npm packages
needed):

```sh
node extension/tests/dom-snapshot.test.js
node extension/tests/message-flow.test.js
```

The fixture test checks heading, paragraph, image, button, link, and
input records; parent/child relationships; repeat-scan deduplication;
and added, removed, and changed IDs. The message test runs popup →
service worker → content extraction and verifies the summary returned to
the popup.

The Jac server-side graph importer is exposed as
`POST /function/ingest_snapshot` when the Jac app loads
`engine/snapshot_importer.jac` into its server entry. It upserts page and
element nodes and reports per-scan ID changes and graph counts. The MV3
extension currently returns its normalized snapshot and diff to the
popup; automatic delivery from Chrome to a running Jac server is not
configured in this milestone.

Validate the extension manifest JSON:

```sh
node -e "JSON.parse(require('node:fs').readFileSync('extension/manifest.json', 'utf8')); console.log('Manifest JSON is valid')"
```

## Load unpacked in Chrome

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this project's `extension/`
   directory.
4. Open or refresh a normal webpage. Chrome internal pages and some
   restricted pages do not allow extensions.
5. Open the AriaJac popup. It scans automatically; **Check page
   connection** runs another scan. The popup shows the page name and the
   page, element, relationship, and graph-size counts. It also shows
   added, removed, and changed element counts since the previous scan.

After changing extension files, click **Reload** on AriaJac at
`chrome://extensions`, then refresh the webpage. The content script
extracts at most 350 visible matching elements and bounds captured text
per element. It records stable selector-based IDs, accessibility names,
roles, geometry, visible foreground/background colors, animation name,
focusability, and containment links. It does not copy the full DOM.

## Build/package

The extension is plain JavaScript and JSON; there is no bundler step.
Load `extension/` directly as an unpacked extension or zip that folder
for local sharing. The Jac engine is a separate module and is not bundled
into the extension.

No API keys or other secrets are required or included.
