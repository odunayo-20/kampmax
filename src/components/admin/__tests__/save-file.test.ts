// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveFile } from "../accommodation/save-file";

const createObjectURL = vi.fn(() => "blob:csv");
const revokeObjectURL = vi.fn();
let click: ReturnType<typeof vi.spyOn>;
let downloads: { href: string; download: string }[];

beforeEach(() => {
  vi.useFakeTimers();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
  downloads = [];
  click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ href: this.href, download: this.download });
  });
});

afterEach(() => {
  click.mockRestore();
  vi.useRealTimers();
});

describe("saveFile", () => {
  it("saves the file under the name the server gave it", () => {
    saveFile({ blob: new Blob(["a"]), filename: "accommodation-payments.csv" }, "fallback.csv");
    expect(downloads).toEqual([{ href: "blob:csv", download: "accommodation-payments.csv" }]);
  });

  it("uses the fallback name when the server gave none, or a blank one", () => {
    saveFile({ blob: new Blob(["a"]), filename: null }, "fallback.csv");
    saveFile({ blob: new Blob(["a"]), filename: "   " }, "fallback.csv");
    expect(downloads.map((d) => d.download)).toEqual(["fallback.csv", "fallback.csv"]);
  });

  it("releases the object URL once the save has started, so the file is not kept in memory", () => {
    saveFile({ blob: new Blob(["a"]), filename: "x.csv" }, "f.csv");
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:csv");
  });

  it("leaves no link behind in the page", () => {
    saveFile({ blob: new Blob(["a"]), filename: "x.csv" }, "f.csv");
    expect(document.querySelectorAll("a[download]")).toHaveLength(0);
  });
});
