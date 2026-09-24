import { describe, expect, it } from "vitest";
import { getGradeColor, getAverageColor } from "./gradeColors";

// Межі кольорового кодування оцінок з ТЗ 6.2: 10-12 зелений, 7-9 синій, 4-6 жовтий, 1-3 червоний.
describe("getGradeColor", () => {
  it.each([
    [12, "emerald"],
    [10, "emerald"],
    [9, "blue"],
    [7, "blue"],
    [6, "amber"],
    [4, "amber"],
    [3, "rose"],
    [1, "rose"],
  ])("оцінка %i отримує колір, що містить '%s'", (value, colorFragment) => {
    expect(getGradeColor(value)).toContain(colorFragment);
  });
});

describe("getAverageColor", () => {
  it("повертає нейтральний сірий колір, коли оцінок ще немає (null)", () => {
    expect(getAverageColor(null)).toContain("slate");
  });

  it("округлює середнє перед вибором кольору", () => {
    // 6.6 округлюється до 7 → синій, а не жовтий
    expect(getAverageColor(6.6)).toBe(getGradeColor(7));
  });
});
