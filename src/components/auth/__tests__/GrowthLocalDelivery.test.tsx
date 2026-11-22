// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ResidenceHallSelector } from "../ResidenceHallSelector";
import {
  ReferralCodeInput,
  validateReferralCode,
} from "../ReferralCodeInput";
import { getHallsForCampus, getCampusDeliverySummary } from "@/data/residence-halls";

afterEach(() => {
  cleanup();
});

describe("ResidenceHall Data & Helper", () => {
  it("returns halls and off-campus areas for UNILAG", () => {
    const halls = getHallsForCampus("unilag");
    expect(halls.length).toBeGreaterThan(5);
    const moremi = halls.find((h) => h.name.includes("Moremi"));
    expect(moremi).toBeDefined();
    expect(moremi?.type).toBe("on_campus");

    const akoka = halls.find((h) => h.name.includes("Akoka"));
    expect(akoka).toBeDefined();
    expect(akoka?.type).toBe("off_campus");
  });

  it("returns empty array for invalid or empty campus", () => {
    expect(getHallsForCampus("")).toEqual([]);
    expect(getHallsForCampus(null)).toEqual([]);
    expect(getHallsForCampus("non-existent-campus")).toEqual([]);
  });

  it("calculates delivery summary counts correctly", () => {
    const summary = getCampusDeliverySummary("unilag");
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.onCampusCount).toBeGreaterThan(0);
    expect(summary.offCampusCount).toBeGreaterThan(0);
    expect(summary.onCampusCount + summary.offCampusCount).toBe(summary.total);
  });
});

describe("ResidenceHallSelector Component", () => {
  it("shows disabled notice when no campus is selected", () => {
    render(
      <ResidenceHallSelector
        campusId={null}
        value=""
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Select your campus first to view your school's halls/i)
    ).toBeTruthy();
  });

  it("shows picker button when campus is selected", () => {
    render(
      <ResidenceHallSelector
        campusId="unilag"
        campusName="University of Lagos"
        value=""
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Select hostel, hall, or off-campus area/i)
    ).toBeTruthy();
  });

  it("opens modal and displays halls when clicked", () => {
    const onChange = vi.fn();
    render(
      <ResidenceHallSelector
        campusId="unilag"
        campusName="University of Lagos"
        value=""
        onChange={onChange}
      />
    );

    const trigger = screen.getByText(/Select hostel, hall, or off-campus area/i);
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Moremi Hall")).toBeTruthy();
    expect(screen.getByText("Jaja Hall")).toBeTruthy();
  });

  it("selects a hall from the modal and triggers onChange", () => {
    const onChange = vi.fn();
    render(
      <ResidenceHallSelector
        campusId="unilag"
        campusName="University of Lagos"
        value=""
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText(/Select hostel, hall, or off-campus area/i));

    const moremiOption = screen.getByText("Moremi Hall");
    fireEvent.click(moremiOption);

    expect(onChange).toHaveBeenCalledWith("Moremi Hall", false);
  });

  it("renders selected hall card and allows clearing", () => {
    const onChange = vi.fn();
    render(
      <ResidenceHallSelector
        campusId="unilag"
        campusName="University of Lagos"
        value="Moremi Hall"
        onChange={onChange}
      />
    );

    expect(screen.getByText("Moremi Hall")).toBeTruthy();
    expect(screen.getByText("On-Campus Hall")).toBeTruthy();

    const clearButton = screen.getByText("Clear");
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith("", false);
  });

  it("supports entering custom hostel / lodge name", () => {
    const onChange = vi.fn();
    render(
      <ResidenceHallSelector
        campusId="unilag"
        campusName="University of Lagos"
        value=""
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText(/Select hostel, hall, or off-campus area/i));

    const customToggle = screen.getByText(/Type a custom hostel or street/i);
    fireEvent.click(customToggle);

    const input = screen.getByPlaceholderText(/Silver Crest Villa/i);
    fireEvent.change(input, { target: { value: "Prestige Heights Lodge" } });

    const saveButton = screen.getByText("Save Location");
    fireEvent.click(saveButton);

    expect(onChange).toHaveBeenCalledWith("Prestige Heights Lodge", true);
  });
}, 20000);

describe("ReferralCode Validation & Component", () => {
  it("accepts anything shaped like an invite code and leaves the checking to the server", () => {
    expect(validateReferralCode("KAMP-1A2B3C4D").isValid).toBe(true);
    expect(validateReferralCode(" kamp-1a2b3c4d ").isValid).toBe(true);
  });

  it("rejects empty or very short codes", () => {
    expect(validateReferralCode("").isValid).toBe(false);
    expect(validateReferralCode("abc").isValid).toBe(false);
  });

  it("expands accordion and allows typing an invite code", () => {
    const onChange = vi.fn();
    render(<ReferralCodeInput value="" onChange={onChange} />);

    // Initially collapsed
    expect(screen.queryByPlaceholderText(/KAMP-/i)).toBeNull();

    fireEvent.click(screen.getByText(/Have a friend's invite code/i));
    const input = screen.getByPlaceholderText(/KAMP-/i);

    fireEvent.change(input, { target: { value: "kamp-1a2b3c4d" } });

    expect(onChange).toHaveBeenCalledWith("KAMP-1A2B3C4D", true);
    // It must not claim the code was verified: only the server can say that.
    expect(screen.queryByText(/verified/i)).toBeNull();
    expect(screen.getByText(/We check it when you create your account/i)).toBeTruthy();
  });
}, 20000);
