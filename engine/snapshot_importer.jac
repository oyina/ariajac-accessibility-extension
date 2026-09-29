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

    # Pass one creates or updates every node before relationships are resolved.
    for record in element_data {
        element_id = record["id"] as str;
        seen = seen + [element_id];
        matches: list[Element] = [];
        for candidate in [root -->][?:Element] {
            if candidate.page_url == page_url and candidate.element_id == element_id { matches = matches + [candidate]; }
        }
        if len(matches) == 0 {
            element = Element(
                element_id=element_id,
                page_url=page_url,
                tag=record["tag"] as str,
                role=record["role"] as str,
                heading_level=record["headingLevel"] as int or 0,
                contrast_ratio=record["contrastRatio"] as float or 0.0,
                has_form_label=record["hasFormLabel"] as bool,
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
            if element.text != (record["text"] as str) or element.accessible_name != (record["accessibleName"] as str) or element.alt != (record["alt"] as str) or element.href != (record["href"] as str or "") or element.width != ((record["bounds"] as dict)["width"] as int) or element.height != ((record["bounds"] as dict)["height"] as int) or element.contrast_ratio != (record["contrastRatio"] as float or 0.0) or element.has_form_label != (record["hasFormLabel"] as bool) {
                modifications = modifications + [element_id];
            }
            element.tag = record["tag"] as str;
            element.role = record["role"] as str;
            element.heading_level = record["headingLevel"] as int or 0;
            element.contrast_ratio = record["contrastRatio"] as float or 0.0;
            element.has_form_label = record["hasFormLabel"] as bool;
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
    }

    # Pass two resolves containment independently of snapshot ordering.
    for record in element_data {
        element_id = record["id"] as str;
        parent_id = record["parentId"] as str;
        matching_elements: list[Element] = [];
        for candidate in [root -->][?:Element] {
            if candidate.page_url == page_url and candidate.element_id == element_id { matching_elements = matching_elements + [candidate]; }
        }
        matching_parents: list[Element] = [];
        if parent_id != "" {
            for candidate in [root -->][?:Element] {
                if candidate.page_url == page_url and candidate.element_id == parent_id { matching_parents = matching_parents + [candidate]; }
            }
        }
        if len(matching_elements) > 0 {
            element = matching_elements[0];
            if len(matching_parents) == 0 {
                attached_pages = [page ->:HasElement:->];
                if element not in attached_pages { page +>:HasElement:+> element; }
            } else {
                parent_element = matching_parents[0];
                attached_children = [parent_element ->:ContainsElement:->];
                if element not in attached_children { parent_element +>:ContainsElement:+> element; }
            }
        }
    }

    # Stable graph cleanup scope: remove stale direct page children only. Nested
    # stale descendants are removed with their detached parent when scanned again.
    existing_direct = [page ->:HasElement:->];
    removals: list[str] = [];
    for element in existing_direct {
        if element.element_id not in seen {
            removals = removals + [element.element_id];
            del element;
        }
    }
    current_elements: list[Element] = [];
    for candidate in [root -->][?:Element] {
        if candidate.page_url == page_url { current_elements = current_elements + [candidate]; }
    }
    relationships = len([edge page ->:HasElement:->]);
    for element in current_elements { relationships += len([edge element ->:ContainsElement:->]); }
    return GraphUpdate(
        snapshot_id=snapshot_id,
        page_count=len([root -->][?:Page]),
        element_count=len(current_elements),
        relationship_count=relationships,
        added=additions,
        removed=removals,
        changed=modifications
    );
}
