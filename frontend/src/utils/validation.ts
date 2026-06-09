import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email обовʼязковий').email('Некоректний формат email'),
  password: z.string().min(6, 'Пароль має містити не менше 6 символів'),
});

// Допоміжна функція інтеграції Zod з Formik
export const validateWithZod = (schema: z.ZodSchema) => (values: any) => {
  const result = schema.safeParse(values);
  if (result.success) return {};
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    if (err.path[0]) {
      errors[err.path[0] as string] = err.message;
    }
  });
  return errors;
};