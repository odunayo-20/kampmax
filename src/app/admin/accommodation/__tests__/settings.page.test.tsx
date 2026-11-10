// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => {
  const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return {
    admin: { role: "SUPER_ADMIN", permissions: ["accommodation.configure"] } as {
      role: string;
      permissions?: string[];
    } | null,
    packages: vi.fn(),
    settings: vi.fn(),
    taxonomy: vi.fn(),
    updatePackage: mutation(),
    updateSettings: mutation(),
    createTaxonomy: mutation(),
    updateTaxonomy: mutation(),
  };
});

vi.mock("@/lib/admin/admin-auth-context", () => ({ useAdminSession: () => ({ admin: h.admin }) }));
vi.mock("@/hooks/admin/use-admin-accommodation", () => ({
  useAccommodationPackages: h.packages,
  useAccommodationSettings: h.settings,
  useAccommodationTaxonomy: h.taxonomy,
  useUpdatePackage: () => h.updatePackage,
  useUpdateAccommodationSettings: () => h.updateSettings,
  useCreateTaxonomy: () => h.createTaxonomy,
  useUpdateTaxonomy: () => h.updateTaxonomy,
}));

import SettingsPage from "../settings/page";

afterEach(cleanup);

const loaded = (data: unknown) => ({ data, isPending: false, isError: false, refetch: vi.fn() });

const PACKAGE = {
  id: "k1",
  name: "Standard listing",
  description: "One listing for 30 days",
  price: 0,
  currency: "NGN",
  durationDays: 30,
  isActive: true,
};

const CATEGORIES = [
  { id: "c1", name: "Student Hostel", slug: "student-hostel", description: null, isActive: true, usage: 4 },
  { id: "c2", name: "Old Type", slug: "old-type", description: null, isActive: false, usage: 0 },
];
const AMENITIES = [{ id: "a1", name: "Security", slug: "security", description: null, isActive: true, usage: 9 }];

const asSuper = () => {
  h.admin = { role: "SUPER_ADMIN", permissions: ["accommodation.configure"] };
};
const asAdmin = () => {
  h.admin = { role: "ADMIN", permissions: ["accommodation.read"] };
};

beforeEach(() => {
  asSuper();
  h.packages.mockReset();
  h.packages.mockReturnValue(loaded([PACKAGE]));
  h.settings.mockReset();
  h.settings.mockReturnValue(loaded({ availabilityIntervalDays: 7, availabilityGraceDays: 3 }));
  h.taxonomy.mockReset();
  h.taxonomy.mockImplementation((kind: string) => loaded(kind === "categories" ? CATEGORIES : AMENITIES));
  for (const m of [h.updatePackage, h.updateSettings, h.createTaxonomy, h.updateTaxonomy]) {
    m.mutateAsync.mockReset();
    m.mutateAsync.mockResolvedValue({});
  }
});

describe("settings: read-only for an Admin", () => {
  beforeEach(asAdmin);

  it("shows the values but no controls to change them", () => {
    render(<SettingsPage />);
    expect(screen.getByText(/can see these settings but not change them/i)).toBeTruthy();
    expect((screen.getByLabelText("Price (₦)") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Ask agents to confirm/) as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /Save/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Rename/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Turn off/ })).toBeNull();
    expect(screen.queryByLabelText("New property type")).toBeNull();
  });

  it("still lists property types and facilities with how many use them", () => {
    render(<SettingsPage />);
    expect(screen.getByText(/student-hostel · used by 4 properties/)).toBeTruthy();
    expect(screen.getByText(/security · used by 9 listings/)).toBeTruthy();
  });
});

