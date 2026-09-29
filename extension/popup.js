(() => {
  const { MESSAGE_TYPE } = globalThis.AriaMessage;
  const button = document.querySelector("#check-page");
  const status = document.querySelector("#status");

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.dataset.state = "loading";
    status.textContent = "Checking the current webpage…";

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !Number.isInteger(tab.id)) throw new Error("No active webpage is available.");

      const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPE, tabId: tab.id });
      if (!response || !response.ok) throw new Error(response?.error || "The page did not respond.");

      status.dataset.state = "success";
      status.textContent = `Connected: ${response.page.title} (${response.page.url})`;
    } catch (error) {
      status.dataset.state = "error";
      status.textContent = error instanceof Error ? error.message : "Could not connect to the page.";
    } finally {
      button.disabled = false;
    }
  });
})();
