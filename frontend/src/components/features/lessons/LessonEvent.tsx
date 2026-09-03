import { format } from 'date-fns';

export default function LessonEvent({ event }: { event: { title: string; start: Date } }) {
  return (
    <div className="h-full px-2 py-1.5 overflow-hidden">
      <p className="text-xs font-bold truncate leading-tight">{event.title}</p>
      <p className="text-[11px] opacity-75 mt-0.5">{format(event.start, 'HH:mm')}</p>
    </div>
  );
}
