import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Що саме станеться — конкретно, з назвою об'єкта, а не «Ви впевнені?» */
  description: ReactNode;
  confirmLabel: string;
  /** Підпис кнопки відмови — коли сама дія теж «скасувати», «Скасувати» тут плутає */
  cancelLabel?: string;
  /** Поки запит іде, діалог лишається відкритим: помилка видна в тому ж контексті */
  isPending?: boolean;
  onConfirm: () => void;
  /** Додатковий вміст між описом і кнопками: підсумок, попередження */
  children?: ReactNode;
}

/** Підтвердження незворотної дії. Закриває його сторінка — після успіху запиту. */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Скасувати',
  isPending = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent className="rounded-[20px] p-6 gap-5 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-title">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {children}

        <AlertDialogFooter className="-mx-6 -mb-6 rounded-b-[20px] bg-slate-50 px-6 py-4">
          <AlertDialogCancel className="h-10 px-4" disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-10 px-4 bg-brand hover:bg-brand-hover text-white"
            disabled={isPending}
            onClick={(event) => {
              // Radix закриває діалог на клік — а закрити його має сторінка, коли запит пройде
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? 'Збереження...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
