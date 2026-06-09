import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/api/axios';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LoginForm } from '@/components/features/auth/LoginForm';

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const handleLogin = async (values: any, { setSubmitting }: any) => {
    setServerError(null);
    try {
      const response = await axiosInstance.post('/auth/login', values);
      const { accessToken, user } = response.data;
      setAuth(user, accessToken);
      navigate('/');
    } catch (error: any) {
      setServerError(error.response?.data?.message || 'Халепа! Щось пішло не так.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">IT Academy LMS</CardTitle>
          <CardDescription>Введіть свій Email та пароль для входу в кабінет</CardDescription>
        </CardHeader>
        <CardContent>
          {serverError && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 text-center">
              {serverError}
            </div>
          )}
          <LoginForm onSubmit={handleLogin} />
        </CardContent>
      </Card>
    </div>
  );
}