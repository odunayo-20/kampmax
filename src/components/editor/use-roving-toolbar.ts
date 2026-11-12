import { useEffect, type RefObject } from "react";

const ITEMS = "button:not(:disabled), [role='combobox']:not(:disabled), select:not(:disabled)";

/**
 * Makes a `role="toolbar"` behave like one (WAI-ARIA toolbar pattern): the whole
 * toolbar is ONE tab stop, and Left/Right (plus Home/End) move between its
 * controls. Without this, a rich-text toolbar with 25+ buttons forces keyboard
 * users to press Tab 25 times to get past it on the way back into the text.
 *
 * Only one control has tabindex=0 at a time (the last one used); the rest are
 * -1 but stay reachable with the arrow keys and by mouse. Disabled controls are
 * skipped, and controls that appear later are picked up on every interaction.
 */
export function useRovingToolbar(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const items = () => Array.from(root.querySelectorAll<HTMLElement>(ITEMS));

    const setActive = (active: HTMLElement | undefined) => {
      for (const el of items()) el.tabIndex = el === active ? 0 : -1;
    };

    // Start with the first enabled control as the single tab stop.
    setActive(items()[0]);

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (items().includes(target)) setActive(target);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const list = items();
      const current = list.indexOf(document.activeElement as HTMLElement);
      if (current < 0) return;
      let next = -1;
      if (e.key === "ArrowRight") next = (current + 1) % list.length;
      else if (e.key === "ArrowLeft") next = (current - 1 + list.length) % list.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = list.length - 1;
      if (next < 0) return;
      e.preventDefault();
      list[next].focus();
    };

    // Re-evaluate when buttons enable/disable (undo/redo, link) so a disabled
    // control never holds the only tab stop.
    const observer = new MutationObserver(() => {
      const list = items();
      if (list.length && !list.some((el) => el.tabIndex === 0)) setActive(list[0]);
    });
    observer.observe(root, { subtree: true, attributes: true, attributeFilter: ["disabled"], childList: true });

    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, [ref]);
}
