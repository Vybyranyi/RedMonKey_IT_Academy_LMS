import { lazy, type ComponentType } from 'react';

const RELOAD_FLAG = 'chunkReloaded';

/**
 * React.lazy для сторінок. Після деплою старі хеші чанків зникають із сервера, і
 * відкрита вкладка не може довантажити сторінку, на яку перейшла. Один
 * перезапуск підтягує свіжий index.html; прапорець у sessionStorage не дає
 * зациклити перезавантаження, якщо збій справжній (мережа, сервер).
 */
export function lazyPage<T extends ComponentType<unknown>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const module = await load();
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        // sessionStorage недоступний — просто без захисту від циклу
      }
      return module;
    } catch (error) {
      try {
        if (sessionStorage.getItem(RELOAD_FLAG) !== '1') {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
          // Чекаємо перезавантаження, а не показуємо помилку на мить
          return await new Promise<never>(() => {});
        }
      } catch {
        // без sessionStorage перезавантажувати небезпечно: можливий цикл
      }
      throw error;
    }
  });
}
