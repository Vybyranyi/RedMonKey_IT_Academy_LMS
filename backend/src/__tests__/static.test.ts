import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Окремий файл: env.ts читає STATIC_DIR на імпорті, тож змінну треба виставити
// до першого імпорту app — у api.test.ts app імпортується без неї.
vi.mock('../lib/prisma.js', () => ({ prisma: {} }));

let app: Express;
let staticDir: string;

beforeAll(async () => {
  staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-static-'));
  fs.mkdirSync(path.join(staticDir, 'assets'));
  fs.writeFileSync(path.join(staticDir, 'index.html'), '<div id="root"></div>');
  fs.writeFileSync(path.join(staticDir, 'assets', 'index-abc123.js'), 'console.log(1)');
  process.env.STATIC_DIR = staticDir;
  ({ app } = await import('../app.js'));
});

afterAll(() => {
  delete process.env.STATIC_DIR;
  fs.rmSync(staticDir, { recursive: true, force: true });
});

describe('frontend з того ж сервера (STATIC_DIR)', () => {
  it('віддає index.html на корені', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<div id="root">');
  });

  it('віддає index.html на роуті React Router, під яким немає файлу', async () => {
    const response = await request(app).get('/grades');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
  });

  it('кешує файли з assets/ назавжди', async () => {
    const response = await request(app).get('/assets/index-abc123.js');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('immutable');
  });

  it('невідомий API-маршрут лишається JSON 404, а не index.html', async () => {
    const response = await request(app).get('/api/v1/nope');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toContain('application/json');
  });

  it('health-check працює', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
  });
});
