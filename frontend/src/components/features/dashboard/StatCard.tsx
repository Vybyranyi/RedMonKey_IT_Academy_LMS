import type { ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  hint?: string;
}

/**
 * Число з іконкою зверху, підпис під ним: підпис переноситься, а не обрізається.
 * В одну лінію («іконка | число + підпис») вузька картка (1/4 ширини при розгорнутому
 * sidebar, 1/2 на телефоні) з'їдала підпис — «Студен…», «Занять…».
 */
export default function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <Card className="border-t-2 border-t-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="space-y-2 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-primary rounded-xl shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        </div>
        <div>
          <p className="text-sm text-slate-600 leading-snug">{label}</p>
          {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
