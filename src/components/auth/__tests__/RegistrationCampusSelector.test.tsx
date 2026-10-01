// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RegistrationCampusSelector } from "../RegistrationCampusSelector";
import type { Campus } from "@/types";

const { mockCampuses } = vi.hoisted(() => ({
  mockCampuses: [
    {
      id: "unilag",
      name: "University of Lagos",
      abbreviation: "UNILAG",
      location: "Akoka, Lagos",
      departments: ["Computer Science", "Economics"],
    },
    {
      id: "futa",
      name: "Federal University of Technology, Akure",
      abbreviation: "FUTA",
      location: "Akure, Ondo State",
      departments: ["Software Engineering", "Architecture"],
    },
    {
      id: "oau",
      name: "Obafemi Awolowo University",
      abbreviation: "OAU",
      location: "Ile-Ife, Osun State",
      departments: ["Medicine", "Law"],
    },
  ] as Campus[],
}));

vi.mock("@/lib/app-context", () => ({
  useApp: () => ({
    campuses: mockCampuses,
    isLoadingCampuses: false,
    selectedCampus: { id: "", name: "", abbreviation: "", location: "", departments: [] },
    setSelectedCampus: vi.fn(),
  }),
}));

vi.mock("@/lib/campus-geolocation", () => ({
  detectCampusFromGeolocation: vi.fn().mockResolvedValue({
    status: "success",
    userCoords: { latitude: 6.517, longitude: 3.398 },
    detectedCampus: mockCampuses[0],
    distanceKm: 0.5,
    formattedDistance: "500m away",
    promptMessage: "Are you currently at University of Lagos? Tap to select.",
    errorMessage: null,
  }),
}));

describe("RegistrationCampusSelector", () => {
  const onSelectCampus = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders placeholder trigger when no campus is selected", () => {
    render(
      <RegistrationCampusSelector
        selectedCampus={null}
        onSelectCampus={onSelectCampus}
      />
    );

    expect(screen.getByText(/Campus \/ Institution/i)).toBeTruthy();
    expect(screen.getByText(/Detect My Campus/i)).toBeTruthy();
    expect(
      screen.getByText(/Choose your university or polytechnic/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Tap to search and select your campus/i)
    ).toBeTruthy();
  });

  it("renders selected campus details with school name, abbreviation, and Change button", () => {
    render(
      <RegistrationCampusSelector
        selectedCampus={mockCampuses[0]}
        onSelectCampus={onSelectCampus}
      />
    );

    expect(screen.getByText("University of Lagos")).toBeTruthy();
    expect(screen.getByText("UNILAG")).toBeTruthy();
    expect(screen.getByText("Akoka, Lagos")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Change/i })).toBeTruthy();
  });

  it("displays validation error message when error prop is provided", () => {
    render(
      <RegistrationCampusSelector
        selectedCampus={null}
        onSelectCampus={onSelectCampus}
        error="Please select your campus or institution"
      />
    );

    expect(
      screen.getByText("Please select your campus or institution")
    ).toBeTruthy();
  });

  it("opens modal dialog and filters campuses by search query", async () => {
    render(
      <RegistrationCampusSelector
        selectedCampus={null}
        onSelectCampus={onSelectCampus}
      />
    );

    // Click placeholder to open modal
    const trigger = screen.getByText(/Choose your university or polytechnic/i);
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /Select Your Campus/i })
    ).toBeTruthy();

    // Verify all campuses are shown initially
    expect(screen.getByText("University of Lagos")).toBeTruthy();
    expect(screen.getByText("Federal University of Technology, Akure")).toBeTruthy();
    expect(screen.getByText("Obafemi Awolowo University")).toBeTruthy();

    // Filter using search input
    const searchInput = screen.getByPlaceholderText(/Search by name, acronym/i);
    fireEvent.change(searchInput, { target: { value: "FUTA" } });

    // FUTA should be visible, others filtered out
    expect(screen.getByText("Federal University of Technology, Akure")).toBeTruthy();
    expect(screen.queryByText("University of Lagos")).toBeNull();
    expect(screen.queryByText("Obafemi Awolowo University")).toBeNull();

    // Click FUTA
    fireEvent.click(screen.getByText("Federal University of Technology, Akure"));

    expect(onSelectCampus).toHaveBeenCalledWith(mockCampuses[1]);
  });

  it("detects campus via GPS and selects from quick-pick prompt", async () => {
    render(
      <RegistrationCampusSelector
        selectedCampus={null}
        onSelectCampus={onSelectCampus}
      />
    );

    const detectBtn = screen.getByText(/Detect My Campus/i);
    fireEvent.click(detectBtn);

    const tapBtn = await screen.findByText(/Tap to select/i);
    expect(tapBtn).toBeTruthy();
    expect(
      screen.getByText(/Are you currently at University of Lagos\?/i)
    ).toBeTruthy();

    fireEvent.click(tapBtn);
    expect(onSelectCampus).toHaveBeenCalledWith(mockCampuses[0]);
  });
}, 20000);
