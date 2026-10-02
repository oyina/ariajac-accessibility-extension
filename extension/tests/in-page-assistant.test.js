const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extensionRoot = path.resolve(__dirname, "..");
const contentSource = fs.readFileSync(path.join(extensionRoot, "content.js"), "utf8");
const contentListeners = [];
const hostChildren = [];
const hostById = new Map();
const target = { style: { outline: "", outlineOffset: "" }, scrollIntoView() { this.scrolled = true; } };
let auditRequests = 0;

class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {};
    this.style = { cssText: "" }; this.hidden = false; this.disabled = false; this.textContent = ""; this.listeners = {};
    this.classList = { add() {}, remove() {}, contains() { return false; } };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.children.push(node); if (node.id) shadow.idMap.set(node.id, node); return node; }
  set innerHTML(markup) {
    this.markup = markup;
    for (const match of markup.matchAll(/<([a-z0-9]+)[^>]*id="([^"]+)"[^>]*>/gi)) {
      const child = new Element(match[1]); child.id = match[2]; shadow.idMap.set(child.id, child); this.children.push(child);
    }
  }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  setPointerCapture() {}
  focus() { this.focused = true; }
  closest(selector) { return selector === "button" && this.tagName === "BUTTON" ? this : null; }
  attachShadow() { this.shadowRoot = shadow; return shadow; }
}
class ShadowRoot extends Element {
  constructor() { super("shadow-root"); this.idMap = new Map(); }
  appendChild(node) { this.children.push(node); if (node.id) this.idMap.set(node.id, node); return node; }
  querySelector(selector) { return this.idMap.get(selector.slice(1)) || null; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
}
const shadow = new ShadowRoot();
const doc = {
  documentElement: { appendChild(node) { hostChildren.push(node); hostById.set(node.id, node); }, classList: { add() {}, remove() {}, contains() { return false; } } },
  getElementById(id) { return hostById.get(id) || null; }, createElement(tag) { return new Element(tag); },
  querySelector(selector) { return selector === "#target" ? target : null; }, querySelectorAll() { return []; }, title: "Assistant test page",
};
const localIssue = {
  id: "name:el-target", element_id: "el-target", selector: "#target", category: "Semantic", severity: "high",
  description: "Interactive control has no detectable accessible name.", wcag_reference: "WCAG 2.2 SC 4.1.2", element_name: "button",
};
const auditResult = { page: { title: "Assistant test page" }, issues: [localIssue], severity: { critical: 0, high: 1, medium: 0, low: 0 }, issueCount: 1 };
const snapshot = { page: { title: "Assistant test page" }, snapshotId: "snap-1", elements: [{ id: "el-target", selector: "#target", tag: "button", accessibleName: "", interactive: true, focusable: true, hasFormLabel: true, bounds: { width: 36, height: 36 } }], relationships: [] };
const context = vm.createContext({
  document: doc, window: { innerHeight: 800, location: { href: "https://example.test" }, getComputedStyle: () => ({}) },
  chrome: { runtime: {
    onMessage: { addListener(callback) { contentListeners.push(callback); } },
    sendMessage(message, callback) {
      if (message.type === "ARIAJAC_PAGE_PING") auditRequests++;
      callback({ ok: true, audit: auditResult, auditSource: "jac" });
    },
  } },
  sessionStorage: { getItem() { return null; }, setItem() {} },
  setTimeout: () => 1, clearTimeout() {}, URL, Date, JSON, Object, Array, Set, Map, Math, Number, Boolean, String, Promise,
  globalThis: null, console,
});
context.globalThis = context;
context.AriaMessage = { MESSAGE_TYPE: "ARIAJAC_PAGE_PING", RESPONSE_TYPE: "ARIAJAC_PAGE_PONG", ERROR_TYPE: "ARIAJAC_MESSAGE_ERROR", HIGHLIGHT_TYPE: "ARIAJAC_HIGHLIGHT" };
context.AriaDomSnapshot = { normalizeDocument: () => snapshot, diffSnapshots: () => ({ added: [], removed: [], changed: [] }) };
context.AriaAudit = { auditSnapshot: () => auditResult };
context.AriaTransform = { applyFixes: () => ({ entries: [] }), restoreTransform: () => 0, setFocusMode: () => ({}), restoreFocusMode: () => 0 };

vm.runInContext(contentSource, context, { filename: "content.js" });
assert.equal(hostChildren.length, 1, "initialization injects one host");
assert.equal(hostChildren[0].shadowRoot, shadow, "assistant renders inside Shadow DOM");
const tab = shadow.children.find((node) => node.id === "aj-tab");
tab.listeners.click();
assert.equal(shadow.querySelector("#aj-panel").hidden, false, "tab opens the panel");
assert.equal(shadow.querySelector("#aj-audit").focused, true, "opening moves focus into the assistant");
shadow.querySelector("#aj-audit").listeners.click();
setImmediate(() => {
  assert.equal(auditRequests, 1, "panel requests audit through extension runtime");
  assert.match(shadow.querySelector("#aj-connection").textContent, /Jac connected/);
  assert.equal(shadow.querySelector("#aj-issues").children.length, 1, "finding renders into panel");
  const finding = shadow.querySelector("#aj-issues").children[0];
  const highlightButton = finding.children.find((child) => child.tagName === "BUTTON");
  highlightButton.listeners.click();
  assert.equal(target.scrolled, true, "highlight scrolls to the correct element");
  assert.equal(target.style.outline, "3px solid #b42318");
  shadow.listeners.keydown({ key: "Escape", stopPropagation() {} });
  assert.equal(shadow.querySelector("#aj-panel").hidden, true, "Escape collapses the panel");
  assert.equal(tab.hidden, false, "floating tab remains available to reopen");
  vm.runInContext(contentSource, context, { filename: "content-second-init.js" });
  assert.equal(hostChildren.length, 1, "repeated initialization does not duplicate the panel");
  console.log("PASS Shadow DOM injection, once-only initialization, panel open/Escape, runtime audit findings, and correct highlight target");
});