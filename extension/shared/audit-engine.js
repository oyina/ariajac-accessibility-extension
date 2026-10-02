(function (root) {
  function makeIssue(id, element, category, severity, description, wcagReference, detectedBy = "deterministic") {
    return {
      id: `${id}:${element.id}`,
      element_id: element.id,
      selector: element.selector,
      category,
      severity,
      description,
      wcag_reference: wcagReference,
      detected_by: detectedBy,
      can_auto_fix: false,
      element_name: element.accessibleName || element.tag,
      potential_fix: "Review this element on the webpage; no automatic repair is applied.",
    };
  }

  function auditSnapshot(snapshot) {
    const markFixability = (issue) => {
      const type = String(issue.id || "").split(":")[0];
      const safe = issue.detected_by !== "manual-review" && (type === "target" || (type === "contrast" && Number(issue.contrast_ratio ?? issue.contrastRatio ?? 0) > 0) || (type === "motion" && issue.detected_by === "deterministic"));
      return { ...issue, can_auto_fix: safe, transformation_type: safe ? ({ target: "increase_target", contrast: "set_text_color", motion: "pause_animation" })[type] : null };
    };
    const issues = [];
    const elements = snapshot.elements || [];
    const byId = new Map(elements.map((element) => [element.id, element]));
    const headingLevels = [];

    for (const element of elements) {
      if (element.tag === "img" && !element.alt) {
        issues.push(makeIssue("image-alt", element, "Semantic", "high", "Image has no alt attribute text. Confirm whether it is informative or intentionally decorative.", "Potential accessibility barrier — WCAG 2.2 SC 1.1.1"));
      }
      if (element.interactive && !element.accessibleName) {
        issues.push(makeIssue("name", element, "Semantic", "high", "Interactive control has no detectable accessible name.", "Potential accessibility barrier — WCAG 2.2 SC 4.1.2"));
      }
      if (["input", "select", "textarea"].includes(element.tag) && !element.hasFormLabel) {
        issues.push(makeIssue("label", element, "Semantic", "medium", "No associated form label was detected. Check accessible naming techniques and grouping.", "Potential accessibility barrier — WCAG 2.2 SC 3.3.2"));
      }
      if (element.contrastRatio !== null && element.contrastRatio !== undefined && element.contrastRatio > 0 && element.contrastRatio < 4.5 && element.text) {
        issues.push(makeIssue("contrast", element, "Visual", "high", `Measured text contrast is ${element.contrastRatio}:1, below 4.5:1. Verify text size and context before changing colors.`, "Potential accessibility barrier — WCAG 2.2 SC 1.4.3"));
      }
      if (element.animation) {
        issues.push(makeIssue("motion", element, "Visual", "low", "Animation detected. A temporary pause is available; review the page context before applying it.", "Motion review: user-selected temporary pause"));
      }
      if (element.interactive && (element.bounds.width < 24 || element.bounds.height < 24)) {
        issues.push(makeIssue("target", element, "Motor", "medium", "Interactive target is smaller than 24 by 24 CSS pixels. Check spacing exceptions and actual pointer target.", "Potential accessibility barrier — WCAG 2.2 SC 2.5.8"));
      }
      if (element.interactive && !element.focusable) {
        issues.push(makeIssue("keyboard", element, "Motor", "medium", "Control is not detected as focusable from element semantics. Verify keyboard operation manually.", "Manual review: keyboard accessibility", "manual-review"));
      }
      if (element.interactive) {
        issues.push(makeIssue("focus-style", element, "Motor", "low", "Visible focus styling cannot be established from an unfocused scan; verify using keyboard navigation.", "Manual review: visible focus", "manual-review"));
      }
      if (element.headingLevel) headingLevels.push(element);
    }

    for (let index = 1; index < headingLevels.length; index++) {
      const prior = headingLevels[index - 1];
      const current = headingLevels[index];
      if (current.headingLevel > prior.headingLevel + 1) {
        issues.push(makeIssue("heading-order", current, "Semantic", "low", `Heading level jumps from H${prior.headingLevel} to H${current.headingLevel}. Review the page outline in context.`, "Manual review: heading structure", "manual-review"));
      }
    }

    for (const edge of snapshot.relationships || []) {
      const element = byId.get(edge.targetId);
      if (!element) continue;
      if (element.interactive && !element.focusable) {
        // Keeps issue IDs tied to the normalized graph node, not a copied label.
      }
    }

    const classifiedIssues = issues.map((issue) => {
      const element = byId.get(issue.element_id);
      return markFixability({ ...issue, contrast_ratio: element?.contrastRatio });
    });
    issues.splice(0, issues.length, ...classifiedIssues);
    const severity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const issue of issues) severity[issue.severity]++;
    return { page: snapshot.page, issues, severity, issueCount: issues.length };
  }

  const api = Object.freeze({ auditSnapshot });
  root.AriaAudit = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
