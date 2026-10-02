import { useSyncExternalStore } from 'react';

/** Телефон: усе, що вужче за брейкпоінт `sm` Tailwind (640px). */
export const PHONE_QUERY = '(max-width: 639px)';
/** Вужче за `md` (768px) — там, де замість Sidebar з'являється Bottom Nav. */
export const NARROW_QUERY = '(max-width: 767px)';

const supportsMatchMedia = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * Чи збігається медіазапит зараз. Для розмітки, яку CSS-класами не перемкнути: інша
 * структура (картки замість таблиці, список замість календаря), а не інший вигляд.
 * Без matchMedia (jsdom у тестах) — false, тобто десктопна розмітка.
 */
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (onChange) => {
      if (!supportsMatchMedia()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => supportsMatchMedia() && window.matchMedia(query).matches,
    () => false
  );
