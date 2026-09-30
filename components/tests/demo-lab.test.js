const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("components/DemoLab.jac", "utf8");
const router = fs.readFileSync("main.jac", "utf8");
const dashboard = fs.readFileSync("components/AccessibilityAudit.jac", "utf8");
const scenarios = ["mixed", "low-vision", "color-vision", "motor", "cognitive", "motion"];
for (const scenario of scenarios) {
  assert.ok(page.includes(`\"id\":\"${scenario}\"`), `scenario ${scenario} is registered`);
  assert.ok(router.includes('path="/demo"'), "demo route is wired");
}
assert.match(dashboard, /Link to="\/demo"/);
assert.match(page, /hero_copy_demo = "low-contrast-text"/);
assert.match(page, /data-ariajac-demo="image-missing-alt"/);
assert.match(page, /target_demo = "small-low-contrast-target"/);
assert.match(page, /status_demo = "color-only-status"/);
assert.match(page, /color-only-chart/);
assert.match(page, /data-ariajac-demo="color-only-error"/);
assert.match(page, /data-ariajac-demo="recommendation-clutter"/);
assert.match(page, /data-ariajac-demo="animated-banner"/);
assert.match(page, /Stop demo animation/);
assert.match(page, /aria-pressed/);
console.log("PASS Demo Lab route, six scenarios, stable barrier IDs, accessible controls, and stop-animation control");
