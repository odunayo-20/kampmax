import axe from "axe-core";

/**
 * Automated accessibility check for a rendered component (jsdom + axe-core).
 *
 * Catches the machine-checkable WCAG 2.x A/AA problems: missing names on
 * buttons and form fields, bad ARIA, duplicate ids, missing landmarks/headings
 * order issues, and so on. jsdom has no layout engine, so colour contrast and
 * anything visual is switched off here and must be checked in a real browser.
 * Passing this is necessary, not sufficient: keyboard behaviour of maps, the
 * rich-text editor and the QR scanner is verified by hand (see docs/ACCESSIBILITY.md).
 */
export async function a11yViolations(root: Element): Promise<string[]> {
  const results = await axe.run(root, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    rules: {
      "color-contrast": { enabled: false }, // needs real rendering
      region: { enabled: false }, // a component fragment is not a whole page
      "landmark-one-main": { enabled: false },
      "page-has-heading-one": { enabled: false },
    },
  });
  return results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n   ` + v.nodes.slice(0, 3).map((n) => n.html.slice(0, 140)).join("\n   ")
  );
}
