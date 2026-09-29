import from engine.graph { Page, Element, HasElement, ContainsElement }
import from engine.audit { AuditSession }
import from engine.walkers { WalkerRegistry }
import from engine.snapshot_importer { GraphUpdate, ingest_snapshot }

def:pub inspect_snapshot(snapshot: dict) -> GraphUpdate {
    return ingest_snapshot(snapshot);
}

with entry:__main__ {
    print("AriaJac graph engine ready. Import normalized snapshots with inspect_snapshot.");
}
