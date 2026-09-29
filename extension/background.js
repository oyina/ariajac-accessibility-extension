importScripts("shared/message-contract.js", "shared/dom-snapshot.js", "shared/audit-engine.js");

(() => {
  const { MESSAGE_TYPE, ERROR_TYPE } = globalThis.AriaMessage;
  const JAC_ENDPOINT = "http://localhost:8000/function/ingest_snapshot_and_audit";

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return false;
    if (message.type === globalThis.AriaMessage.HIGHLIGHT_TYPE) {
      if (!Number.isInteger(message.tabId)) {
        sendResponse({ ok: false, error: "No active webpage is available." });
        return false;
      }
      chrome.tabs.sendMessage(message.tabId, message, (result) => {
        const lastError = chrome.runtime.lastError;
        sendResponse(lastError ? { ok: false, error: "Refresh the page and retry the highlight." } : result);
      });
      return true;
    }
    if (message.type !== MESSAGE_TYPE) return false;
    if (!Number.isInteger(message.tabId)) {
      sendResponse({ type: ERROR_TYPE, ok: false, error: "No active webpage is available." });
      return false;
    }
    chrome.tabs.sendMessage(message.tabId, { type: MESSAGE_TYPE }, async (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ type: ERROR_TYPE, ok: false, error: "No page snapshot received. Refresh the page and try again." });
        return;
      }
      if (!response || !response.ok) {
        sendResponse(response || { type: ERROR_TYPE, ok: false, error: "The webpage returned no snapshot." });
        return;
      }
      if (JSON.stringify(response.snapshot).length > 500000) {
        sendResponse({ type: ERROR_TYPE, ok: false, error: "Snapshot was larger than the allowed transfer size." });
        return;
      }
      const localAudit = globalThis.AriaAudit.auditSnapshot(response.snapshot);
      try {
        const auditResponse = await fetch(JAC_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot: response.snapshot }),
        });
        if (!auditResponse.ok) throw new Error(`Jac audit endpoint returned HTTP ${auditResponse.status}.`);
        const envelope = await auditResponse.json();
        const jacResult = envelope.data?.result || envelope.data || envelope;
        sendResponse({ ...response, audit: jacResult, auditSource: "jac", auditError: null });
      } catch (_error) {
        sendResponse({
          ...response,
          audit: localAudit,
          auditSource: "local-deterministic",
          auditError: "Jac audit endpoint unavailable; showing the extension's deterministic local checks.",
        });
      }
    });
    return true;
  });
})();
