import from engine.graph { Page, Element, HasElement, ContainsElement }
import from engine.audit { AccessibilityIssue, AuditSession }
import from engine.walkers { AuditPageWalker, VisualAuditWalker, SemanticAuditWalker, MotorAuditWalker }
import from engine.snapshot_importer { GraphUpdate, ingest_snapshot }
import from engine.accessibility_audit { AuditResult, ingest_snapshot_and_audit }

def:pub inspect_snapshot(snapshot: dict) -> GraphUpdate {
    return ingest_snapshot(snapshot);
}

with entry:__main__ {
    print("AriaJac deterministic audit engine ready.");
}
