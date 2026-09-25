import { useEffect } from 'react';

export const APP_NAME = 'IT Academy LMS';

/** «Журнал оцінок · IT Academy LMS» — щоб вкладки й історія браузера розрізнялись. */
export const toDocumentTitle = (page?: string) => (page ? `${page} · ${APP_NAME}` : APP_NAME);

export const useDocumentTitle = (page?: string) => {
  useEffect(() => {
    document.title = toDocumentTitle(page);
  }, [page]);
};
