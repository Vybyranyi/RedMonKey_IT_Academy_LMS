import { Formik, Form, Field } from 'formik';
import type { FieldProps } from 'formik';
import { loginSchema, validateWithZod } from '@/utils/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSubmit: (values: LoginFormValues, actions: { setSubmitting: (isSubmitting: boolean) => void }) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  return (
    <Formik
      initialValues={{ email: '', password: '' }}
      validate={validateWithZod(loginSchema)}
      onSubmit={onSubmit}
    >
      {({ isSubmitting, errors, touched }) => (
        <Form className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700 block">
              Email
            </label>
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
            <label htmlFor="password" className="text-sm font-medium text-slate-700 block">
              Пароль
            </label>
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
  );
}
