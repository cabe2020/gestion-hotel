import { type LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  color?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'bg-[var(--color-primary)]',
}: StatsCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{title}</p>
          <p className="text-2xl font-bold text-[var(--color-foreground)] mt-1">{value}</p>
          {trend && (
            <p
              className={`text-xs mt-1 ${trend.positive ? 'text-[var(--color-success)]' : 'text-[var(--color-destructive)]'}`}
            >
              {trend.positive ? '+' : ''}
              {trend.value}% vs. ayer
            </p>
          )}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
