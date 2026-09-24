import { describe, expect, it } from "vitest";
import { getChangedFields } from "./formUtils";

describe("getChangedFields", () => {
  it("повертає лише поля, що відрізняються від початкових значень", () => {
    const initial = { firstName: "Іван", lastName: "Франко", phone: "" };
    const values = { firstName: "Іван", lastName: "Франко", phone: "0991234567" };

    expect(getChangedFields(initial, values)).toEqual({ phone: "0991234567" });
  });

  it("повертає порожній обʼєкт, якщо нічого не змінилось", () => {
    const initial = { firstName: "Іван" };
    const values = { firstName: "Іван" };

    expect(getChangedFields(initial, values)).toEqual({});
  });

  it("включає всі поля, якщо всі змінились", () => {
    const initial = { a: 1, b: 2 };
    const values = { a: 10, b: 20 };

    expect(getChangedFields(initial, values)).toEqual({ a: 10, b: 20 });
  });
});
