import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@redmonkey/shared';
import type { IGroupDto, IPopulatedGroup } from '@redmonkey/shared';
import { apiGetGroups, apiCreateGroup } from '@/api/groups';
import { getApiErrorMessage, isSilentError, toastApiError } from '@/utils/apiError';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import GroupCard from '@/components/features/groups/GroupCard';
import GroupForm from '@/components/features/groups/GroupForm';
import { BookOpen, Plus } from 'lucide-react';

export default function GroupsPage() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<IPopulatedGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // «Спробувати знову» після помилки: ефект перечитує список. Після створення
  // групи список не перечитуємо — нова група додається з відповіді сервера
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await apiGetGroups();
        if (!cancelled) setGroups(data);
      } catch (error) {
        if (!cancelled && !isSilentError(error)) {
          setLoadError(getApiErrorMessage(error, 'Не вдалося завантажити групи'));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  const handleCreateGroup = async (values: IGroupDto) => {
    setIsSubmitLoading(true);
    try {
      const created = await apiCreateGroup(values);
      setIsCreateOpen(false);
      // Бекенд сортує групи від нових — нова стає першою
      setGroups((current) => [created, ...current]);
      toast.success(`Групу «${created.name}» створено`);
    } catch (error) {
      toastApiError(error, 'Не вдалося створити групу');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleViewDetails = (id: string) => {
    console.log('Перегляд складу групи з ID:', id);
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  if (loadError) {
    return (
      <ErrorState
        title="Не вдалося завантажити групи"
        description={loadError}
        onRetry={() => setLoadAttempt((value) => value + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        {isLoading ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          <Badge variant="secondary">
            {groups.filter((g) => g.isActive).length} активних · {groups.length} всього
          </Badge>
        )}

        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-white">
                <Plus className="h-4 w-4" /> Нова група
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Створення нової навчальної групи</DialogTitle>
              </DialogHeader>
              <GroupForm onSubmit={handleCreateGroup} isSubmitting={isSubmitLoading} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-busy="true"
          aria-label="Завантаження груп"
        >
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Груп ще немає"
          description="Група об'єднує студентів, викладачів і розклад — з неї починається робота академії."
        >
          {isAdmin && (
            <Button
              className="bg-[#C10000] hover:bg-[#A00000] text-white"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4" /> Створити першу групу
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} onViewDetails={handleViewDetails} />
          ))}
        </div>
      )}
    </div>
  );
}
