import { useState } from 'react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { GRADE_MAX, GRADE_MIN } from '@redmonkey/shared';
import type { IPopulatedGrade } from '@redmonkey/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getGradeColor } from '@/lib/gradeColors';

interface GradeCellProps {
  grade: IPopulatedGrade | null;
  editable: boolean;
  isSaving?: boolean;
  onSave: (value: number, comment: string) => void;
  onDelete?: () => void;
}

export default function GradeCell({
  grade,
  editable,
  isSaving = false,
  onSave,
  onDelete,
}: GradeCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Поля наповнюємо в обробнику відкриття, а не в ефекті: клітинка живе весь
  // час, поки відкритий журнал, і має підхопити актуальну оцінку на кожен клік
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setValue(grade ? String(grade.value) : '');
      setComment(grade?.comment ?? '');
      setError(null);
    }
    setIsOpen(open);
  };

  const handleSave = () => {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < GRADE_MIN || parsed > GRADE_MAX) {
      setError(`Оцінка має бути цілим числом від ${GRADE_MIN} до ${GRADE_MAX}`);
      return;
    }

    onSave(parsed, comment.trim());
    setIsOpen(false);
  };

  if (!editable) {
    return (
      <div className="flex justify-center">
        {grade ? (
          <span
            title={`${grade.teacher.firstName} ${grade.teacher.lastName}, ${format(new Date(grade.createdAt), 'd MMM yyyy', { locale: uk })}`}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-bold ${getGradeColor(grade.value)}`}
          >
            {grade.value}
          </span>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        )}
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isSaving}
          title={
            grade
              ? `${grade.teacher.firstName} ${grade.teacher.lastName}, ${format(new Date(grade.createdAt), 'd MMM yyyy', { locale: uk })}`
              : 'Виставити оцінку'
          }
          className={`mx-auto flex h-9 w-9 items-center justify-center rounded-md border text-sm font-bold transition-colors disabled:opacity-50 ${
            grade
              ? getGradeColor(grade.value)
              : 'border-dashed border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-400'
          }`}
        >
          {isSaving ? '…' : (grade?.value ?? '+')}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 space-y-3" align="center">
        <div className="space-y-2">
          <Label htmlFor="grade-value">Оцінка ({GRADE_MIN}–{GRADE_MAX})</Label>
          <Input
            id="grade-value"
            type="number"
            min={GRADE_MIN}
            max={GRADE_MAX}
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            // Enter зберігає, Escape закриває — інакше журнал незручно заповнювати з клавіатури
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSave();
              }
              if (event.key === 'Escape') setIsOpen(false);
            }}
            className={error ? 'border-destructive' : undefined}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="grade-comment">Коментар</Label>
          <Input
            id="grade-comment"
            value={comment}
            maxLength={200}
            placeholder="Необов'язково"
            onChange={(event) => setComment(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="flex-1 bg-[#C10000] hover:bg-[#A00000] text-white"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Збереження...' : 'Зберегти'}
          </Button>

          {grade && onDelete && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Видалити оцінку"
              disabled={isSaving}
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
            >
              <Trash2 className="h-4 w-4 text-slate-500" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}