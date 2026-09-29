import from engine.graph { PageSnapshot }

obj AuditSession {
    has page: PageSnapshot;
    has status: str = "idle";
}
