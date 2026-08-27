import { useEffect, useState } from "react";
import AppRouter from "./router";
import { useAuthStore } from "./store/authStore";
import axiosInstance from "./api/axios";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const { isAuthenticated, user, setUser, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (isAuthenticated && !user) {
        try {
          const response = await axiosInstance.get('/auth/me');
          setUser(response.data);
        } catch {
          // Токен протух або користувача деактивували — просто виходимо
          clearAuth();
        }
      }
      setIsInitializing(false);
    };

    fetchMe();
  }, [isAuthenticated, user, setUser, clearAuth]);

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center">Завантаження...</div>;
  }

  return (
    <>
      <Toaster position="top-right" richColors/>
      <AppRouter />
    </>
  );
}

export default App;
