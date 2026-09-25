import axios, { isAxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { SessionExpiredError } from '../utils/apiError';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/** Опції для GET-функцій з api/: signal дає сторінці скасувати запит, який уже не потрібен. */
export interface RequestOptions {
  signal?: AbortSignal;
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

interface QueuedRequest {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Ці маршрути не перевіряють access-токен: 401 від них — відповідь на самі облікові
// дані («Невірний email або пароль»), і рефреш лише замаскував би справжню причину
const NO_REFRESH_URLS = ['/auth/login', '/auth/refresh', '/auth/logout'];

/** Бекенд відповів на refresh відмовою — кука протухла, відкликана або користувача деактивовано. */
const isRefreshRejected = (error: unknown) => {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return status === 401 || status === 403;
};

/**
 * Кілька запитів можуть отримати 401 майже одночасно, тож логаут і toast
 * мають статися один раз: наступні виклики бачать, що сесії вже немає.
 */
const endSession = () => {
  const { isAuthenticated, clearAuth } = useAuthStore.getState();
  if (!isAuthenticated) return;

  clearAuth();
  toast.warning('Сесія завершилась — увійдіть знову', { id: 'session-expired' });
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      NO_REFRESH_URLS.includes(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    // Відповідь на запит, відправлений ще до логауту: сесії вже немає,
    // і новий рефреш лише запустив би ще одне коло 401 → refresh → 401
    if (!useAuthStore.getState().isAuthenticated) {
      return Promise.reject(new SessionExpiredError({ cause: error }));
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
      const { accessToken } = response.data;

      useAuthStore.getState().updateAccessToken(accessToken);
      processQueue(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      // Сервер недоступний або впав — це ще не кінець сесії: refresh-кука може
      // бути цілком дійсною, і розлогінювати через збій мережі не можна
      if (!isRefreshRejected(refreshError)) {
        processQueue(refreshError);
        return Promise.reject(refreshError);
      }

      const sessionError = new SessionExpiredError({ cause: refreshError });
      processQueue(sessionError);
      endSession();
      return Promise.reject(sessionError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosInstance;
