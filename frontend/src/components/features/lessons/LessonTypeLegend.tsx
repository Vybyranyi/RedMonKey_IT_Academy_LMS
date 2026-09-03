import { LESSON_TYPE_META } from '@/lib/lessonTypes';

export default function LessonTypeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {Object.entries(LESSON_TYPE_META).map(([type, meta]) => (
        <div key={type} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-sm ${meta.dot}`} />
          <span className="text-sm text-slate-600">{meta.label}</span>
        </div>
      ))}
    </div>
  );
}
