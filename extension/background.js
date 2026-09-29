importScripts("shared/message-contract.js", "shared/dom-snapshot.js");

(() => {
  const { MESSAGE_TYPE, ERROR_TYPE } = globalThis.AriaMessage;
  const JAC_ENDPOINT = "http://localhost:8000/function/ingest_snapshot_and_audit";

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== MESSAGE_TYPE) return false;
    if (!Number.isInteger(message.tabId)) {
      sendResponse({ type: ERROR_TYPE, ok: false, error: "No active webpage is available." });
      return false;
    }
    chrome.tabs.sendMessage(message.tabId, { type: MESSAGE_TYPE }, async (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        sendResponse({ type: ERROR_TYPE, ok: false, error: "No page snapshot received. Refresh the page and try again." });
        return;
      }
      if (!response || !response.ok) {
        sendResponse(response || { type: ERROR_TYPE, ok: false, error: "The webpage returned no snapshot." });
        return;
      }
      const serialized = JSON.stringify(response.snapshot);
      if (serialized.length > 500000) {
        sendResponse({ type: ERROR_TYPE, ok: false, error: "Snapshot was larger than the allowed transfer size." });
        return;
      }
      try {
        const auditResponse = await fetch(JAC_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot: response.snapshot }),
        });
        if (!auditResponse.ok) throw new Error(`Jac audit endpoint returned HTTP ${auditResponse.status}.`);
        const envelope = await auditResponse.json();
        const auditResult = envelope.data?.result || envelope.data || envelope;
        sendResponse({ ...response, audit: auditResult, auditAvailable: true });
      } catch (_error) {
        sendResponse({
          ...response,
          audit: null,
          auditAvailable: false,
          auditError: "Jac audit service is unavailable. Start the Jac app, then retry.",
        });
      }
    });
    return true;
  });
})();
