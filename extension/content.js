(() => {
  const { MESSAGE_TYPE, RESPONSE_TYPE, ERROR_TYPE, HIGHLIGHT_TYPE } = globalThis.AriaMessage;
  const { normalizeDocument, diffSnapshots } = globalThis.AriaDomSnapshot;
  const { auditSnapshot } = globalThis.AriaAudit;
  const { applyFixes, restoreTransform, setFocusMode, restoreFocusMode } = globalThis.AriaTransform;
  const STORAGE_KEY = "ariajac.snapshot.v1";
  const transformations = [];
  let outlineTimer = null;
  let focusUndo = null;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return false;
    if (message.type === HIGHLIGHT_TYPE) {
      const target = message.selector ? document.querySelector(message.selector) : null;
      if (!target) { sendResponse({ ok: false, error: "Element not found; rerun the audit." }); return false; }
      if (outlineTimer) clearTimeout(outlineTimer);
      const oldOutline = target.style.outline, oldOffset = target.style.outlineOffset;
      target.style.outline = "3px solid #d12b2b";
      target.style.outlineOffset = "3px";
      if (target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "center" });
      outlineTimer = setTimeout(() => { target.style.outline = oldOutline; target.style.outlineOffset = oldOffset; }, 2500);
      sendResponse({ ok: true });
      return false;
    }
    if (message.type === "ARIAJAC_APPLY_SAFE_FIXES") {
      try {
        const snapshot = normalizeDocument(document, window);
        const audit = auditSnapshot(snapshot);
        const transformation = applyFixes(document, snapshot, audit.issues);
        transformations.push(transformation);
        sendResponse({ ok: true, applied: transformation.entries.length, audit: auditSnapshot(normalizeDocument(document, window)), transformation });
      } catch (error) { sendResponse({ ok: false, error: error instanceof Error ? error.message : "Could not apply safe fixes." }); }
      return false;
    }
    if (message.type === "ARIAJAC_UNDO_LAST") {
      const last = transformations.pop();
      const restored = restoreTransform(last);
      sendResponse({ ok: true, restored, audit: auditSnapshot(normalizeDocument(document, window)) });
      return false;
    }
    if (message.type === "ARIAJAC_UNDO_ALL") {
      let restored = 0;
      while (transformations.length) restored += restoreTransform(transformations.pop());
      if (focusUndo) {
        restored += restoreFocusMode(document, focusUndo);
        focusUndo = null;
      }
      sendResponse({ ok: true, restored, audit: auditSnapshot(normalizeDocument(document, window)) });
      return false;
    }
    if (message.type === "ARIAJAC_FOCUS_MODE") {
      if (focusUndo) { restoreFocusMode(document, focusUndo); focusUndo = null; }
      if (message.enabled) focusUndo = setFocusMode(document, true);
      sendResponse({ ok: true, enabled: Boolean(message.enabled) });
      return false;
    }
    if (message.type !== MESSAGE_TYPE) return false;
    try {
      const snapshot = normalizeDocument(document, window);
      const priorRaw = sessionStorage.getItem(STORAGE_KEY);
      const previousSnapshot = priorRaw ? JSON.parse(priorRaw) : null;
      const changes = diffSnapshots(previousSnapshot, snapshot);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      sendResponse({
        type: RESPONSE_TYPE,
        ok: true,
        page: snapshot.page,
        snapshotId: snapshot.snapshotId,
        summary: { pageNodes: 1, elementNodes: snapshot.elements.length, relationships: snapshot.relationships.length, graphSize: snapshot.elements.length + snapshot.relationships.length + 1 },
        changes,
        snapshot,
        audit: auditSnapshot(snapshot),
      });
    } catch (error) { sendResponse({ type: ERROR_TYPE, ok: false, error: error instanceof Error ? error.message : "Page extraction failed." }); }
    return false;
  });
})();
