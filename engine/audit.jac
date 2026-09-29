import from engine.graph { Page }

obj AuditSession {
    has page: Page;
    has status: str = "idle";
}
