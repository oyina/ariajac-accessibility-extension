import from engine.graph { Page, Element, HasElement, ContainsElement }

obj GraphUpdate {
    has snapshot_id: str = "";
    has page_count: int = 0;
    has element_count: int = 0;
    has relationship_count: int = 0;
    has added: list[str] = [];
    has removed: list[str] = [];
    has changed: list[str] = [];
}

def:pub ingest_snapshot(snapshot: dict) -> GraphUpdate {
    page_data = snapshot["page"] as dict;
    page_url = page_data["url"] as str;
    page_title = page_data["title"] as str;
    snapshot_id = snapshot["snapshotId"] as str;
    pages: list[Page] = [];
    for candidate in [root -->][?:Page] {
        if candidate.url == page_url { pages = pages + [candidate]; }
    }
    page: Page;
    if len(pages) == 0 {
        page = Page(snapshot_id=snapshot_id, title=page_title, url=page_url);
        root ++> page;
    } else {
        page = pages[0];
        page.snapshot_id = snapshot_id;
        page.title = page_title;
    }

    additions: list[str] = [];
    modifications: list[str] = [];
    seen: list[str] = [];
    element_data = snapshot["elements"] as list[dict];
    for record in element_data {
        element_id = record["id"] as str;
        seen = seen + [element_id];
        matches: list[Element] = [];
        for candidate in [root -->][?:Element] {
            if candidate.page_url == page_url and candidate.element_id == element_id {
                matches = matches + [candidate];
            }
        }
        if len(matches) == 0 {
            element = Element(
                element_id=element_id,
                page_url=page_url,
                tag=record["tag"] as str,
                role=record["role"] as str,
                heading_level=record["headingLevel"] as int or 0,
                media_controls=((record["media"] as dict)["controls"] as bool) if record["media"] else False,
                media_autoplay=((record["media"] as dict)["autoplay"] as bool) if record["media"] else False,
                media_muted=((record["media"] as dict)["muted"] as bool) if record["media"] else False,
                text=record["text"] as str,
                accessible_name=record["accessibleName"] as str,
                alt=record["alt"] as str,
                href=record["href"] as str or "",
                visible=record["visible"] as bool,
                interactive=record["interactive"] as bool,
                width=(record["bounds"] as dict)["width"] as int,
                height=(record["bounds"] as dict)["height"] as int,
                foreground=record["foreground"] as str,
                background=record["background"] as str,
                animation=record["animation"] as str or "",
                focusable=record["focusable"] as bool
            );
            root ++> element;
            additions = additions + [element_id];
        } else {
            element = matches[0];
            if element.text != (record["text"] as str) or element.accessible_name != (record["accessibleName"] as str) or element.alt != (record["alt"] as str) or element.href != (record["href"] as str or "") or element.width != ((record["bounds"] as dict)["width"] as int) or element.height != ((record["bounds"] as dict)["height"] as int) {
                modifications = modifications + [element_id];
            }
            element.tag = record["tag"] as str;
            element.role = record["role"] as str;
            element.heading_level = record["headingLevel"] as int or 0;
            element.media_controls = ((record["media"] as dict)["controls"] as bool) if record["media"] else False;
            element.media_autoplay = ((record["media"] as dict)["autoplay"] as bool) if record["media"] else False;
            element.media_muted = ((record["media"] as dict)["muted"] as bool) if record["media"] else False;
            element.text = record["text"] as str;
            element.accessible_name = record["accessibleName"] as str;
            element.alt = record["alt"] as str;
            element.href = record["href"] as str or "";
            element.visible = record["visible"] as bool;
            element.interactive = record["interactive"] as bool;
            element.width = (record["bounds"] as dict)["width"] as int;
            element.height = (record["bounds"] as dict)["height"] as int;
            element.foreground = record["foreground"] as str;
            element.background = record["background"] as str;
            element.animation = record["animation"] as str or "";
            element.focusable = record["focusable"] as bool;
        }
        parent_id = record["parentId"] as str;
        parent_matches: list[Element] = [];
        for parent_candidate in [root -->][?:Element] {
            if parent_candidate.page_url == page_url and parent_candidate.element_id == parent_id {
                parent_matches = parent_matches + [parent_candidate];
            }
        }
        if parent_id == "" or len(parent_matches) == 0 {
            attached = [page ->:HasElement:->];
            if element not in attached { page +>:HasElement:+> element; }
        } else {
            parent_element = parent_matches[0];
            attached_children = [parent_element ->:ContainsElement:->];
            if element not in attached_children { parent_element +>:ContainsElement:+> element; }
        }
    }

    previous_elements = [page ->:HasElement:->];
    for parent_node in previous_elements {
        previous_children = [parent_node ->:ContainsElement:->];
        for child_node in previous_children { previous_elements = previous_elements + [child_node]; }
    }
    removals: list[str] = [];
    for element in previous_elements {
        if element.element_id not in seen {
            removals = removals + [element.element_id];
            del element;
        }
    }
    current_elements: list[Element] = [];
    for candidate in [root -->][?:Element] {
        if candidate.page_url == page_url { current_elements = current_elements + [candidate]; }
    }
    return GraphUpdate(
        snapshot_id=snapshot_id,
        page_count=len([root -->][?:Page]),
        element_count=len(current_elements),
        relationship_count=len([edge page ->:HasElement:->]) + len([edge page ->:ContainsElement:->]),
        added=additions,
        removed=removals,
        changed=modifications
    );
}
