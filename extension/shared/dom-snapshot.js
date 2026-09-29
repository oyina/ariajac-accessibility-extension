(function (root) {
  const MAX_ELEMENTS = 350;
  const MAX_TEXT = 400;
  const SELECTOR = "main,header,footer,nav,section,article,aside,h1,h2,h3,h4,h5,h6,p,a,button,img,form,input,select,textarea,video,audio,[role],[tabindex]";
  const INTERACTIVE = new Set(["a", "button", "input", "select", "textarea", "summary"]);

  function textOf(el) {
    const value = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    return value.slice(0, MAX_TEXT);
  }

  function pathOf(el) {
    if (el.id) return `#${el.id}`;
    const parts = [];
    let current = el;
    while (current && current.nodeType === 1 && current !== current.ownerDocument?.documentElement) {
      let part = current.tagName.toLowerCase();
      const parent = current.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(current) + 1})`;
      }
      parts.unshift(part);
      current = parent;
    }
    return parts.join(">");
  }

  function visible(el, style) {
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
    if (style && (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse")) return false;
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    return !rect || (rect.width > 0 && rect.height > 0);
  }

  function roleOf(el, tag) {
    const explicit = el.getAttribute("role");
    if (explicit) return explicit;
    if (/^h[1-6]$/.test(tag)) return "heading";
    if (tag === "a" && el.hasAttribute("href")) return "link";
    if (tag === "button") return "button";
    if (tag === "img") return "img";
    if (tag === "form") return "form";
    if (tag === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (type === "submit" || type === "button") return "button";
      return "textbox";
    }
    if (tag === "select") return el.hasAttribute("multiple") ? "listbox" : "combobox";
    if (tag === "textarea") return "textbox";
    if (tag === "video" || tag === "audio") return tag;
    return tag === "main" ? "main" : tag === "nav" ? "navigation" : tag;
  }

  function accessibleName(el, role, text, alt) {
    const ariaLabel = el.getAttribute("aria-label");
    const labelledBy = el.getAttribute("aria-labelledby");
    const labelText = el.labels ? Array.from(el.labels).map((label) => textOf(label)).join(" ") : "";
    return (ariaLabel || labelledBy || labelText || el.getAttribute("title") || alt || el.value || text || "").trim().slice(0, MAX_TEXT);
  }

  function fingerprint(record) {
    return JSON.stringify({ ...record, bounds: record.bounds && { width: record.bounds.width, height: record.bounds.height } });
  }

  function snapshotId(records, url) {
    const source = url + "|" + records.map((record) => record.id + ":" + fingerprint(record)).join("|");
    let hash = 2166136261;
    for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
    return `snap-${(hash >>> 0).toString(16)}`;
  }

  function normalizeDocument(doc, win) {
    const winRef = win || doc.defaultView || globalThis;
    const elements = Array.from(doc.querySelectorAll(SELECTOR)).slice(0, MAX_ELEMENTS);
    const records = [];
    const ids = new Map();
    for (const el of elements) {
      const tag = el.tagName.toLowerCase();
      const style = winRef.getComputedStyle ? winRef.getComputedStyle(el) : null;
      if (!visible(el, style)) continue;
      const text = textOf(el);
      const alt = el.getAttribute("alt") || "";
      const role = roleOf(el, tag);
      const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
      let parentRelevant = el.parentElement;
      while (parentRelevant && !ids.has(parentRelevant)) parentRelevant = parentRelevant.parentElement;
      const parentId = parentRelevant ? ids.get(parentRelevant) : null;
      const id = `el-${pathOf(el)}`;
      ids.set(el, id);
      records.push({
        id, tag, role, text, accessibleName: accessibleName(el, role, text, alt),
        alt, href: el.href || null, visible: true,
        interactive: INTERACTIVE.has(tag) || el.hasAttribute("tabindex") || el.getAttribute("contenteditable") === "true",
        headingLevel: /^h[1-6]$/.test(tag) ? Number(tag[1]) : null,
        media: tag === "video" || tag === "audio" ? {
          controls: el.hasAttribute("controls"),
          autoplay: el.hasAttribute("autoplay"),
          muted: el.hasAttribute("muted"),
        } : null,
        bounds: { width: Math.round(rect.width), height: Math.round(rect.height) },
        foreground: style ? style.color : null,
        background: style ? style.backgroundColor : null,
        animation: style && style.animationName !== "none" ? style.animationName : null,
        focusable: INTERACTIVE.has(tag) || Number(el.getAttribute("tabindex")) >= 0,
        parentId,
      });
    }
    const url = doc.location?.href || winRef.location?.href || "";
    const pageId = `page-${url}`;
    const snapshot = {
      version: 1,
      snapshotId: snapshotId(records, url),
      page: { id: pageId, title: doc.title || "Untitled page", url, role: "page" },
      elements: records,
      relationships: records.map((item) => ({ sourceId: item.parentId || pageId, targetId: item.id, kind: "contains" })),
    };
    return snapshot;
  }

  function diffSnapshots(previous, next) {
    const before = new Map((previous?.elements || []).map((item) => [item.id, item]));
    const after = new Map((next?.elements || []).map((item) => [item.id, item]));
    const added = [], removed = [], changed = [];
    for (const [id, item] of after) {
      if (!before.has(id)) added.push(id);
      else if (fingerprint(before.get(id)) !== fingerprint(item)) changed.push(id);
    }
    for (const id of before.keys()) if (!after.has(id)) removed.push(id);
    return { added, removed, changed };
  }

  const api = Object.freeze({ normalizeDocument, diffSnapshots, MAX_ELEMENTS, MAX_TEXT });
  root.AriaDomSnapshot = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
