import { describe, expect, it } from "vitest";
import { CV_MAX_BYTES } from "@/config/cv";
import { formatFileSize, validateCvFile } from "../cv";

describe("formatFileSize", () => {
  it("reads naturally at each size", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1536)).toBe("2 KB");
    expect(formatFileSize(120_000)).toBe("117 KB");
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe("2.4 MB");
    expect(formatFileSize(CV_MAX_BYTES)).toBe("3.0 MB");
  });
});

describe("validateCvFile", () => {
  const file = (name: string, size = 1000) => ({ name, size });

  it("accepts a PDF and a Word (.docx) file, in any letter case", () => {
    expect(validateCvFile(file("ada.pdf"))).toBeNull();
    expect(validateCvFile(file("Ada CV.DOCX"))).toBeNull();
    expect(validateCvFile(file("my.cv.v2.pdf"))).toBeNull();
  });

  it("accepts a file of exactly the biggest size", () => {
    expect(validateCvFile(file("ada.pdf", CV_MAX_BYTES))).toBeNull();
  });

  it("refuses anything that is not a PDF or .docx", () => {
    for (const name of ["ada.doc", "ada.txt", "ada.png", "ada.exe", "ada.pdf.exe", "ada", ".pdf.zip"]) {
      expect(validateCvFile(file(name))).toBe("A CV must be a PDF or a Word (.docx) file.");
    }
  });

  it("refuses an empty file", () => {
    expect(validateCvFile(file("ada.pdf", 0))).toBe("That file is empty.");
  });

  it("refuses a file over 3 MB and says how big it was", () => {
    expect(validateCvFile(file("ada.pdf", CV_MAX_BYTES + 1))).toMatch(/That file is 3\.0 MB\. A CV can be up to 3\.0 MB\./);
    expect(validateCvFile(file("ada.pdf", 5 * 1024 * 1024))).toMatch(/That file is 5\.0 MB/);
  });
});
