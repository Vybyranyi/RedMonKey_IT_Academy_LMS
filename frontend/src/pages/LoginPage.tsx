import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, FieldProps } from 'formik';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/api/axios';
import { loginSchema, validateWithZod } from '@/utils/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

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
          <Formik
            initialValues={{ email: '', password: '' }}
            validate={validateWithZod(loginSchema)}
            onSubmit={async (values, { setSubmitting }) => {
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
            }}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Field name="email">
                    {({ field }: FieldProps) => (
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        placeholder="name@academy.com"
                        className={errors.email && touched.email ? 'border-destructive' : ''}
                      />
                    )}
                  </Field>
                  {errors.email && touched.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Field name="password">
                    {({ field }: FieldProps) => (
                      <Input
                        {...field}
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className={errors.password && touched.password ? 'border-destructive' : ''}
                      />
                    )}
                  </Field>
                  {errors.password && touched.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                </div>

                <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                  {isSubmitting ? 'Вхід...' : 'Увійти'}
                </Button>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </div>
  );
}