describe("settings: package", () => {
  it("shows the current price and period", () => {
    render(<SettingsPage />);
    expect((screen.getByLabelText("Price (₦)") as HTMLInputElement).value).toBe("0");
    expect((screen.getByLabelText("Days in one paid period") as HTMLInputElement).value).toBe("30");
    expect(screen.getByText(/Now free for 30 days/)).toBeTruthy();
  });

  it("has nothing to save until something changes", () => {
    render(<SettingsPage />);
    expect((screen.getByRole("button", { name: "Save package" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("warns that a new price is for new subscriptions only", () => {
    render(<SettingsPage />);
    expect(screen.queryByText(/applies to new subscriptions only/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Price (₦)"), { target: { value: "2500" } });
    expect(screen.getByText(/applies to new subscriptions only/)).toBeTruthy();
  });

  it("saves the new price and period", async () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText("Price (₦)"), { target: { value: "2500" } });
    fireEvent.change(screen.getByLabelText("Days in one paid period"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Save package" }));
    await waitFor(() =>
      expect(h.updatePackage.mutateAsync).toHaveBeenCalledWith({
        id: "k1",
        input: { price: 2500, durationDays: 60, isActive: true },
      })
    );
  });

  it("refuses a negative price, and a period out of range", () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText("Price (₦)"), { target: { value: "-5" } });
    expect((screen.getByRole("button", { name: "Save package" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Price (₦)"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Days in one paid period"), { target: { value: "400" } });
    expect((screen.getByRole("button", { name: "Save package" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Days in one paid period"), { target: { value: "0" } });
    expect((screen.getByRole("button", { name: "Save package" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("turns the package off", async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByLabelText("Agents can buy this package"));
    fireEvent.click(screen.getByRole("button", { name: "Save package" }));
    await waitFor(() =>
      expect(h.updatePackage.mutateAsync).toHaveBeenCalledWith({
        id: "k1",
        input: { price: 0, durationDays: 30, isActive: false },
      })
    );
  });

  it("shows the server's reason when the save is refused", async () => {
    h.updatePackage.mutateAsync.mockRejectedValue(new Error("You don't have permission to do that."));
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText("Price (₦)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Save package" }));
    expect((await screen.findByRole("alert")).textContent).toContain("don't have permission");
  });
});

describe("settings: availability", () => {
  it("saves both numbers", async () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText(/Ask agents to confirm/), { target: { value: "14" } });
    fireEvent.change(screen.getByLabelText(/Hide the listing after/), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save availability settings" }));
    await waitFor(() =>
      expect(h.updateSettings.mutateAsync).toHaveBeenCalledWith({
        availabilityIntervalDays: 14,
        availabilityGraceDays: 5,
      })
    );
  });

  it("keeps within the backend's limits: 1 to 90 days and 1 to 30 days", () => {
    render(<SettingsPage />);
    const save = screen.getByRole("button", { name: "Save availability settings" }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText(/Ask agents to confirm/), { target: { value: "91" } });
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Ask agents to confirm/), { target: { value: "90" } });
    expect(save.disabled).toBe(false);
    fireEvent.change(screen.getByLabelText(/Hide the listing after/), { target: { value: "31" } });
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Hide the listing after/), { target: { value: "2.5" } });
    expect(save.disabled).toBe(true);
  });
});

describe("settings: property types and facilities", () => {
  it("shows turned-off ones marked as such", () => {
    render(<SettingsPage />);
    const row = screen.getByText("Old Type").closest("li") as HTMLElement;
    expect(within(row).getByText("Turned off")).toBeTruthy();
    expect(within(row).getByRole("button", { name: "Turn on Old Type" })).toBeTruthy();
  });

  it("turns one off", async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Turn off Student Hostel" }));
    await waitFor(() =>
      expect(h.updateTaxonomy.mutateAsync).toHaveBeenCalledWith({ id: "c1", input: { isActive: false } })
    );
  });

  it("renames one, without offering to change the slug", async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Rename Student Hostel" }));
    fireEvent.change(screen.getByLabelText("New name for Student Hostel"), { target: { value: "Hostel" } });
    fireEvent.click(within(screen.getByRole("form", { name: "Rename Student Hostel" })).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(h.updateTaxonomy.mutateAsync).toHaveBeenCalledWith({ id: "c1", input: { name: "Hostel" } })
    );
    expect(screen.queryByLabelText(/slug/i)).toBeNull();
  });

  it("does not save a name shorter than two characters", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Rename Student Hostel" }));
    fireEvent.change(screen.getByLabelText("New name for Student Hostel"), { target: { value: "H" } });
    const save = within(screen.getByRole("form", { name: "Rename Student Hostel" })).getByRole("button", {
      name: "Save",
    }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it("cancels a rename without saving", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Rename Student Hostel" }));
    fireEvent.click(within(screen.getByRole("form", { name: "Rename Student Hostel" })).getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Student Hostel")).toBeTruthy();
    expect(h.updateTaxonomy.mutateAsync).not.toHaveBeenCalled();
  });

  it("adds a property type, trimming nothing the server won't trim itself, and clears the box", async () => {
    render(<SettingsPage />);
    const box = screen.getByLabelText("New property type") as HTMLInputElement;
    fireEvent.change(box, { target: { value: "Short Stay" } });
    fireEvent.click(screen.getByRole("button", { name: "Add property type" }));
    await waitFor(() => expect(h.createTaxonomy.mutateAsync).toHaveBeenCalledWith({ name: "Short Stay" }));
    await waitFor(() => expect(box.value).toBe(""));
  });

  it("keeps what was typed and shows the reason when adding is refused", async () => {
    h.createTaxonomy.mutateAsync.mockRejectedValue(new Error("A property type with this name already exists"));
    render(<SettingsPage />);
    const box = screen.getByLabelText("New property type") as HTMLInputElement;
    fireEvent.change(box, { target: { value: "Student Hostel" } });
    fireEvent.click(screen.getByRole("button", { name: "Add property type" }));
    expect((await screen.findByRole("alert")).textContent).toContain("already exists");
    expect(box.value).toBe("Student Hostel");
  });

  it("cannot add a blank name", () => {
    render(<SettingsPage />);
    expect((screen.getByRole("button", { name: "Add facility" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("adds a facility to the facilities list, not the property types", async () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText("New facility"), { target: { value: "Swimming Pool" } });
    fireEvent.click(screen.getByRole("button", { name: "Add facility" }));
    await waitFor(() => expect(h.createTaxonomy.mutateAsync).toHaveBeenCalledWith({ name: "Swimming Pool" }));
    expect(h.taxonomy).toHaveBeenCalledWith("amenities");
  });
});

describe("settings: loading and failure", () => {
  it("retries a package list that failed", () => {
    const refetch = vi.fn();
    h.packages.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch });
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("still shows the other sections when one fails", () => {
    h.packages.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch: vi.fn() });
    render(<SettingsPage />);
    expect(screen.getByLabelText(/Ask agents to confirm/)).toBeTruthy();
    expect(screen.getByText("Student Hostel")).toBeTruthy();
  });
});
