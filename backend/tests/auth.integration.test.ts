import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../src/app.js";
import { userRepository } from "../src/repositories/user.repository.js";

// userRepository — єдина точка, де auth.service торкається Prisma (див. репозиторний
// шар у CLAUDE.md), тож мокаємо саме її: тест перевіряє маршрут + контролер + сервіс
// без реального підключення до БД.
vi.mock("../src/repositories/user.repository.js", () => ({
  userRepository: {
    findByEmail: vi.fn(),
  },
  toPublicUser: (user: Record<string, unknown>) => {
    const { passwordHash, tokenVersion, ...publicUser } = user;
    return publicUser;
  },
}));

const fakeUser = {
  id: "11111111-1111-1111-1111-111111111111",
  academyId: "academy-1",
  firstName: "Тест",
  lastName: "Тестовий",
  email: "student@academy.com",
  role: "STUDENT",
  avatar: null,
  phone: null,
  redCoins: 0,
  groupId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  group: null,
  passwordHash: bcrypt.hashSync("CorrectPass123", 10),
  tokenVersion: 0,
};

describe("POST /api/v1/auth/login", () => {
  it("повертає accessToken і публічні дані користувача за правильним паролем", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(fakeUser as never);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: fakeUser.email, password: "CorrectPass123" });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.email).toBe(fakeUser.email);
    // passwordHash не повинен потрапляти у відповідь клієнту
    expect(response.body.user.passwordHash).toBeUndefined();
    // refresh token видається лише httpOnly-кукою, не в тілі відповіді
    expect(response.headers["set-cookie"]?.[0]).toMatch(/^refreshToken=/);
  });

  it("повертає 401 за неправильним паролем", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(fakeUser as never);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: fakeUser.email, password: "WrongPassword" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBeTruthy();
  });

  it("повертає 401, якщо користувача з таким email не існує", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@academy.com", password: "CorrectPass123" });

    expect(response.status).toBe(401);
  });
});
