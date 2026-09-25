import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ErrorState from '@/components/common/ErrorState';

/**
 * Стан 403: роль не має доступу до розділу. Показуємо його на місці, а не
 * тихо перекидаємо на головну — інакше незрозуміло, чому посилання «не працює».
 */
export default function ForbiddenPage() {
  return (
    <ErrorState
      icon={ShieldAlert}
      code="403"
      title="Цей розділ вам недоступний"
      description="Ваша роль не має прав на перегляд цієї сторінки. Якщо вважаєте це помилкою — зверніться до адміністратора академії."
    >
      <Button className="h-10 px-4 bg-[#C10000] hover:bg-[#A00000] text-white" asChild>
        <Link to="/">На головну</Link>
      </Button>
    </ErrorState>
  );
}
