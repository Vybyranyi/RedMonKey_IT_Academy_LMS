import { Formik, Form, Field } from 'formik';
import type { FieldProps } from 'formik';
import { updateProfileSchema } from '@redmonkey/shared';
import { validateWithZod } from '@/utils/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UpdateProfileDto } from '@/api/auth';

/**
 * PATCH має нести лише змінені поля. Якщо слати форму цілком, кожне збереження
 * перезаписує всі поля тим, що форма показала, — і значення, яке не доїхало з
 * бекенда, тихо затирається порожнім рядком.
 */
const getChangedFields = (
  initial: UpdateProfileDto,
  values: UpdateProfileDto
): Partial<UpdateProfileDto> => {
  const changed: Partial<UpdateProfileDto> = {};

  (Object.keys(values) as (keyof UpdateProfileDto)[]).forEach((key) => {
    if (values[key] !== initial[key]) {
      changed[key] = values[key];
    }
  });

  return changed;
};

interface ProfileFormProps {
  initialValues: UpdateProfileDto;
  onSubmit: (values: Partial<UpdateProfileDto>) => void;
  isSubmitting: boolean;
}

export default function ProfileForm({ initialValues, onSubmit, isSubmitting }: ProfileFormProps) {
  return (
    <Formik
      initialValues={initialValues}
      validate={validateWithZod(updateProfileSchema)}
      onSubmit={(values) => onSubmit(getChangedFields(initialValues, values))}
    >
      {({ errors, touched }) => (
        <Form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Ім'я *</Label>
              <Field name="firstName">
                {({ field }: FieldProps) => (
                  <Input {...field} id="firstName" className={`h-11 ${errors.firstName && touched.firstName ? 'border-destructive' : ''}`} />
                )}
              </Field>
              {errors.firstName && touched.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Прізвище *</Label>
              <Field name="lastName">
                {({ field }: FieldProps) => (
                  <Input {...field} id="lastName" className={`h-11 ${errors.lastName && touched.lastName ? 'border-destructive' : ''}`} />
                )}
              </Field>
              {errors.lastName && touched.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Field name="phone">
              {({ field }: FieldProps) => <Input {...field} id="phone" placeholder="+380..." className="h-11" />}
            </Field>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Посилання на аватар</Label>
            <Field name="avatar">
              {({ field }: FieldProps) => <Input {...field} id="avatar" placeholder="https://..." className="h-11" />}
            </Field>
            {errors.avatar && touched.avatar && <p className="text-xs text-destructive">{errors.avatar}</p>}
          </div>

          <Button type="submit" className="w-full h-11 bg-[#C10000] hover:bg-[#A00000] text-white" disabled={isSubmitting}>
            {isSubmitting ? 'Збереження...' : 'Зберегти зміни'}
          </Button>
        </Form>
      )}
    </Formik>
  );
}
