import { Formik, Form, Field } from 'formik';
import type { FieldProps } from 'formik';
import { updateProfileSchema } from '@redmonkey/shared';
import { validateWithZod } from '@/utils/validation';
import { getChangedFields } from '@/utils/formUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
/** Значення форми: усі поля присутні як рядки, порожній рядок = «очистити». */
export interface ProfileFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  avatar: string;
}

interface ProfileFormProps {
  initialValues: ProfileFormValues;
  onSubmit: (values: Partial<ProfileFormValues>) => void;
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
                  <Input {...field} id="firstName" className={errors.firstName && touched.firstName ? 'border-destructive' : undefined} />
                )}
              </Field>
              {errors.firstName && touched.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Прізвище *</Label>
              <Field name="lastName">
                {({ field }: FieldProps) => (
                  <Input {...field} id="lastName" className={errors.lastName && touched.lastName ? 'border-destructive' : undefined} />
                )}
              </Field>
              {errors.lastName && touched.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Field name="phone">
              {({ field }: FieldProps) => <Input {...field} id="phone" placeholder="+380..." />}
            </Field>
            {errors.phone && touched.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Посилання на аватар</Label>
            <Field name="avatar">
              {({ field }: FieldProps) => <Input {...field} id="avatar" placeholder="https://..." />}
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
