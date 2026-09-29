(function (root) {
  const CLASS_NAME = "ariajac-safe-fix";
  const FOCUS_CLASS = "ariajac-focus-mode";
  const STYLE_ID = "ariajac-repair-styles";

  function createStyle(doc) {
    let style = doc.getElementById(STYLE_ID);
    if (!style) {
      style = doc.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        .${CLASS_NAME}[data-ariajac-repair~="contrast"] { color: #000 !important; background-color: #fff !important; }
        .${CLASS_NAME}[data-ariajac-repair~="target"] { min-width: 44px !important; min-height: 44px !important; }
        .${CLASS_NAME}[data-ariajac-repair~="motion"] { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
        .${CLASS_NAME}[data-ariajac-repair~="focus"]:focus { outline: 3px solid #005fcc !important; outline-offset: 3px !important; }
        .${FOCUS_CLASS} [data-ariajac-focus-hidden="true"] { display: none !important; }
      `;
      (doc.head || doc.documentElement).appendChild(style);
    }
    return style;
  }

  function issueTypes(issues, elementId) {
    return issues.filter((issue) => issue.element_id === elementId).map((issue) => issue.id.split(":")[0]);
  }

  function recordBefore(element) {
    return {
      hadClass: element.classList.contains(CLASS_NAME),
      marker: element.getAttribute("data-ariajac-repair"),
      markerHad: element.hasAttribute("data-ariajac-repair"),
    };
  }

  function addTypes(element, types) {
    if (!types.length) return [];
    const before = recordBefore(element);
    const existing = new Set((element.getAttribute("data-ariajac-repair") || "").split(/\s+/).filter(Boolean));
    const added = types.filter((type) => !existing.has(type));
    if (!added.length) return [];
    element.classList.add(CLASS_NAME);
    for (const type of added) existing.add(type);
    element.setAttribute("data-ariajac-repair", Array.from(existing).join(" "));
    return [{ element, before, added }];
  }

  function applyFixes(doc, snapshot, issues) {
    createStyle(doc);
    const entries = [];
    for (const el of snapshot.elements) {
      if (!el.selector) continue;
      const element = doc.querySelector(el.selector);
      if (!element) continue;
      const types = issueTypes(issues, el.id).filter((type) => ["contrast", "target", "motion", "focus-style"].includes(type));
      const normalized = types.map((type) => type === "focus-style" ? "focus" : type);
      const applied = addTypes(element, normalized);
      for (const record of applied) entries.push({ ...record, id: el.id, type: record.added.join("+") });
    }
    return { id: `transform-${Date.now()}-${entries.length}`, type: "safe-fixes", reversible: true, entries, timestamp: new Date().toISOString() };
  }

  function restoreTransform(transformation) {
    if (!transformation) return 0;
    let restored = 0;
    for (const entry of transformation.entries || []) {
      const { element, before, added } = entry;
      if (!element || !element.isConnected) continue;
      const current = new Set((element.getAttribute("data-ariajac-repair") || "").split(/\s+/).filter(Boolean));
      for (const type of added) current.delete(type);
      if (before.markerHad) element.setAttribute("data-ariajac-repair", before.marker || "");
      else if (current.size) element.setAttribute("data-ariajac-repair", Array.from(current).join(" "));
      else element.removeAttribute("data-ariajac-repair");
      if (!before.hadClass && !element.hasAttribute("data-ariajac-repair")) element.classList.remove(CLASS_NAME);
      restored++;
    }
    return restored;
  }

  function restoreFocusMode(doc, transformation) {
    if (!transformation) return 0;
    const rootElement = doc.documentElement;
    if (!transformation.hadRootClass) rootElement.classList.remove(FOCUS_CLASS);
    let restored = 0;
    for (const entry of transformation.changed || []) {
      if (!entry.element || !entry.element.isConnected) continue;
      if (entry.had) entry.element.setAttribute("data-ariajac-focus-hidden", entry.value || "");
      else entry.element.removeAttribute("data-ariajac-focus-hidden");
      restored++;
    }
    return restored;
  }

  function setFocusMode(doc, enabled) {
    createStyle(doc);
    const rootElement = doc.documentElement;
    const changed = [];
    const hadRootClass = rootElement.classList.contains(FOCUS_CLASS);
    if (enabled) {
      rootElement.classList.add(FOCUS_CLASS);
      const candidates = doc.querySelectorAll("[data-ariajac-decorative='true'], [role='complementary'][data-ariajac-unrelated='true'], aside[data-ariajac-unrelated='true']");
      for (const element of candidates) {
        if (element.querySelector("button, a, input, select, textarea, [role='main']")) continue;
        const before = { element, had: element.hasAttribute("data-ariajac-focus-hidden"), value: element.getAttribute("data-ariajac-focus-hidden") };
        changed.push(before);
        element.setAttribute("data-ariajac-focus-hidden", "true");
      }
      return { id: `focus-${Date.now()}`, type: "focus-mode", reversible: true, enabled: true, hadRootClass, changed };
    }
    rootElement.classList.remove(FOCUS_CLASS);
    const candidates = doc.querySelectorAll("[data-ariajac-focus-hidden='true']");
    for (const element of candidates) element.removeAttribute("data-ariajac-focus-hidden");
    return { id: `focus-${Date.now()}`, type: "focus-mode", reversible: true, enabled: false, hadRootClass, changed: [] };
  }

  const api = Object.freeze({ applyFixes, restoreTransform, setFocusMode, restoreFocusMode });
  root.AriaTransform = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
