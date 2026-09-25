import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email обовʼязковий').email('Некоректний формат email'),
  password: z.string().min(6, 'Пароль має містити не менше 6 символів'),
});

// Допоміжна функція інтеграції Zod з Formik
export const validateWithZod = (schema: z.ZodSchema) => (values: unknown) => {
  const result = schema.safeParse(values);
  if (result.success) return {};
  
  const errors: Record<string, string> = {};
  result.error.issues.forEach((err) => {
    const field = err.path[0] as string | undefined;
    // Перше порушення поля, а не останнє: порожній email ламає і min(1), і email(),
    // і користувач має побачити «Email обовʼязковий». Так само робить parseBody на бекенді.
    if (field && !(field in errors)) {
      errors[field] = err.message;
    }
  });
  return errors;
};