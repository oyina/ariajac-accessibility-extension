const assert = require("node:assert/strict");
const { applyFixes, restoreTransform, setFocusMode, restoreFocusMode } = require("../shared/transformation-engine.js");

function makeElement(id, attrs = {}) {
  const attributes = new Map(Object.entries(attrs));
  const classes = new Set();
  return {
    id,
    isConnected: true,
    classList: {
      contains: (value) => classes.has(value),
      add: (value) => classes.add(value),
      remove: (value) => classes.delete(value),
    },
    getAttribute: (name) => attributes.has(name) ? attributes.get(name) : null,
    hasAttribute: (name) => attributes.has(name),
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
    querySelector: () => null,
    attributes,
    classes,
  };
}
const target = makeElement("target");
const informativeSidebar = makeElement("sidebar", { "data-ariajac-unrelated": "true" });
const decorativeRegion = makeElement("decoration", { "data-ariajac-decorative": "true" });
const root = makeElement("root");
const style = { id: "", textContent: "" };
const doc = {
  head: { appendChild(node) { this.style = node; } },
  documentElement: root,
  getElementById() { return style.id ? style : null; },
  createElement() { return { id: "", textContent: "" }; },
  querySelector(selector) { return selector === "#target" ? target : null; },
  querySelectorAll(selector) {
    if (selector.includes("decorative")) return [decorativeRegion];
    return [decorativeRegion];
  },
};
const snapshot = { elements: [{ id: "el-target", selector: "#target" }] };
const issues = [
  { id: "contrast:el-target", element_id: "el-target" },
  { id: "target:el-target", element_id: "el-target" },
  { id: "focus-style:el-target", element_id: "el-target" },
];
const transform = applyFixes(doc, snapshot, issues);
assert.equal(transform.reversible, true);
assert.ok(target.classList.contains("ariajac-safe-fix"));
assert.equal(target.getAttribute("data-ariajac-repair"), "contrast target focus");
assert.equal(restoreTransform(transform), 1);
assert.equal(target.hasAttribute("data-ariajac-repair"), false);
assert.equal(target.classList.contains("ariajac-safe-fix"), false);

const focus = setFocusMode(doc, true);
assert.equal(focus.reversible, true);
assert.equal(root.classList.contains("ariajac-focus-mode"), true);
assert.equal(decorativeRegion.getAttribute("data-ariajac-focus-hidden"), "true");
assert.equal(informativeSidebar.hasAttribute("data-ariajac-focus-hidden"), false);
restoreFocusMode(doc, focus);
assert.equal(root.classList.contains("ariajac-focus-mode"), false);
assert.equal(decorativeRegion.hasAttribute("data-ariajac-focus-hidden"), false);
console.log("PASS reversible safe CSS transformations and conservative Focus Mode undo");
