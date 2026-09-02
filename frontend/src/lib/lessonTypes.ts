export const LESSON_TYPE_META: Record<
  string,
  { label: string; dot: string; bg: string }
> = {
  INDIVIDUAL: {
    label: "Індивідуальне",
    dot: "bg-blue-500",
    bg: "bg-blue-50 text-blue-700 border-blue-200",
  },
  GROUP: {
    label: "Групове",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  TRIAL: {
    label: "Пробне",
    dot: "bg-amber-500",
    bg: "bg-amber-50 text-amber-700 border-amber-200",
  },
  SPEAKING_CLUB: {
    label: "Розмовний клуб",
    dot: "bg-purple-500",
    bg: "bg-purple-50 text-purple-700 border-purple-200",
  },
};
