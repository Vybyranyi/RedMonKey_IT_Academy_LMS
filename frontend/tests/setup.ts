import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Без globals:true в конфізі vitest не підхоплює auto-cleanup testing-library
// сам по собі — розмонтовуємо DOM вручну після кожного тесту.
afterEach(() => {
  cleanup();
});
