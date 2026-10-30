// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const authState: { status: "loading" | "authenticated" | "unauthenticated" } = {
  status: "loading",
};
const replace = vi.fn();
vi.mock("@/lib/auth-context", () => ({ useAuth: () => authState }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/onboarding/service-provider/3",
}));

import { useRequireSignIn } from "../use-require-sign-in";

function Page() {
  useRequireSignIn();
  return null;
}

beforeEach(() => replace.mockReset());
afterEach(cleanup);

describe("useRequireSignIn", () => {
  it("sends a guest to login and back to the same page", () => {
    authState.status = "unauthenticated";
    render(<Page />);

    expect(replace).toHaveBeenCalledWith(
      `/login?returnTo=${encodeURIComponent("/onboarding/service-provider/3")}`
    );
  });

  it("leaves a signed-in user alone", () => {
    authState.status = "authenticated";
    render(<Page />);
    expect(replace).not.toHaveBeenCalled();
  });

  it("waits while the session is still being checked", () => {
    authState.status = "loading";
    render(<Page />);
    expect(replace).not.toHaveBeenCalled();
  });
});
