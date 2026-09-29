(() => {
  const { MESSAGE_TYPE, ERROR_TYPE } = globalThis.AriaMessage;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== MESSAGE_TYPE) return false;

    const tabId = message.tabId;
    if (!Number.isInteger(tabId)) {
      sendResponse({ type: ERROR_TYPE, ok: false, error: "No active webpage is available." });
      return false;
    }

    chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPE }, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        sendResponse({
          type: ERROR_TYPE,
          ok: false,
          error: "The page did not respond. Try refreshing the webpage, then retry.",
        });
        return;
      }
      sendResponse(response || { type: ERROR_TYPE, ok: false, error: "The page returned no response." });
    });

    return true;
  });
})();
