import { Formik, Form, Field } from 'formik';
import type { FieldProps } from 'formik';
import { z } from 'zod';
import { validateWithZod } from '@/utils/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChangePasswordDto } from '@/api/auth';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Вкажіть поточний пароль'),
    newPassword: z.string().min(6, 'Пароль має містити не менше 6 символів'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Паролі не співпадають',
    path: ['confirmPassword'],
  });

interface ChangePasswordFormProps {
  onSubmit: (values: ChangePasswordDto) => void;
  isSubmitting: boolean;
}

export default function ChangePasswordForm({ onSubmit, isSubmitting }: ChangePasswordFormProps) {
  return (
    <Formik
      initialValues={{ currentPassword: '', newPassword: '', confirmPassword: '' }}
      validate={validateWithZod(passwordSchema)}
      onSubmit={(values) => onSubmit({ currentPassword: values.currentPassword, newPassword: values.newPassword })}
    >
      {({ errors, touched }) => (
        <Form className="space-y-4">
          {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((name) => (
            <div className="space-y-2" key={name}>
              <Label htmlFor={name}>
                {name === 'currentPassword' ? 'Поточний пароль' : name === 'newPassword' ? 'Новий пароль' : 'Підтвердження пароля'}
              </Label>
              <Field name={name}>
                {({ field }: FieldProps) => (
                  <Input {...field} id={name} type="password" className={`h-11 ${errors[name] && touched[name] ? 'border-destructive' : ''}`} />
                )}
              </Field>
              {errors[name] && touched[name] && <p className="text-xs text-destructive">{errors[name]}</p>}
            </div>
          ))}

          <Button type="submit" className="w-full h-11 bg-[#C10000] hover:bg-[#A00000] text-white" disabled={isSubmitting}>
            {isSubmitting ? 'Збереження...' : 'Змінити пароль'}
          </Button>
        </Form>
      )}
    </Formik>
  );
}
