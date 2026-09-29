const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { auditSnapshot } = require("../shared/audit-engine.js");

const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/inaccessible-snapshot.json"), "utf8"));
const result = auditSnapshot(snapshot);
const byElement = (id) => result.issues.filter((issue) => issue.element_id === id);
assert.ok(byElement("el-main>img").some((issue) => issue.id.startsWith("image-alt:")), "missing-alt finding references image");
assert.ok(byElement("el-main>button").some((issue) => issue.id.startsWith("name:")), "unlabeled-button finding references button");
assert.ok(byElement("el-main>button").some((issue) => issue.id.startsWith("target:")), "small-target finding references button");
assert.ok(byElement("el-main>h1").some((issue) => issue.id.startsWith("contrast:")), "contrast finding references text node");
assert.ok(result.issueCount >= 4);
assert.ok(result.severity.high >= 2);
assert.ok(result.issues.every((issue) => issue.id && issue.element_id && issue.wcag_reference && issue.detected_by && issue.can_auto_fix === false));
assert.ok(result.issues.some((issue) => issue.detected_by === "manual-review"));
console.log(`PASS deterministic audit: ${result.issueCount} findings across ${Object.keys(result.severity).join(", ")}`);
