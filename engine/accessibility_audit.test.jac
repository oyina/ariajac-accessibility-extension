import from engine.accessibility_audit { ingest_snapshot_and_audit }
import from engine.audit { AccessibilityIssue }

test "inaccessible fixture yields distinct deterministic findings" {
    snapshot: dict = {
        "snapshotId": "fixture-audit-1",
        "page": {"id": "fixture-page", "title": "Bad sample", "url": "https://fixture.test/bad"},
        "elements": [
            {"id":"root-main","tag":"main","role":"main","text":"","accessibleName":"","alt":"","href":None,"visible":True,"interactive":False,"headingLevel":0,"media":None,"hasFormLabel":True,"contrastRatio":0.0,"bounds":{"width":500,"height":400},"foreground":"","background":"","animation":"","focusable":False,"parentId":None},
            {"id":"bad-image","tag":"img","role":"img","text":"","accessibleName":"","alt":"","href":None,"visible":True,"interactive":False,"headingLevel":0,"media":None,"hasFormLabel":True,"contrastRatio":0.0,"bounds":{"width":80,"height":60},"foreground":"","background":"","animation":"","focusable":False,"parentId":"root-main"},
            {"id":"bad-button","tag":"button","role":"button","text":"","accessibleName":"","alt":"","href":None,"visible":True,"interactive":True,"headingLevel":0,"media":None,"hasFormLabel":True,"contrastRatio":0.0,"bounds":{"width":18,"height":18},"foreground":"","background":"","animation":"","focusable":True,"parentId":"root-main"},
            {"id":"low-text","tag":"p","role":"paragraph","text":"Low contrast","accessibleName":"Low contrast","alt":"","href":None,"visible":True,"interactive":False,"headingLevel":0,"media":None,"hasFormLabel":True,"contrastRatio":2.1,"bounds":{"width":200,"height":30},"foreground":"rgb(190,190,190)","background":"rgb(255,255,255)","animation":"","focusable":False,"parentId":"root-main"}
        ],
        "relationships": []
    };
    result = ingest_snapshot_and_audit(snapshot);
    found: list[AccessibilityIssue] = result.issues;
    assert len(found) >= 4;
    assert len([i for i in found if i.element_id == "bad-image" and i.category == "Semantics"]) > 0;
    assert len([i for i in found if i.element_id == "bad-button" and i.category == "Semantics"]) > 0;
    assert len([i for i in found if i.element_id == "bad-button" and i.category == "Motor"]) > 0;
    assert len([i for i in found if i.element_id == "low-text" and i.category == "Visual"]) > 0;
    for issue in found {
        assert issue.issue_id != "";
        assert issue.element_id != "";
        assert issue.detected_by in ["deterministic", "semantic-ai", "manual-review"];
        assert not issue.can_auto_fix;
    }
}
