import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactNode } from "react";

interface RecordsSummaryCardProps {
  icon: ReactNode;
  title: string;
  total: string | number;
  subtitle?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  colorClass?: string;
}

export default function RecordsSummaryCard({
  icon,
  title,
  total,
  subtitle,
  isExpanded,
  onToggle,
  children,
  colorClass = "text-foreground",
}: RecordsSummaryCardProps) {
  return (
    <div className="notebook-paper overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">{icon}</div>
          <div className="text-right">
            <h3 className="font-bold text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xl font-bold ${colorClass}`}>{total}</span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-border animate-fade-in">{children}</div>
      )}
    </div>
  );
}
