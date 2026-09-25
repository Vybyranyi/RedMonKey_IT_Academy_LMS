import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AttendanceStatus } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import EmptyState from '@/components/common/EmptyState';
import { ATTENDANCE_STATUS_META } from '@/lib/attendanceStatuses';

interface AttendanceListProps {
  students: IUser[];
  /** studentId → статус */
  value: Record<string, AttendanceStatus>;
  /** Має бути стабільним (useCallback) — інакше memo рядків не спрацює */
  onChange: (studentId: string, status: AttendanceStatus) => void;
  /** studentId → нотатка */
  notes: Record<string, string>;
  onNoteChange: (studentId: string, note: string) => void;
  readOnly?: boolean;
}

export default function AttendanceList({
  students,
  value,
  onChange,
  notes,
  onNoteChange,
  readOnly = false,
}: AttendanceListProps) {
  if (students.length === 0) {
    return <EmptyState title="У цій групі поки немає студентів" />;
  }

  return (
    <div className="space-y-2">
      {students.map((student) => (
        <AttendanceRow
          key={student.id}
          student={student}
          status={value[student.id] ?? AttendanceStatus.PRESENT}
          note={notes[student.id] ?? ''}
          readOnly={readOnly}
          onChange={onChange}
          onNoteChange={onNoteChange}
        />
      ))}
    </div>
  );
}

interface AttendanceRowProps {
  student: IUser;
  status: AttendanceStatus;
  note: string;
  readOnly: boolean;
  onChange: (studentId: string, status: AttendanceStatus) => void;
  onNoteChange: (studentId: string, note: string) => void;
}

// Рядок отримує лише свій статус і нотатку: перемикання одного студента чи
// набір нотатки не перемальовує решту списку
const AttendanceRow = memo(function AttendanceRow({
  student,
  status,
  note,
  readOnly,
  onChange,
  onNoteChange,
}: AttendanceRowProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={student.avatar || undefined} />
            <AvatarFallback className="bg-[#0070F3] text-white text-xs font-bold">
              {student.firstName[0]}
              {student.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-slate-700 truncate">
            {student.firstName} {student.lastName}
          </span>
        </div>

        {readOnly ? (
          <Badge className={`self-start sm:self-auto ${ATTENDANCE_STATUS_META[status].badge}`}>
            {ATTENDANCE_STATUS_META[status].label}
          </Badge>
        ) : (
          <div
            role="group"
            aria-label={`Статус: ${student.firstName} ${student.lastName}`}
            className="flex items-center gap-1 shrink-0 flex-wrap"
          >
            {Object.entries(ATTENDANCE_STATUS_META).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                aria-pressed={status === key}
                onClick={() => onChange(student.id, key as AttendanceStatus)}
                className={`px-3 h-8 rounded-md text-xs font-semibold border transition-colors ${
                  status === key
                    ? meta.active
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {meta.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Нотатка живе в рядку студента: інакше довелось би зіставляти
          два паралельні списки очима */}
      <Input
        aria-label={`Нотатка для ${student.firstName} ${student.lastName}`}
        value={note}
        disabled={readOnly}
        onChange={(event) => onNoteChange(student.id, event.target.value)}
        placeholder="Нотатка (необов'язково)"
        className="h-9"
      />
    </div>
  );
});
