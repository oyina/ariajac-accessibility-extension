const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extensionRoot = path.resolve(__dirname, "..");
const contentSource = fs.readFileSync(path.join(extensionRoot, "content.js"), "utf8");
const hostChildren = [];
const hostById = new Map();
const target = { style: { outline: "", outlineOffset: "" }, scrollIntoView() { this.scrolled = true; } };
const contentMessages = [];
let auditRequests = 0;

class Element {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {}; this.style = { cssText: "" }; this.hidden = false; this.disabled = false; this.textContent = ""; this.listeners = {}; this.classList = { add() {}, remove() {}, contains() { return false; } }; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.children.push(node); if (node.id) shadow.idMap.set(node.id, node); return node; }
  set innerHTML(markup) { this.markup = markup; for (const match of markup.matchAll(/<([a-z0-9]+)[^>]*id="([^"]+)"[^>]*>/gi)) { const child = new Element(match[1]); child.id = match[2]; shadow.idMap.set(child.id, child); this.children.push(child); } }
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
const doc = { documentElement: { appendChild(node) { hostChildren.push(node); hostById.set(node.id, node); }, classList: { add() {}, remove() {}, contains() { return false; } } }, getElementById(id) { return hostById.get(id) || null; }, createElement(tag) { return new Element(tag); }, querySelector(selector) { return selector === "#target" ? target : null; }, querySelectorAll() { return []; }, title: "Assistant test page" };
const targetIssue = { id: "target:el-target", element_id: "el-target", selector: "#target", category: "Motor", severity: "medium", description: "Interactive target is undersized.", detected_by: "deterministic", can_auto_fix: true, transformation_type: "increase_target" };
const reviewIssue = { id: "name:el-target", element_id: "el-target", selector: "#target", category: "Semantic", severity: "high", description: "Control name needs review.", detected_by: "manual-review", can_auto_fix: false };
const auditResult = { page: { title: "Assistant test page" }, issues: [targetIssue, reviewIssue], severity: { critical: 0, high: 1, medium: 1, low: 0 }, issueCount: 2 };
const snapshot = { page: { title: "Assistant test page" }, snapshotId: "snap-1", elements: [{ id: "el-target", selector: "#target", tag: "button", accessibleName: "", interactive: true, focusable: true, hasFormLabel: true, bounds: { width: 18, height: 18 } }], relationships: [] };
let transformationNumber = 0;
const context = vm.createContext({
  document: doc, window: { innerHeight: 800, location: { href: "https://example.test" }, getComputedStyle: () => ({}) }, location: { hostname: "example.test" },
  chrome: { runtime: { onMessage: { addListener(callback) { contentMessages.push(callback); } }, sendMessage(message, callback) {
    if (message.type === "ARIAJAC_PAGE_PING") auditRequests++;
    let result = { ok: true, audit: auditResult, auditSource: "jac" };
    if (message.type === "ARIAJAC_FIX_ISSUE") result = { ok: true, transformation: { id: `t${++transformationNumber}`, entries: [{ issueId: message.issueId }] }, audit: auditResult };
    if (message.type === "ARIAJAC_FIX_SAFE_ISSUES") result = { ok: true, applied: message.issueIds.length, transformations: message.issueIds.map((issueId) => ({ id: `t${++transformationNumber}`, entries: [{ issueId }] })), audit: auditResult };
    if (message.type === "ARIAJAC_UNDO_TRANSFORMATION" || message.type === "ARIAJAC_UNDO_LAST" || message.type === "ARIAJAC_UNDO_ALL") result = { ok: true, restored: 1, audit: auditResult };
    callback(result);
  } } },
  sessionStorage: { getItem() { return null; }, setItem() {} }, setTimeout: () => 1, clearTimeout() {}, URL, Date, JSON, Object, Array, Set, Map, Math, Number, Boolean, String, Promise, globalThis: null, console,
});
context.globalThis = context;
context.AriaMessage = { MESSAGE_TYPE: "ARIAJAC_PAGE_PING", RESPONSE_TYPE: "ARIAJAC_PAGE_PONG", ERROR_TYPE: "ARIAJAC_MESSAGE_ERROR", HIGHLIGHT_TYPE: "ARIAJAC_HIGHLIGHT" };
context.AriaDomSnapshot = { normalizeDocument: () => snapshot, diffSnapshots: () => ({ added: [], removed: [], changed: [] }) };
context.AriaAudit = { auditSnapshot: () => auditResult };
context.AriaTransform = { applyFixes: () => ({ entries: [] }), applyTransformation: () => ({ id: `direct-${++transformationNumber}`, entries: [{ issueId: targetIssue.id }] }), classifyIssue: (issue) => issue.detected_by === "manual-review" ? { canAutoFix: false, transformationType: null } : { canAutoFix: issue.id.startsWith("target:"), transformationType: issue.id.startsWith("target:") ? "increase_target" : null }, restoreTransform: () => 1, setFocusMode: () => ({}), restoreFocusMode: () => 0 };

vm.runInContext(contentSource, context, { filename: "content.js" });
assert.equal(hostChildren.length, 1);
assert.equal(hostChildren[0].shadowRoot, shadow);
const tab = shadow.children.find((node) => node.id === "aj-tab");
tab.listeners.click();
assert.equal(shadow.querySelector("#aj-panel").hidden, false);
assert.equal(shadow.querySelector("#aj-audit").focused, true);
shadow.querySelector("#aj-audit").listeners.click();
const tick = () => new Promise((resolve) => setImmediate(resolve));
(async () => {
  await tick();
  assert.equal(auditRequests, 1);
  assert.match(shadow.querySelector("#aj-connection").textContent, /Jac connected/);
  assert.match(shadow.querySelector("#aj-summary").textContent, /2 barriers detected · 1 safe fix available/);
  const cards = shadow.querySelector("#aj-issues").children;
  assert.equal(cards.length, 2);
  assert.equal(cards[0].children.find((item) => item.className === "aj-safe").textContent, "SAFE TO FIX");
  assert.equal(cards[1].children.find((item) => item.className === "aj-review").textContent, "REVIEW REQUIRED");
  const highlight = cards[0].children.find((node) => node.className === "aj-finding-actions").children.find((node) => node.textContent === "Highlight");
  highlight.listeners.click();
  assert.equal(target.scrolled, true);
  assert.equal(target.style.outline, "3px solid #b42318");
  const fix = cards[0].children.find((node) => node.className === "aj-finding-actions").children.find((node) => node.textContent === "Fix");
  fix.listeners.click(); await tick();
  assert.match(shadow.querySelector("#aj-status-text").textContent, /temporary repair/);
  shadow.querySelector("#aj-undo-all").listeners.click(); await tick();
  assert.match(shadow.querySelector("#aj-status-text").textContent, /Undid all repairs/);
  shadow.querySelector("#aj-fixes").listeners.click(); await tick();
  assert.match(shadow.querySelector("#aj-status-text").textContent, /Repaired 1 accessibility barrier/);
  shadow.querySelector("#aj-undo-last").listeners.click(); await tick();
  assert.match(shadow.querySelector("#aj-status-text").textContent, /Undid the last repair batch/);
  shadow.querySelector("#aj-rescan").listeners.click(); await tick();
  assert.match(shadow.querySelector("#aj-rescan-note").textContent, /repairs verified absent/);
  shadow.listeners.keydown({ key: "Escape", stopPropagation() {} });
  assert.equal(shadow.querySelector("#aj-panel").hidden, true);
  assert.equal(tab.hidden, false);
  vm.runInContext(contentSource, context, { filename: "content-second-init.js" });
  assert.equal(hostChildren.length, 1);
  console.log("PASS assistant injection, safe/review states, Fix/Undo, batch fix, undo all/last, re-scan, highlight, Escape and duplicate-init behavior");
})().catch((error) => { console.error(error); process.exitCode = 1; });