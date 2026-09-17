import { Coins, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ICoinBalance } from '@/api/coins';

interface CoinBalanceCardProps {
  balance: ICoinBalance | null;
  isLoading: boolean;
}

export default function CoinBalanceCard({ balance, isLoading }: CoinBalanceCardProps) {
  if (isLoading) return <Skeleton className="h-44 w-full rounded-xl" />;

  return (
    <Card className="border-t-2 border-t-slate-200">
      <CardContent className="p-6 space-y-4 text-center">
        <div className="inline-flex p-3 bg-amber-50 text-amber-500 rounded-full">
          <Coins className="h-8 w-8" />
        </div>

        <div>
          <p className="text-4xl font-extrabold text-slate-900 leading-none">
            {balance?.balance ?? 0}
          </p>
          <p className="text-sm font-medium text-slate-500 mt-1">Баланс RedCoins</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-center gap-2 pt-3">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-600">+{balance?.earned ?? 0}</span>
          </div>
          <div className="flex items-center justify-center gap-2 pt-3">
            <TrendingDown className="h-4 w-4 text-[#C10000]" />
            <span className="text-sm font-semibold text-[#C10000]">−{balance?.spent ?? 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
