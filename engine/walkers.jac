import from engine.graph { Page, Element, HasElement, ContainsElement }
import from engine.audit { AccessibilityIssue, Transformation }

walker VisualAuditWalker {
    has page_url: str = "";
    has findings: list[AccessibilityIssue] = [];
    has reports: list[list[AccessibilityIssue]] = [];
    can scan with Root entry { for page in [here -->][?:Page] { if page.url == self.page_url { visit page; } } }
    can check with Element entry {
        if here.page_url != self.page_url { skip; }
        if here.contrast_ratio > 0.0 and here.contrast_ratio < 4.5 { self.findings = self.findings + [AccessibilityIssue(issue_id="contrast:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Visual", severity="high", description="Measured text contrast is below 4.5:1; confirm text size and context.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 1.4.3", detected_by="deterministic", can_auto_fix=True)]; }
        if here.animation != "" { self.findings = self.findings + [AccessibilityIssue(issue_id="motion:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Motion", severity="low", description="Animation metadata exists; a reduced-motion override can be applied temporarily.", wcag_reference="Manual review: motion behavior", detected_by="manual-review", can_auto_fix=True)]; }
        visit [here ->:ContainsElement:->];
    }
    can finish with Root exit { report self.findings; }
}

walker SemanticAuditWalker {
    has page_url: str = "";
    has findings: list[AccessibilityIssue] = [];
    has reports: list[list[AccessibilityIssue]] = [];
    can scan with Root entry { for page in [here -->][?:Page] { if page.url == self.page_url { visit page; } } }
    can check with Element entry {
        if here.page_url != self.page_url { skip; }
        if here.tag == "img" and here.alt == "" { self.findings = self.findings + [AccessibilityIssue(issue_id="image-alt:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Semantics", severity="high", description="Image has no alt text; confirm whether informative or decorative.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 1.1.1", detected_by="deterministic")]; }
        if here.interactive and here.accessible_name == "" { self.findings = self.findings + [AccessibilityIssue(issue_id="name:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Semantics", severity="high", description="Interactive control has no detectable accessible name.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 4.1.2", detected_by="deterministic")]; }
        if here.tag in ["input", "select", "textarea"] and not here.has_form_label { self.findings = self.findings + [AccessibilityIssue(issue_id="label:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Forms", severity="medium", description="No associated form label was detected.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 3.3.2", detected_by="deterministic")]; }
        visit [here ->:ContainsElement:->];
    }
    can finish with Root exit { report self.findings; }
}

walker MotorAuditWalker {
    has page_url: str = "";
    has findings: list[AccessibilityIssue] = [];
    has reports: list[list[AccessibilityIssue]] = [];
    can scan with Root entry { for page in [here -->][?:Page] { if page.url == self.page_url { visit page; } } }
    can check with Element entry {
        if here.page_url != self.page_url { skip; }
        if here.interactive and (here.width < 24 or here.height < 24) { self.findings = self.findings + [AccessibilityIssue(issue_id="target:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Motor", severity="medium", description="Interactive target is smaller than 24 by 24 CSS pixels.", wcag_reference="Potential accessibility barrier — WCAG 2.2 SC 2.5.8", detected_by="deterministic", can_auto_fix=True)]; }
        if here.interactive { self.findings = self.findings + [AccessibilityIssue(issue_id="focus-style:" + here.element_id, element_id=here.element_id, page_url=self.page_url, category="Motor", severity="low", description="Visible focus styling cannot be established by an unfocused scan; temporary focus treatment is available.", wcag_reference="Manual review: visible focus", detected_by="manual-review", can_auto_fix=True)]; }
        visit [here ->:ContainsElement:->];
    }
    can finish with Root exit { report self.findings; }
}

walker AuditPageWalker {
    has page_url: str = "";
    has findings: list[AccessibilityIssue] = [];
    has reports: list[list[AccessibilityIssue]] = [];
    can start with Root entry { pages = [here -->][?:Page]; for page in pages { if page.url == self.page_url { visit [page ->:HasElement:->]; } } }
    can continue with Element entry { visit [here ->:ContainsElement:->]; }
    can finish with Root exit { report self.findings; }
}

walker RepairWalker {
    has page_url: str = "";
    has transformations: list[Transformation] = [];
    has reports: list[list[Transformation]] = [];
    can start with Root entry { for page in [here -->][?:Page] { if page.url == self.page_url { visit [page ->:HasElement:->]; } } }
    can propose with Element entry {
        if here.page_url != self.page_url { skip; }
        if here.contrast_ratio > 0.0 and here.contrast_ratio < 4.5 { self.transformations = self.transformations + [Transformation(id="contrast:" + here.element_id, issue_id="contrast:" + here.element_id, element_id=here.element_id, before_state="computed foreground/background", after_state="temporary high contrast CSS class", transformation_type="contrast", reversible=True)]; }
        if here.interactive and (here.width < 24 or here.height < 24) { self.transformations = self.transformations + [Transformation(id="target:" + here.element_id, issue_id="target:" + here.element_id, element_id=here.element_id, before_state="original dimensions", after_state="temporary 44px minimum target CSS", transformation_type="target-size", reversible=True)]; }
        if here.animation != "" { self.transformations = self.transformations + [Transformation(id="motion:" + here.element_id, issue_id="motion:" + here.element_id, element_id=here.element_id, before_state="original animation styles", after_state="temporary reduced-motion override", transformation_type="reduced-motion", reversible=True)]; }
        if here.interactive { self.transformations = self.transformations + [Transformation(id="focus:" + here.element_id, issue_id="focus-style:" + here.element_id, element_id=here.element_id, before_state="original focus styles", after_state="temporary visible focus outline", transformation_type="focus-visibility", reversible=True)]; }
        visit [here ->:ContainsElement:->];
    }
    can finish with Root exit { report self.transformations; }
}
