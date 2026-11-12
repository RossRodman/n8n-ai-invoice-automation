import { describe, expect, it } from "vitest";

import { formatSize, MAX_UPLOAD_BYTES, uploadProblem } from "./upload";

const file = (name: string, size: number, type = "application/pdf") =>
  new File([new Uint8Array(size)], name, { type });

describe("uploadProblem", () => {
  it("accepts a PDF by type or extension", () => {
    expect(uploadProblem(file("a.pdf", 10))).toBeNull();
    expect(uploadProblem(file("A.PDF", 10, ""))).toBeNull();
  });

  it("rejects other files, empty ones and big ones", () => {
    expect(uploadProblem(file("notes.txt", 10, "text/plain"))).toBe("Not a PDF");
    expect(uploadProblem(file("a.pdf", 0))).toBe("The file is empty");
    expect(uploadProblem(file("a.pdf", MAX_UPLOAD_BYTES + 1))).toBe("Larger than 10 MB");
  });
});

describe("formatSize", () => {
  it("picks a readable unit", () => {
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(154_000)).toBe("150 KB");
    expect(formatSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
