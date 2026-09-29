import from .ui.card { Card, CardContent, CardDescription, CardHeader, CardTitle }
import from .ui.button { Button }
import from .ui.badge { Badge }
import from .ui.progress { Progress }
import from "@hugeicons/react" { HugeiconsIcon }
import from "@hugeicons/core-free-icons" { CheckmarkCircle01Icon, Alert01Icon, Image01Icon, Cursor01Icon, EyeIcon, SparklesIcon, ArrowRight01Icon }

def:pub AccessibilityAudit() -> JsxElement {
    has resolved: list[int] = [];

    def resolve_image(e: MouseEvent) { resolved = resolved + [1]; }
    def resolve_target(e: MouseEvent) { resolved = resolved + [2]; }
    def resolve_link(e: MouseEvent) { resolved = resolved + [3]; }

    open_count = 3 - len(resolved);
    return <div className="min-h-svh bg-muted/40 text-foreground">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
                <a href="#" className="flex items-center gap-3" aria-label="AriaJac home">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><HugeiconsIcon icon={EyeIcon} strokeWidth={2} className="size-5" /></div>
                    <div><div className="text-lg font-semibold tracking-tight">AriaJac</div><div className="text-xs text-muted-foreground">Accessibility assistant</div></div>
                </a>
                <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm"><span className="size-2 rounded-full bg-emerald-600"></span>Monitoring this page</div>
            </header>

            <section className="flex flex-wrap items-end justify-between gap-5">
                <div className="flex max-w-2xl flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary"><HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />Your page, made easier to use</div>
                    <h1 className="text-3xl font-semibold tracking-tight">Accessibility overview</h1>
                    <p className="text-sm leading-relaxed text-muted-foreground">AriaJac is reviewing a sample page and surfacing practical improvements. Findings are illustrative, not a complete accessibility or WCAG audit.</p>
                </div>
                <Button className="gap-2 shadow-sm"><HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />Review page</Button>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Audit summary">
                <Card className="shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={Alert01Icon} strokeWidth={2} className="size-5" /></div><div><div className="text-3xl font-semibold tabular-nums">{str(open_count)}</div><div className="text-sm text-muted-foreground">Items to review</div></div></CardContent></Card>
                <Card className="shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-5" /></div><div><div className="text-3xl font-semibold tabular-nums">{str(len(resolved))}</div><div className="text-sm text-muted-foreground">Safe fixes applied</div></div></CardContent></Card>
                <Card className="shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={EyeIcon} strokeWidth={2} className="size-5" /></div><div><div className="text-base font-semibold">Sample page</div><div className="text-sm text-muted-foreground">Local demonstration</div></div></CardContent></Card>
            </section>

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="shadow-sm lg:col-span-2">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="flex flex-col gap-1"><CardTitle>Suggested improvements</CardTitle><CardDescription>Review each finding before applying a safe fix.</CardDescription></div>
                        <Badge variant="secondary">{str(open_count)} open</Badge>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="flex flex-col gap-4 rounded-xl border bg-background p-4 sm:flex-row sm:items-center">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="size-5" /></div>
                            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">Image is missing a text alternative</h3><Badge variant="outline">Content</Badge></div><p className="mt-1 text-sm leading-relaxed text-muted-foreground">A product image does not have descriptive alt text. Add a concise description so screen reader users get the same context.</p><p className="mt-2 text-xs text-muted-foreground">Image · <code className="rounded bg-muted px-1.5 py-0.5">img.product-photo</code></p></div>
                            {if 1 in resolved {<Badge variant="secondary" className="gap-1"><HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-3.5" />Resolved</Badge>} else {<Button variant="outline" size="sm" onClick={resolve_image}>Apply safe fix</Button>}}
                        </div>
                        <div className="flex flex-col gap-4 rounded-xl border bg-background p-4 sm:flex-row sm:items-center">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={Cursor01Icon} strokeWidth={2} className="size-5" /></div>
                            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">Button target may be hard to tap</h3><Badge variant="outline">Interaction</Badge></div><p className="mt-1 text-sm leading-relaxed text-muted-foreground">A small control could be easier to activate on touch screens with a more generous hit area.</p><p className="mt-2 text-xs text-muted-foreground">Button · <code className="rounded bg-muted px-1.5 py-0.5">button.share</code></p></div>
                            {if 2 in resolved {<Badge variant="secondary" className="gap-1"><HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-3.5" />Resolved</Badge>} else {<Button variant="outline" size="sm" onClick={resolve_target}>Apply safe fix</Button>}}
                        </div>
                        <div className="flex flex-col gap-4 rounded-xl border bg-background p-4 sm:flex-row sm:items-center">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={EyeIcon} strokeWidth={2} className="size-5" /></div>
                            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">Link text needs more context</h3><Badge variant="outline">Navigation</Badge></div><p className="mt-1 text-sm leading-relaxed text-muted-foreground">A “Learn more” link may be unclear on its own. Consider naming the destination in its visible label.</p><p className="mt-2 text-xs text-muted-foreground">Link · <code className="rounded bg-muted px-1.5 py-0.5">a.learn-more</code></p></div>
                            {if 3 in resolved {<Badge variant="secondary" className="gap-1"><HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-3.5" />Resolved</Badge>} else {<Button variant="outline" size="sm" onClick={resolve_link}>Apply safe fix</Button>}}
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-fit shadow-sm">
                    <CardHeader><CardTitle>Page review</CardTitle><CardDescription>A quick view of this sample run.</CardDescription></CardHeader>
                    <CardContent className="flex flex-col gap-5">
                        <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Review progress</span><span className="font-medium tabular-nums">{str(len(resolved))} of 3</span></div>
                        <Progress value={len(resolved) * 33} aria-label="Safe fix progress" />
                        <div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4"><div className="flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full bg-emerald-600"></span>Local demo only</div><p className="text-sm leading-relaxed text-muted-foreground">These sample controls update this screen only. No webpage is currently connected and no changes are made outside this preview.</p></div>
                        <a href="#" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Learn how AriaJac works <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" /></a>
                    </CardContent>
                </Card>
            </section>
            <footer className="border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">AriaJac offers guided accessibility suggestions. Always review changes in context; this prototype does not certify compliance.</footer>
        </div>
    </div>;
}
