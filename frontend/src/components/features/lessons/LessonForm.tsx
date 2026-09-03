import { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import type { FieldProps } from 'formik';
import { z } from 'zod';
import { format } from 'date-fns';
import { createLessonSchema, LessonType, UserRole } from '@redmonkey/shared';
import type { ILessonDto, IUser } from '@redmonkey/shared';
import { apiGetGroups } from '@/api/groups';
import { apiGetUsers } from '@/api/users';
import { useAuthStore } from '@/store/authStore';
import { LESSON_TYPE_META } from '@/lib/lessonTypes';
import { getChangedFields } from '@/utils/formUtils';
import { validateWithZod } from '@/utils/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Значення форми: дата й час — окремі поля, бекенд же чекає один ISO-рядок. */
export interface LessonFormValues {
  title: string;
  description: string;
  groupId: string;
  type: LessonType;
  date: string;
  time: string;
  duration: number;
  teacherId: string;
}

// Поля, яких немає в API-контракті: у формі дата й час окремі
const formOnlySchema = z.object({
  date: z.iso.date('Вкажіть дату'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Вкажіть час'),
});

const lessonFormSchema = z.intersection(createLessonSchema.omit({ date: true }), formOnlySchema);

const defaultValues: LessonFormValues = {
  title: '',
  description: '',
  groupId: '',
  type: LessonType.LECTURE,
  date: format(new Date(), 'yyyy-MM-dd'),
  time: '09:00',
  // Дефолт тривалості теж живе у схемі — не дублюємо число тут
  duration: createLessonSchema.shape.duration.parse(undefined),
  teacherId: '',
};

const toPayload = (values: LessonFormValues): ILessonDto => ({
  title: values.title,
  description: values.description,
  groupId: values.groupId,
  type: values.type,
  duration: Number(values.duration),
  // `${date}T${time}` парситься як ЛОКАЛЬНИЙ час. new Date('2026-09-01') дало б
  // UTC-північ, і подальший setHours() зсував би дату на день у поясах
  // на захід від Гринвіча.
  date: new Date(`${values.date}T${values.time}`).toISOString(),
  ...(values.teacherId ? { teacherId: values.teacherId } : {}),
});

interface LessonFormProps {
  initialValues?: Partial<LessonFormValues>;
  onSubmit: (values: ILessonDto | Partial<ILessonDto>) => void;
  isSubmitting: boolean;
}

export default function LessonForm({ initialValues, onSubmit, isSubmitting }: LessonFormProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [teachers, setTeachers] = useState<IUser[]>([]);

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

  // Викладач завжди створює заняття на себе — список потрібен лише адміну
  useEffect(() => {
    if (!isAdmin) return;

    const fetchTeachers = async () => {
      try {
        const data = await apiGetUsers({ role: UserRole.TEACHER });
        setTeachers(data);
      } catch (error) {
        console.error('Не вдалося завантажити викладачів:', error);
      }
    };
    fetchTeachers();
  }, [isAdmin]);

  const mergedValues: LessonFormValues = { ...defaultValues, ...initialValues };

  return (
    <Formik
      initialValues={mergedValues}
      enableReinitialize
      validate={(values: LessonFormValues) =>
        // Порожній teacherId означає «не обрано» — під правило uuid він не підпадає
        validateWithZod(lessonFormSchema)({ ...values, teacherId: values.teacherId || undefined })
      }
      onSubmit={(values) => {
        const payload = toPayload(values);

        // Створення шле все; редагування — лише змінені поля
        onSubmit(initialValues ? getChangedFields(toPayload(mergedValues), payload) : payload);
      }}
    >
      {({ values, errors, touched, setFieldValue, setFieldTouched }) => (
        <Form className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Назва *</Label>
            <Field name="title">
              {({ field }: FieldProps) => (
                <Input
                  {...field}
                  id="title"
                  placeholder="Основи React"
                  className={`h-11 ${errors.title && touched.title ? 'border-destructive' : ''}`}
                />
              )}
            </Field>
            {errors.title && touched.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Опис</Label>
            <Field name="description">
              {({ field }: FieldProps) => (
                <Input
                  {...field}
                  id="description"
                  placeholder="Коротко про заняття"
                  className={`h-11 ${errors.description && touched.description ? 'border-destructive' : ''}`}
                />
              )}
            </Field>
            {errors.description && touched.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="groupId">Група *</Label>
              <Select
                value={values.groupId}
                onValueChange={(val) => {
                  setFieldValue('groupId', val);
                  setFieldTouched('groupId', true);
                }}
              >
                <SelectTrigger id="groupId" className="bg-white h-11 w-full">
                  <SelectValue placeholder="Оберіть групу" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.groupId && touched.groupId && <p className="text-xs text-destructive">{errors.groupId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Тип заняття *</Label>
              <Select
                value={values.type}
                onValueChange={(val) => {
                  setFieldValue('type', val);
                  setFieldTouched('type', true);
                }}
              >
                <SelectTrigger id="type" className="bg-white h-11 w-full">
                  <SelectValue placeholder="Оберіть тип" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LESSON_TYPE_META).map(([type, meta]) => (
                    <SelectItem key={type} value={type}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && touched.type && <p className="text-xs text-destructive">{errors.type}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Дата *</Label>
              <Field name="date">
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id="date"
                    type="date"
                    className={`h-11 ${errors.date && touched.date ? 'border-destructive' : ''}`}
                  />
                )}
              </Field>
              {errors.date && touched.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Час *</Label>
              <Field name="time">
                {({ field }: FieldProps) => (
                  <Input
                    {...field}
                    id="time"
                    type="time"
                    className={`h-11 ${errors.time && touched.time ? 'border-destructive' : ''}`}
                  />
                )}
              </Field>
              {errors.time && touched.time && <p className="text-xs text-destructive">{errors.time}</p>}
            </div>

          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Тривалість, хв *</Label>
            <Field name="duration">
              {({ field }: FieldProps) => (
                <Input
                  {...field}
                  id="duration"
                  type="number"
                  className={`h-11 ${errors.duration && touched.duration ? 'border-destructive' : ''}`}
                />
              )}
            </Field>
            {errors.duration && touched.duration && <p className="text-xs text-destructive">{errors.duration}</p>}
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="teacherId">Викладач</Label>
              <Select
                value={values.teacherId}
                onValueChange={(val) => {
                  setFieldValue('teacherId', val);
                  setFieldTouched('teacherId', true);
                }}
              >
                <SelectTrigger id="teacherId" className="bg-white h-11 w-full">
                  <SelectValue placeholder="Оберіть викладача" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.lastName} {teacher.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.teacherId && touched.teacherId && (
                <p className="text-xs text-destructive">{errors.teacherId}</p>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium bg-[#C10000] hover:bg-[#A00000] text-white transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Збереження...' : 'Зберегти'}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
