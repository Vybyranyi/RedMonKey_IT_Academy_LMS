import { getGradeColor } from '@/lib/gradeColors';

const RANGES = [
  { label: '10–12', sample: 10 },
  { label: '7–9', sample: 7 },
  { label: '4–6', sample: 4 },
  { label: '1–3', sample: 1 },
];

/** Що означають кольори клітинок журналу — ті самі пороги, що в getGradeColor. */
export default function GradeLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Кольори оцінок">
      {RANGES.map((range) => (
        <li
          key={range.label}
          className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${getGradeColor(range.sample)}`}
        >
          {range.label}
        </li>
      ))}
    </ul>
  );
}
