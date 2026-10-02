((root) => {
  const CLASS_NAME = "ariajac-safe-fix";
  const FOCUS_CLASS = "ariajac-focus-mode";
  const STYLE_ID = "ariajac-repair-styles";
  const ALLOWED_TYPES = new Set(["increase_target", "set_text_color", "pause_animation"]);

  function createStyle(doc) {
    let style = doc.getElementById(STYLE_ID);
    if (!style) {
      style = doc.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        .${CLASS_NAME}[data-ariajac-repair~="set_text_color"] { color: #000 !important; background-color: #fff !important; }
        .${CLASS_NAME}[data-ariajac-repair~="increase_target"] { min-width: 44px !important; min-height: 44px !important; }
        .${CLASS_NAME}[data-ariajac-repair~="pause_animation"] { animation-play-state: paused !important; transition-duration: 0s !important; }
        .${FOCUS_CLASS} [data-ariajac-focus-hidden="true"] { display: none !important; }
      `;
      (doc.head || doc.documentElement).appendChild(style);
    }
    return style;
  }

  function classifyIssue(issue) {
    const type = String(issue?.id || issue?.issue_id || "").split(":")[0];
    if (issue?.detected_by === "manual-review") return { canAutoFix: false, transformationType: null };
    if (type === "target") return { canAutoFix: true, transformationType: "increase_target" };
    if (type === "contrast" && Number(issue.contrast_ratio ?? issue.contrastRatio ?? 0) > 0) return { canAutoFix: true, transformationType: "set_text_color" };
    if (type === "motion" && issue.detected_by === "deterministic") return { canAutoFix: true, transformationType: "pause_animation" };
    return { canAutoFix: false, transformationType: null };
  }

  function recordStyle(element, property) {
    return { value: element.style[property], priority: element.style.getPropertyPriority?.(property) || "" };
  }

  function setStyle(element, property, value) {
    if (element.style.setProperty) element.style.setProperty(property.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), value, "important");
    else element.style[property] = value;
  }

  function applyTransformation(doc, snapshot, issue, explicitType) {
    if (!issue || issue.can_auto_fix === false || issue.detected_by === "manual-review") throw new Error("This finding requires review and cannot be auto-fixed.");
    const classification = classifyIssue(issue);
    const type = explicitType || issue.transformation_type || classification.transformationType;
    if (!ALLOWED_TYPES.has(type) || !classification.canAutoFix || type !== classification.transformationType) throw new Error("Unknown or unsafe transformation type.");
    const model = (snapshot.elements || []).find((item) => item.id === issue.element_id);
    if (!model?.selector) throw new Error("The finding has no valid target selector.");
    const element = doc.querySelector(model.selector);
    if (!element || !element.style) throw new Error("The target element is not available for repair.");

    createStyle(doc);
    const properties = type === "increase_target"
      ? ["minWidth", "minHeight"]
      : type === "set_text_color"
        ? ["color", "backgroundColor"]
        : ["animationPlayState", "transitionDuration"];
    const before = Object.fromEntries(properties.map((property) => [property, recordStyle(element, property)]));
    if (type === "increase_target") {
      setStyle(element, "minWidth", "44px");
      setStyle(element, "minHeight", "44px");
    } else if (type === "set_text_color") {
      const foreground = "#000000";
      const background = "#ffffff";
      if (contrastRatio(foreground, background) < 4.5) throw new Error("Replacement colors do not satisfy the contrast repair threshold.");
      setStyle(element, "color", foreground);
      setStyle(element, "backgroundColor", background);
    } else {
      setStyle(element, "animationPlayState", "paused");
      setStyle(element, "transitionDuration", "0s");
    }
    const entry = { element, elementId: issue.element_id, issueId: issue.id, description: issue.description || issue.category || "Accessibility finding", selector: model.selector, type, before };
    return { id: `transform-${Date.now()}-${Math.random().toString(16).slice(2)}`, type, reversible: true, entries: [entry], timestamp: new Date().toISOString() };
  }

  function contrastRatio(foreground, background) {
    const luminance = (hex) => {
      const value = hex.replace("#", "");
      const channels = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const a = luminance(foreground), b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  function issueTypes(issues, elementId) {
    return issues.filter((issue) => issue.element_id === elementId && classifyIssue(issue).canAutoFix).map((issue) => classifyIssue(issue).transformationType);
  }

  function addTypes(element, types) {
    if (!types.length) return [];
    const hadClass = element.classList.contains(CLASS_NAME);
    const oldValue = element.getAttribute("data-ariajac-repair");
    const hadAttribute = element.hasAttribute("data-ariajac-repair");
    const existing = new Set((oldValue || "").split(/\s+/).filter(Boolean));
    const added = types.filter((type) => !existing.has(type));
    if (!added.length) return [];
    element.classList.add(CLASS_NAME);
    for (const type of added) existing.add(type);
    element.setAttribute("data-ariajac-repair", Array.from(existing).join(" "));
    return [{ element, hadClass, oldValue, hadAttribute, added }];
  }

  function applyFixes(doc, snapshot, issues) {
    createStyle(doc);
    const entries = [];
    for (const model of snapshot.elements || []) {
      if (!model.selector) continue;
      const element = doc.querySelector(model.selector);
      if (!element) continue;
      const types = issueTypes(issues, model.id);
      const records = addTypes(element, types);
      for (const record of records) entries.push({ ...record, id: model.id, type: record.added.join("+") });
    }
    return { id: `transform-${Date.now()}-${entries.length}`, type: "safe-fixes", reversible: true, entries, timestamp: new Date().toISOString() };
  }

  function restoreTransform(transformation) {
    if (!transformation) return 0;
    let restored = 0;
    for (const entry of transformation.entries || []) {
      const element = entry.element;
      if (!element || element.isConnected === false) continue;
      if (entry.before && !entry.added) {
        for (const [property, original] of Object.entries(entry.before)) {
          if (element.style.setProperty) {
            const cssName = property.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
            if (original.value) element.style.setProperty(cssName, original.value, original.priority);
            else element.style.removeProperty(cssName);
          } else element.style[property] = original.value;
        }
        restored++;
        continue;
      }
      const current = new Set((element.getAttribute("data-ariajac-repair") || "").split(/\s+/).filter(Boolean));
      for (const type of entry.added || []) current.delete(type);
      if (entry.hadAttribute) element.setAttribute("data-ariajac-repair", entry.oldValue || "");
      else if (current.size) element.setAttribute("data-ariajac-repair", Array.from(current).join(" "));
      else element.removeAttribute("data-ariajac-repair");
      if (!entry.hadClass && !element.hasAttribute("data-ariajac-repair")) element.classList.remove(CLASS_NAME);
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
      if (!entry.element || entry.element.isConnected === false) continue;
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
        changed.push({ element, had: element.hasAttribute("data-ariajac-focus-hidden"), value: element.getAttribute("data-ariajac-focus-hidden") });
        element.setAttribute("data-ariajac-focus-hidden", "true");
      }
      return { id: `focus-${Date.now()}`, type: "focus-mode", reversible: true, enabled: true, hadRootClass, changed };
    }
    rootElement.classList.remove(FOCUS_CLASS);
    const candidates = doc.querySelectorAll("[data-ariajac-focus-hidden='true']");
    for (const element of candidates) element.removeAttribute("data-ariajac-focus-hidden");
    return { id: `focus-${Date.now()}`, type: "focus-mode", reversible: true, enabled: false, hadRootClass, changed: [] };
  }

  const api = Object.freeze({ applyFixes, applyTransformation, classifyIssue, contrastRatio, restoreTransform, setFocusMode, restoreFocusMode });
  root.AriaTransform = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);