import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

// Найпростіший інтеграційний тест: піднімає реальний Express app (middleware +
// маршрутизація), але не торкається БД — health-ендпоінт нічого з неї не читає.
describe("GET /api/v1/health", () => {
  it("відповідає 200 і статусом ok", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", message: "Server is healthy" });
  });
});
