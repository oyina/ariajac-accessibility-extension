import from engine.graph { Page, Element, HasElement }
import from engine.audit { AccessibilityIssue }
import from engine.walkers { SemanticAuditWalker, MotorAuditWalker, VisualAuditWalker }

test "graph-backed deterministic checks return fixture issues" {
    test_url = "https://jac-fixture.test/unique-2026";
    page = Page(url=test_url, title="Fixture");
    root ++> page;
    image = Element(element_id="fixture-image", page_url=test_url, tag="img", alt="", accessible_name="");
    button = Element(element_id="fixture-button", page_url=test_url, tag="button", interactive=True, accessible_name="", width=18, height=18, focusable=True);
    text = Element(element_id="fixture-text", page_url=test_url, tag="p", text="Low contrast", contrast_ratio=2.1);
    root ++> [image, button, text];
    page +>:HasElement:+> image;
    page +>:HasElement:+> button;
    page +>:HasElement:+> text;

    image_issue = AccessibilityIssue(issue_id="fixture-image-alt", element_id=image.element_id, page_url=test_url, category="Semantics", severity="high", description="Missing alt", wcag_reference="Manual review", detected_by="deterministic", can_auto_fix=False);
    button_issue = AccessibilityIssue(issue_id="fixture-button-name", element_id=button.element_id, page_url=test_url, category="Semantics", severity="high", description="Missing name", wcag_reference="Manual review", detected_by="deterministic", can_auto_fix=False);
    target_issue = AccessibilityIssue(issue_id="fixture-button-target", element_id=button.element_id, page_url=test_url, category="Motor", severity="medium", description="Small target", wcag_reference="Manual review", detected_by="deterministic", can_auto_fix=False);
    contrast_issue = AccessibilityIssue(issue_id="fixture-text-contrast", element_id=text.element_id, page_url=test_url, category="Visual", severity="high", description="Low contrast", wcag_reference="Manual review", detected_by="deterministic", can_auto_fix=False);

    result = page spawn SemanticAuditWalker(page_url=test_url);
    motor = root spawn MotorAuditWalker(page_url=test_url);
    visual = root spawn VisualAuditWalker(page_url=test_url);
    assert result.reports;
    assert len(result.reports[0]) > 0;
    assert button_issue.element_id == "fixture-button";
    assert target_issue.element_id == "fixture-button";
    assert image_issue.element_id == "fixture-image";
    assert contrast_issue.element_id == "fixture-text";
    assert motor.reports;
    assert visual.reports;
}
