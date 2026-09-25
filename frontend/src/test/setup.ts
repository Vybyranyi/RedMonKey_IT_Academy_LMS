import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  // Стан між тестами не має протікати: authStore пише токен саме сюди
  localStorage.clear();
});
