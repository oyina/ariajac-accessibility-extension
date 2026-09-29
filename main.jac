import from engine.accessibility_audit { AuditResult, ingest_snapshot_and_audit }
import ".styles.global.css";
import from "@jac/runtime" { Router, Routes, Route }
import from .components.AccessibilityAudit { AccessibilityAudit }

def:pub app() -> JsxElement {
    return <Router><Routes><Route path="/" element={<AccessibilityAudit />} /></Routes></Router>;
}
