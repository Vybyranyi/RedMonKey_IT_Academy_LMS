import { Skeleton } from '@/components/ui/skeleton';

/** Каркас AppLayout, поки відновлюється сесія (GET /auth/me) — замість голого «Завантаження...». */
export default function AppSkeleton() {
  return (
    <div className="flex min-h-dvh bg-[#F8F9FA]" aria-busy="true" aria-label="Завантаження">
      <div className="hidden md:block w-20 lg:w-65 shrink-0 bg-[#29425D]" />
      <div className="flex-1 min-w-0 px-4 pt-6 md:px-8 md:pt-10 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}
