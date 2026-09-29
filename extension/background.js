importScripts("shared/message-contract.js", "shared/dom-snapshot.js");

(() => {
  const { MESSAGE_TYPE, ERROR_TYPE } = globalThis.AriaMessage;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== MESSAGE_TYPE) return false;
    if (!Number.isInteger(message.tabId)) {
      sendResponse({ type: ERROR_TYPE, ok: false, error: "No active webpage is available." });
      return false;
    }
    chrome.tabs.sendMessage(message.tabId, { type: MESSAGE_TYPE }, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
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
      sendResponse(response);
    });
    return true;
  });
})();
