import { Phone, Gauge } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FixedNumberCardProps {
  phoneNumber: string;
  name: string;
  used: number;
  limit: number;
  onSelect?: () => void;
  isSelected?: boolean;
}

export default function FixedNumberCard({
  phoneNumber,
  name,
  used,
  limit,
  onSelect,
  isSelected,
}: FixedNumberCardProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - used, 0);
  
  const getProgressColor = () => {
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 80) return "bg-amber-500";
    if (percentage >= 50) return "bg-primary";
    return "bg-income";
  };

  const getGaugeColor = () => {
    if (percentage >= 100) return "text-destructive";
    if (percentage >= 80) return "text-amber-500";
    if (percentage >= 50) return "text-primary";
    return "text-income";
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Phone number display */}
          <div className="flex items-center gap-2 mb-1">
            <Phone className="h-4 w-4 text-primary shrink-0" />
            <span className="font-mono text-lg font-bold text-foreground" dir="ltr">
              {phoneNumber}
            </span>
          </div>
          
          {/* Name */}
          {name && (
            <p className="text-sm text-muted-foreground truncate">{name}</p>
          )}
          
          {/* Usage stats */}
          {limit > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">المستخدم</span>
                <span className="font-medium">
                  {used.toLocaleString("ar-EG")} / {limit.toLocaleString("ar-EG")} ج.م
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor()}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              {/* Remaining */}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">المتبقي</span>
                <span className={percentage >= 100 ? "text-destructive font-bold" : "text-income font-medium"}>
                  {remaining.toLocaleString("ar-EG")} ج.م
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Gauge indicator */}
        {limit > 0 && (
          <div className="flex flex-col items-center gap-1">
            <div className={`relative ${getGaugeColor()}`}>
              <Gauge className="h-10 w-10" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                {Math.round(percentage)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
