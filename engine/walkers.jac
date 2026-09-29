import from engine.graph { Page, Element, HasElement, ContainsElement }
import from engine.audit { AccessibilityIssue }

walker VisualAuditWalker {
    has page_url: str = "";
    has findings: list[AccessibilityIssue] = [];
    has reports: list[list[AccessibilityIssue]] = [];

    can scan with Root entry {
        for page in [here -->][?:Page] { if page.url == self.page_url { visit page; } }
    }

    can check with Element entry {
        if here.page_url != self.page_url { skip; }
        if here.contrast_ratio > 0.0 and here.contrast_ratio < 4.5 {
            self.findings = self.findings + [AccessibilityIssue(issue_id="contrast:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Visual", severity="high", description="Measured text contrast is below 4.5:1 (" + str(here.contrast_ratio) + ":1). Verify text size and context before changing colors.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 1.4.3", detected_by="deterministic", can_auto_fix=False)];
        }
        if here.animation != "" {
            self.findings = self.findings + [AccessibilityIssue(issue_id="motion:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Motion", severity="low", description="Animation metadata is present. Review behavior with reduced-motion preferences enabled.", wcag_reference="Manual review: motion behavior", detected_by="manual-review", can_auto_fix=False)];
        }
        visit [here ->:ContainsElement:->];
    }

    can finish with Root exit { report self.findings; }
}

walker SemanticAuditWalker {
    has page_url: str = "";
    has findings: list[AccessibilityIssue] = [];
    has reports: list[list[AccessibilityIssue]] = [];

    can scan with Root entry {
        for page in [here -->][?:Page] { if page.url == self.page_url { visit page; } }
    }

    can check with Element entry {
        if here.page_url != self.page_url { skip; }
        if here.tag == "img" and here.alt == "" {
            self.findings = self.findings + [AccessibilityIssue(issue_id="image-alt:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Semantics", severity="high", description="Image has no alt attribute text. Confirm whether it is informative or intentionally decorative.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 1.1.1", detected_by="deterministic", can_auto_fix=False)];
        }
        if here.interactive and here.accessible_name == "" {
            self.findings = self.findings + [AccessibilityIssue(issue_id="name:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Semantics", severity="high", description="Interactive control has no detectable accessible name.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 4.1.2", detected_by="deterministic", can_auto_fix=False)];
        }
        if here.tag in ["input", "select", "textarea"] and not here.has_form_label {
            self.findings = self.findings + [AccessibilityIssue(issue_id="label:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Forms", severity="medium", description="No associated form label was detected. Check accessible naming techniques and grouping.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 3.3.2", detected_by="deterministic", can_auto_fix=False)];
        }
        if here.tag in ["h1", "h2", "h3", "h4", "h5", "h6"] and here.heading_level > 1 {
            self.findings = self.findings + [AccessibilityIssue(issue_id="heading-review:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Semantics", severity="low", description="Heading outline requires review in page context.", wcag_reference="Manual review: heading structure", detected_by="manual-review", can_auto_fix=False)];
        }
        visit [here ->:ContainsElement:->];
    }

    can finish with Root exit { report self.findings; }
}

walker MotorAuditWalker {
    has page_url: str = "";
    has findings: list[AccessibilityIssue] = [];
    has reports: list[list[AccessibilityIssue]] = [];

    can scan with Root entry {
        for page in [here -->][?:Page] { if page.url == self.page_url { visit page; } }
    }

    can check with Element entry {
        if here.page_url != self.page_url { skip; }
        if here.interactive and (here.width < 24 or here.height < 24) {
            self.findings = self.findings + [AccessibilityIssue(issue_id="target:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Motor", severity="medium", description="Interactive target is smaller than 24 by 24 CSS pixels. Check spacing exceptions and the actual pointer target.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 2.5.8", detected_by="deterministic", can_auto_fix=False)];
        }
        if here.interactive and not here.focusable {
            self.findings = self.findings + [AccessibilityIssue(issue_id="keyboard:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Motor", severity="medium", description="Control is not detected as focusable from its element semantics. Keyboard operation needs manual verification.", wcag_reference="Manual review: keyboard accessibility", detected_by="manual-review", can_auto_fix=False)];
        }
        if here.interactive {
            self.findings = self.findings + [AccessibilityIssue(issue_id="focus-style:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Motor", severity="low", description="Visible focus styling cannot be established from an unfocused page snapshot; verify by keyboard navigation.", wcag_reference="Manual review: visible focus", detected_by="manual-review", can_auto_fix=False)];
        }
        visit [here ->:ContainsElement:->];
    }

    can finish with Root exit { report self.findings; }
}

walker AuditPageWalker {
    has page_url: str = "";
    has findings: list[AccessibilityIssue] = [];
    has reports: list[list[AccessibilityIssue]] = [];

    can start with Root entry {
        pages: list[Page] = [];
        for page in [here -->][?:Page] {
            if page.url == self.page_url { pages = pages + [page]; }
        }
        if len(pages) == 0 { report self.findings; disengage; }
        page = pages[0];
        visit [page ->:HasElement:->];
    }

    can check with Element entry {
        if here.page_url == self.page_url { self.findings = self.findings + []; }
        visit [here ->:ContainsElement:->];
    }

    can finish with Root exit { report self.findings; }
}
