import { describe, expect, it } from "vitest";
import { newItemsText } from "../followed-stores";

describe("newItemsText", () => {
  it("says what is new this week", () => {
    expect(newItemsText(0)).toBe("Nothing new this week");
    expect(newItemsText(1)).toBe("1 new item this week");
    expect(newItemsText(4)).toBe("4 new items this week");
  });
});
