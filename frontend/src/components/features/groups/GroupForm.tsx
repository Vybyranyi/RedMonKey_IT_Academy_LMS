import { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import type { FieldProps } from 'formik';
import { z } from 'zod';
import { validateWithZod } from '@/utils/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { IGroupDto } from '@redmonkey/shared';
import { apiGetUsers } from '@/api/users';
import { GROUP_END_BEFORE_START_MESSAGE, UserRole } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import { toastApiError } from '@/utils/apiError';
import { errorA11y } from '@/utils/formA11y';

const groupSchema = z
  .object({
    name: z.string().min(3, 'Назва групи має містити не менше 3 символів'),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    teachers: z.array(z.string()).optional(),
  })
  // Дати з <input type="date"> — рядки YYYY-MM-DD, тож їх можна порівнювати як рядки
  .refine(({ startDate, endDate }) => !startDate || !endDate || endDate > startDate, {
    message: GROUP_END_BEFORE_START_MESSAGE,
    path: ['endDate'],
  });

interface GroupFormProps {
  initialValues?: IGroupDto;
  onSubmit: (values: IGroupDto) => void;
  isSubmitting: boolean;
}

const defaultValues: IGroupDto = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  teachers: [],
  students: [],
};

export default function GroupForm({
  initialValues = defaultValues,
  onSubmit,
  isSubmitting,
}: GroupFormProps) {
  const [allTeachers, setAllTeachers] = useState<IUser[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const data = await apiGetUsers({ role: UserRole.TEACHER });
        setAllTeachers(data);
      } catch (error) {
        toastApiError(error, 'Не вдалося завантажити список викладачів');
      }
    };
    fetchTeachers();
  }, []);

  return (
    <Formik
      initialValues={initialValues}
      validate={validateWithZod(groupSchema)}
      onSubmit={(values) => onSubmit(values)}
    >
      {({ values, errors, touched, setFieldValue }) => (
        <Form className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Назва групи *</Label>
            <Field name="name">
              {({ field }: FieldProps) => (
                <Input
                  {...field}
                  id="name"
                  {...errorA11y('name', errors.name && touched.name)}
                  placeholder="напр. JS-2026-A"
                  className={errors.name && touched.name ? 'border-destructive' : ''}
                />
              )}
            </Field>
            {errors.name && touched.name && (
              <p id="name-error" className="text-xs text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Опис групи</Label>
            <Field name="description">
              {({ field }: FieldProps) => (
                <Input {...field} id="description" placeholder="Короткий опис напрямку" />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="startDate">Дата початку</Label>
              <Field name="startDate">
                {({ field }: FieldProps) => <Input {...field} id="startDate" type="date" />}
              </Field>
            </div>

            <div className="space-y-1">
              <Label htmlFor="endDate">Дата завершення</Label>
              <Field name="endDate">
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id="endDate"
                    {...errorA11y('endDate', errors.endDate && touched.endDate)}
                    type="date"
                    className={errors.endDate && touched.endDate ? 'border-destructive' : ''}
                  />
                )}
              </Field>
              {errors.endDate && touched.endDate && (
                <p id="endDate-error" className="text-xs text-destructive">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Викладачі групи</Label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
              {allTeachers.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    value={t.id}
                    checked={values.teachers?.includes(t.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const nextTeachers = checked
                        ? [...(values.teachers || []), t.id]
                        : (values.teachers || []).filter((id) => id !== t.id);
                      setFieldValue('teachers', nextTeachers);
                    }}
                    className="accent-primary"
                  />
                  {t.firstName} {t.lastName}
                </label>
              ))}
            </div>
          </div>

          <Button variant="brand" type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Збереження...' : 'Зберегти'}
          </Button>
        </Form>
      )}
    </Formik>
  );
}
