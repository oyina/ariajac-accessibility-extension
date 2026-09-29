const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { normalizeDocument, diffSnapshots } = require("../shared/dom-snapshot.js");

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/page-snapshot.json"), "utf8"));
for (const tag of ["h1", "p", "img", "button", "a", "form", "input"]) {
  assert.ok(fixture.elements.some((item) => item.tag === tag), `fixture includes ${tag}`);
}
assert.equal(fixture.relationships.length, fixture.elements.length);
assert.equal(new Set(fixture.elements.map((item) => item.id)).size, fixture.elements.length);
assert.deepEqual(diffSnapshots(fixture, structuredClone(fixture)), { added: [], removed: [], changed: [] });
const changedFixture = structuredClone(fixture);
changedFixture.elements[1].text = "Updated heading";
changedFixture.elements.pop();
changedFixture.elements.push({ ...fixture.elements[1], id: "el-main>h2" });
const fixtureDiff = diffSnapshots(fixture, changedFixture);
assert.deepEqual(fixtureDiff.added, ["el-main>h2"]);
assert.deepEqual(fixtureDiff.removed, ["el-main>form>input"]);
assert.deepEqual(fixtureDiff.changed, ["el-main>h1"]);

function makeElement(tag, attrs = {}, text = "") {
  return {
    tagName: tag.toUpperCase(), nodeType: 1, attrs, children: [], parentElement: null,
    ownerDocument: null, innerText: text, textContent: text, value: "", hidden: false,
    href: attrs.href || "", labels: [],
    getAttribute(name) { return this.attrs[name] ?? null; },
    hasAttribute(name) { return Object.hasOwn(this.attrs, name); },
    getBoundingClientRect() { return { width: 120, height: 32 }; },
    closest(selector) {
      const tags = selector.split(",");
      let current = this;
      while (current) {
        if (tags.includes(current.tagName.toLowerCase())) return current;
        current = current.parentElement;
      }
      return null;
    },
  };
}
const root = makeElement("html");
const main = makeElement("main");
const heading = makeElement("h1", {}, "Example page");
const link = makeElement("a", { href: "https://example.test/more" }, "More details");
main.children = [heading, link];
heading.parentElement = main;
link.parentElement = main;
main.parentElement = root;
const allElements = [main, heading, link];
const doc = {
  title: "Example fixture",
  location: { href: "https://example.test/" },
  documentElement: root,
  querySelectorAll() { return allElements; },
};
for (const el of allElements) el.ownerDocument = doc;
const style = { display: "block", visibility: "visible", color: "rgb(1, 2, 3)", backgroundColor: "rgb(255, 255, 255)", animationName: "none" };
const win = { location: doc.location, getComputedStyle: () => style };
const first = normalizeDocument(doc, win);
const second = normalizeDocument(doc, win);
assert.equal(first.snapshotId, second.snapshotId, "unchanged scans have stable snapshot IDs");
assert.equal(first.elements.length, 3);
assert.equal(first.relationships.length, 3);
assert.equal(first.elements.find((item) => item.tag === "h1").role, "heading");
assert.equal(first.elements.find((item) => item.tag === "a").accessibleName, "More details");
assert.equal(diffSnapshots(first, second).added.length, 0);
assert.equal(diffSnapshots(first, second).changed.length, 0);
link.innerText = "Updated link label";
link.textContent = "Updated link label";
const third = normalizeDocument(doc, win);
assert.deepEqual(diffSnapshots(second, third).changed, ["el-html>main>a"]);
console.log("PASS DOM extraction fixture, hierarchy, stable IDs, repeat dedupe, and added/removed/changed diff");
