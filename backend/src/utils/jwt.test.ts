import { describe, expect, it } from "vitest";
import { UserRole } from "@redmonkey/shared";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./jwt.js";

describe("jwt utils", () => {
  it("генерує access-токен, який можна верифікувати назад у той самий payload", () => {
    const token = generateAccessToken({ userId: "user-1", role: UserRole.ADMIN });

    const decoded = verifyAccessToken(token);

    expect(decoded.userId).toBe("user-1");
    expect(decoded.role).toBe(UserRole.ADMIN);
  });

  it("генерує refresh-токен із tokenVersion, який зберігається при верифікації", () => {
    const token = generateRefreshToken({ userId: "user-2", role: UserRole.STUDENT, tokenVersion: 3 });

    const decoded = verifyRefreshToken(token);

    expect(decoded.tokenVersion).toBe(3);
  });

  it("кидає помилку на зіпсований токен", () => {
    expect(() => verifyAccessToken("not-a-real-token")).toThrow();
  });

  it("не дає верифікувати access-токен refresh-секретом і навпаки", () => {
    const accessToken = generateAccessToken({ userId: "user-3", role: UserRole.TEACHER });

    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});
