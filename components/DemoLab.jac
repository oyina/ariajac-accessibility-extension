import from "@jac/runtime" { Link }
import from "@hugeicons/react" { HugeiconsIcon }
import from "@hugeicons/core-free-icons" { Home01Icon, SparklesIcon, Notification01Icon, Analytics01Icon, UserGroupIcon, ArrowRight01Icon, Settings01Icon, Alert01Icon }

glob SCENARIOS: list[dict] = [
    {"id":"mixed","label":"Mixed","summary":"A little of everything","title":"Mixed Accessibility Barriers"},
    {"id":"low-vision","label":"Low Vision","summary":"Contrast and density","title":"Low Vision Review"},
    {"id":"color-vision","label":"Color Vision","summary":"Color-only signals","title":"Color-coded Operations"},
    {"id":"motor","label":"Motor","summary":"Targets and focus","title":"Motor Access Review"},
    {"id":"cognitive","label":"Cognitive","summary":"Dense and distracting","title":"Product Update Briefing"},
    {"id":"motion","label":"Motion","summary":"Opt-in motion sample","title":"Motion Preference Demo"}
];

def:pub DemoLab() -> JsxElement {
    has scenario_id: str = "mixed";
    has animation_stopped: bool = False;
    def choose_mixed(e: MouseEvent) { scenario_id = "mixed"; animation_stopped = False; }
    def choose_low(e: MouseEvent) { scenario_id = "low-vision"; animation_stopped = False; }
    def choose_color(e: MouseEvent) { scenario_id = "color-vision"; animation_stopped = False; }
    def choose_motor(e: MouseEvent) { scenario_id = "motor"; animation_stopped = False; }
    def choose_cognitive(e: MouseEvent) { scenario_id = "cognitive"; animation_stopped = False; }
    def choose_motion(e: MouseEvent) { scenario_id = "motion"; animation_stopped = False; }
    def stop_animation(e: MouseEvent) { animation_stopped = True; }

    scenario: dict = SCENARIOS[0];
    for candidate in SCENARIOS { if candidate["id"] == scenario_id { scenario = candidate; } }
    issues_count = 9 if scenario_id == "mixed" else 4 if scenario_id == "low-vision" else 3 if scenario_id == "color-vision" else 4 if scenario_id == "motor" else 3 if scenario_id == "cognitive" else 2;
    mixed_button_class = "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-primary bg-primary text-primary-foreground" if scenario_id == "mixed" else "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-background hover:bg-muted";
    low_button_class = "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-primary bg-primary text-primary-foreground" if scenario_id == "low-vision" else "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-background hover:bg-muted";
    color_button_class = "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-primary bg-primary text-primary-foreground" if scenario_id == "color-vision" else "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-background hover:bg-muted";
    motor_button_class = "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-primary bg-primary text-primary-foreground" if scenario_id == "motor" else "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-background hover:bg-muted";
    cognitive_button_class = "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-primary bg-primary text-primary-foreground" if scenario_id == "cognitive" else "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-background hover:bg-muted";
    motion_button_class = "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-primary bg-primary text-primary-foreground" if scenario_id == "motion" else "min-h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-background hover:bg-muted";
    notification_demo = "unlabeled-notification" if scenario_id == "mixed" or scenario_id == "cognitive" else "notification-control";
    hero_title_class = "mt-2 font-semibold text-sm" if scenario_id == "low-vision" or scenario_id == "mixed" else "mt-2 font-semibold text-2xl";
    hero_copy_demo = "low-contrast-text" if scenario_id == "mixed" or scenario_id == "low-vision" else "article-intro";
    hero_copy_class = "mt-3 max-w-2xl leading-relaxed text-slate-600" if scenario_id == "mixed" or scenario_id == "low-vision" else "mt-3 max-w-2xl leading-relaxed text-slate-300";
    status_demo = "color-only-status" if scenario_id == "color-vision" or scenario_id == "mixed" else "health-status";
    review_demo = "color-only-status" if scenario_id == "color-vision" or scenario_id == "mixed" else "review-status";
    status_text_class = "text-sm text-emerald-700" if scenario_id != "low-vision" and scenario_id != "mixed" else "text-sm text-slate-600";
    review_text_class = "text-sm text-rose-700" if scenario_id != "low-vision" and scenario_id != "mixed" else "text-sm text-slate-600";
    status_copy = "Approved" if scenario_id != "color-vision" else "Ready";
    review_copy = "Rejected" if scenario_id != "color-vision" else "Needs review";
    update_class = "rounded-xl border p-4 text-sm leading-snug" if scenario_id == "cognitive" else "rounded-xl border p-4";
    motion_banner_class = "mt-4 flex items-center gap-3 rounded-lg border bg-muted/40 p-3 animate-pulse" if scenario_id == "motion" else "mt-4 flex items-center gap-3 rounded-lg border bg-muted/40 p-3";
    target_demo = "small-low-contrast-target" if scenario_id == "mixed" or scenario_id == "low-vision" or scenario_id == "motor" else "primary-action";
    target_class = "rounded-lg font-semibold min-h-6 px-1 text-xs bg-indigo-100 text-indigo-200" if scenario_id == "mixed" or scenario_id == "low-vision" or scenario_id == "motor" else "rounded-lg font-semibold min-h-11 px-4 bg-primary text-primary-foreground";
    link_demo = "small-link-target" if scenario_id == "motor" else "report-link";
    link_class = "text-xs" if scenario_id == "motor" else "text-sm";
    return <div className="min-h-svh bg-muted/40 text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Return to AriaJac dashboard">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><HugeiconsIcon icon={Home01Icon} strokeWidth={2} className="size-5" /></span>
            <span><strong className="block text-lg tracking-tight">AriaJac Demo Lab</strong><span className="text-xs text-muted-foreground">A realistic accessibility test environment</span></span>
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-sm"><span className="size-2 rounded-full bg-emerald-600"></span>Demo ready</span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex min-w-0 flex-col gap-5">
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-primary"><HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />DEMO ENVIRONMENT</div>
                <h1 className="text-3xl font-semibold tracking-tight">Explore a page through different access needs</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Choose a scenario to change this realistic product page. Use the AriaJac Chrome extension to inspect the actual rendered content.</p>
              </div>
              <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm"><div className="font-medium">Current scenario</div><div className="mt-1 text-primary">{scenario["title"]}</div></div>
            </div>
            <p className="mt-4 rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">This page intentionally contains accessibility barriers for testing. The scenario controls themselves are keyboard-operable and are outside the sample content.</p>
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Choose accessibility scenario">
              <button type="button" onClick={choose_mixed} aria-pressed={scenario_id == "mixed"} className={mixed_button_class}>Mixed</button>
              <button type="button" onClick={choose_low} aria-pressed={scenario_id == "low-vision"} className={low_button_class}>Low Vision</button>
              <button type="button" onClick={choose_color} aria-pressed={scenario_id == "color-vision"} className={color_button_class}>Color Vision</button>
              <button type="button" onClick={choose_motor} aria-pressed={scenario_id == "motor"} className={motor_button_class}>Motor</button>
              <button type="button" onClick={choose_cognitive} aria-pressed={scenario_id == "cognitive"} className={cognitive_button_class}>Cognitive</button>
              <button type="button" onClick={choose_motion} aria-pressed={scenario_id == "motion"} className={motion_button_class}>Motion</button>
            </div>
          </div>

          <article className="overflow-hidden rounded-2xl border bg-card shadow-sm" aria-label="Sample product webpage">
            <nav className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" aria-label="Sample website navigation">
              <div className="flex items-center gap-2 font-semibold"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={Analytics01Icon} strokeWidth={2} className="size-4" /></span>Northstar Briefing</div>
              <div className="flex flex-wrap items-center gap-4 text-sm"><a href="#overview" className="text-muted-foreground">Overview</a><a href="#reports" className="text-muted-foreground">Reports</a><a href="#updates" className="text-muted-foreground">Updates</a><button type="button" aria-label="Notifications" data-ariajac-demo={notification_demo} className="min-h-10 rounded-lg px-2 text-muted-foreground focus:outline-none"><HugeiconsIcon icon={Notification01Icon} strokeWidth={2} className="size-5" /></button></div>
            </nav>

            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_230px]">
              <div className="flex min-w-0 flex-col gap-5">
                <section id="overview" className="rounded-xl bg-slate-900 p-5 text-slate-100">
                  <p className="text-xs tracking-wide text-slate-400">WEEKLY PRODUCT BRIEFING</p>
                  <h2 className={hero_title_class}>A clearer view of this week’s work</h2>
                  <p data-ariajac-demo={hero_copy_demo} className={hero_copy_class}>Teams are reviewing the latest service changes, customer feedback, and delivery notes in one place. The briefing summarizes recent activity and points to the work that needs attention.</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button type="button" data-ariajac-demo={target_demo} className={target_class}>View weekly report</button>
                    <a href="#details" data-ariajac-demo={link_demo} className={link_class}>Read the release notes</a>
                  </div>
                </section>

                {if scenario_id == "mixed" or scenario_id == "low-vision" or scenario_id == "color-vision" or scenario_id == "motor" {
                  <section id="reports" className="grid gap-3 sm:grid-cols-2" aria-label="Service report cards">
                    <div className="rounded-xl border p-4"><div className="flex items-center justify-between"><h3 className="font-medium">Service health</h3><span data-ariajac-demo={status_demo} className={status_text_class}>{status_copy}</span></div><p className="mt-2 text-sm text-muted-foreground">Core services are responding as expected.</p></div>
                    <div className="rounded-xl border p-4"><div className="flex items-center justify-between"><h3 className="font-medium">Release review</h3><span data-ariajac-demo={review_demo} className={review_text_class}>{review_copy}</span></div><p className="mt-2 text-sm text-muted-foreground">Two items need another review.</p></div>
                  </section>
                }}

                {if scenario_id == "mixed" or scenario_id == "motor" {
                  <button type="button" aria-label="Open service alerts" data-ariajac-demo="small-icon-target" className="min-h-5 rounded p-0.5 text-muted-foreground focus:outline-none"><HugeiconsIcon icon={Alert01Icon} strokeWidth={2} className="size-3" /></button>
                }}

                {if scenario_id == "color-vision" or scenario_id == "mixed" {
                  <section className="rounded-xl border p-4" aria-label="Color-dependent report chart">
                    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">Queue by service</h3><span className="text-xs text-muted-foreground">Color indicates status</span></div>
                    <div className="mt-4 flex h-28 items-end gap-3" role="img" aria-label="Bar chart using color-coded service categories">
                      <div data-ariajac-demo="color-only-chart" className="h-1/2 flex-1 rounded-t bg-emerald-500"></div><div data-ariajac-demo="color-only-chart" className="h-4/5 flex-1 rounded-t bg-rose-500"></div><div data-ariajac-demo="color-only-chart" className="h-2/3 flex-1 rounded-t bg-amber-400"></div><div data-ariajac-demo="color-only-chart" className="h-3/5 flex-1 rounded-t bg-emerald-500"></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs"><span className="text-emerald-700">Approved</span><span className="text-rose-700">Rejected</span><span className="text-amber-700">Pending</span></div>
                  </section>
                }}

                {if scenario_id == "mixed" or scenario_id == "color-vision" {
                  <form className="rounded-xl border p-4" aria-label="Update contact details">
                    <h3 className="font-medium">Update contact details</h3>
                    <label htmlFor="demo-email" className="mt-3 block text-sm">Email address</label>
                    <input id="demo-email" type="email" value="reader@example.com" readOnly={True} data-ariajac-demo="color-only-error" className="mt-1 min-h-10 w-full rounded-lg border border-rose-600 px-3 text-sm outline-none" />
                    <p className="mt-1 text-xs text-rose-600">Please check this address</p>
                  </form>
                }}

                {if scenario_id == "mixed" or scenario_id == "cognitive" {
                  <section id="updates" className={update_class}>
                    <h3 className="font-semibold">What changed this week</h3>
                    <p className="mt-2 text-sm leading-relaxed">The operations team updated the service handoff, consolidated two separate reporting pages, revised the customer response schedule, and added new notes about the release window. Reviewers should compare each update with the prior guidance, confirm that the new checklist matches the current process, contact the owner if details are unclear, and note any timing conflicts before sharing the update with other teams.</p>
                    {if scenario_id == "cognitive" {
                      <p className="mt-3 text-sm leading-relaxed">Additional technical note: the service-level summary reflects an aggregation across several reporting intervals, excluding delayed messages while including unresolved follow-up tasks; depending on the selected operational window, the resulting estimate may not align with the individual event log shown in the expanded report view. Consider consulting the internal appendix, the previous month’s comparison, and the migration note before deciding whether the change represents a regression.</p>
                    }}
                  </section>
                }}

                {if scenario_id == "motion" or scenario_id == "mixed" {
                  <section className="rounded-xl border p-4" aria-label="Controlled motion demonstration">
                    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium">Status pulse preview</h3><p className="mt-1 text-sm text-muted-foreground">A contained motion sample that can be stopped here.</p></div><button type="button" onClick={stop_animation} className="min-h-11 rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Stop demo animation</button></div>
                    {if not animation_stopped {
                      <div data-ariajac-demo="animated-banner" className={motion_banner_class}><span className="size-3 rounded-full bg-primary"></span><span className="text-sm">A sample status update is active</span></div>
                    } else {
                      <p className="mt-4 rounded-lg bg-muted/40 p-3 text-sm" role="status">Demo animation stopped.</p>
                    }}
                  </section>
                }}

                {if scenario_id == "mixed" or scenario_id == "low-vision" {
                  <div className="relative overflow-hidden rounded-xl border bg-muted/20 p-4" data-ariajac-demo="image-missing-alt">
                    <div className="flex h-36 items-center justify-center rounded-lg bg-gradient-to-br from-sky-200 to-indigo-300 text-sm text-slate-700">Northstar product preview</div>
                    <p className="mt-2 text-xs text-muted-foreground">A product preview image for the weekly briefing.</p>
                  </div>
                }}
              </div>

              <aside className="flex flex-col gap-4" aria-label="Related information">
                <div className="rounded-xl border bg-background p-4"><div className="flex items-center gap-2"><HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4 text-primary" /><h3 className="font-medium">Your team</h3></div><p className="mt-2 text-sm text-muted-foreground">A weekly summary for product operations and customer support.</p></div>
                {if scenario_id == "mixed" or scenario_id == "cognitive" {
                  <div className="rounded-xl border bg-background p-4" data-ariajac-demo="recommendation-clutter"><h3 className="font-medium">Recommended for you</h3><div className="mt-3 flex flex-col gap-3">{for (idx, item) in enumerate(["Review onboarding notes", "Read the launch checklist", "Explore customer highlights", "Open the weekly digest"]) {<a key={str(idx)} href="#updates" className="block rounded-lg bg-muted/40 p-3 text-sm">{item}<span className="mt-1 block text-xs text-muted-foreground">Suggested based on recent activity</span></a>}}</div></div>
                }}
                {if scenario_id == "mixed" {
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" data-ariajac-demo="notification-popup" role="status"><div className="flex items-center gap-2 font-medium"><HugeiconsIcon icon={Notification01Icon} strokeWidth={2} className="size-4" />New update available</div><p className="mt-2 text-sm">Your briefing has new recommendations.</p><button type="button" aria-label="Dismiss notification" className="mt-3 min-h-6 rounded px-1 text-xs">×</button></div>
                }}
                <div className="rounded-xl border bg-background p-4"><h3 className="font-medium">Review progress</h3><div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 w-2/3 rounded-full bg-primary"></div></div><span className="text-xs text-muted-foreground">2 of 3</span></div></div>
                {if scenario_id == "color-vision" {
                  <div className="rounded-xl border p-4"><h3 className="font-medium">Validation example</h3><p className="mt-2 text-sm">An input can show an error state through color alone.</p><input aria-label="Sample invalid account code" value="AB-12" readOnly={True} className="mt-3 min-h-10 w-full rounded-lg border border-red-600 px-3 text-sm" /></div>
                }}
              </aside>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-xs text-muted-foreground"><span>Northstar Briefing · Product operations</span><span>Sample content for accessibility testing</span></footer>
          </article>
        </section>

        <aside className="h-fit rounded-2xl border bg-card p-5 shadow-sm" aria-label="Demo status panel">
          <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary"></span><h2 className="text-base font-semibold">Demo status</h2></div>
          <dl className="mt-4 flex flex-col gap-4 text-sm">
            <div><dt className="text-muted-foreground">Demo scenario</dt><dd className="mt-1 font-medium">{scenario["label"]}</dd></div>
            <div><dt className="text-muted-foreground">Intentional barriers</dt><dd className="mt-1 font-medium tabular-nums">{str(issues_count)}</dd></div>
            <div><dt className="text-muted-foreground">AriaJac findings</dt><dd className="mt-1 font-medium">Not scanned</dd></div>
          </dl>
          <p className="mt-4 border-t pt-4 text-xs leading-relaxed text-muted-foreground">Use the Chrome extension to audit this page. Scenario labels are for test instrumentation only; findings come from the rendered page content.</p>
          <Link to="/" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Back to AriaJac <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 rotate-180" /></Link>
        </aside>
      </main>
    </div>;
}
