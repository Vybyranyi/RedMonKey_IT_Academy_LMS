import { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import type { FieldProps } from 'formik';
import { loginSchema, validateWithZod } from '@/utils/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { errorA11y } from '@/utils/formA11y';

export interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSubmit: (
    values: LoginFormValues,
    actions: { setSubmitting: (isSubmitting: boolean) => void }
  ) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Formik
      initialValues={{ email: '', password: '' }}
      validate={validateWithZod(loginSchema)}
      onSubmit={onSubmit}
    >
      {({ isSubmitting, errors, touched }) => (
        <Form className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700 block">
              Email
            </label>
            <Field name="email">
              {({ field }: FieldProps) => (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  </div>
                  <Input
                    {...field}
                    id="email"
                    {...errorA11y('email', errors.email && touched.email)}
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    placeholder="name@academy.com"
                    className={`pl-10 h-11 border-slate-200 rounded-md focus-visible:ring-[#BA0000]/20 focus-visible:border-[#BA0000] text-sm ${
                      errors.email && touched.email ? 'border-destructive' : ''
                    }`}
                  />
                </div>
              )}
            </Field>
            {errors.email && touched.email && (
              <p id="email-error" className="text-xs text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700 block">
              Пароль
            </label>
            <Field name="password">
              {({ field }: FieldProps) => (
                // Перемикач видимості — праворуч, як очікують за звичкою: ліворуч, де він
                // стояв, зазвичай декоративна іконка поля, а не кнопка
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  </div>
                  <Input
                    {...field}
                    id="password"
                    {...errorA11y('password', errors.password && touched.password)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`pl-10 pr-11 h-11 border-slate-200 rounded-md focus-visible:ring-[#BA0000]/20 focus-visible:border-[#BA0000] tracking-widest placeholder:tracking-widest text-sm ${
                      errors.password && touched.password ? 'border-destructive' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </Field>
            {errors.password && touched.password && (
              <p id="password-error" className="text-xs text-destructive">
                {errors.password}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2 bg-[#C10000] hover:bg-[#A00000] text-white rounded-md h-11 text-base font-medium shadow-sm transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Вхід...' : 'Увійти'}
          </Button>
        </Form>
      )}
    </Formik>
  );
}
