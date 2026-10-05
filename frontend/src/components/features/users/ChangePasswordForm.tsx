import { Formik, Form, Field } from 'formik';
import type { FieldProps } from 'formik';
import { z } from 'zod';
import { changePasswordSchema, type IChangePasswordDto } from '@redmonkey/shared';
import { validateWithZod } from '@/utils/validation';
import { errorA11y, errorId } from '@/utils/formA11y';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Правила самих паролів беремо з shared, щоб не розходитися з бекендом.
 * confirmPassword — суто поле форми, бекенду воно не потрібне, тому
 * докладаємо його зверху окремою схемою.
 */
const confirmSchema = z
  .object({ newPassword: z.string(), confirmPassword: z.string() })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Паролі не співпадають',
    path: ['confirmPassword'],
  });

const passwordFormSchema = z.intersection(changePasswordSchema, confirmSchema);

interface ChangePasswordFormProps {
  onSubmit: (values: IChangePasswordDto) => void;
  isSubmitting: boolean;
}

export default function ChangePasswordForm({ onSubmit, isSubmitting }: ChangePasswordFormProps) {
  return (
    <Formik
      initialValues={{ currentPassword: '', newPassword: '', confirmPassword: '' }}
      validate={validateWithZod(passwordFormSchema)}
      onSubmit={(values) =>
        onSubmit({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      }
    >
      {({ errors, touched }) => (
        <Form className="space-y-4">
          {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((name) => (
            <div className="space-y-2" key={name}>
              <Label htmlFor={name}>
                {name === 'currentPassword'
                  ? 'Поточний пароль'
                  : name === 'newPassword'
                    ? 'Новий пароль'
                    : 'Підтвердження пароля'}
              </Label>
              <Field name={name}>
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id={name}
                    {...errorA11y(name, errors[name] && touched[name])}
                    type="password"
                    autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
                    className={errors[name] && touched[name] ? 'border-destructive' : undefined}
                  />
                )}
              </Field>
              {errors[name] && touched[name] && (
                <p id={errorId(name)} className="text-xs text-destructive">
                  {errors[name]}
                </p>
              )}
            </div>
          ))}

          <Button variant="brand" type="submit" className="w-full h-11" disabled={isSubmitting}>
            {isSubmitting ? 'Збереження...' : 'Змінити пароль'}
          </Button>
        </Form>
      )}
    </Formik>
  );
}
