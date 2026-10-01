// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PostRegistrationWelcomeModal } from "../PostRegistrationWelcomeModal";

vi.mock("@/services/profile", () => ({
  updateAvatarApi: vi.fn().mockResolvedValue({ data: { avatar: "preset-tech" }, error: null }),
}));

let mockStore: Record<string, string> = {};

beforeEach(() => {
  mockStore = {};
  const mockStorage = {
    getItem: vi.fn((key: string) => mockStore[key] ?? null),
    setItem: vi.fn((key: string, val: string) => {
      mockStore[key] = String(val);
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStore[key];
    }),
    clear: vi.fn(() => {
      mockStore = {};
    }),
  };

  Object.defineProperty(window, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PostRegistrationWelcomeModal Component", () => {
  it("renders when isOpen is true and displays welcome header", () => {
    render(
      <PostRegistrationWelcomeModal
        isOpen={true}
        firstName="Tunde"
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByText(/Welcome to Kampmax, Tunde! 🎉/i)).toBeTruthy();
    expect(screen.getByText(/Buying & Selling Tech\/Books/i)).toBeTruthy();
    expect(screen.getByText(/Offering Freelance Services/i)).toBeTruthy();
    expect(screen.getByText(/Campus Events & Deals/i)).toBeTruthy();
    expect(screen.getByText(/Finding Roommates\/Hostels/i)).toBeTruthy();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <PostRegistrationWelcomeModal
        isOpen={false}
        firstName="Tunde"
        onComplete={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("toggles interest pills on click", () => {
    render(
      <PostRegistrationWelcomeModal
        isOpen={true}
        firstName="Tunde"
        onComplete={vi.fn()}
      />
    );

    const eventPill = screen.getByText(/Campus Events & Deals/i);
    fireEvent.click(eventPill);

    const finishBtn = screen.getByText(/Save & Dive In/i);
    expect(finishBtn).toBeTruthy();
  });

  it("selects avatar preset and calls onComplete on finish", async () => {
    const onComplete = vi.fn();
    render(
      <PostRegistrationWelcomeModal
        isOpen={true}
        firstName="Chioma"
        onComplete={onComplete}
      />
    );

    const techPreset = screen.getByText("Techie");
    fireEvent.click(techPreset);

    const finishBtn = screen.getByText(/Save & Dive In/i);
    fireEvent.click(finishBtn);

    // wait for async save
    await new Promise((r) => setTimeout(r, 50));
    expect(onComplete).toHaveBeenCalled();
  });

  it("calls onComplete when clicking skip for now", () => {
    const onComplete = vi.fn();
    render(
      <PostRegistrationWelcomeModal
        isOpen={true}
        firstName="Chioma"
        onComplete={onComplete}
      />
    );

    const skipBtn = screen.getByText(/Skip for now/i);
    fireEvent.click(skipBtn);
    expect(onComplete).toHaveBeenCalled();
  });
});
