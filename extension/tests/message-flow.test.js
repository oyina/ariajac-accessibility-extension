const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extensionRoot = path.resolve(__dirname, "..");
const listeners = { runtime: [], content: [] };
const button = { disabled: false, addEventListener(_event, callback) { this.onClick = callback; } };
const status = { textContent: "", dataset: {} };
const graph = { hidden: true };
const counters = Object.fromEntries(["page-count", "element-count", "relationship-count", "graph-size"].map((id) => [id, { textContent: "0" }]));
const changes = { textContent: "" };
const documentStub = {
  title: "AriaJac communication test",
  querySelector(selector) {
    if (selector === "#check-page") return button;
    if (selector === "#status") return status;
    if (selector === "#graph") return graph;
    if (selector === "#changes") return changes;
    const key = selector.slice(1);
    return counters[key] || null;
  },
};
const html = (tag, attrs = {}, children = []) => ({
  tagName: tag.toUpperCase(), nodeType: 1, ownerDocument: null, parentElement: null,
  children, innerText: attrs.text || "", textContent: attrs.text || "", value: "",
  id: attrs.id || "", hidden: false, href: attrs.href || "", style: { outline: "", outlineOffset: "" },
  getAttribute(name) { return attrs[name] ?? null; },
  hasAttribute(name) { return Object.hasOwn(attrs, name); },
  getBoundingClientRect() { return { width: 100, height: 30 }; },
  closest(selector) {
    const wanted = selector.split(",");
    let current = this;
    while (current) {
      if (wanted.includes(current.tagName.toLowerCase())) return current;
      current = current.parentElement;
    }
    return null;
  },
});
const docRoot = html("html");
const main = html("main", { text: "Example" });
const heading = html("h1", { text: "Example" });
main.children = [heading];
main.parentElement = docRoot;
heading.parentElement = main;
const all = [main, heading];
const documentPage = {
  title: "AriaJac communication test",
  location: { href: "https://example.test/path" },
  documentElement: docRoot,
  querySelectorAll() { return all; },
  querySelector(selector) { return all.find((item) => `#${item.id}` === selector) || null; },
};
for (const el of all) el.ownerDocument = documentPage;
const style = { display: "block", visibility: "visible", color: "rgb(1, 2, 3)", backgroundColor: "rgb(255, 255, 255)", animationName: "none" };
const sessionValues = new Map();
const sessionStore = {
  getItem(key) { return sessionValues.get(key) || null; },
  setItem(key, value) { sessionValues.set(key, value); },
};
const contentChrome = {
  runtime: { onMessage: { addListener(callback) { listeners.content.push(callback); } } },
};
const workerChrome = {
  runtime: { lastError: null, onMessage: { addListener(callback) { listeners.runtime.push(callback); } } },
  tabs: {
    query: async () => [{ id: 42, url: "https://example.test/path" }],
    sendMessage(_tabId, message, callback) { listeners.content[0](message, {}, callback); },
  },
};
const context = vm.createContext({
  chrome: workerChrome,
  document: documentPage,
  window: { location: { href: "https://example.test/path" }, getComputedStyle: () => style },
  location: { href: "https://example.test/path" },
  getComputedStyle: () => style,
  URL,
  Date,
  setTimeout: () => 1,
  clearTimeout: () => {},
  Number,
  Object,
  Array,
  Set,
  Map,
  Math,
  JSON,
  globalThis: null,
  module: undefined,
  console,
});
context.globalThis = context;
context.sessionStorage = sessionStore;
documentPage.querySelector = documentStub.querySelector;
context.importScripts = (...files) => files.forEach((file) => vm.runInContext(fs.readFileSync(path.join(extensionRoot, file), "utf8"), context, { filename: file }));
context.window = { ...context.window, document: documentPage };
context.chrome = contentChrome;
for (const file of ["shared/message-contract.js", "shared/dom-snapshot.js", "shared/audit-engine.js", "content.js"]) {
  vm.runInContext(fs.readFileSync(path.join(extensionRoot, file), "utf8"), context, { filename: file });
}
context.chrome = workerChrome;
vm.runInContext(fs.readFileSync(path.join(extensionRoot, "background.js"), "utf8"), context, { filename: "background.js" });
context.chrome.runtime.sendMessage = (message) => new Promise((resolve) => {
  const keepOpen = listeners.runtime[0](message, {}, resolve);
  assert.equal(keepOpen, true, "worker keeps response channel open");
});
context.document = documentPage;
vm.runInContext(fs.readFileSync(path.join(extensionRoot, "popup.js"), "utf8"), context, { filename: "popup.js" });

(async () => {
  await button.onClick();
  assert.equal(status.dataset.state, "success", status.textContent);
  assert.equal(graph.hidden, false);
  assert.equal(counters["page-count"].textContent, "1");
  assert.equal(counters["element-count"].textContent, "2");
  assert.equal(counters["relationship-count"].textContent, "2");
  assert.match(changes.textContent, /Changes:/);
  await button.onClick();
  assert.equal(status.dataset.state, "success", status.textContent);
  assert.equal(changes.textContent, "Changes: +0 added, −0 removed, 0 updated");
  const highlightResult = await new Promise((resolve) => listeners.content[0]({ type: context.AriaMessage.HIGHLIGHT_TYPE, selector: "#missing" }, {}, resolve));
  assert.equal(highlightResult.ok, false);
  console.log("PASS popup → worker → content extraction, repeat-scan diff, and safe highlight lookup");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
