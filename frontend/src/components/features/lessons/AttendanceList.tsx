import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AttendanceStatus } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import { ATTENDANCE_STATUS_META } from '@/lib/attendanceStatuses';

interface AttendanceListProps {
  students: IUser[];
  /** studentId → статус */
  value: Record<string, AttendanceStatus>;
  onChange: (studentId: string, status: AttendanceStatus) => void;
  readOnly?: boolean;
}

export default function AttendanceList({ students, value, onChange, readOnly = false }: AttendanceListProps) {
  if (students.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center">
        <p className="text-slate-400 text-sm font-medium">У цій групі поки немає студентів</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const status = value[student.id] ?? AttendanceStatus.PRESENT;

        return (
          <div key={student.id} className="flex items-center justify-between gap-4 bg-white border border-slate-100 rounded-xl p-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={student.avatar || undefined} />
                <AvatarFallback className="bg-[#0070F3] text-white text-xs font-bold">
                  {student.firstName[0]}{student.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-slate-700 truncate">
                {student.firstName} {student.lastName}
              </span>
            </div>

            {readOnly ? (
              <Badge className={ATTENDANCE_STATUS_META[status].badge}>
                {ATTENDANCE_STATUS_META[status].label}
              </Badge>
            ) : (
              <div className="flex items-center gap-1 shrink-0 flex-wrap">
                {Object.entries(ATTENDANCE_STATUS_META).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange(student.id, key as AttendanceStatus)}
                    className={`px-3 h-8 rounded-md text-xs font-semibold border transition-colors ${
                      status === key ? meta.active : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {meta.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
