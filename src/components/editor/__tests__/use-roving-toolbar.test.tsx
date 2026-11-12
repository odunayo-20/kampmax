// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { useRovingToolbar } from "../use-roving-toolbar";
import { a11yViolations } from "@/test/axe";

function Toolbar({ disabledSecond = false }: { disabledSecond?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useRovingToolbar(ref);
  return (
    <div>
      <button type="button">Before</button>
      <div ref={ref} role="toolbar" aria-label="Text formatting">
        <button type="button">Bold</button>
        <button type="button" disabled={disabledSecond}>
          Italic
        </button>
        <button type="button">Underline</button>
      </div>
      <button type="button">After</button>
    </div>
  );
}

afterEach(cleanup);

describe("useRovingToolbar", () => {
  it("makes the toolbar a single tab stop", () => {
    render(<Toolbar />);
    const tabbable = screen.getAllByRole("button").filter((b) => b.tabIndex === 0).map((b) => b.textContent);
    // Before and After are normal tab stops; the toolbar contributes exactly one.
    expect(tabbable).toEqual(["Before", "Bold", "After"]);
  });

  it("moves with the arrow keys, wrapping at both ends, and Home/End", () => {
    render(<Toolbar />);
    screen.getByText("Bold").focus();
    fireEvent.keyDown(screen.getByText("Bold"), { key: "ArrowRight" });
    expect(document.activeElement?.textContent).toBe("Italic");
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement?.textContent).toBe("Underline");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement?.textContent).toBe("Bold");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement?.textContent).toBe("Underline");
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement?.textContent).toBe("Bold");
  });

  it("remembers the last control used as the tab stop", () => {
    render(<Toolbar />);
    screen.getByText("Underline").focus();
    const stops = screen.getAllByRole("button").filter((b) => b.tabIndex === 0).map((b) => b.textContent);
    expect(stops).toEqual(["Before", "Underline", "After"]);
  });

  it("skips disabled controls", () => {
    render(<Toolbar disabledSecond />);
    screen.getByText("Bold").focus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement?.textContent).toBe("Underline");
  });

  it("does not hijack keys outside the toolbar", () => {
    render(<Toolbar />);
    screen.getByText("Before").focus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement?.textContent).toBe("Before");
  });

  it("passes the axe checks", async () => {
    const { container } = render(<Toolbar />);
    expect(await a11yViolations(container)).toEqual([]);
  });
});
