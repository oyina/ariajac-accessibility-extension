const assert = require("node:assert/strict");
const { applyTransformation, classifyIssue, contrastRatio, restoreTransform } = require("../shared/transformation-engine.js");

function element(selector, initial = {}) {
  const props = { ...initial };
  const priorities = {};
  const style = {
    getPropertyPriority(name) { return priorities[name] || ""; },
    get minWidth() { return props.minWidth; }, set minWidth(value) { props.minWidth = value; },
    get minHeight() { return props.minHeight; }, set minHeight(value) { props.minHeight = value; },
    get color() { return props.color; }, set color(value) { props.color = value; },
    get backgroundColor() { return props.backgroundColor; }, set backgroundColor(value) { props.backgroundColor = value; },
    get animationPlayState() { return props.animationPlayState; }, set animationPlayState(value) { props.animationPlayState = value; },
    get transitionDuration() { return props.transitionDuration; }, set transitionDuration(value) { props.transitionDuration = value; },
    setProperty(name, value, priority = "") { const camel = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); props[camel] = value; priorities[name] = priority; },
    removeProperty(name) { const camel = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); delete props[camel]; delete priorities[name]; },
  };
  return { isConnected: true, style, getComputedStyle: props, classList: { add() {}, remove() {}, contains() { return false; } } };
}
function docFor(el) {
  return { getElementById() { return null; }, createElement() { return { id: "", textContent: "" }; }, head: { appendChild() {} }, documentElement: { appendChild() {} }, querySelector() { return el; } };
}
const snapshot = { elements: [{ id: "el-control", selector: "#control" }] };

const target = element("#control", { minWidth: "12px", minHeight: "18px" });
const targetIssue = { id: "target:el-control", element_id: "el-control", detected_by: "deterministic" };
assert.equal(classifyIssue(targetIssue).canAutoFix, true);
const targetTransform = applyTransformation(docFor(target), snapshot, targetIssue);
assert.equal(target.style.minWidth, "44px");
assert.equal(target.style.minHeight, "44px");
assert.equal(restoreTransform(targetTransform), 1);
assert.equal(target.style.minWidth, "12px");
assert.equal(target.style.minHeight, "18px");

const contrast = element("#control", { color: "#aaa", backgroundColor: "#eee" });
const contrastIssue = { id: "contrast:el-control", element_id: "el-control", detected_by: "deterministic", contrast_ratio: 2.1 };
assert.ok(contrastRatio("#000000", "#ffffff") >= 4.5);
const contrastTransform = applyTransformation(docFor(contrast), snapshot, contrastIssue);
assert.equal(contrast.style.color, "#000000");
assert.equal(contrast.style.backgroundColor, "#ffffff");
restoreTransform(contrastTransform);
assert.equal(contrast.style.color, "#aaa");
assert.equal(contrast.style.backgroundColor, "#eee");

const animated = element("#control", { animationPlayState: "running", transitionDuration: "1s" });
const motionIssue = { id: "motion:el-control", element_id: "el-control", detected_by: "deterministic" };
const motionTransform = applyTransformation(docFor(animated), snapshot, motionIssue);
assert.equal(animated.style.animationPlayState, "paused");
assert.equal(animated.style.transitionDuration, "0s");
restoreTransform(motionTransform);
assert.equal(animated.style.animationPlayState, "running");
assert.equal(animated.style.transitionDuration, "1s");

assert.equal(classifyIssue({ id: "motion:el-control", detected_by: "manual-review" }).canAutoFix, false);
assert.equal(classifyIssue({ id: "name:el-control", detected_by: "deterministic" }).canAutoFix, false);
assert.throws(() => applyTransformation(docFor(target), snapshot, { ...targetIssue, detected_by: "manual-review" }), /requires review/);
assert.throws(() => applyTransformation(docFor(target), snapshot, targetIssue, "run_script"), /Unknown or unsafe/);
assert.throws(() => applyTransformation(docFor(contrast), snapshot, { ...contrastIssue, contrast_ratio: null }, "set_text_color"), /Unknown or unsafe/);
console.log("PASS target, measured-contrast, and motion repairs; manual-review/unknown rejection; exact style undo");