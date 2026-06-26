import { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import type { FieldProps } from 'formik';
import { z } from 'zod';
import { validateWithZod } from '@/utils/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserRole } from '@redmonkey/shared';
import type { IUserDto } from '@redmonkey/shared';
import { apiGetGroups } from '@/api/groups';

const userSchema = z.object({
  firstName: z.string().min(2, "Ім'я має містити не менше 2 символів"),
  lastName: z.string().min(2, 'Прізвище має містити не менше 2 символів'),
  email: z.string().email('Неправильний формат email'),
  password: z.string().min(6, 'Пароль має містити не менше 6 символів').optional().or(z.literal('')),
  role: z.nativeEnum(UserRole),
  phone: z.string().optional(),
  group: z.string().optional(),
});

interface UserFormProps {
  initialValues?: Partial<IUserDto>;
  onSubmit: (values: IUserDto) => void;
  isSubmitting: boolean;
  hideRoleSelect?: boolean;
}

const defaultValues: IUserDto = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: UserRole.STUDENT,
  phone: '',
  group: '',
};

export default function UserForm({ initialValues, onSubmit, isSubmitting, hideRoleSelect = false }: UserFormProps) {
  const [groups, setGroups] = useState<{_id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await apiGetGroups();
        setGroups(data);
      } catch (error) {
        console.error('Не вдалося завантажити групи:', error);
      }
    };
    fetchGroups();
  }, []);

  const mergedValues = { ...defaultValues, ...initialValues } as IUserDto;

  return (
    <Formik
      initialValues={mergedValues}
      validateOnBlur={false}
      validate={validateWithZod(userSchema)}
      onSubmit={(values) => {
        const submitValues = { ...values };
        if (!submitValues.password) {
          delete submitValues.password;
        }
        if (!submitValues.group || submitValues.group === 'none') {
          delete submitValues.group;
        }
        onSubmit(submitValues);
      }}
    >
      {({ values, errors, touched, setFieldValue }) => (
        <Form className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">Ім'я *</Label>
              <Field name="firstName">
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id="firstName"
                    placeholder="Іван"
                    className={errors.firstName && touched.firstName ? 'border-destructive' : ''}
                  />
                )}
              </Field>
              {errors.firstName && touched.firstName && <p className="text-xs text-destructive">{errors.firstName as string}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="lastName">Прізвище *</Label>
              <Field name="lastName">
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id="lastName"
                    placeholder="Шевченко"
                    className={errors.lastName && touched.lastName ? 'border-destructive' : ''}
                  />
                )}
              </Field>
              {errors.lastName && touched.lastName && <p className="text-xs text-destructive">{errors.lastName as string}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email *</Label>
            <Field name="email">
              {({ field }: FieldProps) => (
                <Input
                  {...field}
                  id="email"
                  type="email"
                  placeholder="ivan@example.com"
                  className={errors.email && touched.email ? 'border-destructive' : ''}
                />
              )}
            </Field>
            {errors.email && touched.email && <p className="text-xs text-destructive">{errors.email as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="password">Пароль</Label>
              <Field name="password">
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id="password"
                    type="password"
                    placeholder="Мінімум 6 символів"
                    className={errors.password && touched.password ? 'border-destructive' : ''}
                  />
                )}
              </Field>
              {errors.password && touched.password && <p className="text-xs text-destructive">{errors.password as string}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Телефон</Label>
              <Field name="phone">
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id="phone"
                    placeholder="+380..."
                  />
                )}
              </Field>
            </div>
          </div>

          {!hideRoleSelect && (
            <div className="space-y-1">
              <Label htmlFor="role">Роль *</Label>
              <Select value={values.role} onValueChange={(val) => setFieldValue('role', val)}>
                <SelectTrigger id="role" className="bg-white">
                  <SelectValue placeholder="Оберіть роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.STUDENT}>Студент</SelectItem>
                  <SelectItem value={UserRole.TEACHER}>Викладач</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Адміністратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(values.role === UserRole.STUDENT) && (
            <div className="space-y-1">
              <Label htmlFor="group">Група (необов'язково)</Label>
              <Select value={values.group || "none"} onValueChange={(val) => setFieldValue('group', val === 'none' ? '' : val)}>
                <SelectTrigger id="group" className="bg-white">
                  <SelectValue placeholder="Оберіть групу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без групи</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" className="w-full bg-[#BA0000] hover:bg-[#A00000] text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Збереження...' : 'Зберегти'}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
