import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  label: string;
  color: string;
}

export default function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', color)}>{label}</span>
  );
}
