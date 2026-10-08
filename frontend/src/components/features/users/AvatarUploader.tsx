import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Camera, Trash2 } from 'lucide-react';
import { AVATAR_MAX_UPLOAD_BYTES, AVATAR_MIME_TYPES, type IUser } from '@redmonkey/shared';
import { apiDeleteAvatar, apiUploadAvatar } from '@/api/users';
import { toastApiError } from '@/utils/apiError';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const MAX_MB = AVATAR_MAX_UPLOAD_BYTES / 1024 / 1024;
const ACCEPTED: readonly string[] = AVATAR_MIME_TYPES;

interface AvatarUploaderProps {
  user: Pick<IUser, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  /** Відповідь сервера після зміни — сторінка оновлює нею свій стан */
  onChange: (updated: IUser) => void;
  /** true — керуємо чужою аватаркою (адмін), інакше власною: від цього залежать тексти */
  isOwn?: boolean;
}

/**
 * Не оптимістично: сервер може відхилити файл (формат, розмір), і тоді показуємо
 * попередню картинку. Поки йде запит, видно локальне прев'ю вибраного файлу.
 */
export default function AvatarUploader({ user, onChange, isOwn = true }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const errorId = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Той самий файл вдруге не дав би change, якщо не скинути значення
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      setError('Підтримуються лише JPG, PNG або WebP');
      return;
    }
    if (file.size > AVATAR_MAX_UPLOAD_BYTES) {
      setError(`Файл завеликий (максимум ${MAX_MB} МБ)`);
      return;
    }

    setError(null);
    setPreview(URL.createObjectURL(file));
    setIsUploading(true);
    try {
      onChange(await apiUploadAvatar(user.id, file));
      toast.success('Фото оновлено');
    } catch (uploadError) {
      toastApiError(uploadError, 'Не вдалося завантажити фото');
    } finally {
      setPreview(null);
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      onChange(await apiDeleteAvatar(user.id));
      toast.success('Фото видалено');
      setIsConfirmOpen(false);
    } catch (deleteError) {
      toastApiError(deleteError, 'Не вдалося видалити фото');
    } finally {
      setIsDeleting(false);
    }
  };

  const isBusy = isUploading || isDeleting;
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16 shrink-0">
        <AvatarImage src={preview ?? user.avatar ?? undefined} alt="" />
        <AvatarFallback className="bg-avatar text-xl font-bold text-white">
          {user.firstName.charAt(0)}
          {user.lastName.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleFile}
            data-testid="avatar-input"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            {isUploading ? 'Збереження...' : user.avatar ? 'Змінити фото' : 'Завантажити фото'}
          </Button>
          {user.avatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-600"
              disabled={isBusy}
              onClick={() => setIsConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Видалити фото
            </Button>
          )}
        </div>
        <p id={hintId} className="text-xs text-slate-500">
          JPG, PNG або WebP, до {MAX_MB} МБ
        </p>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Видалити фото?"
        description={
          isOwn
            ? 'Замість фото всюди показуватимуться ваші ініціали. Файл буде видалено зі сховища.'
            : `Замість фото користувача ${fullName} всюди показуватимуться ініціали. Файл буде видалено зі сховища.`
        }
        confirmLabel="Видалити фото"
        isPending={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
