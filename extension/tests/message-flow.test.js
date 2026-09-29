const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extensionRoot = path.resolve(__dirname, "..");
const listeners = { runtime: [], content: [] };
const button = { disabled: false, addEventListener(_event, callback) { this.onClick = callback; } };
const status = { textContent: "", dataset: {} };
const documentStub = {
  title: "AriaJac communication test",
  querySelector(selector) {
    if (selector === "#check-page") return button;
    if (selector === "#status") return status;
    return null;
  },
};
const chromeStub = {
  runtime: {
    lastError: null,
    onMessage: { addListener(callback) { listeners.runtime.push(callback); } },
    sendMessage(message) {
      return new Promise((resolve) => {
        const keepOpen = listeners.runtime[0](message, {}, resolve);
        assert.equal(keepOpen, true, "worker must keep the response channel open");
      });
    },
  },
  tabs: {
    query: async () => [{ id: 42, url: "https://example.test/path" }],
    sendMessage(_tabId, message, callback) {
      const listener = listeners.content[0];
      assert.ok(listener, "content script listener registered");
      listener(message, {}, callback);
    },
  },
};
const context = vm.createContext({
  chrome: chromeStub,
  document: documentStub,
  location: { href: "https://example.test/path" },
  URL,
  Date,
  Number,
  Object,
  globalThis: null,
  module: undefined,
  console,
});
context.globalThis = context;

for (const file of ["shared/message-contract.js", "content.js", "background.js", "popup.js"]) {
  vm.runInContext(fs.readFileSync(path.join(extensionRoot, file), "utf8"), context, { filename: file });
}

(async () => {
  await button.onClick();
  assert.equal(status.dataset.state, "success");
  assert.equal(status.textContent, "Connected: AriaJac communication test (https://example.test/path)");
  assert.equal(button.disabled, false);
  console.log("PASS popup → service worker → content script → webpage response");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
