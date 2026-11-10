import { cn, formatDate, humanizeStatus } from "./format";

describe("format utils", () => {
  it("joins class names", () => {
    expect(cn("a", false, "b", { c: true, d: false })).toBe("a b c");
  });

  it("formats dates", () => {
    expect(formatDate("2026-01-15T00:00:00.000Z")).not.toBe("");
  });

  it("humanizes status", () => {
    expect(humanizeStatus("changes_requested")).toBe("Changes requested");
  });
});