(() => {
  if (globalThis.__ariajacContentInitialized) return;
  globalThis.__ariajacContentInitialized = true;

  const { MESSAGE_TYPE, RESPONSE_TYPE, ERROR_TYPE, HIGHLIGHT_TYPE } = globalThis.AriaMessage;
  const { normalizeDocument, diffSnapshots } = globalThis.AriaDomSnapshot;
  const { auditSnapshot } = globalThis.AriaAudit;
  const { applyFixes, applyTransformation, classifyIssue, restoreTransform, setFocusMode, restoreFocusMode } = globalThis.AriaTransform;
  const STORAGE_KEY = "ariajac.snapshot.v1";
  const ROOT_ID = "ariajac-assistant-root";
  const transformations = [];
  const transformationById = new Map();
  const fixedIssueIds = new Set();
  const verifiedIssues = new Map();
  let outlineTimer = null, focusUndo = null, auditState = "idle", auditSource = "", auditError = "", audit = null;
  let shadow = null, expanded = false, panelTop = 120, dragging = null;

  function highlight(selector) {
    const target = selector ? document.querySelector(selector) : null;
    if (!target) return { ok: false, error: "Element not found; rerun the audit." };
    if (outlineTimer) clearTimeout(outlineTimer);
    const oldOutline = target.style.outline, oldOffset = target.style.outlineOffset;
    target.style.outline = "3px solid #b42318"; target.style.outlineOffset = "3px";
    if (target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "center" });
    outlineTimer = setTimeout(() => { target.style.outline = oldOutline; target.style.outlineOffset = oldOffset; }, 3000);
    return { ok: true };
  }
  function sendRuntime(message) {
    return new Promise((resolve, reject) => {
      try { chrome.runtime.sendMessage(message, (result) => { const err = chrome.runtime.lastError; if (err) reject(new Error(err.message || "Extension communication failed.")); else resolve(result); }); }
      catch (error) { reject(error); }
    });
  }
  function updateSummary() {
    if (!audit) return;
    const safeCount = audit.issues.filter((issue) => classifyIssue(issue).canAutoFix && !fixedIssueIds.has(issue.id)).length;
    shadow.querySelector("#aj-summary").textContent = `${audit.issueCount} ${audit.issueCount === 1 ? "barrier" : "barriers"} detected · ${safeCount} safe fix${safeCount === 1 ? "" : "es"} available`;
    shadow.querySelector("#aj-fixes").textContent = `Fix Safe Issues (${safeCount})`;
    shadow.querySelector("#aj-fixes").disabled = safeCount === 0 || auditState === "loading";
    shadow.querySelector("#aj-undo-last").disabled = transformations.length === 0 || auditState === "loading";
    shadow.querySelector("#aj-undo-all").disabled = transformations.length === 0 || auditState === "loading";
  }
  function renderPanel() {
    if (!shadow) return;
    const status = shadow.querySelector("#aj-status"), statusText = shadow.querySelector("#aj-status-text"), issueList = shadow.querySelector("#aj-issues"), auditButton = shadow.querySelector("#aj-audit"), badge = shadow.querySelector("#aj-connection"), panel = shadow.querySelector("#aj-panel"), tab = shadow.querySelector("#aj-tab");
    if (!status || !statusText || !issueList || !auditButton) return;
    panel.hidden = !expanded; tab.hidden = expanded; panel.style.top = `${panelTop}px`; tab.style.top = `${panelTop}px`;
    shadow.querySelector("#aj-collapse").setAttribute("aria-expanded", String(expanded));
    auditButton.disabled = auditState === "loading";
    status.dataset.state = auditState;
    if (auditState === "loading") statusText.textContent = "Analyzing page...";
    else if (auditState === "error") statusText.textContent = auditError || "Audit failed. No findings are available.";
    else if (audit && transformations.length && Array.from(fixedIssueIds).length) statusText.textContent = `Repairs applied to ${fixedIssueIds.size} issue${fixedIssueIds.size === 1 ? "" : "s"}; verify with Re-scan`;
    else if (audit) statusText.textContent = `Monitoring · ${audit.issueCount} issue${audit.issueCount === 1 ? "" : "s"} found`;
    else statusText.textContent = "Monitoring · Ready to audit this page";
    badge.textContent = auditSource === "jac" ? "Jac connected" : auditSource === "local-deterministic" ? "Jac unavailable · Using local audit" : "Not audited";
    shadow.querySelector("#aj-current-page").textContent = location.hostname || "Current webpage";
    issueList.replaceChildren();
    if (!audit) {
      const msg = document.createElement("p"); msg.className = "aj-empty"; msg.textContent = auditState === "error" ? "The audit could not be completed. Retry when the page is available." : "Run an audit to see findings associated with this page."; issueList.appendChild(msg);
    } else if (!audit.issues.length) {
      const empty = document.createElement("p"); empty.className = "aj-empty"; empty.textContent = "No active issues detected by these checks. This is not a complete accessibility audit."; issueList.appendChild(empty);
    } else {
      for (const issue of audit.issues) {
        const card = document.createElement("article"); card.className = "aj-finding";
        const title = document.createElement("strong"); title.textContent = issue.description || issue.category || "Accessibility finding";
        const meta = document.createElement("small"); meta.textContent = `${issue.severity || "Review"}${issue.wcag_reference ? ` · ${issue.wcag_reference}` : ""}`;
        const target = document.createElement("small"); target.textContent = `Element: ${issue.element_name || issue.element_id || "Unknown"}`;
        const safe = classifyIssue(issue).canAutoFix;
        const classification = document.createElement("span"); classification.className = safe ? "aj-safe" : "aj-review"; classification.textContent = safe ? "SAFE TO FIX" : "REVIEW REQUIRED";
        card.append(title, meta, target, classification);
        const actions = document.createElement("div"); actions.className = "aj-finding-actions";
        if (verifiedIssues.has(issue.id)) {
          const fixed = document.createElement("span"); fixed.className = "aj-fixed"; fixed.textContent = "Fixed · Verified"; actions.appendChild(fixed);
          const undo = document.createElement("button"); undo.type = "button"; undo.className = "aj-secondary"; undo.textContent = "Undo"; undo.addEventListener("click", () => undoIssue(issue.id)); actions.appendChild(undo);
        } else if (safe && fixedIssueIds.has(issue.id)) {
          const applied = document.createElement("span"); applied.className = "aj-review-label"; applied.textContent = "Applied · Re-scan"; actions.appendChild(applied);
          const undo = document.createElement("button"); undo.type = "button"; undo.className = "aj-secondary"; undo.textContent = "Undo"; undo.addEventListener("click", () => undoIssue(issue.id)); actions.appendChild(undo);
        } else if (safe) {
          const fix = document.createElement("button"); fix.type = "button"; fix.className = "aj-secondary"; fix.textContent = "Fix"; fix.setAttribute("aria-label", `Fix: ${title.textContent}`); fix.addEventListener("click", () => fixIssue(issue)); actions.appendChild(fix);
        } else {
          const review = document.createElement("span"); review.className = "aj-review-label"; review.textContent = "Review"; actions.appendChild(review);
        }
        const hi = document.createElement("button"); hi.type = "button"; hi.className = "aj-secondary"; hi.textContent = "Highlight"; hi.setAttribute("aria-label", `Highlight finding: ${title.textContent}`); hi.addEventListener("click", () => { const result = highlight(issue.selector || verifiedIssues.get(issue.id)?.selector || null); if (!result.ok) statusText.textContent = result.error; }); actions.appendChild(hi);
        card.appendChild(actions); issueList.appendChild(card);
      }
    }
    updateSummary();
  }
  function setExpanded(value) { expanded = Boolean(value); renderPanel(); if (expanded) shadow.querySelector("#aj-audit").focus(); }

  async function runAudit() {
    auditState = "loading"; auditError = ""; renderPanel();
    try {
      const response = await sendRuntime({ type: MESSAGE_TYPE, auditSource: "assistant" });
      if (!response || response.ok === false || !response.audit) throw new Error(response?.error || response?.auditError || "Audit failed. No findings are available.");
      audit = response.audit; auditSource = response.auditSource || "local-deterministic"; auditError = response.auditError || ""; auditState = "done";
      const activeIds = new Set(audit.issues.map((issue) => issue.id));
      for (const id of activeIds) verifiedIssues.delete(id);
      const verified = Array.from(fixedIssueIds).filter((id) => !activeIds.has(id));
      const stillPresent = Array.from(fixedIssueIds).filter((id) => activeIds.has(id));
      for (const id of verified) {
        const entry = transformations.flatMap((item) => item.entries || []).find((item) => item.issueId === id);
        if (entry) verifiedIssues.set(id, { id, element_id: entry.elementId, selector: entry.selector, description: entry.description || `Repaired ${entry.type.replaceAll("_", " ")} finding`, severity: "low", detected_by: "deterministic", can_auto_fix: false });
        fixedIssueIds.delete(id);
      }
      shadow.querySelector("#aj-rescan-note").textContent = `${verified.length} repair${verified.length === 1 ? "" : "s"} verified absent; ${stillPresent.length} repaired issue${stillPresent.length === 1 ? "" : "s"} still detected.`;
      for (const id of stillPresent) fixedIssueIds.delete(id);
      audit.issues = [...audit.issues, ...Array.from(verifiedIssues.values()).filter((issue) => !activeIds.has(issue.id))];
    } catch (error) { auditState = "error"; auditError = error instanceof Error ? error.message : "Audit failed. No findings are available."; audit = null; auditSource = ""; }
    renderPanel();
  }
  async function fixIssue(issue) {
    try {
      const result = await sendRuntime({ type: "ARIAJAC_FIX_ISSUE", issueId: issue.id });
      if (!result?.ok) throw new Error(result?.error || "The fix was not applied.");
      transformations.push(result.transformation); fixedIssueIds.add(issue.id); audit = result.audit || audit; auditState = "done"; renderPanel();
      shadow.querySelector("#aj-status-text").textContent = `Applied a temporary repair. Re-scan to verify ${issue.category || "the finding"}.`;
    } catch (error) { auditError = error.message; shadow.querySelector("#aj-status-text").textContent = auditError; }
  }
  async function fixSafeIssues() {
    if (!audit) return;
    const issueIds = audit.issues.filter((issue) => classifyIssue(issue).canAutoFix && !fixedIssueIds.has(issue.id)).map((issue) => issue.id);
    if (!issueIds.length) return;
    const result = await sendRuntime({ type: "ARIAJAC_FIX_SAFE_ISSUES", issueIds });
    if (!result?.ok) { shadow.querySelector("#aj-status-text").textContent = result?.error || "Safe repairs could not be applied."; return; }
    for (const transformation of result.transformations || []) { transformations.push(transformation); for (const entry of transformation.entries || []) fixedIssueIds.add(entry.issueId); }
    renderPanel();
    shadow.querySelector("#aj-status-text").textContent = `Repaired ${result.applied} accessibility barrier${result.applied === 1 ? "" : "s"}. Re-scan to verify.`;
  }
  async function undoIssue(issueId) {
    const transformation = [...transformations].reverse().find((item) => item.entries?.some((entry) => entry.issueId === issueId));
    if (!transformation) return;
    const result = await sendRuntime({ type: "ARIAJAC_UNDO_TRANSFORMATION", transformationId: transformation.id });
    if (!result?.ok) { shadow.querySelector("#aj-status-text").textContent = result?.error || "Undo failed."; return; }
    const index = transformations.indexOf(transformation); transformations.splice(index, 1); fixedIssueIds.delete(issueId); verifiedIssues.delete(issueId); renderPanel(); shadow.querySelector("#aj-status-text").textContent = "Repair undone. Re-scan to confirm the original issue returns.";
  }
  async function undoLast() {
    const result = await sendRuntime({ type: "ARIAJAC_UNDO_LAST" });
    if (!result?.ok) { shadow.querySelector("#aj-status-text").textContent = result?.error || "Undo failed."; return; }
    const last = transformations.pop(); if (last?.entries) for (const entry of last.entries) { fixedIssueIds.delete(entry.issueId); verifiedIssues.delete(entry.issueId); }
    audit = result.audit || audit; renderPanel(); shadow.querySelector("#aj-status-text").textContent = `Undid the last repair batch; restored ${result.restored} change${result.restored === 1 ? "" : "s"}.`;
  }
  async function undoAll() {
    const result = await sendRuntime({ type: "ARIAJAC_UNDO_ALL" });
    if (!result?.ok) { shadow.querySelector("#aj-status-text").textContent = result?.error || "Undo failed."; return; }
    transformations.length = 0; transformationById.clear(); fixedIssueIds.clear(); verifiedIssues.clear(); audit = result.audit || audit; renderPanel(); shadow.querySelector("#aj-status-text").textContent = `Undid all repairs; restored ${result.restored} change${result.restored === 1 ? "" : "s"}.`;
  }
  function describeTransformation(transformation) {
    return { id: transformation.id, type: transformation.type, reversible: transformation.reversible, entries: (transformation.entries || []).map((entry) => ({ issueId: entry.issueId, elementId: entry.elementId, description: entry.description, selector: entry.selector, type: entry.type })) };
  }
  function keepTransformation(transformation) {
    transformationById.set(transformation.id, transformation);
    transformations.push(transformation);
    return describeTransformation(transformation);
  }
  function createAssistant() {
    if (!document.documentElement || document.getElementById(ROOT_ID)) return;
    const host = document.createElement("div"); host.id = ROOT_ID; host.setAttribute("data-ariajac-ui", "true"); host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;contain:layout style;"; document.documentElement.appendChild(host);
    if (!host.attachShadow) return; shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `:host{all:initial;color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.45;color:#172033}*{box-sizing:border-box}button{font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #2563eb;outline-offset:2px}#aj-tab,#aj-panel{position:fixed;right:16px;pointer-events:auto;box-shadow:0 12px 36px rgba(15,23,42,.24)}#aj-tab{z-index:2;min-height:52px;border:0;border-radius:14px 0 0 14px;padding:0 17px;background:#172554;color:#fff;font-weight:700;cursor:grab}#aj-panel{right:16px;width:min(370px,calc(100vw - 32px));max-height:min(680px,calc(100vh - 32px));display:flex;flex-direction:column;border:1px solid #cbd5e1;border-radius:16px;background:#fff;color:#172033;overflow:hidden}#aj-panel[hidden],#aj-tab[hidden]{display:none}.aj-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;background:#172554;color:#fff;cursor:grab}.aj-brand{font-size:14px;font-weight:800;letter-spacing:.08em}.aj-subtitle{display:block;color:#dbeafe;font-size:11px;margin-top:2px}.aj-icon{min-width:42px;min-height:42px;border:1px solid rgba(255,255,255,.5);border-radius:10px;background:transparent;color:#fff;font-size:22px;line-height:1}.aj-body{overflow:auto;padding:14px;overscroll-behavior:contain}.aj-status{padding:10px 12px;border:1px solid #cbd5e1;border-radius:11px;background:#f8fafc;font-weight:650}.aj-status[data-state=loading]{color:#1d4ed8}.aj-status[data-state=error]{color:#991b1b;background:#fef2f2;border-color:#fecaca}.aj-connection,.aj-current{display:block;margin-top:5px;color:#475569;font-size:11px;font-weight:500}.aj-summary{margin:9px 0;padding:10px;border-radius:9px;background:#eff6ff;color:#172554;font-weight:700}.aj-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.aj-primary,.aj-secondary{min-height:44px;border-radius:10px;padding:9px 11px;font-weight:700}.aj-primary{grid-column:1/-1;border:1px solid #172554;background:#172554;color:#fff}.aj-secondary{border:1px solid #cbd5e1;background:#fff;color:#172033}.aj-primary:disabled,.aj-secondary:disabled{opacity:.55;cursor:not-allowed}.aj-section{margin:16px 0 8px;font-size:13px;font-weight:800}.aj-issues{display:flex;flex-direction:column;gap:9px}.aj-finding{display:flex;flex-direction:column;gap:6px;padding:12px;border:1px solid #dbe2ea;border-radius:12px;background:#fff}.aj-finding strong{font-size:13px;line-height:1.35}.aj-finding small{color:#475569;font-size:11px;line-height:1.4}.aj-finding-actions{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:3px}.aj-finding-actions .aj-secondary{min-height:40px}.aj-safe,.aj-review,.aj-fixed,.aj-review-label{display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.04em}.aj-safe{background:#dcfce7;color:#14532d}.aj-review{background:#fef3c7;color:#713f12}.aj-fixed{background:#dcfce7;color:#14532d}.aj-review-label{background:#f1f5f9;color:#334155}.aj-empty{margin:0;padding:13px;border:1px dashed #cbd5e1;border-radius:11px;color:#475569;font-size:12px}.aj-rescan-note{margin:8px 0;color:#475569;font-size:11px} @media(max-width:420px){#aj-panel{right:8px;width:calc(100vw - 16px);max-height:calc(100vh - 16px)}#aj-tab{right:8px}}`;
    shadow.appendChild(style);
    const tab = document.createElement("button"); tab.id = "aj-tab"; tab.type = "button"; tab.textContent = "AriaJac"; tab.setAttribute("aria-label", "Open AriaJac accessibility assistant"); tab.addEventListener("click", () => setExpanded(true)); shadow.appendChild(tab);
    const panel = document.createElement("section"); panel.id = "aj-panel"; panel.setAttribute("role", "region"); panel.setAttribute("aria-label", "AriaJac accessibility assistant"); panel.hidden = true;
    panel.innerHTML = `<header class="aj-head" id="aj-drag"><div><div class="aj-brand">ARIAJAC</div><span class="aj-subtitle">Current page · <span id="aj-current-page">Current webpage</span></span></div><button class="aj-icon" id="aj-collapse" type="button" aria-label="Collapse AriaJac panel" aria-expanded="false">−</button></header><div class="aj-body"><div class="aj-status" id="aj-status" role="status" aria-live="polite"><span id="aj-status-text">Monitoring · Ready to audit this page</span><span class="aj-connection" id="aj-connection">Not audited</span></div><p class="aj-summary" id="aj-summary">Run an audit to count findings and safe fixes.</p><div class="aj-actions"><button class="aj-primary" id="aj-audit" type="button">Run Audit</button><button class="aj-secondary" id="aj-fixes" type="button" disabled>Fix Safe Issues (0)</button><button class="aj-secondary" id="aj-undo-last" type="button" disabled>Undo Last</button><button class="aj-secondary" id="aj-undo-all" type="button" disabled>Undo All</button><button class="aj-secondary" id="aj-rescan" type="button">Re-scan</button><button class="aj-secondary" id="aj-focus" type="button" aria-pressed="false">Focus Mode</button></div><p class="aj-rescan-note" id="aj-rescan-note">Repairs are temporary for this page session. Re-scan to verify.</p><p class="aj-section">Findings</p><div class="aj-issues" id="aj-issues"></div><p class="aj-current">Simplify, Color Vision, and Read Aloud are unavailable.</p></div>`;
    shadow.appendChild(panel);
    shadow.querySelector("#aj-collapse").addEventListener("click", () => setExpanded(false));
    shadow.querySelector("#aj-audit").addEventListener("click", runAudit); shadow.querySelector("#aj-rescan").addEventListener("click", runAudit);
    shadow.querySelector("#aj-fixes").addEventListener("click", fixSafeIssues); shadow.querySelector("#aj-undo-last").addEventListener("click", undoLast); shadow.querySelector("#aj-undo-all").addEventListener("click", undoAll);
    shadow.querySelector("#aj-focus").addEventListener("click", async (event) => { const enabled = event.currentTarget.getAttribute("aria-pressed") !== "true"; try { const result = await sendRuntime({ type: "ARIAJAC_FOCUS_MODE", enabled }); if (!result?.ok) throw new Error(result?.error || "Focus Mode could not be changed."); event.currentTarget.setAttribute("aria-pressed", String(enabled)); shadow.querySelector("#aj-status-text").textContent = enabled ? "Focus Mode enabled for explicitly marked decorative regions." : "Focus Mode disabled."; } catch (error) { shadow.querySelector("#aj-status-text").textContent = error.message; } });
    shadow.addEventListener("keydown", (event) => { if (event.key === "Escape" && expanded) { event.stopPropagation(); setExpanded(false); } });
    const dragHandle = shadow.querySelector("#aj-drag"); dragHandle.addEventListener("pointerdown", (event) => { if (event.target.closest("button")) return; dragging = { y: event.clientY, top: panelTop }; try { dragHandle.setPointerCapture(event.pointerId); } catch (_error) {} });
    dragHandle.addEventListener("pointermove", (event) => { if (!dragging) return; panelTop = Math.max(8, Math.min(window.innerHeight - 100, dragging.top + event.clientY - dragging.y)); renderPanel(); });
    const stopDrag = () => { dragging = null; }; dragHandle.addEventListener("pointerup", stopDrag); dragHandle.addEventListener("pointercancel", stopDrag); renderPanel();
  }
  createAssistant();
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return false;
    if (message.type === HIGHLIGHT_TYPE) { sendResponse(highlight(message.selector)); return false; }
    if (message.type === "ARIAJAC_FIX_SAFE_ISSUES") {
      try {
        if (!Array.isArray(message.issueIds) || message.issueIds.length > 350) throw new Error("Invalid safe-fix request.");
        const snapshot = normalizeDocument(document, window); const freshAudit = auditSnapshot(snapshot); const transformationsApplied = [];
        for (const issueId of new Set(message.issueIds)) {
          const issue = freshAudit.issues.find((item) => item.id === issueId);
          if (!issue || !classifyIssue(issue).canAutoFix) continue;
          try { transformationsApplied.push(keepTransformation(applyTransformation(document, snapshot, issue, classifyIssue(issue).transformationType))); } catch (_error) {}
        }
        sendResponse({ ok: true, applied: transformationsApplied.length, transformations: transformationsApplied, audit: auditSnapshot(normalizeDocument(document, window)) });
      } catch (error) { sendResponse({ ok: false, error: error instanceof Error ? error.message : "Safe repairs could not be applied." }); }
      return false;
    }
    if (message.type === "ARIAJAC_FIX_ISSUE") {
      try {
        const snapshot = normalizeDocument(document, window); const auditNow = auditSnapshot(snapshot); const issue = auditNow.issues.find((item) => item.id === message.issueId);
        if (!issue) throw new Error("Finding is no longer present; run a new audit.");
        const classification = classifyIssue(issue); if (!classification.canAutoFix) throw new Error("This finding requires review and cannot be auto-fixed.");
        const transformation = keepTransformation(applyTransformation(document, snapshot, issue, classification.transformationType));
        sendResponse({ ok: true, transformation, audit: auditSnapshot(normalizeDocument(document, window)) });
      } catch (error) { sendResponse({ ok: false, error: error instanceof Error ? error.message : "Repair could not be applied." }); }
      return false;
    }
    if (message.type === "ARIAJAC_UNDO_TRANSFORMATION") {
      const transformation = transformationById.get(message.transformationId);
      const index = transformations.indexOf(transformation);
      if (index < 0 || !transformation) { sendResponse({ ok: false, error: "Repair no longer exists in this page session." }); return false; }
      const restored = restoreTransform(transformation); transformations.splice(index, 1); transformationById.delete(transformation.id); sendResponse({ ok: true, restored, audit: auditSnapshot(normalizeDocument(document, window)) }); return false;
    }
    if (message.type === "ARIAJAC_APPLY_SAFE_FIXES") {
      try {
        const snapshot = normalizeDocument(document, window); const localAudit = auditSnapshot(snapshot);
        const transformation = keepTransformation(applyFixes(document, snapshot, localAudit.issues));
        sendResponse({ ok: true, applied: transformation.entries.length, audit: auditSnapshot(normalizeDocument(document, window)), transformation });
      } catch (error) { sendResponse({ ok: false, error: error instanceof Error ? error.message : "Could not apply safe fixes." }); }
      return false;
    }
    if (message.type === "ARIAJAC_UNDO_LAST") {
      const last = transformations.pop(); const restored = restoreTransform(last); if (last) transformationById.delete(last.id); sendResponse({ ok: true, restored, audit: auditSnapshot(normalizeDocument(document, window)) }); return false;
    }
    if (message.type === "ARIAJAC_UNDO_ALL") {
      let restored = 0; while (transformations.length) { const item = transformations.pop(); restored += restoreTransform(item); if (item) transformationById.delete(item.id); }
      if (focusUndo) { restored += restoreFocusMode(document, focusUndo); focusUndo = null; }
      sendResponse({ ok: true, restored, audit: auditSnapshot(normalizeDocument(document, window)) }); return false;
    }
    if (message.type === "ARIAJAC_FOCUS_MODE") {
      if (focusUndo) { restoreFocusMode(document, focusUndo); focusUndo = null; }
      if (message.enabled) focusUndo = setFocusMode(document, true); sendResponse({ ok: true, enabled: Boolean(message.enabled) }); return false;
    }
    if (message.type !== MESSAGE_TYPE) return false;
    try {
      const snapshot = normalizeDocument(document, window); const priorRaw = sessionStorage.getItem(STORAGE_KEY); const previousSnapshot = priorRaw ? JSON.parse(priorRaw) : null;
      const changes = diffSnapshots(previousSnapshot, snapshot); sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      sendResponse({ type: RESPONSE_TYPE, ok: true, page: snapshot.page, snapshotId: snapshot.snapshotId, summary: { pageNodes: 1, elementNodes: snapshot.elements.length, relationships: snapshot.relationships.length, graphSize: snapshot.elements.length + snapshot.relationships.length + 1 }, changes, snapshot, audit: auditSnapshot(snapshot) });
    } catch (error) { sendResponse({ type: ERROR_TYPE, ok: false, error: error instanceof Error ? error.message : "Page extraction failed." }); }
    return false;
  });
})();