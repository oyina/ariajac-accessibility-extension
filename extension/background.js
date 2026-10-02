importScripts("shared/message-contract.js", "shared/dom-snapshot.js", "shared/audit-engine.js", "shared/api-config.js");importScripts("shared/message-contract.js", "shared/api-config.js", "shared/audit-engine.js", "shared/transformation-engine.js");

(() => {
  const { MESSAGE_TYPE, ERROR_TYPE } = globalThis.AriaMessage;
  const JAC_ENDPOINT = globalThis.AriaApiConfig.baseUrl + globalThis.AriaApiConfig.auditPath;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return false;
    const tabId = Number.isInteger(message.tabId) ? message.tabId : sender?.tab?.id;
    if (["ARIAJAC_HIGHLIGHT", "ARIAJAC_APPLY_SAFE_FIXES", "ARIAJAC_FIX_ISSUE", "ARIAJAC_FIX_SAFE_ISSUES", "ARIAJAC_UNDO_TRANSFORMATION", "ARIAJAC_UNDO_LAST", "ARIAJAC_UNDO_ALL", "ARIAJAC_FOCUS_MODE"].includes(message.type)) {
      if (!Number.isInteger(tabId)) {
        sendResponse({ ok: false, error: "No active webpage is available." });
        return false;
      }
      chrome.tabs.sendMessage(tabId, message, (result) => {
        const lastError = chrome.runtime.lastError;
        sendResponse(lastError ? { ok: false, error: "Refresh the page and retry the highlight." } : result);
      });
      return true;
    }
    if (message.type !== MESSAGE_TYPE) return false;
    if (!Number.isInteger(tabId)) {
      sendResponse({ type: ERROR_TYPE, ok: false, error: "No active webpage is available." });
      return false;
    }
    chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPE }, async (response) => {
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
        const jacIssues = (jacResult.issues || []).map((issue) => {
          const element = response.snapshot.elements.find((item) => item.id === issue.element_id);
          const normalized = {
            ...issue,
            id: issue.issue_id,
            selector: element?.selector || null,
            element_name: element?.accessibleName || element?.tag || issue.element_id,
            contrast_ratio: element?.contrastRatio,
          };
          const classified = globalThis.AriaTransform.classifyIssue(normalized);
          return { ...normalized, can_auto_fix: classified.canAutoFix, transformation_type: classified.transformationType, potential_fix: classified.canAutoFix ? "A deterministic temporary repair is available and can be undone." : "Review this finding in page context; no automatic repair is available." };
        });
        const severity = {
          critical: jacResult.critical || 0,
          high: jacResult.high || 0,
          medium: jacResult.medium || 0,
          low: jacResult.low || 0,
        };
        sendResponse({
          ...response,
          audit: { page: response.page, issues: jacIssues, severity, issueCount: jacIssues.length },
          auditSource: "jac",
          auditError: null,
        });
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
