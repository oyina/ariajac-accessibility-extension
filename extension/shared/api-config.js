(() => {
  const config = Object.freeze({
    baseUrl: "https://preview-jac-sbx-49b6bda7e2764429b49a9e64f1df0715.jachammer.app",
    auditPath: "/function/ingest_snapshot_and_audit",
  });
  globalThis.AriaApiConfig = config;
  if (typeof module !== "undefined" && module.exports) module.exports = config;
})();
