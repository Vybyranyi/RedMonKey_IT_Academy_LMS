import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseBody, parseQuery } from "./validation.js";
import { BadRequestError } from "./errors.js";

const schema = z.object({
  email: z.string().email("Некоректний email"),
});

describe("parseBody", () => {
  it("повертає розпарсені дані, коли тіло валідне", () => {
    const result = parseBody(schema, { email: "test@academy.com" });

    expect(result).toEqual({ email: "test@academy.com" });
  });

  it("кидає BadRequestError з текстом першої помилки Zod, коли тіло невалідне", () => {
    expect(() => parseBody(schema, { email: "not-an-email" })).toThrow(BadRequestError);
    expect(() => parseBody(schema, { email: "not-an-email" })).toThrow("Некоректний email");
  });
});

describe("parseQuery", () => {
  it("веде себе так само, як parseBody, для query-параметрів", () => {
    expect(() => parseQuery(schema, {})).toThrow(BadRequestError);
  });
});
