# AriaJac

AriaJac is a Jac-based accessibility assistant prototype with a
separate Chrome Manifest V3 communication shell. The current extension
only verifies popup → service worker → content script → webpage
messaging. It does not analyze accessibility or modify the page.

## Project areas

- `main.jac` and `components/`: existing Jac web dashboard.
- `extension/`: unpacked Chrome extension shell.
- `engine/`: separate Jac engine module boundary (`PageSnapshot`,
  `AuditSession`, and an explicit unimplemented walker registry).

## Local development and checks

From the project root, install project dependencies and run the web
dashboard:

```sh
jac install
jac start --dev main.jac
```

Check the Jac web app and Jac engine entry point:

```sh
jac check main.jac engine/main.jac
jac run engine/main.jac
```

Run the deterministic message-flow harness with Node.js (no browser or
npm packages needed):

```sh
node extension/tests/message-flow.test.js
```

Validate the extension manifest JSON:

```sh
node -e "JSON.parse(require('node:fs').readFileSync('extension/manifest.json', 'utf8')); console.log('Manifest JSON is valid')"
```

## Load unpacked in Chrome

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this project's `extension/`
   directory.
4. Open or refresh an ordinary webpage (Chrome internal pages and some
   restricted pages do not allow extensions).
5. Open the AriaJac extension popup. It checks the current page
   automatically; **Check page connection** retries the check. A
   successful response shows **Connected** plus the page title and URL.
   If it cannot connect, the popup shows an error message with the next
   step.

After changing extension files, return to `chrome://extensions`, click
**Reload** on AriaJac, and refresh the webpage before reopening the
popup. Chrome may refuse content scripts on restricted browser pages.
The extension uses the `activeTab` permission for the user-invoked
active-tab query and a content script on pages matching `<all_urls>`.

## Build/package

The extension is plain JavaScript and JSON; there is no bundler step.
Load `extension/` directly as an unpacked extension or zip that folder
for local sharing. The Jac engine is an independent Jac module set and
is not bundled into the Chrome extension in this milestone.

No API keys or other secrets are required or included.
