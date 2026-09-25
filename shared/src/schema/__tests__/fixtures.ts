/** Валідні UUID для схем — щоб у тестах не плодити випадкові рядки. */
export const UUID = {
  student: '11111111-1111-4111-8111-111111111111',
  otherStudent: '22222222-2222-4222-8222-222222222222',
  lesson: '33333333-3333-4333-8333-333333333333',
  group: '44444444-4444-4444-8444-444444444444',
  teacher: '55555555-5555-4555-8555-555555555555',
} as const;

/** Перше повідомлення про помилку — саме його BadRequestError віддає клієнту. */
export const firstIssue = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : (result.error?.issues[0]?.message ?? null);
