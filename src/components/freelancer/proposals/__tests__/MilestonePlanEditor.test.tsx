// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MilestonePlanEditor } from "../MilestonePlanEditor";
import { validatePlan, type MilestoneRow } from "@/lib/milestone-plan";

afterEach(cleanup);

/** The editor is controlled, so give it somewhere to keep its rows. */
function Harness({ total = 250000, initial = [] as MilestoneRow[], showErrors = false }) {
  const [rows, setRows] = useState(initial);
  return (
    <MilestonePlanEditor
      rows={rows}
      total={total}
      onChange={setRows}
      errors={showErrors ? validatePlan(rows, total) : null}
    />
  );
}

const row = (title: string, amount: string): MilestoneRow => ({ title, description: "", amount, dueDate: "" });
const toggle = () => screen.getByRole("checkbox", { name: "Use milestones" }) as HTMLInputElement;

describe("MilestonePlanEditor", () => {
  it("is off by default, which means one payment", () => {
    render(<Harness />);
    expect(toggle().checked).toBe(false);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("starts with two empty milestones when switched on, and clears them when switched off", () => {
    render(<Harness />);
    fireEvent.click(toggle());
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    fireEvent.click(toggle());
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("adds milestones up to the limit, and never lets the count drop below two", () => {
    render(<Harness initial={[row("A", "1000"), row("B", "1000")]} />);
    // Two is the minimum: nothing can be removed.
    expect(screen.queryByRole("button", { name: /Remove milestone/ })).toBeNull();

    const add = screen.getByRole("button", { name: "Add milestone" }) as HTMLButtonElement;
    for (let i = 0; i < 8; i++) fireEvent.click(add);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(add.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Remove milestone 10" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    expect(add.disabled).toBe(false);
  });

  it("removes the milestone that was clicked, keeping the others as typed", () => {
    render(<Harness initial={[row("Design", "100000"), row("Build", "100000"), row("Launch", "50000")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove milestone 2" }));

    const titles = screen.getAllByLabelText("Title").map((i) => (i as HTMLInputElement).value);
    expect(titles).toEqual(["Design", "Launch"]);
  });

  it("keeps a running tally of what is assigned against the total", () => {
    render(<Harness initial={[row("Design", ""), row("Build", "")]} />);
    const tally = () => screen.getByRole("status").textContent;

    const [first, second] = screen.getAllByLabelText("Amount (₦)");
    fireEvent.change(first, { target: { value: "100000" } });
    expect(tally()).toBe("₦100,000 of ₦250,000 assigned · ₦150,000 left");

    fireEvent.change(second, { target: { value: "150000" } });
    expect(tally()).toBe("₦250,000 of ₦250,000 assigned");

    fireEvent.change(second, { target: { value: "200000" } });
    expect(tally()).toBe("₦300,000 of ₦250,000 assigned · ₦50,000 over");
  });

  it("asks for the total first when there is none to compare with", () => {
    render(<MilestonePlanEditor rows={[row("A", "5000"), row("B", "")]} total={undefined} onChange={() => {}} />);
    expect(screen.getByRole("status").textContent).toContain("Enter your proposed amount above");
  });

  it("shows what is wrong, on the plan and on the milestone it is about", () => {
    render(<Harness initial={[row("Design", "100000"), row("", "")]} showErrors />);
    expect(screen.getByText("Give this milestone a title.")).not.toBeNull();
    expect(screen.getByText("Enter an amount.")).not.toBeNull();
  });

  it("gives every field its own id, so each label points at its own input", () => {
    const { container } = render(<Harness initial={[row("Design", "100000"), row("Build", "150000")]} />);
    const ids = Array.from(container.querySelectorAll("input[id]")).map((el) => el.id);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    expect(new Set(ids).size).toBe(ids.length);

    // Clicking a label reaches its own row's input, not the first row's.
    const secondTitle = screen.getAllByLabelText("Title")[1] as HTMLInputElement;
    expect(secondTitle.value).toBe("Build");
  });

  it("has a date field per milestone that cannot be set in the past", () => {
    render(<Harness initial={[row("Design", "100000"), row("Build", "150000")]} />);
    const dates = screen.getAllByLabelText("Due date (optional)") as HTMLInputElement[];
    expect(dates).toHaveLength(2);
    expect(dates[0].type).toBe("date");
    expect(dates[0].min).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    fireEvent.change(dates[1], { target: { value: "2099-05-20" } });
    expect((screen.getAllByLabelText("Due date (optional)")[1] as HTMLInputElement).value).toBe("2099-05-20");
  });

  it("explains a date that is in the past", () => {
    render(
      <Harness
        showErrors
        initial={[{ ...row("Design", "100000"), dueDate: "2020-01-01" }, row("Build", "150000")]}
      />
    );
    expect(screen.getByText("Pick today or a later date.")).not.toBeNull();
  });

  it("explains that milestones are paid one at a time", () => {
    render(<Harness />);
    expect(screen.getByText(/funds and pays one milestone at a time/)).not.toBeNull();
  });
});
