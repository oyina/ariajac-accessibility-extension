(() => {
  const { MESSAGE_TYPE, RESPONSE_TYPE } = globalThis.AriaMessage;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== MESSAGE_TYPE) return false;

    sendResponse({
      type: RESPONSE_TYPE,
      ok: true,
      page: {
        title: document.title || "Untitled page",
        url: location.href,
      },
      receivedAt: new Date().toISOString(),
    });
    return false;
  });
})();
