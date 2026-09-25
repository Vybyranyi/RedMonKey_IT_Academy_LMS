import { useRef, useState } from 'react';
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
  /** Оцінку вже видно (оптимістично), але сервер ще не підтвердив — клітинку блокуємо */
  isSaving?: boolean;
  onSave: (value: number, comment: string) => void;
  onDelete?: () => void;
  /** Хто й за яке заняття — для скрінрідера: сама кнопка показує лише «+» чи оцінку */
  cellLabel?: string;
}

/**
 * Клітинка того ж заняття в наступному рядку журналу. Шукаємо в DOM, а не через
 * пропси: інакше кожен рядок мав би знати про сусідів і React.memo рядків ламався б.
 */
const nextCellTrigger = (trigger: HTMLElement | null) => {
  const cell = trigger?.closest('td');
  const nextRow = cell?.parentElement?.nextElementSibling;
  const nextCell = cell && nextRow?.children[cell.cellIndex];
  return nextCell?.querySelector<HTMLButtonElement>('button[data-grade-cell]:not(:disabled)');
};

export default function GradeCell({
  grade,
  editable,
  isSaving = false,
  onSave,
  onDelete,
  cellLabel,
}: GradeCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Після збереження з клавіатури фокус іде не назад на клітинку, а до наступного студента
  const moveToNextRef = useRef(false);
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

  const handleSave = (moveToNext = false) => {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < GRADE_MIN || parsed > GRADE_MAX) {
      setError(`Оцінка має бути цілим числом від ${GRADE_MIN} до ${GRADE_MAX}`);
      return;
    }

    onSave(parsed, comment.trim());
    moveToNextRef.current = moveToNext;
    setIsOpen(false);
  };

  // ТЗ 6.4: Enter або Tab — зберегти й перейти до наступного, Escape — скасувати.
  // Tab по незміненій оцінці веде на коментар — інакше до нього не дістатись з клавіатури
  const handleValueKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const isTabForward = event.key === 'Tab' && !event.shiftKey;
    const changed = value !== (grade ? String(grade.value) : '');
    if (event.key === 'Enter' || (isTabForward && changed)) {
      event.preventDefault();
      handleSave(true);
    }
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
          ref={triggerRef}
          type="button"
          data-grade-cell
          aria-label={
            cellLabel && `${cellLabel}: ${grade ? `оцінка ${grade.value}` : 'виставити оцінку'}`
          }
          disabled={isSaving}
          title={
            isSaving
              ? 'Зберігається…'
              : grade
                ? `${grade.teacher.firstName} ${grade.teacher.lastName}, ${format(new Date(grade.createdAt), 'd MMM yyyy', { locale: uk })}`
                : 'Виставити оцінку'
          }
          className={`mx-auto flex h-9 w-9 items-center justify-center rounded-md border text-sm font-bold transition-colors disabled:animate-pulse disabled:opacity-60 ${
            grade
              ? getGradeColor(grade.value)
              : 'border-dashed border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-400'
          }`}
        >
          {grade?.value ?? '+'}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-64 space-y-3"
        align="center"
        onCloseAutoFocus={(event) => {
          if (!moveToNextRef.current) return;
          moveToNextRef.current = false;
          const next = nextCellTrigger(triggerRef.current);
          if (!next) return;
          event.preventDefault();
          next.focus();
          next.click();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="grade-value">
            Оцінка ({GRADE_MIN}–{GRADE_MAX})
          </Label>
          <Input
            id="grade-value"
            type="number"
            min={GRADE_MIN}
            max={GRADE_MAX}
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleValueKeyDown}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'grade-error' : 'grade-hint'}
            className={error ? 'border-destructive' : undefined}
          />
          {!error && (
            <p id="grade-hint" className="text-[11px] text-slate-400">
              Enter або Tab — зберегти й до наступного студента, Esc — скасувати
            </p>
          )}
          {error && (
            <p id="grade-error" role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="grade-comment">Коментар</Label>
          <Input
            id="grade-comment"
            value={comment}
            maxLength={200}
            placeholder="Необов'язково"
            onChange={(event) => setComment(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSave(true);
              }
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="flex-1 bg-[#C10000] hover:bg-[#A00000] text-white"
            onClick={() => handleSave()}
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
