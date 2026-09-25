import { Settings } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function SettingsPage() {
  return (
    <EmptyState
      icon={Settings}
      title="Розділ у розробці"
      description="Тут з'являться системні налаштування академії. Поки що всі параметри задаються на сервері."
    />
  );
}
