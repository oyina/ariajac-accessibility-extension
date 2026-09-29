(() => {
  const { MESSAGE_TYPE } = globalThis.AriaMessage;
  const button = document.querySelector("#check-page");
  const status = document.querySelector("#status");
  const graph = document.querySelector("#graph");
  const changes = document.querySelector("#changes");

  async function checkActivePage() {
    button.disabled = true;
    status.dataset.state = "loading";
    status.textContent = "Extracting page structure…";
    changes.textContent = "";
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !Number.isInteger(tab.id)) throw new Error("No active webpage is available.");
      const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPE, tabId: tab.id });
      if (!response || !response.ok) throw new Error(response?.error || "The page did not respond.");
      const summary = response.summary;
      if (!summary || !response.snapshot) throw new Error("The response did not include a page graph snapshot.");
      status.dataset.state = "success";
      status.textContent = `Snapshot ${response.snapshotId}: ${response.page.title}`;
      document.querySelector("#page-count").textContent = String(summary.pageNodes);
      document.querySelector("#element-count").textContent = String(summary.elementNodes);
      document.querySelector("#relationship-count").textContent = String(summary.relationships);
      document.querySelector("#graph-size").textContent = String(summary.graphSize);
      graph.hidden = false;
      const diff = response.changes || { added: [], removed: [], changed: [] };
      changes.textContent = `Changes: +${diff.added.length} added, −${diff.removed.length} removed, ${diff.changed.length} updated`;
    } catch (error) {
      graph.hidden = true;
      status.dataset.state = "error";
      status.textContent = error instanceof Error ? error.message : "Page extraction failed.";
    } finally {
      button.disabled = false;
    }
  }

  button.addEventListener("click", checkActivePage);
  checkActivePage();
})();
