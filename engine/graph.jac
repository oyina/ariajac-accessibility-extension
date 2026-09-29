node Page {
    has snapshot_id: str = "";
    has title: str = "";
    has url: str = "";
}

node Element {
    has element_id: str = "";
    has page_url: str = "";
    has tag: str = "";
    has role: str = "";
    has heading_level: int = 0;
    has media_controls: bool = False;
    has media_autoplay: bool = False;
    has media_muted: bool = False;
    has text: str = "";
    has accessible_name: str = "";
    has alt: str = "";
    has href: str = "";
    has visible: bool = True;
    has interactive: bool = False;
    has width: int = 0;
    has height: int = 0;
    has foreground: str = "";
    has background: str = "";
    has animation: str = "";
    has focusable: bool = False;
}

edge HasElement: Page --> Element {}
edge ContainsElement: Element --> Element {}
