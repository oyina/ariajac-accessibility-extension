(() => {
  const { MESSAGE_TYPE, RESPONSE_TYPE, ERROR_TYPE, HIGHLIGHT_TYPE } = globalThis.AriaMessage;
  const { normalizeDocument, diffSnapshots } = globalThis.AriaDomSnapshot;
  const { auditSnapshot } = globalThis.AriaAudit;
  const STORAGE_KEY = "ariajac.snapshot.v1";
  let outlineTimer = null;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return false;
    if (message.type === HIGHLIGHT_TYPE) {
      try {
        const element = message.selector ? document.querySelector(message.selector) : null;
        if (!element) {
          sendResponse({ ok: false, error: "The element is no longer on this page. Run the audit again." });
          return false;
        }
        if (outlineTimer) clearTimeout(outlineTimer);
        const priorOutline = element.style.outline;
        const priorOffset = element.style.outlineOffset;
        element.style.outline = "3px solid #d12b2b";
        element.style.outlineOffset = "3px";
        if (element.scrollIntoView) element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        outlineTimer = setTimeout(() => {
          element.style.outline = priorOutline;
          element.style.outlineOffset = priorOffset;
        }, 2500);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : "Could not highlight the element." });
      }
      return false;
    }
    if (message.type !== MESSAGE_TYPE) return false;
    try {
      const snapshot = normalizeDocument(document, window);
      const priorRaw = sessionStorage.getItem(STORAGE_KEY);
      const previousSnapshot = priorRaw ? JSON.parse(priorRaw) : null;
      const changes = diffSnapshots(previousSnapshot, snapshot);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      const audit = auditSnapshot(snapshot);
      sendResponse({
        type: RESPONSE_TYPE,
        ok: true,
        page: snapshot.page,
        snapshotId: snapshot.snapshotId,
        summary: {
          pageNodes: 1,
          elementNodes: snapshot.elements.length,
          relationships: snapshot.relationships.length,
          graphSize: snapshot.elements.length + snapshot.relationships.length + 1,
        },
        changes,
        snapshot,
        audit,
      });
    } catch (error) {
      sendResponse({ type: ERROR_TYPE, ok: false, error: error instanceof Error ? error.message : "Page extraction failed." });
    }
    return false;
  });
})();
