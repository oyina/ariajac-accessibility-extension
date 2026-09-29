(() => {
  const { MESSAGE_TYPE, RESPONSE_TYPE, ERROR_TYPE } = globalThis.AriaMessage;
  const { normalizeDocument, diffSnapshots } = globalThis.AriaDomSnapshot;
  const STORAGE_KEY = "ariajac.snapshot.v1";

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== MESSAGE_TYPE) return false;
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
        summary: {
          pageNodes: 1,
          elementNodes: snapshot.elements.length,
          relationships: snapshot.relationships.length,
          graphSize: snapshot.elements.length + snapshot.relationships.length + 1,
        },
        changes,
        snapshot,
      });
    } catch (error) {
      sendResponse({ type: ERROR_TYPE, ok: false, error: error instanceof Error ? error.message : "Page extraction failed." });
    }
    return false;
  });
})();
