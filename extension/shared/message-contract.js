(() => {
  const MESSAGE_TYPE = "ARIAJAC_PAGE_PING";
  const RESPONSE_TYPE = "ARIAJAC_PAGE_PONG";
  const ERROR_TYPE = "ARIAJAC_MESSAGE_ERROR";
  const HIGHLIGHT_TYPE = "ARIAJAC_HIGHLIGHT";

  const contract = Object.freeze({ MESSAGE_TYPE, RESPONSE_TYPE, ERROR_TYPE });
  globalThis.AriaMessage = contract;
  if (typeof module !== "undefined" && module.exports) module.exports = contract;
})();
