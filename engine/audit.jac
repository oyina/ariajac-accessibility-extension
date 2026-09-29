import from engine.graph { Page, Element }

enum IssueSource: str {
    DETERMINISTIC = "deterministic",
    SEMANTIC_AI = "semantic-ai",
    MANUAL_REVIEW = "manual-review"
}

enum IssueSeverity: str {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}

node AccessibilityIssue {
    has issue_id: str = "";
    has element_id: str = "";
    has page_url: str = "";
    has category: str = "";
    has severity: str = "low";
    has description: str = "";
    has wcag_reference: str = "";
    has detected_by: str = "deterministic";
    has can_auto_fix: bool = False;
}

node Transformation {
    has id: str = "";
    has issue_id: str = "";
    has element_id: str = "";
    has before_state: str = "";
    has after_state: str = "";
    has transformation_type: str = "";
    has reversible: bool = True;
    has timestamp: str = "";
}

obj AuditSession {
    has page: Page;
    has status: str = "idle";
    has issues: list[AccessibilityIssue] = [];
}
