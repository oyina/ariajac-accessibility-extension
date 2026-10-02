(() => {
  if (globalThis.__ariajacContentInitialized) return;
  globalThis.__ariajacContentInitialized = true;

  const { MESSAGE_TYPE, RESPONSE_TYPE, ERROR_TYPE, HIGHLIGHT_TYPE } = globalThis.AriaMessage;
  const { normalizeDocument, diffSnapshots } = globalThis.AriaDomSnapshot;
  const { auditSnapshot } = globalThis.AriaAudit;
  const { applyFixes, restoreTransform, setFocusMode, restoreFocusMode } = globalThis.AriaTransform;
  const STORAGE_KEY = "ariajac.snapshot.v1";
  const ROOT_ID = "ariajac-assistant-root";
  const transformations = [];
  let outlineTimer = null;
  let focusUndo = null;
  let auditState = "idle";
  let auditSource = "";
  let auditError = "";
  let audit = null;
  let shadow = null;
  let expanded = false;
  let panelTop = 120;
  let dragging = null;

  function highlight(selector) {
    const target = selector ? document.querySelector(selector) : null;
    if (!target) return { ok: false, error: "Element not found; rerun the audit." };
    if (outlineTimer) clearTimeout(outlineTimer);
    const oldOutline = target.style.outline;
    const oldOffset = target.style.outlineOffset;
    target.style.outline = "3px solid #b42318";
    target.style.outlineOffset = "3px";
    if (target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "center" });
    outlineTimer = setTimeout(() => {
      target.style.outline = oldOutline;
      target.style.outlineOffset = oldOffset;
    }, 3000);
    return { ok: true };
  }

  function sendRuntime(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (result) => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message || "Extension communication failed."));
          else resolve(result);
        });
      } catch (error) { reject(error); }
    });
  }

  function renderPanel() {
    if (!shadow) return;
    const status = shadow.querySelector("#aj-status");
    const statusText = shadow.querySelector("#aj-status-text");
    const issueList = shadow.querySelector("#aj-issues");
    const auditButton = shadow.querySelector("#aj-audit");
    const badge = shadow.querySelector("#aj-connection");
    const panel = shadow.querySelector("#aj-panel");
    const tab = shadow.querySelector("#aj-tab");
    if (!status || !statusText || !issueList || !auditButton) return;

    panel.hidden = !expanded;
    tab.hidden = expanded;
    panel.style.top = `${panelTop}px`;
    tab.style.top = `${panelTop}px`;
    shadow.querySelector("#aj-collapse").setAttribute("aria-expanded", String(expanded));
    auditButton.disabled = auditState === "loading";
    status.dataset.state = auditState;
    if (auditState === "loading") statusText.textContent = "Analyzing page...";
    else if (auditState === "error") statusText.textContent = auditError || "Audit failed. No findings are available.";
    else if (audit) statusText.textContent = `Monitoring · ${audit.issueCount} issue${audit.issueCount === 1 ? "" : "s"} found`;
    else statusText.textContent = "Monitoring · Ready to audit this page";
    badge.textContent = auditSource === "jac" ? "Jac connected" : auditSource === "local-deterministic" ? "Jac unavailable · Using local audit" : "Not audited";
    issueList.replaceChildren();
    if (!audit) {
      const message = document.createElement("p");
      message.className = "aj-empty";
      message.textContent = auditState === "error" ? "The audit could not be completed. Retry when the page is available." : "Run an audit to see findings associated with this page.";
      issueList.appendChild(message);
      return;
    }
    if (!audit.issues.length) {
      const empty = document.createElement("p");
      empty.className = "aj-empty";
      empty.textContent = "No issues detected by these checks. This is not a complete accessibility audit.";
      issueList.appendChild(empty);
      return;
    }
    for (const issue of audit.issues) {
      const card = document.createElement("article");
      card.className = "aj-finding";
      const title = document.createElement("strong");
      title.textContent = issue.description || issue.category || "Accessibility finding";
      const meta = document.createElement("small");
      meta.textContent = `${issue.severity || "Review"}${issue.wcag_reference ? ` · ${issue.wcag_reference}` : ""}`;
      const target = document.createElement("small");
      target.textContent = `Element: ${issue.element_name || issue.element_id || "Unknown"}`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "aj-secondary";
      button.textContent = "Highlight";
      button.setAttribute("aria-label", `Highlight finding: ${title.textContent}`);
      button.addEventListener("click", () => {
        const result = highlight(issue.selector || null);
        if (!result.ok) {
          auditError = result.error;
          statusText.textContent = result.error;
        }
      });
      card.append(title, meta, target, button);
      issueList.appendChild(card);
    }
  }

  function setExpanded(value) {
    expanded = Boolean(value);
    renderPanel();
    if (expanded) shadow.querySelector("#aj-audit").focus();
  }

  function createAssistant() {
    if (!document.documentElement || document.getElementById(ROOT_ID)) return;
    const host = document.createElement("div");
    host.id = ROOT_ID;
    host.setAttribute("data-ariajac-ui", "true");
    host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;contain:layout style;";
    document.documentElement.appendChild(host);
    if (!host.attachShadow) return;
    shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `:host{all:initial;color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.45;color:#172033}*{box-sizing:border-box}button{font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #2563eb;outline-offset:2px}#aj-tab,#aj-panel{position:fixed;right:16px;pointer-events:auto;box-shadow:0 12px 36px rgba(15,23,42,.24)}#aj-tab{z-index:2;min-height:52px;border:0;border-radius:14px 0 0 14px;padding:0 17px;background:#172554;color:#fff;font-weight:700;letter-spacing:.01em;cursor:grab}#aj-tab:hover{background:#1e3a8a}#aj-panel{right:16px;width:min(370px,calc(100vw - 32px));max-height:min(680px,calc(100vh - 32px));display:flex;flex-direction:column;border:1px solid #cbd5e1;border-radius:16px;background:#fff;color:#172033;overflow:hidden}#aj-panel[hidden],#aj-tab[hidden]{display:none}.aj-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;background:#172554;color:#fff}.aj-brand{font-size:14px;font-weight:800;letter-spacing:.08em}.aj-subtitle{display:block;color:#dbeafe;font-size:11px;margin-top:2px}.aj-icon{min-width:42px;min-height:42px;border:1px solid rgba(255,255,255,.5);border-radius:10px;background:transparent;color:#fff;font-size:22px;line-height:1}.aj-body{overflow:auto;padding:14px;overscroll-behavior:contain}.aj-status{padding:10px 12px;border:1px solid #cbd5e1;border-radius:11px;background:#f8fafc;font-weight:650}.aj-status[data-state=loading]{color:#1d4ed8}.aj-status[data-state=error]{color:#991b1b;background:#fef2f2;border-color:#fecaca}.aj-connection{display:block;margin-top:5px;color:#475569;font-size:11px;font-weight:500}.aj-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.aj-primary,.aj-secondary{min-height:44px;border-radius:10px;padding:9px 11px;font-weight:700}.aj-primary{grid-column:1/-1;border:1px solid #172554;background:#172554;color:#fff}.aj-primary:hover:not(:disabled){background:#1e3a8a}.aj-secondary{border:1px solid #cbd5e1;background:#fff;color:#172033}.aj-secondary:hover{background:#f1f5f9}.aj-primary:disabled{opacity:.65;cursor:wait}.aj-section{margin:16px 0 8px;font-size:13px;font-weight:800}.aj-issues{display:flex;flex-direction:column;gap:9px}.aj-finding{display:flex;flex-direction:column;gap:6px;padding:12px;border:1px solid #dbe2ea;border-radius:12px;background:#fff}.aj-finding strong{font-size:13px;line-height:1.35}.aj-finding small{color:#475569;font-size:11px;line-height:1.4}.aj-finding .aj-secondary{align-self:flex-start;min-width:94px;margin-top:2px}.aj-empty{margin:0;padding:13px;border:1px dashed #cbd5e1;border-radius:11px;color:#475569;font-size:12px}.aj-unavailable{margin:10px 0 0;color:#64748b;font-size:11px} @media(max-width:420px){#aj-panel{right:8px;width:calc(100vw - 16px);max-height:calc(100vh - 16px)}#aj-tab{right:8px}}`;
    shadow.appendChild(style);
    const tab = document.createElement("button");
    tab.id = "aj-tab";
    tab.type = "button";
    tab.textContent = "AriaJac";
    tab.setAttribute("aria-label", "Open AriaJac accessibility assistant");
    tab.addEventListener("click", () => setExpanded(true));
    shadow.appendChild(tab);
    const panel = document.createElement("section");
    panel.id = "aj-panel";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "AriaJac accessibility assistant");
    panel.hidden = true;
    panel.innerHTML = `<header class="aj-head" id="aj-drag"><div><div class="aj-brand">ARIAJAC</div><span class="aj-subtitle">In-page accessibility assistant</span></div><button class="aj-icon" id="aj-collapse" type="button" aria-label="Collapse AriaJac panel" aria-expanded="false">−</button></header><div class="aj-body"><div class="aj-status" id="aj-status" role="status" aria-live="polite"><span id="aj-status-text">Monitoring · Ready to audit this page</span><span class="aj-connection" id="aj-connection">Not audited</span></div><div class="aj-actions"><button class="aj-primary" id="aj-audit" type="button">Run Audit</button><button class="aj-secondary" id="aj-fixes" type="button">Fix Safe Issues</button><button class="aj-secondary" id="aj-focus" type="button" aria-pressed="false">Focus Mode</button></div><p class="aj-section">Findings</p><div class="aj-issues" id="aj-issues"></div><p class="aj-unavailable">Simplify, Color Vision, and Read Aloud are not available yet.</p></div>`;
    shadow.appendChild(panel);
    shadow.querySelector("#aj-collapse").addEventListener("click", () => setExpanded(false));
    shadow.querySelector("#aj-audit").addEventListener("click", runAudit);
    shadow.querySelector("#aj-fixes").addEventListener("click", async () => {
      try {
        const result = await sendRuntime({ type: "ARIAJAC_APPLY_SAFE_FIXES" });
        if (!result?.ok) throw new Error(result?.error || "Could not apply safe fixes.");
        audit = result.audit || null;
        auditSource = "local-deterministic";
        auditState = "done";
        renderPanel();
        shadow.querySelector("#aj-status-text").textContent = `Applied ${result.applied} safe fix${result.applied === 1 ? "" : "es"}.`;
      } catch (error) { auditState = "error"; auditError = error.message; renderPanel(); }
    });
    shadow.querySelector("#aj-focus").addEventListener("click", async (event) => {
      const enabled = event.currentTarget.getAttribute("aria-pressed") !== "true";
      try {
        const result = await sendRuntime({ type: "ARIAJAC_FOCUS_MODE", enabled });
        if (!result?.ok) throw new Error(result?.error || "Focus Mode could not be changed.");
        event.currentTarget.setAttribute("aria-pressed", String(enabled));
        shadow.querySelector("#aj-status-text").textContent = enabled ? "Focus Mode enabled for explicitly marked decorative regions." : "Focus Mode disabled.";
      } catch (error) { shadow.querySelector("#aj-status-text").textContent = error.message; }
    });
    shadow.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && expanded) { event.stopPropagation(); setExpanded(false); }
    });
    const dragHandle = shadow.querySelector("#aj-drag");
    dragHandle.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      dragging = { y: event.clientY, top: panelTop };
      try { dragHandle.setPointerCapture(event.pointerId); } catch (_error) {}
    });
    dragHandle.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      panelTop = Math.max(8, Math.min(window.innerHeight - 100, dragging.top + event.clientY - dragging.y));
      renderPanel();
    });
    const stopDrag = () => { dragging = null; };
    dragHandle.addEventListener("pointerup", stopDrag);
    dragHandle.addEventListener("pointercancel", stopDrag);
    renderPanel();
  }

  async function runAudit() {
    auditState = "loading";
    auditError = "";
    renderPanel();
    try {
      const response = await sendRuntime({ type: MESSAGE_TYPE });
      if (!response || response.ok === false || !response.audit) throw new Error(response?.error || response?.auditError || "Audit failed. No findings are available.");
      audit = response.audit;
      auditSource = response.auditSource || "local-deterministic";
      auditError = response.auditError || "";
      auditState = "done";
    } catch (error) {
      auditState = "error";
      auditError = error instanceof Error ? error.message : "Audit failed. No findings are available.";
      audit = null;
      auditSource = "";
    }
    renderPanel();
  }

  createAssistant();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return false;
    if (message.type === HIGHLIGHT_TYPE) {
      sendResponse(highlight(message.selector));
      return false;
    }
    if (message.type === "ARIAJAC_APPLY_SAFE_FIXES") {
      try {
        const snapshot = normalizeDocument(document, window);
        const auditResult = auditSnapshot(snapshot);
        const transformation = applyFixes(document, snapshot, auditResult.issues);
        transformations.push(transformation);
        sendResponse({ ok: true, applied: transformation.entries.length, audit: auditSnapshot(normalizeDocument(document, window)), transformation });
      } catch (error) { sendResponse({ ok: false, error: error instanceof Error ? error.message : "Could not apply safe fixes." }); }
      return false;
    }
    if (message.type === "ARIAJAC_UNDO_LAST") {
      const last = transformations.pop();
      const restored = restoreTransform(last);
      sendResponse({ ok: true, restored, audit: auditSnapshot(normalizeDocument(document, window)) });
      return false;
    }
    if (message.type === "ARIAJAC_UNDO_ALL") {
      let restored = 0;
      while (transformations.length) restored += restoreTransform(transformations.pop());
      if (focusUndo) { restored += restoreFocusMode(document, focusUndo); focusUndo = null; }
      sendResponse({ ok: true, restored, audit: auditSnapshot(normalizeDocument(document, window)) });
      return false;
    }
    if (message.type === "ARIAJAC_FOCUS_MODE") {
      if (focusUndo) { restoreFocusMode(document, focusUndo); focusUndo = null; }
      if (message.enabled) focusUndo = setFocusMode(document, true);
      sendResponse({ ok: true, enabled: Boolean(message.enabled) });
      return false;
    }
    if (message.type !== MESSAGE_TYPE) return false;
    try {
      const snapshot = normalizeDocument(document, window);
      const priorRaw = sessionStorage.getItem(STORAGE_KEY);
      const previousSnapshot = priorRaw ? JSON.parse(priorRaw) : null;
      const changes = diffSnapshots(previousSnapshot, snapshot);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      sendResponse({ type: RESPONSE_TYPE, ok: true, page: snapshot.page, snapshotId: snapshot.snapshotId, summary: { pageNodes: 1, elementNodes: snapshot.elements.length, relationships: snapshot.relationships.length, graphSize: snapshot.elements.length + snapshot.relationships.length + 1 }, changes, snapshot, audit: auditSnapshot(snapshot) });
    } catch (error) { sendResponse({ type: ERROR_TYPE, ok: false, error: error instanceof Error ? error.message : "Page extraction failed." }); }
    return false;
  });
})();