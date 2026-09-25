import { useState } from 'react';
import { CoinCategory, COIN_AMOUNT_MAX, createCoinTransactionSchema } from '@redmonkey/shared';
import type { ICoinTransactionDto, IUser } from '@redmonkey/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { validateWithZod } from '@/utils/validation';
import { COIN_CATEGORY_META } from '@/lib/coinCategories';

interface CoinAwardFormProps {
  isOpen: boolean;
  onClose: () => void;
  students: IUser[];
  /** студент, якого обрали в рейтингу; порожній рядок — обирає користувач */
  initialStudentId?: string;
  /** CoinsPage закриває форму одразу (оптимістичне оновлення), тож за замовчуванням false */
  isSubmitting?: boolean;
  onSubmit: (data: ICoinTransactionDto) => void;
}

const QUICK_AMOUNTS = [5, 10, 25, 50];

export default function CoinAwardForm({
  isOpen,
  onClose,
  students,
  initialStudentId,
  isSubmitting = false,
  onSubmit,
}: CoinAwardFormProps) {
  // Стан ініціалізується один раз: батько монтує форму лише на час відкриття,
  // тож скидати її ефектом не треба
  const [studentId, setStudentId] = useState(initialStudentId ?? '');
  const [direction, setDirection] = useState<'award' | 'deduct'>('award');
  const [amount, setAmount] = useState('10');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<CoinCategory>(CoinCategory.ACHIEVEMENT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Мінус у полі не вводять: напрям — це окремий перемикач, інакше «-10» і
  // категорію «штраф» доводиться тримати в голові окремо
  const handleDirection = (next: 'award' | 'deduct') => {
    setDirection(next);
    setCategory(next === 'deduct' ? CoinCategory.PENALTY : CoinCategory.ACHIEVEMENT);
  };

  const handleSubmit = () => {
    const parsed = Number(amount);
    const payload = {
      studentId,
      amount: Number.isFinite(parsed) ? (direction === 'deduct' ? -parsed : parsed) : NaN,
      reason: reason.trim(),
      category,
    };

    const nextErrors = validateWithZod(createCoinTransactionSchema)(payload);
    // Порожній студент дає з Zod повідомлення «studentId має бути UUID» —
    // технічний текст, який користувачу нічого не пояснює
    if (!studentId) nextErrors.studentId = 'Оберіть студента';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit(payload as ICoinTransactionDto);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Операція з RedCoins</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coin-student">Студент</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger id="coin-student" className="bg-white h-11">
                <SelectValue placeholder="Оберіть студента" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.studentId && <p className="text-xs text-destructive">{errors.studentId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={direction === 'award' ? 'default' : 'outline'}
              className={direction === 'award' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
              onClick={() => handleDirection('award')}
            >
              Нарахувати
            </Button>
            <Button
              type="button"
              variant={direction === 'deduct' ? 'default' : 'outline'}
              className={direction === 'deduct' ? 'bg-[#C10000] hover:bg-[#A00000] text-white' : ''}
              onClick={() => handleDirection('deduct')}
            >
              Списати
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coin-amount">Кількість монет</Label>
            <Input
              id="coin-amount"
              type="number"
              min={1}
              max={COIN_AMOUNT_MAX}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(String(value))}
                >
                  {direction === 'deduct' ? '−' : '+'}
                  {value}
                </Button>
              ))}
            </div>
            {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="coin-category">Категорія</Label>
            <Select value={category} onValueChange={(next) => setCategory(next as CoinCategory)}>
              <SelectTrigger id="coin-category" className="bg-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COIN_CATEGORY_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="coin-reason">Причина</Label>
            <Input
              id="coin-reason"
              placeholder="Напр. «Відмінна відповідь на уроці»"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            {errors.reason && <p className="text-xs text-destructive">{errors.reason}</p>}
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <Button
            className="w-full h-11 bg-[#C10000] hover:bg-[#A00000] text-white"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Збереження...' : 'Підтвердити'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
