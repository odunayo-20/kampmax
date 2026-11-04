// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EngagementRevisions } from "../EngagementRevisions";
import type { Revisions } from "@/lib/revisions";
import type { EngagementStatus } from "@/services/jobs";

afterEach(cleanup);

const req = (id: string, kind: "CHANGES" | "FIX" | "NEW_SCOPE", note: string) => ({
  id,
  kind,
  counted: kind === "CHANGES",
  note,
  createdAt: "2026-11-04T10:00:00.000Z",
});
const revisions = (used: number, requests: Revisions["requests"] = []): Revisions => ({
  allowed: 3,
  used,
  remaining: 3 - used,
  requests,
});

const show = (
  r: Revisions | undefined,
  status: EngagementStatus = "SUBMITTED",
  role: "employer" | "freelancer" | "admin" = "employer"
) => render(<EngagementRevisions revisions={r} status={status} role={role} />);

describe("EngagementRevisions", () => {
  it.each(["employer", "freelancer"] as const)("shows the %s how many are allowed, used and left", (role) => {
    show(revisions(1), "SUBMITTED", role);
    expect(screen.getByTestId("revisions-summary").textContent).toBe("1 of 3 revisions used · 2 left");
  });

  it("says nothing is left, without closing the door, when the revisions are used", () => {
    show(revisions(3), "SUBMITTED", "employer");
    expect(screen.getByTestId("revisions-summary").textContent).toContain("none left");
    const out = screen.getByTestId("revisions-out").textContent ?? "";
    expect(out).toContain("You have used all 3 revisions");
    expect(out).toContain("report a mistake or something missing");
    expect(out).toContain("open a dispute");
    expect(screen.getByRole("link", { name: "Contact support" })).toBeTruthy();
  });

  it("tells the freelancer the same thing in their own terms, with support and a dispute in reach", () => {
    show(revisions(3), "SUBMITTED", "freelancer");
    const out = screen.getByTestId("revisions-out").textContent ?? "";
    expect(out).toContain("The client has used all 3 revisions");
    expect(out).toContain("a dispute or support can help");
    expect(screen.getByRole("link", { name: "Contact support" })).toBeTruthy();
  });

  it("does not say the order is finished: it only says what the revisions allow", () => {
    show(revisions(3), "SUBMITTED", "freelancer");
    expect(screen.queryByText(/order (is|was) (completed|closed)|payment (was )?released/i)).toBeNull();
  });

  it("offers support only once the revisions are gone", () => {
    show(revisions(2));
    expect(screen.queryByRole("link", { name: "Contact support" })).toBeNull();
    expect(screen.queryByTestId("revisions-out")).toBeNull();
  });

  it("lists what was asked for, and whether each request counted", () => {
    show(
      revisions(1, [
        req("a", "CHANGES", "Use the green logo"),
        req("b", "FIX", "The form does not send"),
        req("c", "NEW_SCOPE", "Add a blog"),
      ]),
      "REVISION_REQUESTED"
    );
    expect(screen.getByText("What was asked for (3)")).toBeTruthy();
    expect(screen.getByText("Change · used a revision")).toBeTruthy();
    expect(screen.getByText("Mistake or missing part · no revision used")).toBeTruthy();
    expect(screen.getByText("Extra work · not a revision")).toBeTruthy();
    expect(screen.getByText("“The form does not send”")).toBeTruthy();
  });

  it("shows a note as plain text, never as markup", () => {
    show(revisions(1, [req("a", "CHANGES", "<img src=x onerror=alert(1)> make it <b>bold</b>")]), "REVISION_REQUESTED");
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeTruthy();
  });

  it("stays out of the way before delivery, and when there is nothing to show", () => {
    for (const status of ["PENDING_PAYMENT", "FUNDED", "COMPLETED", "CANCELLED"] as const) {
      const { container, unmount } = show(revisions(0), status);
      expect(container.textContent).toBe("");
      unmount();
    }
    expect(show(undefined).container.textContent).toBe("");
  });

  it("keeps the record in view after the work is done, if there is one", () => {
    show(revisions(2, [req("a", "CHANGES", "Use the green logo")]), "COMPLETED");
    expect(screen.getByTestId("revisions-summary").textContent).toContain("2 of 3");
  });

  it("shows an admin the same record in neutral words, without links meant for the two parties", () => {
    show(
      revisions(3, [req("a", "CHANGES", "Use the green logo"), req("b", "FIX", "The form does not send")]),
      "DISPUTED",
      "admin"
    );
    expect(screen.getByTestId("revisions-summary").textContent).toBe("3 of 3 revisions used · none left");
    expect(screen.getByTestId("revisions-out").textContent).toBe("The client has used all 3 revisions. ");
    expect(screen.queryByRole("link", { name: "Contact support" })).toBeNull();
    expect(screen.getByText("What was asked for (2)")).toBeTruthy();
  });

  it("keeps showing while the work is in dispute, so both sides can see where it stood", () => {
    show(revisions(3), "DISPUTED");
    expect(screen.getByTestId("revisions-summary")).toBeTruthy();
  });
});
