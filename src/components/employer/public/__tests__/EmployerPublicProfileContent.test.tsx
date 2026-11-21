// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { EmployerPublicProfile } from "@/types/employer";

// The follow / message buttons need a signed-in session; they are not what is tested here.
vi.mock("@/components/employer/public/EmployerProfileActions", () => ({
  EmployerProfileActions: () => null,
}));

import { EmployerPublicProfileContent } from "../EmployerPublicProfileContent";

afterEach(cleanup);

const profile = (over: Partial<EmployerPublicProfile> = {}): EmployerPublicProfile => ({
  userId: "u1",
  name: "Acme Ltd",
  descriptor: "Retail",
  about: "",
  location: "Lagos",
  verified: true,
  slug: "e1",
  reputation: null,
  openJobs: [],
  ...over,
});

describe("public employer page", () => {
  it("shows how the employer treats people who apply", () => {
    render(
      <EmployerPublicProfileContent
        profile={profile({
          reputation: { received: 20, responseRate: 90, typicalReplyHours: 30, hires: 1 },
        })}
      />
    );

    expect(screen.getByText("Replies in about 1 day")).toBeTruthy();
    expect(screen.getByText("90% answered")).toBeTruthy();
    expect(screen.getByText("1 person hired")).toBeTruthy();
  });

  it("shows nothing about it while too few people have applied to say", () => {
    render(
      <EmployerPublicProfileContent
        profile={profile({
          reputation: { received: 1, responseRate: null, typicalReplyHours: null, hires: 0 },
        })}
      />
    );

    expect(screen.queryByText(/answered/)).toBeNull();
    expect(screen.queryByText(/hired/)).toBeNull();
  });

  it("shows nothing for an employer the server sent no reputation for", () => {
    render(<EmployerPublicProfileContent profile={profile()} />);

    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByRole("heading", { name: "Acme Ltd" })).toBeTruthy();
  });
});
