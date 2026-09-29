import from engine.graph { Page, Element }
import from engine.audit { AccessibilityIssue }
import from engine.snapshot_importer { GraphUpdate, ingest_snapshot }

obj AuditResult {
    has graph: GraphUpdate = GraphUpdate();
    has page_url: str = "";
    has page_title: str = "";
    has issues: list[AccessibilityIssue] = [];
    has critical: int = 0;
    has high: int = 0;
    has medium: int = 0;
    has low: int = 0;
}

def:pub audit_page_graph(page_url: str) -> list[AccessibilityIssue] {
    issues: list[AccessibilityIssue] = [];
    for element in [root -->][?:Element] {
        if element.page_url != page_url { continue; }
        if element.contrast_ratio > 0.0 and element.contrast_ratio < 4.5 {
            issues = issues + [AccessibilityIssue(issue_id="contrast:" + element.element_id, element_id=element.element_id, page_url=page_url, category="Visual", severity="high", description="Measured text contrast is below 4.5:1 (" + str(element.contrast_ratio) + ":1). Verify text size and context before changing colors.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 1.4.3", detected_by="deterministic", can_auto_fix=False)];
        }
        if element.animation != "" {
            issues = issues + [AccessibilityIssue(issue_id="motion:" + element.element_id, element_id=element.element_id, page_url=page_url, category="Motion", severity="low", description="Animation metadata is present. Review behavior with reduced-motion preferences enabled.", wcag_reference="Manual review: motion behavior", detected_by="manual-review", can_auto_fix=False)];
        }
        if element.tag == "img" and element.alt == "" {
            issues = issues + [AccessibilityIssue(issue_id="image-alt:" + element.element_id, element_id=element.element_id, page_url=page_url, category="Semantics", severity="high", description="Image has no alt attribute text. Confirm whether it is informative or intentionally decorative.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 1.1.1", detected_by="deterministic", can_auto_fix=False)];
        }
        if element.interactive and element.accessible_name == "" {
            issues = issues + [AccessibilityIssue(issue_id="name:" + element.element_id, element_id=element.element_id, page_url=page_url, category="Semantics", severity="high", description="Interactive control has no detectable accessible name.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 4.1.2", detected_by="deterministic", can_auto_fix=False)];
        }
        if element.tag in ["input", "select", "textarea"] and not element.has_form_label {
            issues = issues + [AccessibilityIssue(issue_id="label:" + element.element_id, element_id=element.element_id, page_url=page_url, category="Forms", severity="medium", description="No associated form label was detected. Check accessible naming techniques and grouping.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 3.3.2", detected_by="deterministic", can_auto_fix=False)];
        }
        if element.interactive and (element.width < 24 or element.height < 24) {
            issues = issues + [AccessibilityIssue(issue_id="target:" + element.element_id, element_id=element.element_id, page_url=page_url, category="Motor", severity="medium", description="Interactive target is smaller than 24 by 24 CSS pixels. Check spacing exceptions and the actual pointer target.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 2.5.8", detected_by="deterministic", can_auto_fix=False)];
        }
        if element.interactive {
            issues = issues + [AccessibilityIssue(issue_id="focus-style:" + element.element_id, element_id=element.element_id, page_url=page_url, category="Motor", severity="low", description="Visible focus styling cannot be established from an unfocused page snapshot; verify by keyboard navigation.", wcag_reference="Manual review: visible focus", detected_by="manual-review", can_auto_fix=False)];
        }
        if element.tag in ["h1", "h2", "h3", "h4", "h5", "h6"] and element.heading_level > 1 {
            issues = issues + [AccessibilityIssue(issue_id="heading-review:" + element.element_id, element_id=element.element_id, page_url=page_url, category="Semantics", severity="low", description="Heading outline requires review in page context.", wcag_reference="Manual review: heading structure", detected_by="manual-review", can_auto_fix=False)];
        }
    }
    return issues;
}

def:pub ingest_snapshot_and_audit(snapshot: dict) -> AuditResult {
    graph = ingest_snapshot(snapshot);
    page_data = snapshot["page"] as dict;
    page_url = page_data["url"] as str;
    page_title = page_data["title"] as str;
    issues = audit_page_graph(page_url);
    critical = 0;
    high = 0;
    medium = 0;
    low = 0;
    for issue in issues {
        if issue.severity == "critical" { critical += 1; }
        elif issue.severity == "high" { high += 1; }
        elif issue.severity == "medium" { medium += 1; }
        else { low += 1; }
    }
    return AuditResult(graph=graph, page_url=page_url, page_title=page_title, issues=issues, critical=critical, high=high, medium=medium, low=low);
}
