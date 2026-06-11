import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@redmonkey/shared';
import { apiGetGroups, apiCreateGroup, type GroupData, type GroupItem } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import GroupCard from '@/components/features/groups/GroupCard';
import GroupForm from '@/components/features/groups/GroupForm';
import { Plus } from 'lucide-react';

export default function GroupsPage() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const fetchGroups = async () => {
    try {
      const data = await apiGetGroups();
      setGroups(data);
    } catch (error) {
      console.error('Помилка завантаження груп:', error);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (values: GroupData) => {
    setIsSubmitLoading(true);
    try {
      await apiCreateGroup(values);
      setIsCreateOpen(false);
      fetchGroups();
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
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Групи</h1>
            <Badge variant="secondary" className="mt-1">
              {groups.filter(g => g.isActive).length} активних · {groups.length} всього
            </Badge>
          </div>
          <p className="text-slate-500">Управління академічними групами та перегляд їхнього складу</p>
        </div>

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
            key={group._id} 
            group={group} 
            onViewDetails={handleViewDetails} 
          />
        ))}
      </div>
    </div>
  );
}