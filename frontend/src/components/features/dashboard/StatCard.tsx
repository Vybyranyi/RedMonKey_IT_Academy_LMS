import type { ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  hint?: string;
}

export default function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <Card className="border-t-2 border-t-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="p-3 bg-red-50 text-primary rounded-xl shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
          <p className="text-sm text-slate-500 truncate">{label}</p>
          {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
