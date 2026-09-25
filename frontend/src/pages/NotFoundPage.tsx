import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ErrorState from '@/components/common/ErrorState';

/** Catch-all маршрут: без нього невідомий URL давав порожній екран. Заголовок рендерить Header. */
export default function NotFoundPage() {
  return (
    <ErrorState
      icon={Compass}
      code="404"
      title="Такої сторінки немає"
      description="Можливо, посилання застаріло або в адресі помилка. Скористайтеся меню або поверніться на головну."
    >
      <Button className="h-10 px-4 bg-[#C10000] hover:bg-[#A00000] text-white" asChild>
        <Link to="/">На головну</Link>
      </Button>
    </ErrorState>
  );
}
