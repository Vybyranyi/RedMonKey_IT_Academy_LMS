import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/api/axios';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LoginForm } from '@/components/features/auth/LoginForm';
import logo from '@/assets/logo.png';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#29425D] relative overflow-hidden px-4">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#3D335A] opacity-90 pointer-events-none mix-blend-multiply blur-xl"></div>
      <div className="absolute bottom-[-15%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#1A3150] opacity-80 pointer-events-none mix-blend-multiply blur-xl"></div>
      
      {/* Header section (Logo and Title) */}
      <div className="z-10 text-center mb-8 pt-10">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[18px] relative overflow-hidden">
           <img src={logo} alt="Logo" className="w-full h-full object-contain relative z-10" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1 drop-shadow-sm">IT Academy LMS</h1>
        <p className="text-[#8B9DB4] text-sm font-medium">Платформа управління навчанням</p>
      </div>

      <Card className="z-10 w-full max-w-105 shadow-2xl border-0 rounded-[20px] p-2 bg-white">
        <CardHeader className="space-y-1 pb-6 pt-5 px-6">
          <CardTitle className="text-[22px] font-bold text-slate-900 tracking-tight">Вхід до системи</CardTitle>
          <CardDescription className="text-[14px] font-medium text-slate-500">Введіть свої облікові дані</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {serverError && (
            <div className="mb-5 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-200 text-center">
              {serverError}
            </div>
          )}
          <LoginForm onSubmit={handleLogin} />
        </CardContent>
      </Card>

      <div className="z-10 mt-12 mb-6 text-center text-xs font-medium text-[#7A8C9E]">
        © 2026 RedMonKey IT Academy
      </div>
    </div>
  );
}