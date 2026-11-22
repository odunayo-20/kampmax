import { describe, expect, it } from "vitest";
import { pausedCartProblem, pausedStoreText } from "../paused-stores";

describe("paused stores", () => {
  it("names a paused store kindly", () => {
    expect(pausedStoreText("Ada Kicks")).toBe("Ada Kicks isn't taking new orders right now.");
  });

  it("stops checkout with a reason that names each paused store", () => {
    expect(pausedCartProblem([])).toBeNull();
    expect(pausedCartProblem(["Bola Books"])).toBe("Bola Books isn't taking orders right now. Remove its items to continue.");
    expect(pausedCartProblem(["Bola Books", "Chi Tech"])).toBe(
      "Bola Books and Chi Tech aren't taking orders right now. Remove their items to continue."
    );
    expect(pausedCartProblem(["A", "B", "C"])).toBe("A, B and C aren't taking orders right now. Remove their items to continue.");
  });
});
