import { describe, expect, it } from "vitest";
import { transliterate, generateRandomPassword } from "./stringUtils";

describe("transliterate", () => {
  it("транслітерує українські символи в латиницю", () => {
    expect(transliterate("Іван Шевченко")).toBe("ivanshevchenko");
  });

  it("прибирає апострофи, пробіли та інші символи поза a-z0-9", () => {
    expect(transliterate("О'Коннор №1")).toBe("okonnor1");
  });
});

describe("generateRandomPassword", () => {
  it("генерує пароль потрібної довжини", () => {
    expect(generateRandomPassword(12)).toHaveLength(12);
  });

  it("використовує дефолтну довжину 10, якщо аргумент не передано", () => {
    expect(generateRandomPassword()).toHaveLength(10);
  });

  it("генерує різні паролі при повторних викликах", () => {
    expect(generateRandomPassword(20)).not.toBe(generateRandomPassword(20));
  });
});
