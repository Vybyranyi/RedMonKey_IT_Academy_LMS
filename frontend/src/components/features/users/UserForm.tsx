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
import { RefreshCw, Wand2 } from 'lucide-react';
import { transliterate, generateRandomPassword } from '@/utils/stringUtils';

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
        <Form className="space-y-6 pt-2">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">Ім'я *</Label>
              <Field name="firstName">
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id="firstName"
                    placeholder="Іван"
                    className={`h-11 ${errors.firstName && touched.firstName ? 'border-destructive' : ''}`}
                  />
                )}
              </Field>
              {errors.firstName && touched.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName as string}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">Прізвище *</Label>
              <Field name="lastName">
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id="lastName"
                    placeholder="Шевченко"
                    className={`h-11 ${errors.lastName && touched.lastName ? 'border-destructive' : ''}`}
                  />
                )}
              </Field>
              {errors.lastName && touched.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName as string}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
            <div className="flex gap-2">
              <Field name="email">
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="ivan.shevchenko@academy.com"
                    className={`h-11 ${errors.email && touched.email ? 'border-destructive' : ''}`}
                  />
                )}
              </Field>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-11 px-0 shrink-0"
                title="Згенерувати email автоматично"
                onClick={() => {
                  if (values.firstName && values.lastName) {
                    const generatedEmail = `${transliterate(values.firstName)}.${transliterate(values.lastName)}@academy.com`;
                    setFieldValue('email', generatedEmail);
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 text-slate-500" />
                <span className="sr-only">Генерувати Email</span>
              </Button>
            </div>
            {errors.email && touched.email && <p className="text-xs text-destructive mt-1">{errors.email as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Пароль</Label>
              <div className="flex gap-2">
                <Field name="password">
                  {({ field }: FieldProps) => (
                    <Input
                      {...field}
                      id="password"
                      type="text"
                      placeholder="Мінімум 6 символів"
                      className={`h-11 ${errors.password && touched.password ? 'border-destructive' : ''}`}
                    />
                  )}
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-11 px-0 shrink-0"
                  title="Згенерувати надійний пароль"
                  onClick={() => {
                    setFieldValue('password', generateRandomPassword());
                  }}
                >
                  <Wand2 className="h-4 w-4 text-slate-500" />
                  <span className="sr-only">Генерувати Пароль</span>
                </Button>
              </div>
              {errors.password && touched.password && <p className="text-xs text-destructive mt-1">{errors.password as string}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Телефон</Label>
              <Field name="phone">
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id="phone"
                    placeholder="+380..."
                    className="h-11"
                  />
                )}
              </Field>
            </div>
          </div>

          {!hideRoleSelect && (
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">Роль *</Label>
              <Select value={values.role} onValueChange={(val) => setFieldValue('role', val)}>
                <SelectTrigger id="role" className="bg-white h-11">
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
            <div className="space-y-2">
              <Label htmlFor="group" className="text-sm font-medium">Група (необов'язково)</Label>
              <Select value={values.group || "none"} onValueChange={(val) => setFieldValue('group', val === 'none' ? '' : val)}>
                <SelectTrigger id="group" className="bg-white h-11">
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

          <div className="pt-4">
            <Button type="submit" className="w-full h-12 text-base font-medium bg-[#C10000] hover:bg-[#A00000] text-white transition-colors" disabled={isSubmitting}>
              {isSubmitting ? 'Збереження...' : 'Зберегти'}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
