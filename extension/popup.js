(() => {
  const { MESSAGE_TYPE, HIGHLIGHT_TYPE } = globalThis.AriaMessage;
  const button = document.querySelector("#check-page");
  const status = document.querySelector("#status");
  const graph = document.querySelector("#graph");
  const changes = document.querySelector("#changes");
  const auditSection = document.querySelector("#audit");
  const auditStatus = document.querySelector("#audit-status");
  const issueList = document.querySelector("#issues");
  let activeTabId = null;

  async function sendPageCommand(type, payload = {}) {
    if (!Number.isInteger(activeTabId)) throw new Error("Run an audit on an active webpage first.");
    const result = await chrome.runtime.sendMessage({ type, tabId: activeTabId, ...payload });
    if (!result || result.ok === false) throw new Error(result?.error || "The page did not respond.");
    return result;
  }

  function renderAudit(audit) {
    issueList.replaceChildren();
    for (const severity of ["critical", "high", "medium", "low"]) {
      document.querySelector(`#count-${severity}`).textContent = String(audit.severity[severity] || 0);
    }
    auditStatus.textContent = `${audit.issueCount} potential accessibility issue${audit.issueCount === 1 ? "" : "s"} found. Findings are limited to detectable snapshot evidence.`;
    if (audit.issueCount === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No issues detected by these checks. This is not a complete accessibility audit.";
      issueList.appendChild(empty);
      return;
    }
    for (const issue of audit.issues) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "issue";
      item.dataset.severity = issue.severity;
      const title = document.createElement("strong");
      title.textContent = `${issue.category} · ${issue.severity}`;
      const detail = document.createElement("small");
      detail.textContent = `${issue.description} Element: ${issue.element_name}. ${issue.wcag_reference} · ${issue.detected_by}`;
      const potential = document.createElement("small");
      potential.textContent = issue.potential_fix;
      item.append(title, detail, potential);
      item.addEventListener("click", async () => {
        try {
          const response = await chrome.runtime.sendMessage({
            type: HIGHLIGHT_TYPE,
            tabId: activeTabId,
            selector: issue.selector,
          });
          if (!response?.ok) auditStatus.textContent = response?.error || "Could not identify that element on the page.";
        } catch (_error) {
          auditStatus.textContent = "Refresh the webpage and run the audit again to highlight this element.";
        }
      });
      issueList.appendChild(item);
    }
  }

  async function checkActivePage() {
    button.disabled = true;
    status.dataset.state = "loading";
    status.textContent = "Extracting and auditing page structure…";
    changes.textContent = "";
    auditSection.hidden = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !Number.isInteger(tab.id)) throw new Error("No active webpage is available.");
      activeTabId = tab.id;
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
      if (response.audit) {
        auditSection.hidden = false;
        renderAudit(response.audit);
      } else {
        auditSection.hidden = false;
        auditStatus.textContent = response.auditError || "Audit results are unavailable.";
        issueList.replaceChildren();
      }
    } catch (error) {
      graph.hidden = true;
      auditSection.hidden = true;
      status.dataset.state = "error";
      status.textContent = error instanceof Error ? error.message : "Page extraction failed.";
    } finally {
      button.disabled = false;
    }
  }

  const applyButton = document.querySelector("#apply-fixes");
  const undoLastButton = document.querySelector("#undo-last");
  const undoAllButton = document.querySelector("#undo-all");
  const focusModeButton = document.querySelector("#focus-mode");

  applyButton.addEventListener("click", async () => {
    try {
      const result = await sendPageCommand("ARIAJAC_APPLY_SAFE_FIXES");
      auditStatus.textContent = `Applied ${result.applied} reversible safe fix${result.applied === 1 ? "" : "es"}.`;
      renderAudit(result.audit);
    } catch (error) { auditStatus.textContent = error.message; }
  });
  undoLastButton.addEventListener("click", async () => {
    try {
      const result = await sendPageCommand("ARIAJAC_UNDO_LAST");
      auditStatus.textContent = `Undid the last fix batch; restored ${result.restored} element change${result.restored === 1 ? "" : "s"}.`;
      renderAudit(result.audit);
    } catch (error) { auditStatus.textContent = error.message; }
  });
  undoAllButton.addEventListener("click", async () => {
    try {
      const result = await sendPageCommand("ARIAJAC_UNDO_ALL");
      focusModeButton.setAttribute("aria-pressed", "false");
      focusModeButton.textContent = "Enable Focus Mode";
      auditStatus.textContent = `Undid all fix batches; restored ${result.restored} element change${result.restored === 1 ? "" : "s"}.`;
      renderAudit(result.audit);
    } catch (error) { auditStatus.textContent = error.message; }
  });
  focusModeButton.addEventListener("click", async () => {
    const enabled = focusModeButton.getAttribute("aria-pressed") !== "true";
    try {
      await sendPageCommand("ARIAJAC_FOCUS_MODE", { enabled });
      focusModeButton.setAttribute("aria-pressed", String(enabled));
      focusModeButton.textContent = enabled ? "Disable Focus Mode" : "Enable Focus Mode";
      auditStatus.textContent = enabled ? "Focus Mode enabled for explicitly marked decorative regions." : "Focus Mode disabled.";
    } catch (error) { auditStatus.textContent = error.message; }
  });

  button.addEventListener("click", checkActivePage);
  checkActivePage();
})();
