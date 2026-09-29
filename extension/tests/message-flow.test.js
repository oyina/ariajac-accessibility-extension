const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extensionRoot = path.resolve(__dirname, "..");
const listeners = { runtime: [], content: [] };
const button = { disabled: false, addEventListener(_event, callback) { this.onClick = callback; } };
const applyButton = { addEventListener(_event, callback) { this.onClick = callback; } };
const undoLastButton = { addEventListener(_event, callback) { this.onClick = callback; } };
const undoAllButton = { addEventListener(_event, callback) { this.onClick = callback; } };
const focusModeButton = { value: "false", textContent: "Enable Focus Mode", addEventListener(_event, callback) { this.onClick = callback; }, getAttribute() { return this.value; }, setAttribute(_name, value) { this.value = value; } };
const status = { textContent: "", dataset: {} };
const graph = { hidden: true };
const auditSection = { hidden: true };
const auditStatus = { textContent: "" };
const changes = { textContent: "" };
const elements = new Map();
const issueContainer = {
  children: [], replaceChildren() { this.children = []; },
  appendChild(item) { this.children.push(item); },
};
const counters = Object.fromEntries([
  "page-count", "element-count", "relationship-count", "graph-size",
  "count-critical", "count-high", "count-medium", "count-low",
].map((id) => [id, { textContent: "0" }]));
const documentStub = {
  title: "AriaJac communication test",
  querySelector(selector) {
    if (selector === "#check-page") return button;
    if (selector === "#status") return status;
    if (selector === "#graph") return graph;
    if (selector === "#changes") return changes;
    if (selector === "#audit") return auditSection;
    if (selector === "#audit-status") return auditStatus;
    if (selector === "#issues") return issueContainer;
    if (selector === "#apply-fixes") return applyButton;
    if (selector === "#undo-last") return undoLastButton;
    if (selector === "#undo-all") return undoAllButton;
    if (selector === "#focus-mode") return focusModeButton;
    if (selector === "#headline") return elements.get(selector) || null;
    return counters[selector.slice(1)] || null;
  },
  createElement(tag) {
    return { tagName: tag.toUpperCase(), dataset: {}, children: [], addEventListener(_name, cb) { this.onClick = cb; }, append(...items) { this.children.push(...items); } };
  },
};
const html = (tag, attrs = {}, children = []) => ({
  tagName: tag.toUpperCase(), nodeType: 1, ownerDocument: null, parentElement: null,
  children, innerText: attrs.text || "", textContent: attrs.text || "", value: "",
  id: attrs.id || "", hidden: false, href: attrs.href || "", style: { outline: "", outlineOffset: "" },
  getAttribute(name) { return attrs[name] ?? null; },
  setAttribute(name, value) { attrs[name] = String(value); },
  removeAttribute(name) { delete attrs[name]; },
  hasAttribute(name) { return Object.hasOwn(attrs, name); },
  getBoundingClientRect() { return { width: 100, height: 30 }; },
  querySelector() { return null; },
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
heading.id = "headline";
main.children = [heading];
main.parentElement = docRoot;
heading.parentElement = main;
elements.set("#headline", heading);
const all = [main, heading];
const documentPage = {
  title: "AriaJac communication test",
  location: { href: "https://example.test/path" },
  documentElement: docRoot,
  querySelectorAll() { return all; },
  createElement(tag) { return { tagName: tag.toUpperCase(), id: "", textContent: "", classList: { add() {}, remove() {}, contains() { return false; } } }; },
  querySelector(selector) { return elements.get(selector) || null; },
  head: { appendChild() {} },
  documentElement: { classList: { add() {}, remove() {}, contains() { return false; } } },
  getElementById() { return null; },
};
for (const el of all) el.ownerDocument = documentPage;
const style = { display: "block", visibility: "visible", color: "rgb(1, 2, 3)", backgroundColor: "rgb(255, 255, 255)", animationName: "none" };
const sessionValues = new Map();
const sessionStore = { getItem(key) { return sessionValues.get(key) || null; }, setItem(key, value) { sessionValues.set(key, value); } };
const contentChrome = { runtime: { onMessage: { addListener(callback) { listeners.content.push(callback); } } } };
const workerChrome = {
  runtime: { lastError: null, onMessage: { addListener(callback) { listeners.runtime.push(callback); } } },
  tabs: {
    query: async () => [{ id: 42, url: "https://example.test/path" }],
    sendMessage(tabId, message, callback) {
      assert.equal(tabId, 42);
      listeners.content[0](message, {}, callback);
    },
  },
};
const context = vm.createContext({
  chrome: workerChrome,
  document: documentPage,
  window: { location: { href: "https://example.test/path" }, getComputedStyle: () => style },
  location: { href: "https://example.test/path" }, getComputedStyle: () => style,
  URL, Date, setTimeout: () => 1, clearTimeout: () => {}, Number, Object, Array, Set, Map, Math, JSON,
  globalThis: null, module: undefined, console,
});
context.globalThis = context;
context.sessionStorage = sessionStore;
documentPage.querySelector = (selector) => documentStub.querySelector(selector) || elements.get(selector) || null;
context.importScripts = (...files) => files.forEach((file) => vm.runInContext(fs.readFileSync(path.join(extensionRoot, file), "utf8"), context, { filename: file }));
context.window = { ...context.window, document: documentPage };
context.chrome = contentChrome;
for (const file of ["shared/message-contract.js", "shared/dom-snapshot.js", "shared/audit-engine.js", "shared/transformation-engine.js", "content.js"]) {
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
  assert.equal(auditSection.hidden, false);
  assert.equal(counters["page-count"].textContent, "1");
  assert.equal(counters["element-count"].textContent, "2");
  assert.equal(counters["relationship-count"].textContent, "2");
  assert.match(changes.textContent, /Changes:/);
  await button.onClick();
  assert.equal(changes.textContent, "Changes: +0 added, −0 removed, 0 updated");
  const highlight = await context.chrome.runtime.sendMessage({ type: context.AriaMessage.HIGHLIGHT_TYPE, tabId: 42, selector: "#headline" });
  assert.equal(highlight.ok, true);
  assert.equal(heading.style.outline, "3px solid #d12b2b");
  const missing = await context.chrome.runtime.sendMessage({ type: context.AriaMessage.HIGHLIGHT_TYPE, tabId: 42, selector: "#missing" });
  assert.equal(missing.ok, false);
  const apply = await new Promise((resolve) => listeners.content[0]({ type: "ARIAJAC_APPLY_SAFE_FIXES" }, {}, resolve));
  assert.equal(apply.ok, true);
  assert.ok(apply.applied >= 0);
  const undo = await new Promise((resolve) => listeners.content[0]({ type: "ARIAJAC_UNDO_LAST" }, {}, resolve));
  assert.equal(undo.ok, true);
  assert.ok(Number.isInteger(undo.restored));
  const focus = await new Promise((resolve) => listeners.content[0]({ type: "ARIAJAC_FOCUS_MODE", enabled: true }, {}, resolve));
  assert.equal(focus.ok, true);
  const undoAll = await new Promise((resolve) => listeners.content[0]({ type: "ARIAJAC_UNDO_ALL" }, {}, resolve));
  assert.equal(undoAll.ok, true);
  console.log("PASS extraction, audit, repeat scan, highlighting, safe-fix apply/undo, and Focus Mode undo");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
