import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@redmonkey/shared';
import type { IGroupDto, IPopulatedGroup } from '@redmonkey/shared';
import { apiGetGroups, apiCreateGroup } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import GroupCard from '@/components/features/groups/GroupCard';
import GroupForm from '@/components/features/groups/GroupForm';
import { Plus } from 'lucide-react';

export default function GroupsPage() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<IPopulatedGroup[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Лічильник перезавантаження: після створення групи збільшуємо його,
  // і ефект перечитує список. Запит лишається в одному місці, а setState
  // не викликається з ефекту синхронно.
  const [reloadKey, setReloadKey] = useState(0);
  const reloadGroups = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      try {
        const data = await apiGetGroups();
        if (!cancelled) setGroups(data);
      } catch (error) {
        console.error('Помилка завантаження груп:', error);
      }
    };

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleCreateGroup = async (values: IGroupDto) => {
    setIsSubmitLoading(true);
    try {
      await apiCreateGroup(values);
      setIsCreateOpen(false);
      reloadGroups();
    } catch (error) {
      console.error('Помилка при створенні групи:', error);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleViewDetails = (id: string) => {
    console.log('Перегляд складу групи з ID:', id);
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          {groups.filter(g => g.isActive).length} активних · {groups.length} всього
        </Badge>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <GroupCard 
            key={group.id} 
            group={group} 
            onViewDetails={handleViewDetails} 
          />
        ))}
      </div>
    </div>
  );
}